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
var stave = new VF.Stave(10, 40, 500);
var stave2 = new VF.Stave(410, 40, 400);
var stave3 = new VF.Stave(10, 200, 400);
var stave4 = new VF.Stave(410, 200, 400);


// Add a clef and time signature.
stave.addClef("treble").addTimeSignature("4/4");

// Connect it to the rendering context and draw!
stave.setContext(context).draw();
// stave2.setContext(context).draw();
stave3.setContext(context).draw();
// stave4.setContext(context).draw();

function makeAnnotation(text) {
  return new VF.Annotation(text)
    .setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM);
}

function makeNote(key) {
  return new VF.StaveNote({clef: "treble", keys: [key], duration: "q"});
}

function makeText(text, line) {
  return new VF.TextNote({
    text: text,
    duration: 'q'
  })
    .setLine(line ? line : 12)
    .setStave(stave);
}

var notes =[
makeNote("c/5"),
makeNote("d/5"),
makeNote("f/4"),
makeNote("c/5"),
new VF.BarNote(),
makeNote("e/5"),
makeNote("f/4"),
makeNote("d/5"),
makeNote("f/4"),
];

var notes2 = [
  makeText("c/55555"),
  makeText("d/5"),
  makeText("f/4"),
  makeText("c/555"),
  new VF.BarNote(),
  makeText("e/5"),
  makeText("f/4"),
  makeText("d/5555555"),
  makeText("f/4"),
];

var notes3 = [
  makeText("堯", 16),
  makeText("算", 16),
  makeText("欣", 16),
  makeText("逢", 16),
  new VF.BarNote(),
  makeText("照", 16),
  makeText("照", 16),
  makeText("照", 16),
  makeText("照", 16),
];

// Create a voice in 4/4 and add above notes
var voice = new VF.Voice({ num_beats: 8, beat_value: 4 });
voice.addTickables(notes);

var voice2 = new VF.Voice({ num_beats: 8, beat_value: 4 });
voice2.addTickables(notes2);

var voice3 = new VF.Voice({ num_beats: 8, beat_value: 4 });
voice3.addTickables(notes3);

// Format and justify the notes to 400 pixels.
var formatter = new VF.Formatter()
  .joinVoices([voice, voice2, voice3])
  .format([voice, voice2, voice3], 400);

// Render voice
voice.draw(context, stave);
voice2.draw(context, stave);
voice3.draw(context, stave);
