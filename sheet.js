import { RHYME_MAP } from './assets/rhyme_dictionary.js';
import { rhythmize, toLyricTimes } from './rhythmize.js';
import { skeletonize, countSixteenths } from './skeletonize.js';
import { schedulePlayback } from './playback.js';
import { gongcheToJianpu, jianpuToOffset } from './lines.js';
import { messages } from './assets/translations.js';
import { Song } from './models/song.js';

export class Note {
  constructor(gongche) {
    this.gongche = gongche;
    this.duration;
    this.lyricGroup;
  }
  // Only display lyric char on the first note in the group.
  getLyric() {
    const index = this.lyricGroup.children.indexOf(this);
    return index == 0 && this.lyricGroup.lyric ? this.lyricGroup.lyric : ' ';
  }
  // Same as above, but wrap padding lyrics in paranthesis.
  getPaddedLyric() {
    if (this.getLyric() != ' ' && this.lyricGroup.padding) {
      return `(${this.getLyric()})`;
    }
    return this.getLyric();
  }
  setDuration(duration) {
    this.duration = duration;
    if (window.VEXFLOW_HEADLESS) {
      return;
    }
    let jianpu = gongcheToJianpu[this.gongche];
    const key = jianpuToKey(jianpu, vueApp.keySignature);

    const lyricFont = {
      family: 'Noto Serif TC',
      size: this.lyricGroup.padding ? '10' : '14',
    };

    this.melodyNote = makeStaveNote(key, this.duration);
    this.lyricsNote = makeTextNote(
      this.getPaddedLyric(),
      16,
      this.duration,
      lyricFont
    );

    this.pronounceNote = makeTextNote(' ', 18, this.duration);
    if (this.getLyric() != ' ' && this.getLyric() in RHYME_MAP) {
      const rhyme = RHYME_MAP[this.getLyric()];
      const font = { family: 'Noto Serif TC', size: '10' };
      const index = vueApp.song.region == 'North' ? 3 : 2;
      this.pronounceNote = makeTextNote(rhyme[index], 18, this.duration, font);
    }

    // If shifted by an octave, add a dot above or below.
    this.jianpuOctave = makeTextNote(' ', 12, this.duration);
    if (jianpu.endsWith("'")) {
      this.jianpuOctave = makeTextNote('•', 10.5, this.duration);
    }
    if (jianpu.endsWith('.')) {
      this.jianpuOctave = makeTextNote('•', 13.5, this.duration);
    }

    // Append dashes, or (double) underline to indicate note length.
    const lengthFont = { size: '16' };
    this.jianpuLength = makeTextNote(' ', 12, this.duration);
    jianpu = jianpu.replace(/[\.']/g, '');
    if (this.duration == '1') {
      jianpu = jianpu + ' - - -';
    } else if (this.duration == '2') {
      jianpu = jianpu + ' -';
    } else if (this.duration == '8') {
      this.jianpuLength = makeTextNote('_', 12, this.duration, lengthFont);
    } else if (this.duration == '16') {
      this.jianpuLength = makeTextNote('‗', 12, this.duration, lengthFont);
    }
    const jianpuFont = { family: 'Noto Serif TC', size: '14' };
    this.jianpuNote = makeTextNote(jianpu, 12, this.duration, jianpuFont);
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

export class RestNote {
  constructor() {}
  getLyric() {
    return 'R';
  }
  getPaddedLyric() {
    return 'R';
  }
  setDuration(duration) {
    this.duration = duration;
    if (window.VEXFLOW_HEADLESS) {
      return;
    }
    this.melodyNote = makeStaveNote('b/4', this.duration + 'r');
    this.jianpuNote = makeTextNote('0', 12, this.duration, {
      family: 'Noto Serif TC',
      size: '14',
    });
    this.pronounceNote = makeTextNote(' ', 16, this.duration);
    this.lyricsNote = makeTextNote(' ', 16, this.duration);
    this.jianpuLength = makeTextNote(' ', 12, this.duration);
    this.jianpuOctave = makeTextNote(' ', 12, this.duration);
  }
}

export class LyricGroup {
  constructor(lyric, padding) {
    this.lyric = lyric;
    this.padding = padding;
    this.children = [];
  }
  addNote(note) {
    this.children.push(note);
    note.lyricGroup = this;
  }
}

export const TimeSignature = {
  FOUR_FOUR: 'four_four',
  EIGHT_FOUR: 'eight_four',
  FREE: 'free',
};

export const BAR = '|';

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

// Parse the lyric at the index, noting whether it is padding.
function makeLyricGroup(unspacedLyrics, index) {
  const padding = unspacedLyrics[index] == '_';
  if (padding) {
    index++;
  }
  return [index, new LyricGroup(unspacedLyrics[index], padding)];
}

// Assign a lyric to each gongche symbol
// Pass through other symbols unchanged
// Output: ['_', Note, Note, "."...]
function assignLyrics(melody, lyrics) {
  // Strip out spaces, periods and commas (but leave '_' padding markers)
  // Note: '_' has different meanings in lyrics vs melody
  const unspacedLyrics = lyrics.replace(/[\s.,]/g, '');
  let lyricIndex = 0,
    currentLyric = null;
  [lyricIndex, currentLyric] = makeLyricGroup(unspacedLyrics, lyricIndex);
  const result = [];
  for (const char of melody) {
    if (char == ' ') {
      lyricIndex++;
      [lyricIndex, currentLyric] = makeLyricGroup(unspacedLyrics, lyricIndex);
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
  stave.addClef('treble').addKeySignature(vueApp.keySignature);
  if (timeSignature == TimeSignature.FOUR_FOUR) {
    stave.addTimeSignature('4/4');
  } else if (timeSignature == TimeSignature.EIGHT_FOUR) {
    stave.addTimeSignature('8/4');
  }
  stave.setContext(vexflowContext).draw();
  return stave;
}

function makeStaveNote(key, duration) {
  return new VF.StaveNote({ clef: 'treble', keys: [key], duration: duration });
}

function makeTextNote(text, line, duration, font) {
  return new VF.TextNote({
    text: text,
    duration: duration,
    font: font,
  })
    .setLine(line)
    .setContext(vexflowContext);
}

// Output: [ [Note, Note, BarNote, Note, ...], ... ]
function splitStaves(notes) {
  // Ensure the notes end with a BAR, as needed by the split algorithm.
  if (notes[notes.length - 1] != BAR) {
    notes.push(BAR);
  }
  const MAX_NOTES_PER_STAVE = 24;
  const staves = [];
  let measure = [];
  let stave = [];
  for (const note of notes) {
    if (note == BAR) {
      if (measure.length + stave.length > MAX_NOTES_PER_STAVE) {
        // This measure should start a new stave
        staves.push(stave);
        stave = measure;
        if (measure.length > MAX_NOTES_PER_STAVE) {
          // This measure should also end its stave
          staves.push(stave);
          stave = [];
        }
      } else {
        // This measure should continue current stave.
        if (stave.length > 0) {
          stave.push(new VF.BarNote());
        }
        stave = stave.concat(measure);
      }
      measure = [];
    } else {
      measure.push(note);
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
  return Math.round(countSixteenths(notes) / 4);
}

// Output: [ [melodyVoice1, jianpuVoice1, lyricsVoice1], ...]
function makeVoices(staves) {
  // TODO ugly reflection hack
  function getTickables(stave, noteElement) {
    return stave.map((note) =>
      note[noteElement] ? note[noteElement] : new VF.BarNote()
    );
  }

  const voices = [];
  for (const stave of staves) {
    const beats = countQuarters(getTickables(stave, 'melodyNote'));

    const voiceGroup = [
      'melodyNote',
      'jianpuNote',
      'jianpuOctave',
      'jianpuLength',
      'lyricsNote',
      'pronounceNote',
    ].map((voiceName) =>
      new VF.Voice({ num_beats: beats, beat_value: 4 }).addTickables(
        getTickables(stave, voiceName)
      )
    );

    voices.push(voiceGroup);
  }
  return voices;
}

function getTimeSignature(melody) {
  if (melody.includes('﹆') || melody.includes('╚')) {
    return TimeSignature.EIGHT_FOUR;
  }
  if (melody.includes('、')) {
    return TimeSignature.FOUR_FOUR;
  }
  return TimeSignature.FREE;
}

function renderSheet(lyrics, melody) {
  vexflowContext.clear();
  const timeSignature = getTimeSignature(melody);
  const quarters = assignLyrics(melody, lyrics);
  let rhythmized = rhythmize(quarters, timeSignature);
  if (vueApp.skeletal == 'first') {
    rhythmized = skeletonize(rhythmized);
  } else if (vueApp.skeletal == 'last') {
    rhythmized = skeletonize(rhythmized, false);
  }
  const modelStaves = splitStaves(rhythmized);
  const voices = makeVoices(modelStaves);
  const playbackNotes = [];

  // Size the canvas now that we have a stave count.
  // Note: Only on first render call; resizing causes weird Vexflow behavior.
  if (!vexflowRenderer.ctx.width) {
    const canvasHeight = modelStaves.length * 200 + 100;
    vexflowRenderer.resize(850, canvasHeight);
  }

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
    for (const voice of voiceGroup) {
      if (voice != melodyVoice) {
        voice.draw(vexflowContext, vexflowStave);
      }
    }
    // Draw the melody voice separately, to keep references to the SVG groups.
    for (const melodyNote of melodyVoice.tickables) {
      melodyNote.svgGroup = vexflowContext.openGroup();
      melodyNote.setStave(vexflowStave);
      melodyNote.setContext(vexflowContext);
      melodyNote.draw();
      vexflowContext.closeGroup();
      playbackNotes.push(melodyNote);
    }
    // Draw the beams
    beams.forEach((beam) => beam.setContext(vexflowContext).draw());
  }

  // Find all lyric groups in order
  const allLyricGroups = [];
  for (const note of rhythmized) {
    if (note.lyricGroup && !allLyricGroups.includes(note.lyricGroup)) {
      allLyricGroups.push(note.lyricGroup);
    }
  }

  // For groups with more than 1 note, draw a slur from first to last.
  const curves = allLyricGroups
    .filter((lg) => lg.children.length > 1)
    .map(
      (lg) =>
        new VF.Curve(
          lg.children[0].melodyNote,
          lg.children[lg.children.length - 1].melodyNote
        )
    );
  curves.forEach((curve) => curve.setContext(vexflowContext).draw());

  schedulePlayback(playbackNotes, allLyricGroups, vueApp.keySignature);
}

async function main() {
  const urlParams = new URLSearchParams(window.location.search);
  let songId = urlParams.get('songId');
  songId = songId ? songId : '6584.1';

  const songJson = await loadSongJson(songId);
  const song = Song.fromJson(songJson);

  const i18n = new VueI18n({
    locale: 'en', // set locale
    messages, // set locale messages
  });

  vueApp = new Vue({
    i18n,
    el: '.songdata',
    data: {
      song,
      keySignature: 'D',
      signatures: Object.keys(VF.keySignature.keySpecs),
      toggle: '▶️',
      bpm: '120',
      skeletal: 'off',
    },
    methods: {
      toggleMusic(event) {
        if (this.toggle == '▶️') {
          Tone.Transport.start();
          this.toggle = '⏸️';
        } else if (this.toggle == '⏸️') {
          Tone.Transport.pause();
          this.toggle = '▶️';
        }
      },
      stopMusic(event) {
        Tone.Transport.stop();
        this.toggle = '▶️';
      },
    },
    watch: {
      bpm(newBpm) {
        Tone.Transport.bpm.value = newBpm;
      },
      keySignature: () => {
        renderSheet(song.fullLyrics, song.melody);
      },
      skeletal: () => {
        renderSheet(song.fullLyrics, song.melody);
      },
    },
  });
  try {
    renderSheet(song.fullLyrics, song.melody);
  } catch (e) {
    alert(e);
  }
}

export function getRhythmized(lyrics, melody) {
  const timeSignature = getTimeSignature(melody);
  const quarters = assignLyrics(melody, lyrics);
  return rhythmize(quarters, timeSignature);
}

/** Returns an array of each note's length in quarters (or null on an error) */
export function getQuarters(song) {
  try {
    return toLyricTimes(getRhythmized(song.fullLyrics, song.melody));
  } catch (error) {
    return null;
  }
}

// We do this globally because TextNote needs a global context.
// TODO: See if we can remove that global context.
let VF, vexflowRenderer, vexflowContext, vueApp;

// To load sheet.js to get melody breakdowns but without rendering, set:
// window.VEXFLOW_HEADLESS = true;
if (!window.VEXFLOW_HEADLESS) {
  VF = Vex.Flow;
  // Create an SVG renderer and attach it to the DIV element named "vexflow".
  const vexflowDiv = document.getElementById('vexflow');
  vexflowRenderer = new VF.Renderer(vexflowDiv, VF.Renderer.Backends.SVG);
  // And get a drawing context:
  vexflowContext = vexflowRenderer.getContext();
  main();
}
