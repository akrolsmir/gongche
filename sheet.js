VF = Vex.Flow;

class Note {
  constructor(gongche) {
    this.gongche = gongche;
    this.duration;
    this.lyricGroup;
  }
  getLyric() {
    const index = this.lyricGroup.children.indexOf(this);
    return index == 0 ? this.lyricGroup.lyric : '-';
  }
  setDuration(duration) {
    this.duration = duration;
    const jianpu = gongcheToJianpu[this.gongche];
    const key = jianpuToKey[jianpu];

    this.melodyNote = makeStaveNote(key, this.duration);
    this.jianpuNote = makeTextNote(jianpu, 12, this.duration);
    this.lyricsNote = makeTextNote(this.getLyric(), 16, this.duration);
  }
  getCopy() {
    const copy = new Note(this.gongche);
    if (this.lyricGroup) {
      this.lyricGroup.addNote(copy);
    }
    if (this.duration) {
      copy.setDuration(this.duration);
    }
    return copy;
  }
}

class RestNote {
  constructor() {
  }
  getLyric() {
    return "R";
  }
  setDuration(duration) {
    this.duration = duration;
    this.melodyNote = makeStaveNote("b/4", this.duration + 'r');
    this.jianpuNote = makeTextNote('0', 12, this.duration);
    this.lyricsNote = makeTextNote(' ', 16, this.duration);
  }
}

class LyricGroup {
  constructor(lyric) {
    this.lyric = lyric;
    this.children = [];
  }
  addNote(note) {
    this.children.push(note);
    note.lyricGroup = this;
  }
}

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

// Assign a lyric to each gongche symbol
// Pass through other symbols unchanged
// Output: ['_', Note, Note, "."...]
function assignLyrics(melody, lyrics) {
  const unspacedLyrics = lyrics.replace(/\s/g, '');
  let lyricIndex = 0;
  let currentLyric = new LyricGroup(unspacedLyrics[lyricIndex]);
  const result = [];
  for (char of melody) {
    if (char == ' ') {
      lyricIndex++;
      currentLyric = new LyricGroup(unspacedLyrics[lyricIndex]);
    } else if (char in gongcheToJianpu) {
      const note = new Note(char);
      currentLyric.addNote(note);
      result.push(note);
    } else {
      result.push(char);
    }
  }
  return result;
}

const BAR = '|';

function makeStave(index) {
  const stave = new VF.Stave(10, 40 + 200 * index, 800);
  stave.addClef("treble").addTimeSignature("4/4").addKeySignature("D");
  stave.setContext(context).draw();
  return stave;
}

function makeStaveNote(key, duration) {
  return new VF.StaveNote({clef: "treble", keys: [key], duration: duration});
}

function makeTextNote(text, line, duration) {
  return new VF.TextNote({
    text: text,
    duration: duration
  })
    .setLine(line)
    .setContext(context);
}

// Output: [ [melody1, jianpu1, lyrics1], ... ]
function splitStaves(notes) {
  let stave = [];
  let staves = [stave];
  let barCount = 0;
  for (note of notes) {
    if (note == BAR) {
      barCount++;
      if (barCount == 4) {
        // Create a new stave every 4 bars
        barCount = 0;
        stave = [];
        staves.push(stave);
      } else {
        // Mark a new measure
        stave.push(new VF.BarNote());
      }
    } else {
      stave.push(note);
    }
  }
  return staves;
}

// Return the number of quarter notes
function countQuarters(notes) {
  const durationToQuarters = {
    'b': 0, // Bar note has 0 length
    '16': 0.25,
    '8': 0.5,
    '4': 1,
    '2': 2,
    '1': 4
  }
  let count = 0;
  for (note of notes) {
    count += durationToQuarters[note.duration];
  }
  return Math.round(count);
}

// Output: [ [melodyVoice1, jianpuVoice1, lyricsVoice1], ...]
function makeVoices(staves) {
  // TODO ugly reflection hack
  function getTickables(stave, noteElement) {
    return stave.map(note => note[noteElement] ? note[noteElement] : new VF.BarNote());
  }

  const voices = [];
  for (const stave of staves) {
    const beats = countQuarters(getTickables(stave, 'melodyNote'));

    var melodyVoice = new VF.Voice({ num_beats: beats, beat_value: 4 });
    melodyVoice.addTickables(getTickables(stave, 'melodyNote'));

    var jianpuVoice = new VF.Voice({ num_beats: beats, beat_value: 4 });
    jianpuVoice.addTickables(getTickables(stave, 'jianpuNote'));

    var lyricsVoice = new VF.Voice({ num_beats: beats, beat_value: 4 });
    lyricsVoice.addTickables(getTickables(stave, 'lyricsNote'));

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

main();

async function main() {
  const urlParams = new URLSearchParams(window.location.search);
  let songId = urlParams.get('songId');
  songId = songId ? songId : "6584.1";

  const [songs, songsById] = await getSongTables();
  const song = songs[songsById[songId]];
  const testLyrics = song.lyrics;
  const testMelody = song.melody;
  
  const vueApp = new Vue({
    el: '.songdata',
    data: {
      song: song
    }
  });

  const quarters = assignLyrics(testMelody, testLyrics)
  const temp = rhythmize4(quarters);
  const modelStaves = splitStaves(temp);
  const voices = makeVoices(modelStaves);

  for (let i = 0; i < voices.length; i++) {
    const [melodyVoice, jianpuVoice, lyricsVoice] = voices[i];

    // Automatically beam the notes.
    var beams = VF.Beam.generateBeams(melodyVoice.getTickables());

    // Format and justify the notes.
    var formatter = new VF.Formatter()
      .joinVoices([melodyVoice, jianpuVoice, lyricsVoice])
      .format([melodyVoice, jianpuVoice, lyricsVoice], 700);

    // Make the stave and draw voices on it.
    const vexflowStave = makeStave(i);
    melodyVoice.draw(context, vexflowStave);
    jianpuVoice.draw(context, vexflowStave);
    lyricsVoice.draw(context, vexflowStave);

    // Draw the beams
    beams.forEach(beam => beam.setContext(context).draw());
  }

  // Find all lyric groups in order
  const allLyricGroups = [];
  for (const modelStave of modelStaves) {
    for (const note of modelStave) {
      if (note.lyricGroup && !allLyricGroups.includes(note.lyricGroup)) {
        allLyricGroups.push(note.lyricGroup);
      }
    }
  }

  // For groups with more than 1 note, draw a slur from first to last.
  const curves = allLyricGroups
    .filter(lg => lg.children.length > 1)
    .map(lg => new VF.Curve(
      lg.children[0].melodyNote,
      lg.children[lg.children.length - 1].melodyNote,
    ));
  curves.forEach(curve => curve.setContext(context).draw());
  
}
