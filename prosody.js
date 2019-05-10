import { buildLines } from "./lines.js";

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
