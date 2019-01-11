const pageNumText = document.getElementById('pagenum');
// Invisible intermediate canvas for loading PDF.
const bgCanvas = document.createElement('canvas');
const img = new Image();

let pdf;
const pdfOffset = 6531; // Delta between pdf and printed page num
let pageNum = 6608 - pdfOffset;

let songs;
let songIndex = 6282;

async function main() {
  // loadImage('assets/2880.png');
  // TODO: Consider parallelizing these async calls.
  await loadPdf('assets/104.pdf');
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
  pageNum = song.pageNum - pdfOffset;
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
  renderPdfPage();
}

async function renderPdfPage() {
  resetSong();
  let page;
  try {
    page = await pdf.getPage(pageNum);
  } catch (error) {
    alert(`Page not found: ${pageNum + pdfOffset}`);
    pageNum = 1;
    page = await pdf.getPage(pageNum);
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
  pageNumText.value = `Page ${pageNum + pdfOffset}`;
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
    pageNum = parseInt(match[0]) - pdfOffset;
    renderPdfPage();
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
