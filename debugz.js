import {getSongTables} from "./assets/mulu.js";
import {debugSheet} from "./sheet.js";
import {RHYME_MAP} from "./assets/rhyme_dictionary.js";

const vueApp = new Vue({
  el: '#debugz',
  data: {
    sheetErrors: {},
    songs: [],
  },
  async mounted() {
    const [songs, songsById] = await getSongTables();
    this.songs = songs;
  },
  computed: {
    missingCharacters() {
      const missing = {};
      for (const song of this.songs) {
        for (const index of song.getRhymeIndices()) {
          const lyric = song.fullLyrics[index];
          if (!(RHYME_MAP[lyric] || missing[lyric])) {
            missing[lyric] = song.id;
          }
        }
      }
      return missing;
    },
  },
  methods: {
    async getSheetErrors() {
      const start = new Date();
      for (const song of this.songs) {
        try {
          debugSheet(song.fullLyrics, song.melody);
          console.log('Done with ' + song.id);
        } catch (e) {
          // Reactive equivalent to "this.errors[song.id] = e;"
          this.$set(this.sheetErrors, song.id, e);
        }
      }
      console.log(`${new Date() - start}ms elapsed`);
    }
  }
});