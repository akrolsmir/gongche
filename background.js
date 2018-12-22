const pageNumText = document.getElementById('pagenum');
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

function loadPdf(src) {
  pdfjsLib.getDocument(src)
    .then(result => {
      pdf = result;
      renderPdfPage();
    });
}

function renderPdfPage() {
  resetSong();
  pageNumText.value = `Page ${pageNum}`;
  pdf.getPage(pageNum)
    .then(page => {
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
      return page.render(renderContext)
    })
    .then(() => {
      ctx.drawImage(bgCanvas, 0, 0);
    });
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
