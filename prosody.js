import { buildLines } from "./lines.js";
import { messages } from "./assets/translations.js";
import { ProsodyComponent } from "./prosody-vue.js";

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
    components: {
      'prosody': ProsodyComponent
    },
    data: {
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
