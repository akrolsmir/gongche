import { RHYME_MAP } from "../assets/rhyme_dictionary.js";

export class Song {
  constructor(id, title, composer, pageNum, lyrics, melody, region, fullLyrics, modeKey) {
    this.id = id;
    this.title = title;
    this.composer = composer;
    this.pageNum = pageNum;
    this.lyrics = lyrics ? lyrics : '';
    this.melody = melody ? melody : '';
    this.region = region ? region : 'North';
    // Lyrics combined with symbols for padding and rhymes.
    // TODO: Since lyrics are derivable from fullLyrics,
    // stop storing lyrics in the cloud; just compute it.
    this.fullLyrics = fullLyrics ? fullLyrics : this.lyrics;
    this.modeKey = modeKey ? modeKey : 'default_mode_key'
  }
  toJson() {
    return {
      id: this.id,
      title: this.title,
      composer: this.composer,
      pageNum: this.pageNum,
      lyrics: this.lyrics,
      melody: this.melody,
      region: this.region,
      fullLyrics: this.fullLyrics,
      modeKey: this.modeKey
    };
  }
  static fromJson(json) {
    return new Song(json.id, json.title, json.composer, json.pageNum, 
      json.lyrics, json.melody, json.region, json.fullLyrics, json.modeKey);
  }
  // Return the locations of all rhyming lyrics (lyrics followed by '.');
  getRhymeIndices() {
    return this.fullLyrics.split('')
      .flatMap((char, i) => (char == '.' && i > 0) ? i - 1 : []);
  }
  hasRhymeCategory(query) {
    for (const category of this.getRhymeCategories(RHYME_MAP)) {
      if (category.includes(query)) {
        return true;
      }
    }
    return false;
  }
  getRhymeCategories() {
    const categories = this.getRhymeIndices()
      .map(index => this.fullLyrics[index])
      .filter(lyric => RHYME_MAP[lyric])
      .map(lyric => RHYME_MAP[lyric][0]);
    // Deduplicate with an intermediate set.
    return [...new Set(categories)];
  }
}
