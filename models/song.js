class Song {
  constructor(id, title, composer, pageNum, lyrics, melody) {
    this.id = id;
    this.title = title;
    this.composer = composer;
    this.pageNum = pageNum;
    this.lyrics = lyrics ? lyrics : '';
    this.melody = melody ? melody : '';
  }
  toJson() {
    return {
      id: this.id,
      title: this.title,
      composer: this.composer,
      pageNum: this.pageNum,
      lyrics: this.lyrics,
      melody: this.melody
    };
  }
  static fromJson(json) {
    return new Song(json.id, json.title, json.composer, json.pageNum, json.lyrics, json.melody);
  }
}
