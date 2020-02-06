// Ready translated locale messages
export const messages = {
  en: {
    // Used in Query Engine
    lyric: 'Lyric',
    yinyang: 'Yin/Yang',
    melody: 'Melody',
    sheet: 'Sheet',
    prosody: 'Prosody',
    edit: 'Edit',
    motifs: 'Motifs',
    tone: 'Tone',
    lineLengths: 'Line Lengths',
    rhythm: 'Rhythm',
    lineOf: 'Line {num} of {id}',
    findSymbol: 'Find Symbol',
    findTone: 'Find Tone',
    countPaddingCharacters: 'Count Padding Characters',
    // Used in Prosody
    pronounce: 'Pronounce',
    beats: 'Beats',
    contour: 'Contour',
    firstNote: 'First Note',
    lastNote: 'Last Note',
    interleaved: 'Interleaved',
    // Used in Sheet Music
    playback: 'Playback',
    bpm: 'BPM',
    skeletal: 'Skeletal',
    keySignature: 'Key Signature',
    // Query Engine example search terms
    examples: 'Examples',
    keywords: {
      id: 'id',
      title: 'title',
      region: 'region',
      n: 'n',
      s: 's',
      mode: 'mode',
      source: 'source',
      lyrics: 'lyrics',
      melody: 'melody',
      padding: 'padding',
      rhyme: 'rhyme',
      rhymeswith: 'rhymeswith',
      fuzzy: 'fuzzy',
      tone: 'tone',
      tonemelody: 'tonemelody',
      length: 'length',
    }
  },
  zh: {
    lyric: '字',
    yinyang: '陰陽',
    melody: '旋律',
    sheet: '五線譜',
    prosody: '格律',
    edit: '善本',
    motifs: '主腔',
    tone: '聲調',
    lineLengths: '長短',
    rhythm: '節奏',
    lineOf: '{id}號，第{num}句',
    findSymbol: '符號檢索',
    findTone: '聲調檢索',
    countPaddingCharacters: '包括襯字',
    pronounce: '字音',
    beats: '板眼',
    contour: '升降',
    firstNote: '第一音',
    lastNote: '最後音',
    interleaved: '交叉對比',
    playback: '播放',
    bpm: 'BPM',
    skeletal: '骨幹音',
    keySignature: '調號',
    examples: '例',
    keywords: {
      id: '歌號',
      title: '曲牌名',
      region: '地區',
      n: '北',
      s: '南',
      mode: '宮調',
      source: '來源',
      lyrics: '歌詞',
      melody: '旋律',
      padding: '襯字',
      rhyme: '韻部',
      rhymeswith: 'rhymeswith',
      fuzzy: '模糊',
      tone: '聲調',
      tonemelody: '聲調旋律',
      length: '長短',
    }
  }
}

export const zhKeywords = {};
for (let [key, value] of Object.entries(messages.zh.keywords)) {
  zhKeywords[value] = key;
}

export const selectSongsExamples = [
  ['id', '287.1,287.2'],
  ['title', '春'],
  ['region', 's'],
  ['mode', '仙呂'],
  ['source', '法宮'],
  ['lyrics', '春'],
  ['melody', '。'],
  ['padding', '2+'],
  ['rhyme', '東同'],
  ['rhymeswith', '中'],
]

export const filterLinesExamples = [
  ['melody', '216.5.6.'],
  ['fuzzy', '65323'],
  ['tone', '平平仄'],
  ['tone', '平陽平陰仄平'],
  ['tonemelody', '平3去35'],
  ['padding', '1'],
  ['length', '4'],
  ['rhyme', '東同'],
  ['rhymeswith', '中'],
]