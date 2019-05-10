import { buildLines } from "./lines.js"

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
  if (searchParams.mode) {
    // Song mode key must contain the specified string.
    if (!song.modeKey.includes(searchParams.mode)) {
      return false;
    }
  }
  if (searchParams.region) {
    // Song region must contain the specified string (case-blind).
    if (!song.region.toLowerCase().includes(searchParams.region.toLowerCase())) {
      return false;
    }
  }
  return true;
}

function addJianpuString(line) {
  line.jianpuString = line.words
    .map(word => word.melody)
    .join(' ')
    .replace(/ /g, '');
  return line;
}

function checkLineMatch(line, query) {
  return line.jianpuString.includes(query);
}

const rowHeaders = [
  { id: 'lyric', display: '字' },
  { id: 'melody', display: '簡譜音高' },
]

async function main() {
  const [songs, songsById] = await getSongTables();

  const vueApp = new Vue({
    el: '.songdata',
    data: {
      songs,
      songsQuery: '',
      linesQuery: '',
      headers: rowHeaders
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
        const terms = this.songsQuery.split(' ');
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
      },
      lines() {
        return this.matches.flatMap(buildLines).map(addJianpuString);
      },
      matchedLines() {
        const query = this.linesQuery.replace(/ /g, '');
        return this.lines
          .filter(line => checkLineMatch(line, query))
          .slice(0, 50);
      }
    }
  });
}
