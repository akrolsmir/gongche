import { RHYME_MAP } from './assets/rhyme_dictionary.js';
import { getQuarters } from './sheet.js';

// TODO deduplicate from sheet.js
export const gongcheToJianpu = {
  合: '5.',
  四: '6.',
  一: '7.',
  上: '1',
  尺: '2',
  工: '3',
  凡: '4',
  六: '5',
  五: '6',
  乙: '7',
  仩: "1'",
  伬: "2'",
  仜: "3'",
};

export const jianpuToOffset = {
  '5.': -3,
  '6.': -2,
  '7.': -1,
  '1': 0,
  '2': 1,
  '3': 2,
  '4': 3,
  '5': 4,
  '6': 5,
  '7': 6,
  "1'": 7,
  "2'": 8,
  "3'": 9,
};

// Mapping from jianpu to single char for string manipulation.
const jianpuToChar = {
  '5.': 'g',
  '6.': 'a',
  '7.': 'b',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  "1'": 'C',
  "2'": 'D',
  "3'": 'E',
};

const charToJianpu = {};
for (let jianpu in jianpuToChar) {
  const char = jianpuToChar[jianpu];
  charToJianpu[char] = jianpu;
}

export function encodeJianpu(jianpu) {
  let result = '';
  for (let i = 0; i < jianpu.length; i++) {
    if (i + 1 < jianpu.length) {
      const two = jianpu[i] + jianpu[i + 1];
      if (two in jianpuToChar) {
        result += jianpuToChar[two];
        i++;
        continue;
      }
    }
    const one = jianpu[i];
    result += one in jianpuToChar ? jianpuToChar[one] : one;
  }
  return result;
}

export function decodeToJianpu(chars) {
  let result = '';
  for (const char of chars) {
    result += char in charToJianpu ? charToJianpu[char] : char;
  }
  return result;
}

const beatSymbols = ['、', '。', '_', '▯', 'L', '﹆', '╚'];

function parseMelodyChunk(melodyChunk, lastOffset) {
  if (!melodyChunk) {
    return [{}, 0];
  }
  const melody = [];
  const beats = [];
  const contours = [];
  for (const char of melodyChunk) {
    if (beatSymbols.includes(char)) {
      beats.push(char);
    } else if (char in gongcheToJianpu) {
      melody.push(gongcheToJianpu[char]);
      const offset = jianpuToOffset[gongcheToJianpu[char]];
      // Explicit check against undefined, since 0 is a valid offset value.
      contours.push(lastOffset == undefined ? 0 : offset - lastOffset);
      lastOffset = offset;
    }
  }
  return [
    {
      beats: beats.join(' '),
      melody: melody.join(' '),
      contour: contours.map((r) => (r <= 0 ? '' : '+') + r).join(' '),
      firstNote: melody[0],
      lastNote: melody[melody.length - 1],
    },
    lastOffset,
  ];
}

class Line {
  constructor(song, index, padded = true) {
    // Array of {lyric, pronounce, tone, yinyang, beats, melody, padding}
    this.words = [];
    this.song = song;
    this.index = index;
    // Whether to count padding words in analysis
    this.padded = padded;
  }

  getWords() {
    return this.padded
      ? this.words
      : this.words.filter((word) => !word.padding);
  }
}

/**
  @returns an array of lines for the input song.
*/
export function buildLines(song, padded = true, quartered = false) {
  let melodyIndex = 0;
  let melodyChunks = song.melody.split(' ');
  const lines = [];
  let lineCount = 1;
  let line = new Line(song, lineCount, padded);
  let lastOffset;
  let melodyObject;
  let padding = false;
  let songQuarters = quartered ? getQuarters(song) : null;
  for (let i = 0; i < song.fullLyrics.length; i++) {
    const lyric = song.fullLyrics[i];
    if (lyric == '_') {
      // Remember that next character is padding.
      padding = true;
    } else if (lyric != '\n' && lyric != ',' && lyric != '.') {
      const rhyme = RHYME_MAP[lyric] ? RHYME_MAP[lyric] : [, , , , ,];
      const [file, char, south, north, yinyang, tone] = rhyme;
      const word = { lyric, yinyang, tone, padding };
      padding = false;
      word.pronounce = song.region == 'North' ? north : south;
      if (tone != null && tone.includes('/')) {
        // Tones of the form "入/上" should be chosen based on region ("S/N")
        const [southTone, northTone] = tone.split('/');
        word.tone = song.region == 'North' ? northTone : southTone;
      }
      // Lyrics followed by '.' are rhymes.
      if (i < song.fullLyrics.length - 1 && song.fullLyrics[i + 1] == '.') {
        word.rhyme = file ? file : 'MISSING_RHYME_ENTRY';
      }
      // Parse the beats and jianpu, and copy into word object.
      [melodyObject, lastOffset] = parseMelodyChunk(
        melodyChunks[melodyIndex],
        lastOffset
      );
      Object.assign(word, melodyObject);
      word.quarters = songQuarters ? songQuarters[melodyIndex] : 0;
      melodyIndex++;
      line.words.push(word);
    } else if (lyric == '\n') {
      lines.push(line);
      lineCount++;
      line = new Line(song, lineCount, padded);
    } else if (lyric == ',' || lyric == '.') {
      line.end = lyric;
    }
  }
  if (line.words.length > 0) {
    // Add the last line even if there's no terminating newline
    lines.push(line);
  }
  return lines;
}
