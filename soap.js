const canvas = document.getElementById('canvas');
const lyricsTextField = document.getElementById('lyrics');
const uiCanvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

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
      for (const word of paragraph.words) {
        lines.push(word);

        for (const symbol of word.symbols) {
          // Add a parent reference and save the symbol.
          symbol.parent = word;
          symbols.push(symbol);
        }
      }
    }
  }
  drawUiLayer();
}

function drawUiLayer() {
  // Clear out the UI layer
  const uiCtx = uiCanvas.getContext('2d');
  uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);

  // Draw empty green boxes around each line
  for (const line of lines) {
    const [start, end] = getStartEnd(line.boundingBox);
    uiCtx.strokeStyle = 'green';
    uiCtx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  }

  // Draw empty blue boxes around each symbol
  for (const symbol of symbols) {
    const [start, end] = getStartEnd(symbol.boundingBox);
    uiCtx.strokeStyle = 'blue';
    uiCtx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  }

  for (const line of songLines) {
    for (const symbol of line.symbols) {
      if (songBreaks.includes(symbol)) {
        // Color break symbols as green.
        uiCtx.fillStyle = 'rgba(0, 256, 0, 0.2)';
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
  ctx.drawImage(bgCanvas, 0, 0);
  ctx.drawImage(uiCanvas, 0, 0);
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
  let clickedSymbol = intersect(event.offsetX, event.offsetY, symbols);
  if (!clickedSymbol) {
    // TODO: Using words as line grouping may cause problems
    // (eg: if clicked outside word, or word is not parsed correctly).
    // Consider the vertical line approach.
    const line = intersect(event.offsetX, event.offsetY, lines);
    // Create a fake symbol to use as a pointer.
    clickedSymbol = { x: event.offsetX, y: event.offsetY, parent: line };
    // Find where in the line to inject this symbol.
    let i = 0;
    for (; i < line.symbols.length; i++) {
      const word = line.symbols[i];
      const [start, end] = getStartEnd(word.boundingBox);
      if (clickedSymbol.y <= start.y) {
        break;
      }
    }
    line.symbols.splice(i, 0, clickedSymbol);

  }
  splitSong(clickedSymbol, clickedSymbol.parent);
  lyricsTextField.value = printSong();
  drawUiLayer();
}

let songLines = [];
let songBreaks = [];

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
