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

function findMotifs(lines) {
  const motifs = new Map();
  // Count the occurences of each motif (aka line substring >= 4 chars.)
  // TODO: Adjust for jianpu strings longer than 1 character
  for (const line of lines) {
    const jianpu = line.jianpuString;
    if (jianpu.length <= 3) {
      continue;
    }
    const MIN_LENGTH = 4;
    for (let end = jianpu.length; end >= MIN_LENGTH; end--) {
      for (let start = 0; start <= end - MIN_LENGTH; start++) {
        const motif = jianpu.slice(start, end);
        if (motifs.has(motif)) {
          motifs.set(motif, motifs.get(motif) + 1);
        } else {
          motifs.set(motif, 1);
        }
      }
    }
  }
  // Identify the unique longest motifs occuring more than once.
  const sortedMotifs = Array.from(motifs)
    .filter(([motif, count]) => count > 1)
    .sort(([m1, c1], [m2, c2]) => m2.length - m1.length);
  const finalMotifs = []
  for (const [motif, count] of sortedMotifs) {
    const longerMotifs = finalMotifs
      .filter(([m, c]) => m.includes(motif) && c >= count);
    if (longerMotifs.length == 0) {
      finalMotifs.push([motif, count]);
    }
  }
  return finalMotifs;
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
