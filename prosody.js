import { RHYME_MAP } from "./assets/rhyme_dictionary.js";

/*
- Poem
  - Lines
    - Words
      - Dict: Pronounce, YinYang, Tone
      - Beat
      - Melody
*/

function buildPoem(melody, lyrics) {
  let melodyIndex = 0;
  let melodyChunks = melody.split(' ');
  const lines = [];
  let line = [];
  for (const lyric of lyrics) {
    if (lyric != '\n') {
      const rhyme = RHYME_MAP[lyric] ? RHYME_MAP[lyric] : [,,,,,];
      const [file, char, south, north, yinyang, tone] = rhyme;
      const word = { lyric, south, north, yinyang, tone };
      word.melodyChunk = melodyChunks[melodyIndex];
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
      poem: buildPoem(song.melody, song.lyrics)
    }
  });
}
