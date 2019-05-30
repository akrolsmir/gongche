import { buildLines, encodeJianpu, decodeToJianpu, jianpuToOffset } from "./lines.js";
import { renderChart } from "./chart.js";
Vue.use(vueTabs.default);

main();

function checkSongMatch(song, searchParams) {
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

function checkLineMatch(line, params) {
  if (params.melody) {
    // Line melody must exactly contain the specified string.
    if (!line.jianpuString.includes(params.melody)) {
      return false;
    }
  }
  if (params.fuzzy) {
    // Line melody must contain the string with at most 3 intervening chars.
    const encodedQuery = encodeJianpu(params.fuzzy);
    const fuzzyQuery = encodedQuery.split('').join('.{0,3}?');
    const regex = new RegExp(fuzzyQuery);
    if (!regex.test(encodeJianpu(line.jianpuString))) {
      return false;
    }
  }
  if (params.tone) {
    // TODO
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

function findMotifs(lines) {
  const motifs = new Map();
  // Count the occurences of each motif (any line substring >= 4 chars).
  // TODO: Possibly speed up with suffix tree?
  for (const line of lines) {
    const jianpu = encodeJianpu(line.jianpuString);
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
      finalMotifs.push([decodeToJianpu(motif), count]);
    }
  }
  return finalMotifs;
}

// Parse the search query for the keywords specified in params.
// Example format: 'id:123.4 title:hello region:north'
function parseQuery(query, params) {
  const terms = query.split(' ');
  for (const term of terms) {
    const termSplit = term.split(':');
    if (termSplit.length != 2) {
      console.log(`Invalid syntax: ${term}`);
      continue;
    }
    const [keyword, param] = termSplit;
    if (!keyword in params) {
      console.log(`Invalid keyword: ${term}`);
      continue;
    }
    params[keyword] = param;
  }
  return params;
}

const rowHeaders = [
  { id: 'lyric', display: '字' },
  { id: 'tone', display: '聲調' },
  { id: 'yinyang', display: '陰陽' },
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
      toneQuery: '',
      rhythmQuery: '',
      motifs: [],
      headers: rowHeaders
    },
    methods: {
      findAllMotifs() {
        this.motifs = findMotifs(this.lines);
      },
      setLinesQuery(query) {
        this.linesQuery = query;
      },
      showAlert(text) {
        alert(text);
      }
    },
    // To reference canvas, we have to use $refs and lifestyle hooks.
    // See also https://stackoverflow.com/a/42606029/1222351
    mounted() {
      renderChart(this.matchedRhythms, this.$refs.rhythmChart);
    },
    watch: {
      matchedRhythms(newRhythms) {
        renderChart(newRhythms, this.$refs.rhythmChart);        
      }
    },
    computed: {
      matchedSongs() {
        const songParams = {
          'id': '',
          'title': '',
          'region': '',
          'mode': ''
        }
        const params = parseQuery(this.songsQuery, songParams);
        return songs.filter(song => checkSongMatch(song, params));
      },
      lines() {
        this.motifs = [];
        return this.matchedSongs.flatMap(buildLines).map(addJianpuString);
      },
      matchedLines() {
        const lineParams = {
          'melody': '',
          'fuzzy': '',
          'tone': ''
        }
        const params = parseQuery(this.linesQuery, lineParams);
        return this.lines.filter(line => checkLineMatch(line, params))
          .slice(0, 50);
      },
      matchedRhythms() {
        const rhythms = {};
        for (const line of this.lines) {
          for (let i = 0; i < line.words.length; i++) {
            const word = line.words[i];
            if (word.beats != null && word.beats.includes(this.rhythmQuery)) {
              const key = `${i + 1}`;
              if (key in rhythms) {
                rhythms[key]++;
              } else {
                rhythms[key] = 1;
              }
            }
          }
        }
        return rhythms;
      },
      matchedToneContours() {
        // Maps contours to [count, [song names...]]
        const tones = {};
        for (const line of this.lines) {
          for (const word of line.words) {
            if (word.tone && word.melody && word.tone.includes(this.toneQuery)) {
              const melodyArray = word.melody.split(' ');
              // Only count contours of 2 or more notes
              if (melodyArray.length > 1) {
                const firstNote = melodyArray[0];
                const lastNote = melodyArray[melodyArray.length - 1];
                const contour = jianpuToOffset[lastNote] - jianpuToOffset[firstNote];
                const key = `${contour}`;
                if (!(key in tones)) {
                  tones[key] = {count: 0, titles: new Set()};
                }
                tones[key].count++;
                tones[key].titles.add(line.song.title);
              }
            }
          }
        }
        return tones;
      }
    }
  });
}
