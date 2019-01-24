VF = Vex.Flow;

const testLyrics = 
`堯算欣逢照代
普照恩光無外
萬方仁壽胁春臺
西魏祥隔淑爾
龍樓上瑞乙
端的是天漢宗派
又看蘭玉茵蔡枝
開到幾莖莫英
`

const testMelody =
`四上 、一四上 。六尺 工尺 、工 。尺上_ 。上尺 工尺 、工六工 。尺 、四尺 。上一四_ 尺。上一 四 、四上 。一四合 、上尺 。工尺 、上 。六 工尺 、上 尺 。四上一四 、合 。上 上尺 、六 六。工尺上 、一四合 。尺 上 尺 、工 尺。工尺 、上 。合凡工 。工六 工尺 、上尺 工尺。工 、合四 。上尺 、上 。工 工上一四 、工 合 。四上一四 、合`

// Create an SVG renderer and attach it to the DIV element named "boo".
var div = document.getElementById("boo")
var renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);

// Size our svg:
renderer.resize(1000, 1000);

// And get a drawing context:
var context = renderer.getContext();

// Create a stave at position 10, 40 of width 400 on the canvas.
var stave = new VF.Stave(10, 40, 400);

// Add a clef and time signature.
stave.addClef("treble").addTimeSignature("4/4");

// Connect it to the rendering context and draw!
stave.setContext(context).draw();

function makeAnnotation(text) {
  return new VF.Annotation(text)
    .setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM);
}

var notes = [
  // A quarter-note C.
  new VF.StaveNote({ clef: "treble", keys: ["c/4"], duration: "q" })
    .addAnnotation(0, makeAnnotation('hi')),

  // A quarter-note D.
  new VF.StaveNote({ clef: "treble", keys: ["d/5"], duration: "q" })
    .addAnnotation(0, makeAnnotation('bye')),

  // A quarter-note rest. Note that the key (b/4) specifies the vertical
  // position of the rest.
  new VF.StaveNote({ clef: "treble", keys: ["b/4"], duration: "qr" })
    .addAnnotation(0, makeAnnotation('try')),

  // A C-Major chord.
  new VF.StaveNote({ clef: "treble", keys: ["c/4", "e/4", "g/4"], duration: "q" })
];

// Create a lyric?
var text = new Vex.Flow.TextNote({
  text: "堯",
  font: {
    family: "Arial",
    size: 12,
    weight: ""
  },
  duration: 'h'
})
  .setLine(12)
  .setStave(stave);
  // .setJustification(Vex.Flow.TextNote.Justification.LEFT);
var text2 = new Vex.Flow.TextNote({
  text: "算 what's up",
  font: {
    family: "Comic Sans",
    size: 12,
    weight: ""
  },
  duration: 'h'
})
  .setLine(12)
  .setStave(stave);
  // .setJustification(Vex.Flow.TextNote.Justification.LEFT);
var voice2 = new VF.Voice({ num_beats: 4, beat_value: 4 });
voice2.addTickables([text, text2]);


// Create a voice in 4/4 and add above notes
var voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
voice.addTickables(notes);

// Format and justify the notes to 400 pixels.
var formatter = new VF.Formatter()
  .joinVoices([voice, voice2])
  .format([voice, voice2], 400);

// Render voice
voice.draw(context, stave);
// voice2.draw(context, stave);
text.setContext(context).draw();
text2.setContext(context)
  .draw();
