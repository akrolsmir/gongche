import {
  buildLines,
  encodeJianpu,
  decodeToJianpu,
  jianpuToOffset,
} from './lines.js';
import { renderChart, KeyCounter } from './chart.js';
import { RHYME_MAP } from './assets/rhyme_dictionary.js';
import {
  messages,
  selectSongsExamples,
  filterLinesExamples,
  zhKeywords,
} from './assets/translations.js';
import { ProsodyComponent } from './prosody-vue.js';
import { getSongTables } from './assets/mulu.js';
Vue.use(vueTabs.default);
Vue.config.performance = true;
Vue.component('pwa-a', {
  props: ['href'],
  template: `<a :target='target' :rel='rel' :href='href'><slot></slot></a>`,
  computed: {
    // In PWA desktop app, open in same window. Otherwise, new tab.
    isStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches;
    },
    target() {
      return this.isStandalone ? '' : '_blank';
    },
    rel() {
      return this.isStandalone ? '' : 'noopener noreferrer';
    },
  },
});

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
  if (searchParams.source) {
    // Song source (aka composer) must contain the specified string.
    if (!song.composer.includes(searchParams.source)) {
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
    if (
      !song.region.toLowerCase().includes(searchParams.region.toLowerCase())
    ) {
      return false;
    }
  }
  if (searchParams.lyrics) {
    if (!song.fullLyrics.includes(searchParams.lyrics)) {
      return false;
    }
  }
  if (searchParams.rhymeswith) {
    // Look up the rhyme category and fill it in for rhyme query.
    const rhyme = RHYME_MAP[searchParams.rhymeswith];
    if (!searchParams.rhyme && rhyme) {
      searchParams.rhyme = rhyme[0];
    }
  }
  if (searchParams.rhyme) {
    if (!song.hasRhymeCategory(searchParams.rhyme, RHYME_MAP)) {
      return false;
    }
  }
  if (searchParams.melody) {
    if (!song.melody.includes(searchParams.melody)) {
      return false;
    }
  }
  if (searchParams.padding) {
    let query = searchParams.padding;
    const paddingCount = (song.fullLyrics.match(/_/g) || []).length;
    if (query.endsWith('+')) {
      // Song must have at least this many padding chars
      query = query.substring(0, query.length - 1);
      if (query > paddingCount) {
        return false;
      }
    } else {
      // Song must have exactly this many padding chars
      if (query != paddingCount) {
        return false;
      }
    }
  }
  if (searchParams.lines) {
    // Expects a search like "lines:7/7/4/4/7"
    const query = searchParams.lines.replace(/\//g, ' ');
    if (!song.getLineCounts().includes(query)) {
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
    // Valid tonal search patterns:
    // YinYang - 陰平陽平陰去, 平陽平去
    // Basic - 平平去
    // Two-way - 平平仄
    let query = params.tone;
    if (query.includes('陰') || query.includes('陽')) {
      // If a tone does not have a preceding yinyang, accept either of yin/yang.
      // e.g. "平陽平去" => "y平陽平y去"
      query = query.replace(/(?<![陰陽])[平上去入仄]/g, 'y$&');
      // Accept missing dictionary entries (underscores)
      query = query
        .split('')
        .map((char) => `[${char}_]`)
        .join('');
      // Expand 'y' with either of yin/yang.
      query = query.replace(/y/g, '陰陽');
    } else {
      // Accept underscores and either of yin/yang.
      query = query
        .split('')
        .map((tone) => `.[${tone}_]`)
        .join('');
    }
    // Expand the not-平 character (仄)
    query = query.replace(/仄/g, '上去入');
    const regex = new RegExp(query);
    if (!regex.test(line.toneString)) {
      return false;
    }
  }
  if (params.tonemelody) {
    // Line tone melody must exactly match.
    if (!line.tonemelodyString.includes(params.tonemelody)) {
      return false;
    }
  }
  if (params.padding) {
    let query = params.padding;
    // Directly access line.words so padding is always included
    const paddingCount = line.words.filter((word) => word.padding).length;
    if (query.endsWith('+')) {
      // Line must have at least this many padding chars
      query = query.substring(0, query.length - 1);
      if (query > paddingCount) {
        return false;
      }
    } else {
      // Line must have exactly this many padding chars
      if (query != paddingCount) {
        return false;
      }
    }
  }
  if (params.length) {
    if (line.getWords().length != params.length) {
      return false;
    }
  }
  if (params.rhymeswith) {
    // Look up the rhyme category and fill it in for rhyme query.
    const rhyme = RHYME_MAP[params.rhymeswith];
    if (!params.rhyme && rhyme) {
      params.rhyme = rhyme[0];
    }
  }
  if (params.rhyme) {
    // Some word in this line must match this rhyming scheme.
    let hasRhyme = false;
    for (const word of line.getWords()) {
      if (word.rhyme && word.rhyme.includes(params.rhyme)) {
        hasRhyme = true;
      }
    }
    if (!hasRhyme) {
      return false;
    }
  }
  return true;
}

function addJianpuString(line) {
  line.jianpuString = line
    .getWords()
    .map((word) => word.melody)
    .join(' ')
    .replace(/ /g, '');
  return line;
}

function addToneStrings(line) {
  line.toneAllString = line
    .getWords()
    .map((word) => word.tone)
    .join('');
  line.toneZeString = line.toneAllString.replace(/[上去入]/g, '仄');
  return line;
}

function addToneString(line) {
  line.toneString = line
    .getWords()
    .map((word) => word.yinyang + word.tone)
    // Mark missing dictionary entries with two underscores.
    .map((token) => (token ? token : '__'))
    .join('');
  return line;
}

/** Joint combination to match both tone and melody. TODO: rename. */
function addTonemelodyString(line) {
  line.tonemelodyString = line
    .getWords()
    .map((word) => word.tone + word.melody)
    .join('')
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
  const finalMotifs = [];
  for (const [motif, count] of sortedMotifs) {
    const longerMotifs = finalMotifs.filter(
      ([m, c]) => m.includes(motif) && c >= count
    );
    if (longerMotifs.length == 0) {
      finalMotifs.push([motif, count]);
    }
  }
  // Convert the final result back to jianpu notation.
  return finalMotifs.map(([m, c]) => [decodeToJianpu(m), c]);
}

function findTonalPatterns(lines, useToneZeString = false) {
  // 1. Group lines by length
  const linesByLength = {};
  for (const line of lines) {
    const length = line.words.length;
    if (!linesByLength[length]) {
      linesByLength[length] = [];
    }
    linesByLength[length].push(line);
  }
  // Format: allGroup[length=6][most matches=0] = ['入去平去去平', [line1, line2, line3...]]
  const allGroup = {};
  for (const [length, lines] of Object.entries(linesByLength)) {
    const toneString = useToneZeString ? 'toneZeString' : 'toneAllString';
    // 2. Sort lines by toneAll/ZeString
    lines.sort((a, b) => a[toneString].localeCompare(b[toneString]));

    // 3. Group matching lines of that length
    const groupedByTone = {};
    for (const line of lines) {
      if (groupedByTone[line[toneString]]) {
        groupedByTone[line[toneString]].push(line);
      } else {
        groupedByTone[line[toneString]] = [line];
      }
    }
    // 4. Output most matches first
    const ordered = Object.entries(groupedByTone)
      .filter(([tone, group]) => group.length > 1)
      .sort(([t1, g1], [t2, g2]) => g2.length - g1.length)
      // Convert to string for easier processing, for now
      .map(
        ([tone, group]) =>
          `${tone} (${group.length}) -- ${group
            .map((line) => lineId(line))
            .join(', ')}`
      );
    allGroup[length] = ordered;
  }
  return allGroup;

  // 5. Repeat 2-4 for toneZeString
}

function lineId(line) {
  return `${line.song.id}-${line.index}`;
}

// Parse the search query for the keywords specified in params.
// Example format: 'id:123.4 title:hello region:north'
function parseQuery(query, params) {
  const terms = query.split(' ');
  const paramsClone = { ...params };
  for (const term of terms) {
    const termSplit = term.split(/[:：]/);
    if (termSplit.length != 2) {
      console.log(`Invalid syntax: ${term}`);
      continue;
    }
    let [keyword, param] = termSplit;
    // Translate Chinese keywords back into English
    if (zhKeywords[keyword]) {
      keyword = zhKeywords[keyword];
    }
    if (!keyword in params) {
      console.log(`Invalid keyword: ${term}`);
      continue;
    }
    paramsClone[keyword] = param;
  }
  return paramsClone;
}

async function main() {
  const [songs, songsById] = await getSongTables();

  const i18n = new VueI18n({
    locale: 'en', // set locale
    messages, // set locale messages
  });

  const vueApp = new Vue({
    i18n,
    el: '.songdata',
    components: {
      prosody: ProsodyComponent,
    },
    data: {
      songs,
      songsQuery: '',
      linesQuery: '',
      toneQuery: '',
      rhythmQuery: '',
      rhythmPercent: false,
      motifs: [],
      headers: ['lyric', 'yinyang', 'tone', 'melody'],
      padded: false,
      quartered: false,
      selectSongsExamples,
      filterLinesExamples,
      matrixSkeletal: 'off',
      tonalPatterns: {},
      useToneZeString: false,
    },
    methods: {
      findAllMotifs() {
        this.motifs = findMotifs(this.lines);
      },
      findAllTonalPatterns() {
        this.tonalPatterns = findTonalPatterns(
          this.lines.slice(0, 5000),
          this.useToneZeString
        );
      },
      setLinesQuery(query) {
        this.linesQuery = query;
      },
      showAlert(text) {
        alert(text);
      },
      submitLinesQuery(value) {
        this.linesQuery = value;
      },
      submitSongsQuery(value) {
        this.songsQuery = value;
      },
    },
    // To reference canvas, we have to use $refs and lifestyle hooks.
    // See also https://stackoverflow.com/a/42606029/1222351
    mounted() {
      renderChart(this.matchedRhythms, this.$refs.rhythmChart);
      renderChart(this.matchedContourGraph, this.$refs.contourChart);
      renderChart(this.matchedLineLengths, this.$refs.lengthChart);
      renderChart(this.matchedNotes, this.$refs.noteChart);
      renderChart(this.avgQuartersByPos, this.$refs.quartersChart);
      renderChart(this.avgNotesByPos, this.$refs.notesByPosChart);
      renderChart(this.rhymingTones, this.$refs.rhymingChart);
      renderChart(this.finalTones, this.$refs.finalChart);
      renderChart(this.finalNotes, this.$refs.finalNotesChart);
      renderChart(this.allTones, this.$refs.allTonesChart);
    },
    created() {
      // See also https://stackoverflow.com/a/53022397/1222351
      this.debouncedSongsQuery = _.debounce(this.submitSongsQuery, 500);
      this.debouncedLinesQuery = _.debounce(this.submitLinesQuery, 500);
    },
    watch: {
      matchedRhythms(newRhythms) {
        renderChart(newRhythms, this.$refs.rhythmChart);
      },
      matchedContourGraph(newContours) {
        renderChart(newContours, this.$refs.contourChart);
      },
      matchedLineLengths(newLengths) {
        renderChart(newLengths, this.$refs.lengthChart);
      },
      matchedNotes(newNotes) {
        renderChart(newNotes, this.$refs.noteChart);
      },
      avgQuartersByPos(newTimes) {
        renderChart(newTimes, this.$refs.quartersChart);
      },
      avgNotesByPos(newAvgs) {
        renderChart(newAvgs, this.$refs.notesByPosChart);
      },
      rhymingTones(newTones) {
        renderChart(newTones, this.$refs.rhymingChart);
      },
      finalTones(newTones) {
        renderChart(newTones, this.$refs.finalChart);
      },
      finalNotes(newNotes) {
        renderChart(newNotes, this.$refs.finalNotesChart);
      },
      allTones(newTones) {
        renderChart(newTones, this.$refs.allTonesChart);
      },
    },
    computed: {
      // In PWA desktop app, open in same window. Otherwise, new tab.
      isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches;
      },
      target() {
        return this.isStandalone ? '' : '_blank';
      },
      rel() {
        return this.isStandalone ? '' : 'noopener noreferrer';
      },
      matchedSongs() {
        const songParams = {
          id: '',
          title: '',
          source: '',
          region: '',
          mode: '',
          lyrics: '',
          melody: '',
          padding: '',
          lines: '',
        };
        // Split up songsQuery into &'ed components
        const jointQueries = this.songsQuery.split(' & ');
        const songsSet = new Set();

        for (const query of jointQueries) {
          const params = parseQuery(query, songParams);
          // TODO: Consider v-show for performance https://stackoverflow.com/a/43920347/1222351
          songs
            .filter((song) => checkSongMatch(song, params))
            .forEach((s) => songsSet.add(s));
        }
        return Array.from(songsSet);
      },
      lines() {
        this.motifs = [];
        return this.matchedSongs
          .flatMap((song) => buildLines(song, this.padded, this.quartered))
          .map(addJianpuString)
          .map(addToneString)
          .map(addTonemelodyString)
          .map(addToneStrings);
      },
      matchedLines() {
        const lineParams = {
          melody: '',
          fuzzy: '',
          tone: '',
          tonemelody: '',
          padding: '',
          length: '',
        };
        const params = parseQuery(this.linesQuery, lineParams);
        return this.lines.filter((line) => checkLineMatch(line, params));
      },
      matchedRhythms() {
        const matchCounter = new KeyCounter('1');
        const totalCounter = new KeyCounter('1');
        for (const line of this.matchedLines) {
          for (let i = 0; i < line.getWords().length; i++) {
            const word = line.getWords()[i];
            if (word.beats != null) {
              totalCounter.count(`${i + 1}`);
              if (word.beats.includes(this.rhythmQuery)) {
                matchCounter.count(`${i + 1}`);
              }
            }
          }
        }
        if (this.rhythmPercent) {
          // Display the rhythm matches as a percent of chars at this length.
          const percentMap = {};
          for (const key in matchCounter.map) {
            percentMap[key] =
              (matchCounter.map[key] / totalCounter.map[key]) * 100;
          }
          return percentMap;
        }
        return matchCounter.map;
      },
      matchedToneContours() {
        // Maps contours to [count, [song names...]]
        const tones = {};
        for (const line of this.matchedLines) {
          for (const word of line.getWords()) {
            if (word.tone && word.melody && toneMatches(this.toneQuery, word)) {
              const melodyArray = word.melody.split(' ');
              // Only count contours of 2 or more notes
              if (melodyArray.length > 1) {
                const firstNote = melodyArray[0];
                const lastNote = melodyArray[melodyArray.length - 1];
                const contour =
                  jianpuToOffset[lastNote] - jianpuToOffset[firstNote];
                const key = `${contour}`;
                if (!(key in tones)) {
                  tones[key] = { count: 0, titles: new Set() };
                }
                tones[key].count++;
                tones[key].titles.add(line.song.title);
              }
            }
          }
        }
        return tones;
      },
      matchedNotes() {
        const counter = new KeyCounter('1');
        for (const line of this.matchedLines) {
          for (const word of line.getWords()) {
            if (word.tone && word.melody && toneMatches(this.toneQuery, word)) {
              const melodyArray = word.melody.split(' ');
              for (const jianpu of melodyArray) {
                counter.count(normalizeJianpu(jianpu));
              }
            }
          }
        }
        return counter.map;
      },
      finalNotes() {
        const counter = new KeyCounter('1');
        for (const line of this.matchedLines) {
          const lastIndex = line.song.fullLyrics.trim().split('\n').length;
          if (line.index === lastIndex) {
            const lastWord = line.getWords()[line.getWords().length - 1];
            if (lastWord && lastWord.melody) {
              const melodyArray = lastWord.melody.split(' ');
              const lastJianpu = melodyArray[melodyArray.length - 1];
              counter.count(normalizeJianpu(lastJianpu));
            }
          }
        }
        return counter.map;
      },
      matchedFollowingMatrix() {
        const skeletalFuncs = {
          off: (word) => word.melody.split(' '),
          first: (word) => [word.melody.split(' ')[0]],
          last: (word) => [
            word.melody.split(' ')[word.melody.split(' ').length - 1],
          ],
          both: (word) => [
            word.melody.split(' ')[0],
            word.melody.split(' ')[word.melody.split(' ').length - 1],
          ],
        };
        return makeMatrix(this, skeletalFuncs[this.matrixSkeletal]);
      },
      /** Return the exact breakdown of contours and counts. */
      matchedContourBreakdown() {
        const tones = {};
        for (const line of this.matchedLines) {
          for (const word of line.getWords()) {
            if (
              word.tone &&
              word.contour &&
              toneMatches(this.toneQuery, word)
            ) {
              const key = word.contour;
              if (!(key in tones)) {
                tones[key] = { count: 0, titles: new Set() };
              }
              tones[key].count++;
              tones[key].titles.add(line.song.title);
            }
          }
        }
        let breakdown = [];
        for (const key of Object.keys(tones)) {
          breakdown.push([tones[key].count, key]);
        }
        if (breakdown.length == 0) {
          return [[], 0];
        }
        const total = breakdown.map((b) => b[0]).reduce((a, b) => a + b);
        // Sort by count, desc (largest first)
        breakdown = breakdown.sort((a, b) => b[0] - a[0]);
        return [breakdown, total];
      },
      matchedContourGraph() {
        const result = {};
        for (const key of Object.keys(this.matchedToneContours)) {
          result[key] = this.matchedToneContours[key].count;
        }
        return result;
      },
      matchedLineLengths() {
        const counter = new KeyCounter();
        for (const line of this.matchedLines) {
          counter.count(`${line.getWords().length}`);
        }
        return counter.map;
      },
      avgQuartersByPos() {
        const total = {};
        const counts = {};
        for (const line of this.matchedLines) {
          for (let i = 0; i < line.words.length; i++) {
            const word = line.words[i];
            // Songs that didn't have a valid rhythmization have quarters = 0
            if (word.quarters) {
              if (!total[i]) {
                total[i] = 0;
                counts[i] = 0;
              }
              total[i] += word.quarters;
              counts[i] += 1;
            }
          }
        }
        const entries = Object.keys(total).map((i) => [
          // Shift to 1-based indexing in the result
          parseInt(i) + 1,
          total[i] / counts[i],
        ]);
        return Object.fromEntries(entries);
      },
      avgNotesByPos() {
        const total = {};
        const counts = {};
        for (const line of this.matchedLines) {
          for (let i = 0; i < line.words.length; i++) {
            const word = line.words[i];
            if (!total[i]) {
              total[i] = 0;
              counts[i] = 0;
            }
            if (word.melody) {
              total[i] += word.melody.split(' ').length;
              counts[i] += 1;
            }
          }
        }
        const entries = Object.keys(total).map((i) => [
          // Shift to 1-based indexing in the result
          parseInt(i) + 1,
          total[i] / counts[i],
        ]);
        return Object.fromEntries(entries);
      },
      avgNotesPerWord() {
        let notes = 0;
        let words = 0;
        for (const line of this.matchedLines) {
          for (const word of line.words) {
            if (word.melody) {
              notes += word.melody.split(' ').length;
              words += 1;
            }
          }
        }
        return notes / words;
      },
      rhymingTones() {
        return makeTones(this.matchedLines, ',');
      },
      finalTones() {
        return makeTones(this.matchedLines, '.');
      },
      allTones() {
        const tonesToInt = { 平: 0, 上: 1, 去: 2, 入: 3 };
        const counter = new KeyCounter();
        for (const line of this.matchedLines) {
          for (const word of line.words) {
            if (word && word.tone) {
              counter.count(tonesToInt[word.tone]);
            }
          }
        }
        return counter.map;
      },
      matchedToneQuarters() {
        let total = 0;
        let count = 0.00001; // To prevent division by 0 xP
        for (const line of this.matchedLines) {
          for (const word of line.getWords()) {
            if (
              word.tone &&
              word.quarters &&
              toneMatches(this.toneQuery, word)
            ) {
              total += word.quarters;
              count += 1;
            }
          }
        }
        return total / count;
      },
    },
  });
}

// TODO: Try charts with arbitrary string keys
function makeTones(lines, end) {
  const tonesToInt = { 平: 0, 上: 1, 去: 2, 入: 3 };
  const counter = new KeyCounter();
  for (const line of lines) {
    if (line.end == end) {
      const lastWord = line.words[line.words.length - 1];
      if (lastWord && lastWord.tone) {
        counter.count(tonesToInt[lastWord.tone]);
      }
    }
  }
  return counter.map;
}

// Whether a tone query matches a particular word.
// When the word has no rhyme entry, we assume it matches.
// TODO: ^ might not matter, since we always check for word.tones first?
function toneMatches(query, word) {
  if (query.length == 0) {
    return true;
  }
  // Supported patterns: 平/上/去/入/仄, maybe prefixed by 陰/陽
  const matches = query.match(/^[陰陽]?[平上去入仄]$/);
  if (!matches) {
    return false;
  }
  if (query.startsWith('陰') || query.startsWith('陽')) {
    if (word.yinyang && word.yinyang != query[0]) {
      return false;
    }
  }
  let tone = query[query.length - 1];
  if (tone == '仄') {
    tone = '上去入';
  }
  return !word.tone || tone.includes(word.tone);
}

/**
 * 7x7 matrix. Rows are start notes, columns are following notes.
 * wordToMelodies is a function that takes in a word and returns
 * an array of melodies that we want to include for "following". */
function makeMatrix(vueApp, wordToMelodies) {
  const matrix = [];
  for (let i = 0; i < 7; i++) {
    matrix.push([0, 0, 0, 0, 0, 0, 0]);
  }
  for (const line of vueApp.matchedLines) {
    const melodies = [];
    for (const word of line.getWords()) {
      if (word.tone && word.melody && toneMatches(vueApp.toneQuery, word)) {
        melodies.push(...wordToMelodies(word));
      }
    }
    const notes = melodies.map(normalizeJianpu);
    for (let i = 0; i < notes.length - 1; i++) {
      const current = notes[i];
      const next = notes[i + 1];
      // Shift by 1 to accomodate 0-based indexing.
      matrix[current - 1][next - 1]++;
    }
  }
  return matrix;
}

// Map "do" to 1, "re" to 2... regardless of octave.
function normalizeJianpu(jianpu) {
  return ((jianpuToOffset[jianpu] + 7) % 7) + 1;
}
