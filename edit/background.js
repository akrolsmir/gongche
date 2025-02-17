import { getSongTables, findBookAndOffset } from "../assets/mulu.js";
import { drawUiLayer, resetSong, processClick, analyze } from "./lyricize.js";
import { mouseUp, mouseDown, contextMenu} from "./ocr.js";

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');

// Invisible intermediate canvas for loading PDF.
const bgCanvas = document.createElement('canvas');
window.bgCanvas = bgCanvas;
const img = new Image();

let pdf;
let pdfOffset; // Delta between pdf and printed page num
let pageNum; // Printed page number

let songs;
let songsById;
let songIndex;

let currentBook;

async function main() {
  // If songId is provided as a URL param, focus on that song.
  const urlParams = new URLSearchParams(window.location.search);
  let urlSongId = urlParams.get('songId');
  urlSongId = urlSongId ? urlSongId : "6584.1";

  [songs, songsById] = await getSongTables();
  songIndex = songsById[urlSongId];
  window.songDataApp = configSongData();
  renderSong();
}
main();

function configSongData() {
  return new Vue({
    el: '.vue',
    data: {
      song: '',
      regions: ['North', 'South'],
      editedLyrics: 'Placeholder lyrics',
      editedMelody: 'Placeholder melody',
      editedRegion: 'North',
      editedId: '123.4',
      keyboardToGongche,
      downloadSongs: downloadSongsAsCsv,
    },
    mounted() {
      canvas = this.$refs.canvas;
      ctx = canvas.getContext('2d');
    },
    methods: {
      processClick,
      analyze,
      nextPage,
      prevPage,
      jumpToPage,
      mouseUp,
      mouseDown,
      contextMenu,
      nextSong,
      prevSong,
    },
    computed: {
      // If the song's lyrics or melody were edited, color the field yellow.
      lyricsStyle() {
        const yellow = 'rgba(256, 256, 0, 0.4)';
        const color = this.song.fullLyrics == this.editedLyrics ? 'white' : yellow;
        return {
          backgroundColor: color,
        }
      },
      melodyStyle() {
        const yellow = 'rgba(256, 256, 0, 0.4)';
        const color = this.song.melody == this.editedMelody ? 'white' : yellow;
        return {
          backgroundColor: color,
        }
      },
      // Show the current lyric, based on the spaces in the melody field.
      lyricPreview() {
        const melodySpaces = this.editedMelody.split(' ').length - 1;
        const unspacedLyrics = this.strippedLyrics.replace(/\s/g, '');
        if (0 <= melodySpaces && melodySpaces < unspacedLyrics.length) {
          return unspacedLyrics[melodySpaces];
        }
        return '';
      },
      // Rewrite melody text with Gongche, and mark the character on the canvas.
      melodyGongche: {
        get() {
          return this.editedMelody;
        },
        set(input) {
          let output = "";
          for (const char of input) {
            const gongche = keyboardToGongche[char];
            output += gongche ? gongche : char;
          }
          this.editedMelody = output;

          const spaceCount = output.split(' ').length - 1;
          drawUiLayer(spaceCount, /* showAnnotations = */ false);
        }
      },
      strippedLyrics() {
        // Remove all rhyme and padding markers.
        return this.editedLyrics.replace(/[.,_]/g, '');
      }
    },
    watch: {
      editedId(newId) {
        if (songsById[newId]) {
          if (songsById[newId] != songIndex) {
            saveLyricsAndMelody();
            songIndex = songsById[newId];
            renderSong();
          }
        } else {
          // TODO: Consider debouncing this
          // alert(`No song at ${newId}`);
        }
      }
    }
  });
}

function saveLyricsAndMelody() {
  const song = songs[songIndex];
  if (song.fullLyrics != songDataApp.editedLyrics
    || song.lyrics != songDataApp.strippedLyrics
    || song.melody != songDataApp.editedMelody
    || song.region != songDataApp.editedRegion) {

    if (!hasEditPermission()) {
      return;
    }
    song.fullLyrics = songDataApp.editedLyrics;
    song.lyrics = songDataApp.strippedLyrics;
    song.melody = songDataApp.editedMelody;
    song.region = songDataApp.editedRegion;
    saveSong(song);
  }
}

function nextSong() {
  saveLyricsAndMelody();
  songIndex++;
  renderSong();
}

function prevSong() {
  saveLyricsAndMelody();
  songIndex--;
  renderSong();
}

function renderSong() {
  const song = songs[songIndex];
  pageNum = song.pageNum;
  renderPdfPage();

  songDataApp.song = song;
  songDataApp.editedLyrics = song.fullLyrics;
  songDataApp.editedMelody = song.melody;
  songDataApp.editedRegion = song.region;
  songDataApp.editedId = song.id;
}

function loadImage(src) {
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);
  }
  img.src = src;
}

async function loadPdf(src) {
  pdf = await pdfjsLib.getDocument(src);
  await renderPdfPage();
}

