export const ProsodyComponent = {
  props: ['lines', 'headers', 'colorize'],
  methods: {
    tableStyle(song) {
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
  },
  template: `
  <div>
  <template v-for="line in lines">
    <table :style="colorize ? tableStyle(line.song) : ''">
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
};
