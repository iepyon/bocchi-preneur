// 書き置き・救援サインに使う語彙。サーバーとブラウザの両方で読む。
// 書き置きは自由記述を許さず、定型文と語の組み合わせだけで作る（02-spec.md「定型文だけで書く」）。
(function (root) {
  const STEPS = [
    { id: 1, phase: '調査', name: 'コンセプトと課題検証', place: '問いの荒野' },
    { id: 2, phase: '企画', name: '仕様設計', place: '設計の書庫' },
    { id: 3, phase: '試作', name: '画面設計', place: '下描きの工房' },
    { id: 4, phase: '試作', name: 'プロトタイプ実装', place: '鍛冶場' },
    { id: 5, phase: '検証', name: '価値検証', place: '審判の橋' },
    { id: 6, phase: '検証', name: '価格設計', place: '天秤の間' },
    { id: 7, phase: '公開', name: '本番実装', place: '石積みの城壁' },
    { id: 8, phase: '公開', name: 'デザイン', place: '染め場' },
    { id: 9, phase: '公開', name: 'セキュリティと公開準備', place: '見張り塔' },
    { id: 10, phase: '公開', name: 'ローンチ', place: '開門の広場' },
    { id: 11, phase: '保守', name: '計測・運用・継続判断', place: '灯台' },
  ];

  const TEMPLATES = [
    'この先、{w}に注意',
    '{w}が効いた',
    '{w}を試せ',
    '{w}はまだ早い',
    '{w}を恐れるな',
    'ここで{w}をした',
    '{w}があれば……',
    'まず{w}',
    '{w}に助けられた',
    '{w}を忘れるな',
  ];

  const CONJ = ['', 'そして', 'しかし', 'だから', 'あるいは', 'ともかく'];

  const WORDS = {
    '進め方': ['顧客に聞くこと', '過去の出来事を聞くこと', '小さく出すこと', '撤退基準', '締め切り', '先行課金', '待機リスト', '記録', '数字', '削ること', '公開しながら作ること'],
    '落とし穴': ['友人の褒め言葉', '作り込み', '完璧主義', '他人との比較', '一人で抱えること', '機能の足し算', '値下げ', '「いつか」', '徹夜'],
    '体と心': ['眠ること', '散歩', '食事', '休むこと', '昨日の自分', '小さな達成', '誰かの灯'],
    '物': ['紙とペン', '声に出すこと', '15分のタイマー', '見本の画面', '一枚の表'],
  };

  const SIGN_KINDS = [
    { id: 'review', label: '見てほしい', hint: '画面・文章・価格を見て一言ほしい' },
    { id: 'rubber', label: '話を聞いてほしい', hint: '壁打ち。答えはいらない' },
    { id: 'test', label: '触ってほしい', hint: '試作品を5分触ってほしい' },
    { id: 'cowork', label: '並んで作業したい', hint: '黙って同じ時間に作業する' },
  ];

  const SIGN_MINUTES = [15, 30];

  const GESTURES = ['礼', '手を振る', '拳を掲げる', '灯を分ける'];

  const L = { STEPS, TEMPLATES, CONJ, WORDS, SIGN_KINDS, SIGN_MINUTES, GESTURES };
  L.ALL_WORDS = Object.values(WORDS).flat();
  if (typeof module !== 'undefined' && module.exports) module.exports = L;
  else root.LEXICON = L;
})(this);
