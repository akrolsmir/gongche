import { RHYME_MAP } from "./assets/rhyme_dictionary.js";

// TODO deduplicate from sheet.js
export const gongcheToJianpu = {
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
  "仩": "1'",
  "伬": "2'",
  "仜": "3'",
}

export const jianpuToOffset = {
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
  "1'": 7,
  "2'": 8,
  "3'": 9,
}

// Mapping from jianpu to single char for string manipulation.
const jianpuToChar = {
  "5.": "g",
  "6.": "a",
  "7.": "b",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "1'": "C",
  "2'": "D",
  "3'": "E",
}

const charToJianpu = {};
for (let jianpu in jianpuToChar) {
  const char = jianpuToChar[jianpu];
  charToJianpu[char] = jianpu;
}

export function encodeJianpu(jianpu) {
  let result = "";
  for (let i = 0; i < jianpu.length; i++) {
    if (i + 1 < jianpu.length) {
      const two = jianpu[i] + jianpu[i + 1];
      if (two in jianpuToChar) {
        result += jianpuToChar[two]
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

const beatSymbols = ["、", "。", "_",  "▯",  "L",  "﹆",  "╚"];


function parseMelodyChunk(melodyChunk, lastOffset) {
  if (!melodyChunk) {
    return [{}, 0];
  }
  const melody = [];
  const beats = [];
  const differences = [];
  for (const char of melodyChunk) {
    if (beatSymbols.includes(char)) {
      beats.push(char);
    }
    else if (char in gongcheToJianpu) {
      melody.push(gongcheToJianpu[char]);
      const offset = jianpuToOffset[gongcheToJianpu[char]];
      // Explicit check against undefined, since 0 is a valid offset value.
      differences.push(lastOffset == undefined ? 0 : offset - lastOffset);
      lastOffset = offset;
    }
  }
  return [{
    beats: beats.join(' '),
    melody: melody.join(' '),
    difference: differences.map(r => (r <= 0 ? '' : '+') + r).join(' ')
  }, lastOffset];
}

/**
  @returns an array of lines for the input song.
  Line object: { song: {...}, index: 0, words: [
    {lyric, pronounce, tone, yinyang, beats, melody}, ...
  ]}
*/
export function buildLines(song) {
  let melodyIndex = 0;
  let melodyChunks = song.melody.split(' ');
  const lines = [];
  let lineCount = 1;
  let line = { words: [], song, index: lineCount };
  let lastOffset;
  let melodyObject;
  for (const lyric of song.lyrics) {
    if (lyric != '\n') {
      const rhyme = RHYME_MAP[lyric] ? RHYME_MAP[lyric] : [, , , , ,];
      const [file, char, south, north, yinyang, tone] = rhyme;
      const word = { lyric, yinyang, tone };
      word.pronounce = song.region == 'North' ? north : south;
      // Parse the beats and jianpu, and copy into word object.
      [melodyObject, lastOffset] = parseMelodyChunk(melodyChunks[melodyIndex], lastOffset);
      Object.assign(word, melodyObject);
      melodyIndex++;
      line.words.push(word);
    }
    else {
      lines.push(line);
      lineCount++;
      line = { words: [], song, index: lineCount };
    }
  }
  if (line.words.length > 0) {
    // Add the last line even if there's no terminating newline
    lines.push(line);
  }
  return lines;
}
