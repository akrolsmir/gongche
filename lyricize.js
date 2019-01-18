const canvas = document.getElementById('canvas');
const lyricsTextField = document.getElementById('lyrics');
const ctx = canvas.getContext('2d');
// Google's OCR boxes are a little offset from the PDF.
const UI_VERTICAL_OFFSET = -15;

let lines = [];
let symbols = [];

function analyze() {
  // TODO: drawSeparators is slow (~300ms). Optimize or move to async.
  drawSeparators(ctx);
  requestOcr(canvas).then(json => saveOcrResults(json));
  lyricsTextField.placeholder = 'Click on boxes around 句/韻/押';
}

function saveOcrResults(json) {
  symbols = [];
  lines = [];
  const fullTextAnnotations = json.responses[0].fullTextAnnotation;
  const page = fullTextAnnotations.pages[0];
  for (const block of page.blocks) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.words) {
        let lineContainsChinese = false;

        for (const symbol of line.symbols) {
          if (symbol.text.match(/[\u3400-\u9FBF]/)) {
            // If it's a Chinese symbol, remember its line and save it.
            symbol.parent = line;
            symbols.push(symbol);
            lineContainsChinese = true;
          }
        }
        if (lineContainsChinese) {
          lines.push(line);
        }
      }
    }
  }
  drawUiLayer();
}

/** 
 * Draw boxes for annotations and selected lyrics.
 * @var melodyIndex If provided, highlight the current melody symbol.
 */
function drawUiLayer(melodyIndex = -1, showAnnotations = true) {
  // Create a hidden UI layer to stage changes
  const uiCanvas = document.createElement('canvas');
  uiCanvas.width = canvas.width;
  uiCanvas.height = canvas.height;
  const uiCtx = uiCanvas.getContext('2d');

  if (showAnnotations) {
    // Draw gray box around each symbol
    for (const symbol of symbols) {
      const [start, end] = getStartEnd(symbol.boundingBox);
      uiCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      uiCtx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);      
    }
  }

  for (const line of songLines) {
    for (const symbol of line.symbols) {
      if (songBreaks.includes(symbol)) {
        // Color break symbols as green.
        uiCtx.fillStyle = 'rgba(0, 256, 0, 0.2)';
      } else if (0 <= melodyIndex && getSongSymbol(melodyIndex) == symbol) {
        // Color the current melody symbol as yellow.
        uiCtx.fillStyle = 'rgba(256, 256, 0, 0.2)';
      } else {
        // Color song symbols using blue <-> red spectrum, based on confidence.
        const blue = 256 * symbol.confidence;
        const red = 256 - blue;
        uiCtx.fillStyle = `rgba(${red}, 0, ${blue}, 0.2)`;
      }
      const [start, end] = getStartEnd(symbol.boundingBox);
      uiCtx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
    }
  }

  // Draw the layers from bottom to top.
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bgCanvas, 0, 0);
  ctx.drawImage(uiCanvas, 0, UI_VERTICAL_OFFSET);
}

/** Given a list of objects with boundingBoxes, find one containing (x, y). */
function intersect(x, y, objects) {
  for (const object of objects) {
    const [start, end] = getStartEnd(object.boundingBox);
    if (start.x <= x && x <= end.x && start.y <= y && y <= end.y) {
      return object;
    }
  }
}

/** Remember the clicked box as a break symbol. */
function processClick(event) {
  let x = event.offsetX;
  let y = event.offsetY - UI_VERTICAL_OFFSET
  let clickedSymbol = intersect(x, y, symbols);
  if (!clickedSymbol) {
    // Create a fake symbol to use as a pointer.
    // TODO: Handle break symbol above/below a line
    let line = intersect(x, y, lines);
    if (!line) {
      line = findNearestLine(x, y, lines);
    }
    clickedSymbol = makeFakeBreakSymbol(x, y, line);
    // Find where in the line to inject this symbol.
    let i = 0;
    for (; i < line.symbols.length; i++) {
      const symbol = line.symbols[i];
      const [start, end] = getStartEnd(symbol.boundingBox);
      if (y <= start.y) {
        break;
      }
    }
    line.symbols.splice(i, 0, clickedSymbol);
    // Also stick it into all symbols, for rendering.
    symbols.push(clickedSymbol);
  }
  if (songBreaks.includes(clickedSymbol)) {
    unsplitSong(clickedSymbol);
  } else {
    splitSong(clickedSymbol);
  }
  // TODO remove cross-dependency?
  lyricsTextField.value = songs[songIndex].lyrics + printSong();
  colorLyricsBackground();
  drawUiLayer();
}

function findNearestLine(xc, yc, lines) {
  for (const line of lines) {
    const [start, end] = getStartEnd(line.boundingBox);
    // Return any line in the same x range.
    // TODO: if multiple lines, return nearest by y?
    if (start.x <= xc && xc <= end.x) {
      return line;
    }
  }
  // TODO: Replace with exception
  alert('Could not find a line for this break symbol.');
}

function makeFakeBreakSymbol(xc, yc, line) {
  return {
    parent: line,
    text: 'fakebreak',
    boundingBox: {
      vertices: [ // Currently a 50 x 50 box.
        {x: xc - 25, y: yc - 25},
        {x: xc - 25, y: yc + 25},
        {x: xc + 25, y: yc + 25},
        {x: xc + 25, y: yc - 25},
      ]
    }
  }
}

let songLines = [];
let songBreaks = [];

function unsplitSong(symbol) {
  function remove(array, element) {
    array.splice(array.indexOf(element), 1);
  }

  remove(songBreaks, symbol);
  if (symbol.text == 'fakebreak') {
    remove(symbol.parent.symbols, symbol);
    remove(symbols, symbol);
  }
  let danglingParent = true;
  for (const child of symbol.parent.symbols) {
    if (songBreaks.includes(child)) {
      danglingParent = false;
    }
  }
  if (danglingParent) {
    remove(songLines, symbol.parent);
  }
}

function splitSong(symbol) {
  if (!songLines.includes(symbol.parent)) {
    songLines.push(symbol.parent);
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

function resetSong() {
  songLines = [];
  songBreaks = [];
}

/** Return the song symbol at the specified index, ignoring breaks.  */
function getSongSymbol(index) {
  let i = 0;
  for (const line of songLines) {
    for (const symbol of line.symbols) {
      if (songBreaks.includes(symbol)) {
        continue;
      }
      if (i == index) {
        return symbol;
      }
      i++;
    }
  }
}

/** 
 * Convert a OCR rectangle into a pair of points. 
 * See: https://cloud.google.com/vision/docs/reference/rest/v1/images/annotate#BoundingPoly
 */
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
