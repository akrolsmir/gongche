import { RHYME_MAP } from "./assets/rhyme_dictionary.js";

// TODO deduplicate from sheet.js
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

const beatSymbols = [ "、", "。"];

const rowHeaders = [
  {id: 'lyric', display: '字'},
  {id: 'pronounce', display: '字音'},
  {id: 'tone', display: '聲調'},
  {id: 'yinyang', display: '陰陽'},
  {id: 'beats', display: '板眼'},
  {id: 'melody', display: '簡譜音高'},
  // How much a note is offset relative to previous note.
  {id: 'difference', display: 'difference'} 
]

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

/** @returns the lines of these songs, zipped (all line 1s, then 2s, 3s...) */
function interleaveLines(songs) {
  const result = [];
  const unzippedLines = songs.map(buildLines);
  const maxLength = Math.max(...unzippedLines.map(batch => batch.length));
  for (let i = 0; i < maxLength; i++) {
    for (const lines of unzippedLines) {
      if (lines[i]) {
        result.push(lines[i]);
      }
    }
  }
  return result;
}

/**
  @returns an array of lines for the input song.
  Line object: { song: {...}, index: 0, words: [
    {lyric, pronounce, tone, yinyang, beats, melody}, ...
  ]}
*/
function buildLines(song) {
  let melodyIndex = 0;
  let melodyChunks = song.melody.split(' ');
  const lines = [];
  let lineCount = 1;
  let line = { words: [], song, index: lineCount };
  let lastOffset;
  let melodyObject;
  for (const lyric of song.lyrics) {
    if (lyric != '\n') {
      const rhyme = RHYME_MAP[lyric] ? RHYME_MAP[lyric] : [,,,,,];
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
  return lines;
}

function tableStyle(song) {
  // From https://stackoverflow.com/a/7616484/1222351
  function hashString(str) {
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
  // Reverse the string, to generate wider color ranges over small sigdigits.
  const seed = hashString(song.id.split('').reverse().join(''));
  // Set opacity to be #66 to keep text readable.
  return `background-color: ${randomColor({ seed }) + '66'}`;
}

main();

async function main() {
  const [songs, songsById] = await getSongTables();

  const urlParams = new URLSearchParams(window.location.search);
  let songId = urlParams.get('songId');
  songId = songId ? songId : "6584.1,6584.2";
  const ids = songId.split(',')

  let songTitle = urlParams.get('songTitle');
  let rawSongs;
  let pageTitle;
  if (songTitle) {
    rawSongs = songs.filter(song => song.title == songTitle);
    pageTitle = songTitle;
  } else {
    rawSongs = ids.map(id => songs[songsById[id]]);
    pageTitle = 'IDs: ' + ids;
  }

  const vueApp = new Vue({
    el: '.songdata',
    data: {
      tableStyle,
      rowHeaders,
      rawSongs,
      pageTitle,
      interleave: true,
      checkedHeaders: rowHeaders.map(h => h.id)
    },
    computed: {
      filteredHeaders () {
        return rowHeaders.filter(h => this.checkedHeaders.includes(h.id));
      },
      lines() {
        return this.interleave 
          ? interleaveLines(this.rawSongs) : this.rawSongs.flatMap(buildLines);
      }
    }
  });
}
