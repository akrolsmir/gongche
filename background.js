const pageNumText = document.getElementById('pagenum');
// Invisible intermediate canvas for loading PDF.
const bgCanvas = document.createElement('canvas');
const img = new Image();

let pdf;
let pdfOffset; // Delta between pdf and printed page num
let pageNum = 6608; // Printed page number

let songs;
let songsById;
let songIndex = 6288;

let currentBook = 1;

let songDataApp;

async function main() {
  // TODO: Consider parallelizing these async calls.
  await loadPdf('assets/book (18).pdf');
  [songs, songsById] = await getSongTables();
  songDataApp = configSongData();
  renderSong();
}
main();

function configSongData() {
  return new Vue({
    el: '.songdata',
    data: {
      song: '',
      regions: ['North', 'South'],
      editedLyrics: 'Placeholder lyrics',
      editedMelody: 'Placeholder melody',
      editedRegion: 'North',
      editedId: '123.4',
      keyboardToGongche,
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
          for (char of input) {
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
      editedId (newId) {
        if (songsById[newId]) {
          if (songsById[newId] != songIndex) {
            saveLyricsAndMelody();
            songIndex = songsById[newId];
            renderSong();
          }
        } else {
          // TODO: Consider debouncing this
          alert(`No song at ${newId}`);
        }
      }
    }
  });
}

function saveLyricsAndMelody() {
  const song = songs[songIndex];
  if (song.fullLyrics != songDataApp.editedLyrics) {
    song.fullLyrics = songDataApp.editedLyrics;
    saveSong(song);
  }
  if (song.lyrics != songDataApp.strippedLyrics) {
    song.lyrics = songDataApp.strippedLyrics;
    saveSong(song);
  }
  if (song.melody != songDataApp.editedMelody) {
    song.melody = songDataApp.editedMelody;
    saveSong(song);
  }
  if (song.region != songDataApp.editedRegion) {
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
    await loadPdf(`assets/book (${bookIndex}).pdf`);
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

/** Use Ctrl + D shortcut to jump to corresponding melody. */
document.onkeydown = function(event) {
  if (event.ctrlKey || event.metaKey) {
    switch (String.fromCharCode(event.which).toLowerCase()) {
      case 'd':
        event.preventDefault();
        selectMelodyForLyrics();
        break;
    }
  }
}

function selectMelodyForLyrics() {
  const lyricsText = document.getElementById('lyrics');
  const melodyText = document.getElementById('melody');

  if (lyricsText != document.activeElement) {
    return;
  }

  let lyricsStart = unspacedIndex(lyricsText.value, lyricsText.selectionStart);
  let lyricsEnd = unspacedIndex(lyricsText.value, lyricsText.selectionEnd);

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

function unspacedIndex(string, index) {
  let prefix = string.substring(0, index);
  return prefix.replace(/\s/g, '').length;
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
