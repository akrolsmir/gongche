import { RHYME_MAP } from "./assets/rhyme_dictionary.js";

main();

function checkMatch(song, searchParams) {
  if (searchParams.id) {
    // Song id must be an exact match of one in the comma-separated list.
    const ids = searchParams.id.split(',');
    if (!ids.includes(song.id)) {
      return false;
    }
  }
  if (searchParams.title) {
    // Song title must contain the specified string.
    if (!song.title.includes(searchParams.title)) {
      return false;
    }
  }
  return true;
}

async function main() {
  const [songs, songsById] = await getSongTables();

  const vueApp = new Vue({
    el: '.songdata',
    data: {
      searchbox: '',
      songs
    },
    computed: {
      matches() {
        // Parse the search query for specific keywords
        const searchParams = {
          'id': '',
          'title': '',
          'region': '',
          'mode': ''
        }
        // Example format: 'id:123.4 title:hello region:north'
        const terms = this.searchbox.split(' ');
        for (const term of terms) {
          const termSplit = term.split(':');
          if (termSplit.length != 2) {
            console.log(`Invalid syntax: ${term}`);
            continue;
          }
          const [keyword, param] = termSplit;
          if (!keyword in searchParams) {
            console.log(`Invalid keyword: ${term}`);
            continue;
          }
          searchParams[keyword] = param;
        }
        return songs.filter(song => checkMatch(song, searchParams))
      }
    }
  });
}