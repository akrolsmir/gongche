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
let bookOffsets = [
  // [Book num, first printed page num - page it appears]
  [1, 1 - 247],
  [2, 315 - 3],
  [3, 749 - 3],
  [4, 1149 - 3],
  [5, 1557 - 3],
  [6, 1945 - 3],
  [7, 2327 - 3],
  [8, 2693 - 3],
  [9, 3045 - 3],
  [10, 3441 - 3],
  [11, 3849 - 3],
  [12, 4271 - 3],
  [13, 4679 - 3],
  [14, 5097 - 3],
  [15, 5505 - 3],
  [16, 5885 - 3],
  [17, 6165 - 3],
  [18, 6535 - 4]
];

function findBookAndOffset(pageNum) {
  let i = 0
  for (; i < bookOffsets.length; i++) {
    let [book, page] = bookOffsets[i];
    if (pageNum < page) {
      break;
    }
  }
  return bookOffsets[i - 1];
}

async function main() {
  // loadImage('assets/2880.png');
  // TODO: Consider parallelizing these async calls.
  await loadPdf('assets/book (18).pdf');
  songs = await parseTable(getRawTable());
  renderSong();
}
main();

/** If the song's lyrics were changed, color the text field yellow. */
function colorLyricsBackground() {
  const song = songs[songIndex];
  const lyricsTextField = document.getElementById('lyrics');
  if (song.lyrics == lyricsTextField.value) {
    lyricsTextField.style.backgroundColor = 'white';
  } else {
    lyricsTextField.style.backgroundColor = 'rgba(256, 256, 0, 0.4)';
  }
}

function colorMelodyBackground() {
  const song = songs[songIndex];
  const melodyTextField = document.getElementById('melody');
  if (song.melody == melodyTextField.value) {
    melodyTextField.style.backgroundColor = 'white';
  } else {
    melodyTextField.style.backgroundColor = 'rgba(256, 256, 0, 0.4)';
  }
}

function updateLyricPreview(index) {
  const lyricsTextField = document.getElementById('lyrics');
  const lyrics = lyricsTextField.value.replace(/\s/g, ''); // Remove whitespace
  if (0 <= index && index < lyrics.length) {
    const lyricPreviewTextField = document.getElementById('lyricpreview');
    lyricPreviewTextField.value = lyrics[index];
  }
}

function saveLyricsAndMelody() {
  const song = songs[songIndex];
  const lyricsTextField = document.getElementById('lyrics');
  const melodyTextField = document.getElementById('melody');
  if (song.lyrics != lyricsTextField.value) {
    song.lyrics = lyricsTextField.value;
    saveSong(song);
  }
  if (song.melody != melodyTextField.value) {
    song.melody = melodyTextField.value;
    saveSong(song);
  }
  colorLyricsBackground();
  colorMelodyBackground();
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

  const titleTextField = document.getElementById('title');
  const composerTextField = document.getElementById('composer');
  const songIdTextField = document.getElementById('songnum');
  const lyricsTextField = document.getElementById('lyrics');
  const melodyTextField = document.getElementById('melody');
  titleTextField.value = song.title;
  composerTextField.value = song.composer;
  songIdTextField.value = song.id;
  lyricsTextField.value = song.lyrics;
  melodyTextField.value = song.melody;
}

async function parseTable(table) {
  songsById = {}; // TODO Remove global usage;
  const songsMap = await loadSongs();
  const fullTable = [];
  let orderInPage = 1;
  for (let i = 0; i < table.length; i++) {
    let [title, composer, pageNum] = table[i];
    pageNum = parseInt(pageNum.substring(1, pageNum.length)); // '頁42' -> 42
    if (i > 0) {
      const lastSong = fullTable[i - 1];
      // Empty titles should refer to the last known title.
      if (!title) {
        title = lastSong.title; 
      }
      // Determine whether this song is the first of its page.
      orderInPage = (lastSong.pageNum != pageNum) ? 1 : orderInPage + 1;
    }
    const id = `${pageNum}.${orderInPage}`
    if (songsMap.has(id)) {
      fullTable.push(Song.fromJson(songsMap.get(id)));
    } else {
      fullTable.push(new Song(id, title, composer, pageNum));
    }
    songsById[id] = i;
  }
  return fullTable;
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
