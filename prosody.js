import { RHYME_MAP } from "./assets/rhyme_dictionary.js";

/*
- Poem
  - Lines
    - Words
      - Dict: Pronounce, YinYang, Tone
      - Beat
      - Melody
*/

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

const beatSymbols = [ "、", "。"];

const rowHeaders = [
  {id: 'lyric', display: '字'},
  {id: 'pronounce', display: '字音'},
  {id: 'tone', display: '聲調'},
  {id: 'yinyang', display: '陰陽'},
  {id: 'beats', display: '板眼'},
  {id: 'melody', display: '簡譜音高'}
]

function parseMelodyChunk(melodyChunk) {
  const melody = [];
  const beats = [];
  for (const char of melodyChunk) {
    if (beatSymbols.includes(char)) {
      beats.push(char);
    }
    else if (char in gongcheToJianpu) {
      melody.push(gongcheToJianpu[char]);
    }
  }
  return { beats: beats.join(' '), melody: melody.join(' ') };
}

function buildPoem(song) {
  let melodyIndex = 0;
  let melodyChunks = song.melody.split(' ');
  const lines = [];
  let line = [];
  for (const lyric of song.lyrics) {
    if (lyric != '\n') {
      const rhyme = RHYME_MAP[lyric] ? RHYME_MAP[lyric] : [,,,,,];
      const [file, char, south, north, yinyang, tone] = rhyme;
      const word = { lyric, yinyang, tone };
      word.pronounce = song.region == 'North' ? north : south;
      // Parse the beats and jianpu, and copy into word object.
      Object.assign(word, parseMelodyChunk(melodyChunks[melodyIndex]));
      melodyIndex++;
      line.push(word);
    }
    else {
      lines.push(line);
      line = [];
    }
  }
  return lines;
}

main();

async function main() {
  const urlParams = new URLSearchParams(window.location.search);
  let songId = urlParams.get('songId');
  songId = songId ? songId : "6584.1";

  const [songs, songsById] = await getSongTables();
  const song = songs[songsById[songId]];

  const vueApp = new Vue({
    el: '.songdata',
    data: {
      song,
      rowHeaders,
      poem: buildPoem(song),
      checkedHeaders: rowHeaders.map(h => h.id)
    },
    computed: {
      filteredHeaders () {
        return rowHeaders.filter(h => this.checkedHeaders.includes(h.id));
      }
    }
  });
}
