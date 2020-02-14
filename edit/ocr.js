const OCR_URL = 'https://vision.googleapis.com/v1/images:annotate?key=AIzaSyA7ZlydINXmk61P2lz3sDi0ACSIwJEloUY';
function buildOcrRequest(base64) {
  return `{
  "requests": [
    {
      "image": {
        "content": "${base64}"
      },
      "features": [
        {
          "type": "DOCUMENT_TEXT_DETECTION"
        },
      ],
      "imageContext": {
        "languageHints": [
          "zh-TW"
        ]
      }
    }
  ]
}
`;
}

/** Upload the image from the canvas to OCR. */
export async function requestOcr(canvas) {
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
  const response = await fetch(OCR_URL, {
    method: 'POST',
    body: buildOcrRequest(base64),
    headers: { 'Content-Type': 'application/json' }
  });
  return await response.json();
}

/** Send right-click drag area to OCR. */
let downEvent;
export function mouseDown(e) {
  switch (e.which) {
    case 3: // Right mouse click
      downEvent = e;
  }
}

export function mouseUp(e) {
  switch (e.which) {
    case 3: // Right mouse click
      const snippet = document.getElementById('snippet');
      const snippetCtx = snippet.getContext('2d');
      const clipWidth = e.offsetX - downEvent.offsetX;
      const clipHeight = e.offsetY - downEvent.offsetY;
      // Resize the snippet canvas, then copy to it
      snippet.width = clipWidth;
      snippet.height = clipHeight
      snippetCtx.drawImage(canvas,
        // Source: x, y, width, hight
        downEvent.offsetX, downEvent.offsetY, clipWidth, clipHeight,
        // Destination: x, y, width, height
        0, 0, clipWidth, clipHeight);
      requestOcr(snippet)
        .then(json => {
          if (json.responses.length > 0) {
            const text = json.responses[0].textAnnotations[0].description;
            lyricsTextField.value += text; // TODO: Remove global ref
          }
        });
  }
}

/** Prevent right click menu from appearing. */
export function contextMenu(e) {
  e.preventDefault();
}