async function renderPdfPage() {
  const [bookIndex, offset] = findBookAndOffset(pageNum);
  pdfOffset = offset;
  if (bookIndex != currentBook) {
    currentBook = bookIndex;
    await loadPdf(`../assets/book (${bookIndex}).pdf`);
  }

  resetSong();
  let page;
  try {
    page = await pdf.getPage(pageNum - pdfOffset);
  } catch (error) {
    alert(`Page not found: ${pageNum}`);
    pageNum = 1;
    await renderPdfPage();
    return;
  }
  const scale = 1.3;
  const viewport = page.getViewport(scale);

  canvas.height = viewport.height;
  canvas.width = viewport.width;
  bgCanvas.height = canvas.height;
  bgCanvas.width = canvas.width;

  const renderContext = {
    canvasContext: bgCanvas.getContext('2d'),
    viewport: viewport
  };
  await page.render(renderContext);
  ctx.drawImage(bgCanvas, 0, 0);
  const pageNumText = document.getElementById('pagenum');
  pageNumText.value = `Page ${pageNum}`;
}

function prevPage() {
  saveLyricsAndMelody();
  pageNum--;
  renderPdfPage();
}

function nextPage() {
  saveLyricsAndMelody();
  pageNum++;
  renderPdfPage();
}

function jumpToPage() {
  const pageNumText = document.getElementById('pagenum');
  try {
    saveLyricsAndMelody();
    const match = pageNumText.value.match(/\d+/);
    pageNum = parseInt(match[0]);
    const id = `${pageNum}.1`;
    if (songsById[id]) {
      saveLyricsAndMelody();
      songIndex = songsById[id];
      renderSong();
    } else {
      renderPdfPage();
    }
  } catch (error) {
    alert(`No number found: ${pageNumText.value}`)
  }
}

/** Use Ctrl + D and Ctrl + E shortcut to jump to corresponding melody. */
document.onkeydown = function (event) {
  if (event.ctrlKey || event.metaKey) {
    switch (String.fromCharCode(event.which).toLowerCase()) {
      case 'd':
        event.preventDefault();
        selectMelodyForLyrics();
        break;
      case 'e':
        event.preventDefault();
        selectLyricsForMelody();
    }
  }
}

function selectMelodyForLyrics() {
  const lyricsText = document.getElementById('lyrics');
  const melodyText = document.getElementById('melody');

  if (lyricsText != document.activeElement) {
    return;
  }

  const lyricsStart = strippedIndex(lyricsText.value, lyricsText.selectionStart);
  const lyricsEnd = strippedIndex(lyricsText.value, lyricsText.selectionEnd);

  let melodyStart = 0;
  let melodyEnd = 0;
  let spaceCount = 0;
  for (let i = 0; i < melodyText.value.length; i++) {
    if (melodyText.value[i] == ' ') {
      spaceCount++;
      if (spaceCount == lyricsStart) {
        melodyStart = i + 1;
      }
      if (spaceCount == lyricsEnd) {
        melodyEnd = i;
      }
    }
  }
  melodyText.focus();
  melodyText.setSelectionRange(melodyStart, melodyEnd);
}

function selectLyricsForMelody() {
  const lyricsText = document.getElementById('lyrics');
  const melodyText = document.getElementById('melody');

  if (melodyText != document.activeElement) {
    return;
  }

  const melodyStart = melodyText.selectionStart;
  const melodyEnd = melodyText.selectionEnd;
  // Number of spaces before == index in stripped lyrics
  let spacesStart = melodyText.value.substring(0, melodyStart).match(/ /g || []).length;
  let spacesEnd = melodyText.value.substring(0, melodyEnd).match(/ /g || []).length;
  if (spacesEnd == spacesStart) {
    // End selection at least one whole lyric after
    spacesEnd++;
  }

  let lyricsStart = 0;
  let lyricsEnd = 0;
  for (let i = 0; i < lyricsText.value.length; i++) {
    if (lyricsText.value[i].match(/[\s\.,_]/g)) {
      // Ignore non-lyric character
      continue;
    }
    if (spacesStart == 0) {
      lyricsStart = i;
    }
    spacesStart--;
    if (spacesEnd == 0) {
      lyricsEnd = i;
    }
    spacesEnd--;
  }

  lyricsText.focus();
  lyricsText.setSelectionRange(lyricsStart, lyricsEnd);
}

/** Index into string after non-lyrical symbols are removed. */
function strippedIndex(string, index) {
  let prefix = string.substring(0, index);
  return prefix.replace(/[\s\.,_]/g, '').length;
}

/** Handle drag + dropped image or PDF.*/
var dropzone = document.getElementById('dropzone');

dropzone.ondragover = function (e) {
  e.preventDefault();
}

dropzone.ondrop = function (e) {
  e.preventDefault();
  var files = e.dataTransfer.files;
  replaceImage(files[0]);
}

function replaceImage(file) {
  let reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = () => {
    const dataUrl = reader.result;
    if (file.name.endsWith('pdf')) {
      loadPdf(dataUrl);
    } else {
      loadImage(dataUrl);
    }
  }
}
