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

const gongcheToJianpu = {
  "一": "7.",
  "四": "6.",
  "合": "5.",
  "上": "1",
  "尺": "2",
  "工": "3",
  "凡": "4",
  "六": "5",
  "五": "6",
  "乙": "7",
}

// TODO replace with function for key signature
const jianpuToKey = {
  "5.": "a/3",
  "6.": "b/3",
  "7.": "c/4",
  "1": "d/4",
  "2": "e/4",
  "3": "f/4",
  "4": "g/4",
  "5": "a/4",
  "6": "b/4",
  "7": "c/5",
}

// Right now, output up a list of quarter notes
// Format: [[gongche, lyric], ...]
function buildQuarters(melody, lyrics) {
  const unspacedLyrics = lyrics.replace(/\s/g, '');
  let lyricIndex = 0;
  let currentLyric = unspacedLyrics[lyricIndex];
  const result = [];
  for (char of melody) {
    if (char == ' ') {
      lyricIndex++;
      currentLyric = unspacedLyrics[lyricIndex];
    } else if (char in gongcheToJianpu) {
      result.push([char, currentLyric]);
      currentLyric = '-';
    }
  }
  return result;
}

function makeStave(index) {
  const stave = new VF.Stave(10, 40 + 200 * index, 800);
  stave.addClef("treble").addTimeSignature("4/4").addKeySignature("D");
  stave.setContext(context).draw();
  return stave;
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
    // TODO Is the stave important here? Might be overwritten later.
    .setStave(staves[0]);
}

// Output: [ [melody1, jianpu1, lyrics1], ... ]
function makeNotes(quarters) {
  let results = [];
  let melodyNotes = [];
  let jianpuNotes = [];
  let lyricsNotes = [];
  for (let i = 0; i < quarters.length; i++) {
    // Create a new stave every 20 notes.
    if (i % 20 == 0) {
      melodyNotes = [];
      jianpuNotes = [];
      lyricsNotes = [];
      results.push([melodyNotes, jianpuNotes, lyricsNotes])
    }
    const [gongche, lyric] = quarters[i];
    const jianpu = gongcheToJianpu[gongche];
    const key = jianpuToKey[jianpu];
    melodyNotes.push(makeNote(key));
    jianpuNotes.push(makeText(jianpu));
    lyricsNotes.push(makeText(lyric, 16));
    // Add a BarNote after every 4th note (but not at the end of a stave).
    if (i % 4 == 3 && i % 20 != 19) {
      melodyNotes.push(new VF.BarNote());
      jianpuNotes.push(new VF.BarNote());
      lyricsNotes.push(new VF.BarNote());
    }
  }
  return results;
}

// Return the number of non-BarNotes.
function countBeats(notes) {
  let count = 0;
  for (note of notes) {
    if (note.attrs.type != "BarNote") {
      count++;
    }
  }
  return count;
}

// Output: [ [melodyVoice1, jianpuVoice1, lyricsVoice1], ...]
function makeVoices(notes) {
  const voices = [];
  const i = 0;
  for (const [melodyNotes, jianpuNotes, lyricsNotes] of notes) {
    const beats = countBeats(melodyNotes);

    var melodyVoice = new VF.Voice({ num_beats: beats, beat_value: 4 });
    melodyVoice.addTickables(melodyNotes);

    var jianpuVoice = new VF.Voice({ num_beats: beats, beat_value: 4 });
    jianpuVoice.addTickables(jianpuNotes);

    var lyricsVoice = new VF.Voice({ num_beats: beats, beat_value: 4 });
    lyricsVoice.addTickables(lyricsNotes);

    voices.push([melodyVoice, jianpuVoice, lyricsVoice]);
  }
  return voices;
}

// Create an SVG renderer and attach it to the DIV element named "boo".
var div = document.getElementById("boo")
var renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);

// Size our svg:
renderer.resize(2500, 2500);

// And get a drawing context:
var context = renderer.getContext();

// For some reason, we need to attach the TextNotes to some stave at init time,
// so start by creating the first stave.
const staves = [makeStave(0)];

const quarters = buildQuarters(testMelody, testLyrics)
const notes = makeNotes(quarters);
const voices = makeVoices(notes);

// Now create all the needed staves. 
for (let i = 1; i < voices.length; i++) {
  staves.push(makeStave(i));
}


for (let i = 0; i < voices.length; i++) {
  // Format and justify the notes to 400 pixels.
  var formatter = new VF.Formatter()
    .joinVoices(voices[i])
    .format(voices[i], 700);

  // Render the voices on each stave.
  const [melodyVoice, jianpuVoice, lyricsVoice] = voices[i]
  melodyVoice.draw(context, staves[i]);
  jianpuVoice.draw(context, staves[i]);
  lyricsVoice.draw(context, staves[i]);
}
