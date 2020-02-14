import {getSongTables} from "./assets/mulu.js";
import {debugSheet} from "./sheet.js";

const vueApp = new Vue({
  el: '#debugz',
  data: {
    errors: {}
  },
  async mounted() {
    const [songs, songsById] = await getSongTables();
    const start = new Date();

    for (const song of songs) {
      try {
        debugSheet(song.fullLyrics, song.melody);
        console.log('Done with ' + song.id);
      } catch (e) {
        // Reactive equivalent to "this.errors[song.id] = e;"
        this.$set(this.errors, song.id, e);
      }
    }
    console.log(`${new Date() - start}ms elapsed`);
  },
});