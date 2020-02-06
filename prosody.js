import { buildLines } from "./lines.js";
import { messages } from "./assets/translations.js";

const rowHeaders = ['lyric', 'pronounce', 'tone', 'yinyang', 'beats', 'melody', 'firstNote', 'lastNote', 'contour'];

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

  const i18n = new VueI18n({
    locale: 'en', // set locale
    messages, // set locale messages
  })

  const vueApp = new Vue({
    i18n,
    el: '.songdata',
    data: {
      tableStyle,
      rowHeaders,
      rawSongs,
      pageTitle,
      interleave: true,
      checkedHeaders: rowHeaders
    },
    computed: {
      filteredHeaders() {
        return rowHeaders.filter(h => this.checkedHeaders.includes(h));
      },
      lines() {
        return this.interleave
          ? interleaveLines(this.rawSongs) : this.rawSongs.flatMap(buildLines);
      }
    }
  });
}

Vue.component('prosody', {
  props: ['lines', 'headers', 'tableStyle'],
  template: `
  <div>
  <template v-for="line in lines">
    <table :style="tableStyle ? tableStyle(line.song) : ''">
      <tbody>
        <tr>
          <td style='text-align: center' :colspan='line.words.length + 1'>
            {{ $t('lineOf', {num: line.index, id: line.song.id})}}《{{ line.song.title }} - {{ line.song.composer }}》
          </td>
        </tr>
        <template v-for='header in headers'>
          <tr>
            <th>{{ $t(header) }}</th>
            <template v-for="word in line.words">
              <td :class='{padding: word.padding, rhyme: word.rhyme}'> {{ word[header] }}</td>
            </template>
          </tr>
        </template>
      </tbody>
    </table>
  </template>
  </div>
`
});
