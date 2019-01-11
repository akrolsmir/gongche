const keyboardToGongche = {
  's': '上',
  'c': '尺',
  'g': '工',
  'f': '凡',
  'l': '六',
  'w': '五',
  'y': '乙',
  'h': '合',
  'x': '四',
  'i': '一',
  '.': '。',
  ',': '、',
}

function rewriteWithGongche() {
  const melodyInput = document.getElementById('melody');
  let output = "";
  for (char of melodyInput.value) {
    const gongche = keyboardToGongche[char];
    output += gongche ? gongche : char;
  }
  melodyInput.value = output;
  colorMelodyBackground();
}
