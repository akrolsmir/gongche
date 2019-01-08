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
    lyricsTextField.style.backgroundColor = 'rgba(256, 256, 0.4)';
  }
}

function saveLyrics() {
  const song = songs[songIndex];
  const lyricsTextField = document.getElementById('lyrics');
  if (song.lyrics != lyricsTextField.value) {
    song.lyrics = lyricsTextField.value;
    saveSong(song);
  }
  colorLyricsBackground();
}

function nextSong() {
  saveLyrics();
  songIndex++;
  renderSong();
}

function prevSong() {
  saveLyrics();
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
  titleTextField.value = song.title;
  composerTextField.value = song.composer;
  songIdTextField.value = song.id;
  lyricsTextField.value = song.lyrics;
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
      fullTable.push(new Song(id, title, composer, pageNum, ''));
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
  saveLyrics();
  pageNum--;
  renderPdfPage();
}

function nextPage() {
  saveLyrics();
  pageNum++;
  renderPdfPage();
}

function jumpToPage() {
  try {
    saveLyrics();
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

const rawTable = [
  ["木蘭花", "月令承應", 6571],
  ["", "月令承應", 6571],
  ["", "月令承應", 6572],
  ["", "月令承應", 6573],
  ["", "董西廂", 6573],
  ["", "董西廂", 6574],
  ["", "董西廂", 6574],
  ["于飛樂", "月令承應", 6575],
  ["", "月令承應", 6576],
  ["", "董西廂", 6577],
  ["", "董西廂", 6577],
  ["", "董西廂", 6578],
  ["", "董西廂", 6579],
  ["糖多令", "明朝樂章", 6579],
  ["", "董西廂", 6580],
  ["", "董西廂", 6581],
  ["青玉案", "董西廂", 6581],
  ["", "董西廂", 6582],
  ["雪花飛", "法宮雅奏", 6583],
  ["憶漢月（望漢月）", "法宮雅奏", 6584],
  ["", "法宮雅奏", 6584],
  ["長命女", "法宮雅奏", 6585],
  ["文如錦", "散曲", 6586],
  ["", "散曲", 6587],
  ["", "董西廂", 6587],
  ["", "董西廂", 6588],
  ["", "董西廂", 6589],
  ["", "董西廂", 6590],
  ["願成雙", "散曲", 6592],
  ["", "散曲", 6592],
  ["", "雍熙樂府", 6593],
  ["", "雍熙樂府", 6593],
  ["", "散曲", 6594],
  ["", "散曲", 6594],
  ["", "散曲", 6595],
  ["", "散曲", 6596],
  ["玉梅令", "法宮雅奏", 6596],
  ["白雪", "法宮雅奏", 6597],
  ["晝夜樂", "散曲", 6599],
  ["", "散曲", 6599],
  ["人月圓", "散曲", 6600],
  ["", "散曲", 6601],
  ["傾杯序", "天寶遺事", 6601],
  ["", "天寶遺事", 6602],
  ["", "天寶遺事", 6603],
  ["", "天寶遺事", 6604],
  ["傾杯樂（古傾杯）", "法宮雅奏", 6605],
  ["", "法宮雅奏", 6606],
  ["賀聖朝", "散曲", 6607],
  ["添聲楊柳枝（賀聖朝影、太平時）", "法宮雅奏", 6608],
  ["探新芳", "太平圖", 6608],
  ["", "太平圖", 6609],
  ["綵樓春", "太平圖", 6610],
  ["", "太平圖", 6611],
  ["五抝子", "月令承應", 6613],
  ["", "月令承應", 6613],
  ["", "月令承應", 6614],
  ["", "月令承應", 6615],
  ["瑞龍吟", "太平圖", 6616],
  ["慶千秋", "太平圖", 6617],
  ["慶餘", "月令承應", 6619],
  ["", "法宮雅奏", 6619],
  ["", "董西廂", 6620],
  ["隨煞", "散曲", 6620],
];
