const canvas = document.getElementById('canvas');
const snippet = document.getElementById('snippet');
const lyricsTextField = document.getElementById('lyrics');
const pageNumText = document.getElementById('pagenum');
const ctx = canvas.getContext('2d');
const snippetCtx = snippet.getContext('2d');
const img = new Image();

let annotations;
let symbols;
let pdf;
let pageNum = 46;

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
  pageNumText.value = `Page ${pageNum}`;
  pdf.getPage(pageNum)
    .then(page => {
      const scale = 1.3;
      const viewport = page.getViewport(scale);

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };
      return page.render(renderContext);
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

function analyze() {
  // TODO: drawSeparators is slow (~300ms). Optimize or move to async.
  drawSeparators(ctx);
  requestOcr(canvas).then(json => colorWords(json));
}

/** Draws boxes around each annotation. */
function colorWords(json) {
  annotations = json.responses[0].textAnnotations;
  // Remove the first (overarching) annotation.
  annotations.splice(0, 1);
  for (const annotation of annotations) {
    const [start, end] = getStartEnd(annotation.boundingPoly);
    ctx.strokeStyle = 'green';
    ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  }

  symbols = [];
  const fullTextAnnotations = json.responses[0].fullTextAnnotation;
  const page = fullTextAnnotations.pages[0];
  for (const block of page.blocks) {
    for (const paragraph of block.paragraphs) {
      for (const word of paragraph.words) {
        for (const symbol of word.symbols) {
          // Add a parent reference and save the symbol.
          symbol.parent = word;
          symbols.push(symbol);

          colorSymbol(symbol);
        }
      }
    }
  }
}

function colorSymbol(symbol) {
  // Draw symbol box, on blue <-> red spectrum based on confidence.
  const [start, end] = getStartEnd(symbol.boundingBox);
  ctx.strokeStyle = 'blue';
  ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);

  const blue = 256 * symbol.confidence;
  const red = 256 - blue;
  ctx.fillStyle = `rgba(${red}, 0, ${blue}, 0.2)`;
  ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
}

/** Copies the annotation box's text into the textarea. */
function processClick(event) {
  let lastSymbol; // Since boxes may overlap, use the last one.
  for (const symbol of symbols) {
    const [start, end] = getStartEnd(symbol.boundingBox);
    if (start.x <= event.offsetX && event.offsetX <= end.x &&
      start.y <= event.offsetY && event.offsetY <= end.y) {
      lastSymbol = symbol;
    }
  }
  splitSong(lastSymbol, lastSymbol.parent);
  lyricsTextField.value = printSong();
}

const songLines = [];
const songBreaks = [];

function splitSong(symbol, line) {
  if (!songLines.includes(line)) {
    songLines.push(line);
  }
  songBreaks.push(symbol);
}

function printSong() {
  let output = "";
  for (const line of songLines) {
    for (const symbol of line.symbols) {
      if (!songBreaks.includes(symbol)) {
        output += symbol.text;
      } else {
        output += "\n";
      }
    }
  }
  return output;
}

/** Convert a OCR rectangle into a pair of points. */
function getStartEnd(boundingPoly) {
  function helper(axis, func) {
    let result = boundingPoly.vertices[0][axis];
    for (let i = 1; i < 4; i++) {
      const current = boundingPoly.vertices[i][axis];
      result = func(result, current);
    }
    return result;
  }

  const minX = helper('x', Math.min);
  const minY = helper('y', Math.min);
  const maxX = helper('x', Math.max);
  const maxY = helper('y', Math.max);

  return [{ x: minX, y: minY }, { x: maxX, y: maxY }];
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
