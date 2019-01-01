const pageNumText = document.getElementById('pagenum');
// Invisible intermediate canvas for loading PDF.
const bgCanvas = document.createElement('canvas');
const img = new Image();

let pdf;
let pageNum = 64;

// loadImage('assets/2880.png');
loadPdf('assets/104.pdf');

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
  pageNumText.value = `Page ${pageNum}`;
  const page = await pdf.getPage(pageNum);
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
}

function prevPage() {
  pageNum--;
  renderPdfPage();
}

function nextPage() {
  pageNum++;
  renderPdfPage();
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
