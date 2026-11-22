// 試用模式的內建範例（還沒接上 AI 時使用）。格式和 Worker 回傳的一樣。

export const DEMO = {
  '迫不及待': {
    word: '迫不及待',
    type: 'idiom',
    age: '10-11',
    zhuyin: { source: 'revised', readings: [{ bopomofo: 'ㄆㄛˋ ㄅㄨˋ ㄐㄧˊ ㄉㄞˋ' }] },
    meaning: '心裡急得等不了，想馬上就去做。',
    anchor: {
      kind: 'scene',
      scene: '微波爐還剩 3 秒，糰糰就忍不住伸手要開門了。',
      mnemonic: '迫不及待 ＝ 人心裡急，等不了',
    },
    examples: [
      '收到外婆寄來的包裹，妹妹迫不及待地拆開來看。',
      '明天就要去露營了，我迫不及待地把背包整理好。',
    ],
    pattern: '迫不及待地＋馬上做某件事',
    common_mistake: { wrong: '迫不急待', right: '迫不及待' },
    quiz_usage: {
      correct: '放學鐘聲一響，弟弟就迫不及待地衝到操場打球。',
      wrong: '湯還很燙，我迫不及待地慢慢等它變涼。',
      why_right: '鐘聲一響就衝出去，是等不了的心情。',
      explain: '「迫不及待」是等不了，和「慢慢等」剛好相反。',
    },
    quiz_compare: {
      pair: ['迫不及待', '迫在眉睫'],
      items: [
        { sentence: '聽到要去遊樂園，弟弟＿＿地換好衣服。', answer: '迫不及待' },
        { sentence: '明天就要段考，複習的事已經＿＿了。', answer: '迫在眉睫' },
        { sentence: '一聞到蛋糕的香味，小狗就＿＿地跑進廚房。', answer: '迫不及待' },
        { sentence: '颱風就快登陸了，補強門窗的工作＿＿。', answer: '迫在眉睫' },
      ],
      contrast: { '迫不及待': '人心裡急，等不了', '迫在眉睫': '事情急，就在眼前' },
      explain: '「迫不及待」是人心裡急；「迫在眉睫」是事情很急、就在眼前。',
    },
    extra: {
      simpler: '就是「好想馬上做，一秒都不想等」。',
      alt_anchor: { scene: '糰糰收到新玩具，包裝紙還沒拆完就開始玩了。', mnemonic: '等不及、馬上做 ＝ 迫不及待' },
      more_examples: [
        '聽到下課鐘響，大家迫不及待地衝向福利社。',
        '新書一到，哥哥就迫不及待地翻開第一頁。',
      ],
    },
    story: null,
    common_words: [],
    lookalikes: [],
    lookalike_title: '',
    reading_words: [],
  },

  '辨': {
    word: '辨',
    type: 'char',
    age: '10-11',
    zhuyin: { source: 'revised', readings: [{ bopomofo: 'ㄅㄧㄢˋ' }] },
    meaning: '分清楚，看出哪裡不一樣。',
    anchor: {
      kind: 'split',
      scene: '「辨」的中間是「刀」的變形：用刀把東西分開，就分得清清楚楚。',
      mnemonic: '有刀才能分 ＝ 辨',
    },
    examples: [
      '雙胞胎長得好像，我分辨不出誰是誰。',
      '老師教我們辨別哪些是假新聞。',
    ],
    pattern: '分辨／辨別＋要分清楚的東西',
    common_mistake: { wrong: '辯別', right: '辨別' },
    quiz_usage: {
      correct: '這兩張圖很像，你能分辨哪裡不一樣嗎？',
      wrong: '他參加辨論比賽，得了第一名。',
      why_right: '看出兩張圖哪裡不同，就是「分辨」。',
      explain: '「辯論」是用嘴說，要用中間是「言」的「辯」。',
    },
    quiz_compare: {
      pair: ['辨', '辯'],
      items: [
        { sentence: '請你分＿＿這兩種花有什麼不同。', answer: '辨' },
        { sentence: '他們為了誰先到，爭＿＿了好久。', answer: '辯' },
        { sentence: '在黑暗中很難＿＿認方向。', answer: '辨' },
        { sentence: '律師在法庭上替他＿＿護。', answer: '辯' },
      ],
      contrast: { '辨': '中間是刀，分清楚', '辯': '中間是言，用嘴說' },
      explain: '「辨」中間是刀，意思是分清楚；「辯」中間是言，意思是用話爭論。',
    },
    extra: {
      simpler: '就是看清楚，把不一樣的地方找出來。',
      alt_anchor: { scene: '糰糰拿著小刀，把黏在一起的兩顆湯圓輕輕分開。', mnemonic: '刀一切，分清楚 ＝ 辨' },
      more_examples: [
        '媽媽一聞就能辨別牛奶有沒有壞掉。',
        '小偵探仔細辨認腳印的方向。',
      ],
    },
    story: null,
    common_words: ['分辨', '辨別', '明辨是非'],
    lookalikes: [
      { char: '辯', part: '中間是「言」', hint: '用嘴說', word: '辯論' },
      { char: '辨', part: '中間是「刀」的變形', hint: '用刀分開', word: '分辨' },
      { char: '辮', part: '中間是「糸」', hint: '用線編', word: '辮子' },
      { char: '瓣', part: '中間是「瓜」', hint: '一片一片', word: '花瓣' },
    ],
    lookalike_title: '看中間，就分得清',
    reading_words: [],
  },
};
