VF = Vex.Flow;

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
// Format: [[gongche, lyric], ...]
function assignLyrics(melody, lyrics) {
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
    } else {
      result.push(char);
    }
  }
  return result;
}

const BAR = '|';

// Output a list of notes parsed by length.
// Input: ['.', [g1, l1], ',', [...]...]
// Format: ['|', [gongche, lyric, length (whole = 1, half = 2...)]]
// Currently only works with . and ,
function assignLengths(input) {
  var output = [BAR]; // TODO use real marking object
  var symbols = ['。', '、'];
  const DOWNBEAT = '、';
  var symbolIndex = 1;
  var expectedSymbol = symbols[symbolIndex];
  var block = []
  for (let i = 0; i < input.length; i++) {
    var current = input[i];
    if (current == expectedSymbol) {
      // This marks the end of a block.
      // Find durations for notes in the current block
      const notesWithDurations = injectDurations(block);
      for (const note of notesWithDurations) {
        output.push(note);
      }
      if (current == DOWNBEAT) {
        output.push(BAR);
      }
      block = [];
      // Next expected should progress through symbols (circular linked list)
      symbolIndex = (symbolIndex + 1) % symbols.length;
      expectedSymbol = symbols[symbolIndex];
    } else {
      // Add any gongche notes to this current block
      if (typeof current == "object") {
        block.push(current);
      }
    }
  }
  return output;
}

// Input: [[gongche1, lyric1], ...]
// Output: [[gongche, lyric, length (whole = 1, half = 2...)], ...]
function injectDurations(quarters) {
  // console.log(quarters);
  if (quarters.length == 1) {
    const [q1] = quarters;
    q1.push('2') // HALF
    return [q1];
  }
  if (quarters.length == 2) {
    const [q1, q2] = quarters;
    q1.push('4'); // QUARTER
    q2.push('4');
    return [q1, q2];
  }
  if (quarters.length == 3) {
    const [q1, q2, q3] = quarters;
    q1.push('4'); // QUARTER
    q2.push('8'); // EIGHTH
    q3.push('8');
    return [q1, q2, q3];
  }
  if (quarters.length >= 4) {
    const [q1, q2, q3, q4] = quarters;
    q1.push('8'); // EIGHTH
    q2.push('8');
    q3.push('8');
    q4.push('8');
    return [q1, q2, q3, q4];
    // For now, drop the extra notes.
  }
  throw `Invalid input of length ${quarters.length}`
}



function makeStave(index) {
  const stave = new VF.Stave(10, 40 + 200 * index, 800);
  stave.addClef("treble").addTimeSignature("4/4").addKeySignature("D");
  stave.setContext(context).draw();
  return stave;
}

function makeNote(key, duration) {
  return new VF.StaveNote({clef: "treble", keys: [key], duration: duration});
}

function makeText(text, line, duration) {
  return new VF.TextNote({
    text: text,
    duration: duration
  })
    .setLine(line)
    // TODO Is the stave important here? Might be overwritten later.
    .setStave(staves[0]);
}

// Output: [ [melody1, jianpu1, lyrics1], ... ]
function prepareNotesForVoices(notes) {
  let melodyNotes = [];
  let jianpuNotes = [];
  let lyricsNotes = [];
  let results = [[melodyNotes, jianpuNotes, lyricsNotes]];
  let barCount = 0;
  for (note of notes) {
    if (note == BAR) {
      barCount++;
      if (barCount == 5) {
        // Create a new stave every 5 bars
        barCount = 0;
        melodyNotes = [];
        jianpuNotes = [];
        lyricsNotes = [];
        results.push([melodyNotes, jianpuNotes, lyricsNotes]);
      } else {
        // Mark a new measure
        melodyNotes.push(new VF.BarNote());
        jianpuNotes.push(new VF.BarNote());
        lyricsNotes.push(new VF.BarNote());
      }
    } else {
      const [gongche, lyric, duration] = note;
      const jianpu = gongcheToJianpu[gongche];
      const key = jianpuToKey[jianpu];
      melodyNotes.push(makeNote(key, duration));
      jianpuNotes.push(makeText(jianpu, 12, duration));
      lyricsNotes.push(makeText(lyric, 16, duration));
    }
  }
  return results;
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
function makeVoices(notes) {
  const voices = [];
  for (const [melodyNotes, jianpuNotes, lyricsNotes] of notes) {
    const beats = countQuarters(melodyNotes);

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

// main();

// async function main() {
//   const urlParams = new URLSearchParams(window.location.search);
//   let songId = urlParams.get('songId');
//   songId = songId ? songId : "6584.1";

//   const [songs, songsById] = await getSongTables();
//   const song = songs[songsById[songId]];
  // const testLyrics = song.lyrics;
  // const testMelody = song.melody;
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
  const testMelody = `四上 、一四上 。六尺 工尺 、工 。尺上_ 。上尺 工尺 、工六工 。尺 、四尺 。上一四_ 尺。上一 四 、四上 。一四合 、上尺 。工尺 、上 。六 工尺 、上 尺 。四上一四 、合 。上 上尺 、六 六。工尺上 、一四合 。尺 上 尺 、工 尺。工尺 、上 。合凡工 。工六 工尺 、上尺 工尺。工 、合四 。上尺 、上 。工 工上一四 、工 合 。四上一四 、合`;

  // const vueApp = new Vue({
  //   el: '.songdata',
  //   data: {
  //     song: song
  //   }
  // });

  const quarters = assignLyrics(testMelody, testLyrics)
  const notes = prepareNotesForVoices(assignLengths(quarters));
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
// }
