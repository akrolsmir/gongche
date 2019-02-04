VF = Vex.Flow;

class Note {
  constructor(gongche) {
    this.gongche = gongche;
    this.duration;
    this.lyricGroup;
  }
  getLyric() {
    const index = this.lyricGroup.children.indexOf(this);
    return index == 0 ? this.lyricGroup.lyric : ' ';
  }
  setDuration(duration) {
    this.duration = duration;
    let jianpu = gongcheToJianpu[this.gongche];
    const key = jianpuToKey(jianpu, vueApp.keySignature);

    this.melodyNote = makeStaveNote(key, this.duration);
    this.lyricsNote = makeTextNote(this.getLyric(), 16, this.duration);

    // If shifted by an octave, add a dot above or below.
    this.jianpuOctave = makeTextNote(' ', 12, this.duration);
    if (jianpu.startsWith('.')) {
      this.jianpuOctave = makeTextNote('•', 10.5, this.duration);
    }
    if (jianpu.endsWith('.')) {
      this.jianpuOctave = makeTextNote('•', 13.5, this.duration);
    }

    // Append dashes, or (double) underline to indicate note length.
    this.jianpuLength = makeTextNote(' ', 12, this.duration);
    jianpu = jianpu.replace('.', '');
    if (this.duration == '1') {
      jianpu = jianpu + ' - - -';
    } else if (this.duration == '2') {
      jianpu = jianpu + ' -';
    } else if (this.duration == '8') {
      this.jianpuLength = makeTextNote('_', 12, this.duration);
    } else if (this.duration == '16') {
      this.jianpuLength = makeTextNote('‗', 12, this.duration);
    }
    this.jianpuNote = makeTextNote(jianpu, 12, this.duration);
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
    this.jianpuLength = makeTextNote(' ', 12, this.duration);
    this.jianpuOctave = makeTextNote(' ', 12, this.duration);
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

const TimeSignature = {
  FOUR_FOUR: "four_four",
  EIGHT_FOUR: "eight_four",
  FREE: "free",
}

const BAR = '|';

const gongcheToJianpu = {
  "合": "5.",
  "四": "6.",
  "一": "7.",
  "上": "1",
  "尺": "2",
  "工": "3",
  "凡": "4",
  "六": "5",
  "五": "6",
  "乙": "7",
  "仩": ".1",
  "伬": ".2",
  "仜": ".3",
}

const jianpuToOffset = {
  "5.": -3,
  "6.": -2,
  "7.": -1,
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
  "7": 6,
  ".1": 7,
  ".2": 8,
  ".3": 9,
}

function jianpuToKey(jianpu, keySignature) {
  const PITCHES = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];

  // E.g. "c/1" = 0, "b/1" = 1, "c/2" = 7...
  function keyToCode(pitch, octave) {
    return PITCHES.indexOf(pitch) + octave * 7;
  }
  function codeToKey(code) {
    return `${PITCHES[code % 7]}/${Math.floor(code / 7)}`;
  }

  const signaturePitch = keySignature[0].toLowerCase();
  const signatureCode = keyToCode(signaturePitch, 4);
  const code = signatureCode + jianpuToOffset[jianpu];
  return codeToKey(code);
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

function makeStave(index, timeSignature) {
  const stave = new VF.Stave(10, 200 * index, 800);
  stave.addClef("treble").addKeySignature(vueApp.keySignature);
  if (timeSignature == TimeSignature.FOUR_FOUR) {
    stave.addTimeSignature("4/4");
  } else if (timeSignature == TimeSignature.EIGHT_FOUR) {
    stave.addTimeSignature("8/4");
  }
  stave.setContext(vexflowContext).draw();
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
    .setContext(vexflowContext);
}

// Output: [ [Note, Note, BarNote, Note, ...], ... ]
function splitStaves(notes, timeSignature) {
  const BARS_PER_STAVE = {};
  BARS_PER_STAVE[TimeSignature.FOUR_FOUR] = 4;
  BARS_PER_STAVE[TimeSignature.EIGHT_FOUR] = 4;
  BARS_PER_STAVE[TimeSignature.FREE] = 2;

  let stave = [];
  let staves = [];
  let barCount = 0;
  for (note of notes) {
    if (note == BAR) {
      barCount++;
      if (barCount == BARS_PER_STAVE[timeSignature]) {
        // We reached our max number of bars in this stave, so tart a new one.
        barCount = 0;
        staves.push(stave);
        stave = [];
      } else {
        // Mark a new measure
        stave.push(new VF.BarNote());
      }
    } else {
      stave.push(note);
    }
  }
  // Include the final stave if it's not empty.
  if (stave.length > 0) {
    staves.push(stave);
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

    const voiceGroup =
      ["melodyNote", "jianpuNote", "jianpuOctave", "jianpuLength", "lyricsNote"]
        .map(voiceName => 
          new VF.Voice({ num_beats: beats, beat_value: 4 })
            .addTickables(getTickables(stave, voiceName)));

    voices.push(voiceGroup);
  }
  return voices;
}

function getTimeSignature(melody) {
  if (melody.includes("﹆") || melody.includes("╚")) {
    return TimeSignature.EIGHT_FOUR;
  }
  if (melody.includes("、")) {
    return TimeSignature.FOUR_FOUR;
  }
  return TimeSignature.FREE;
}

function renderSheet(lyrics, melody) {
  const timeSignature = getTimeSignature(melody);
  const quarters = assignLyrics(melody, lyrics)
  const rhythmized = rhythmize(quarters, timeSignature);
  const modelStaves = splitStaves(rhythmized, timeSignature);
  const voices = makeVoices(modelStaves);

  for (let i = 0; i < voices.length; i++) {
    const voiceGroup = voices[i];
    const melodyVoice = voiceGroup[0];

    // Automatically beam the notes.
    const beams = VF.Beam.generateBeams(melodyVoice.getTickables());

    // Make the stave, then format and draw voices on it.
    const vexflowStave = makeStave(i, timeSignature);
    new VF.Formatter()
      .joinVoices(voiceGroup)
      .formatToStave(voiceGroup, vexflowStave);
    for (voice of voiceGroup) {
      voice.draw(vexflowContext, vexflowStave);
    }

    // Draw the beams
    beams.forEach(beam => beam.setContext(vexflowContext).draw());
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
  curves.forEach(curve => curve.setContext(vexflowContext).draw());
}

// We do this globally because TextNote needs a global context.
// TODO: See if we can remove that global context.
// Create an SVG renderer and attach it to the DIV element named "vexflow".
const vexflowDiv = document.getElementById("vexflow")
const vexflowRenderer = new VF.Renderer(vexflowDiv, VF.Renderer.Backends.SVG);
// Size our svg:
vexflowRenderer.resize(900, 2500);
// And get a drawing context:
const vexflowContext = vexflowRenderer.getContext();
let vueApp;

main();

async function main() {
  const urlParams = new URLSearchParams(window.location.search);
  let songId = urlParams.get('songId');
  songId = songId ? songId : "6584.1";

  const [songs, songsById] = await getSongTables();
  const song = songs[songsById[songId]];

  vueApp = new Vue({
    el: '.songdata',
    data: {
      song: song,
      keySignature: 'D',
      signatures: Object.keys(VF.keySignature.keySpecs)
    },
    watch: {
      keySignature: function(oldSignature, newSignature) {
        vexflowContext.clear();
        renderSheet(song.lyrics, song.melody);
      }
    }
  });
  renderSheet(song.lyrics, song.melody);
}
