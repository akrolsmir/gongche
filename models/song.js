class Song {
  constructor(id, title, composer, pageNum, lyrics) {
    this.id = id;
    this.title = title;
    this.composer = composer;
    this.pageNum = pageNum;
    this.lyrics = lyrics;
  }
  toJson() {
    return {
      id: this.id,
      title: this.title,
      composer: this.composer,
      pageNum: this.pageNum,
      lyrics: this.lyrics
    };
  }
  static fromJson(json) {
    return new Song(json.id, json.title, json.composer, json.pageNum, json.lyrics);
  }
}
