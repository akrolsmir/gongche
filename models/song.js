class Song {
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
}
