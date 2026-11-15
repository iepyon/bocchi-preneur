// 試作品の見本データ。すべて架空。実在の人物・発言ではない。
// data/db.json がないときに一度だけ作られる。作り直すときは data/ を消す。
const crypto = require('crypto');
const L = require('./public/lexicon.js');

function seed(t0) {
  const M = 60 * 1000;
  const H = 60 * M;
  const D = 24 * H;
  const rid = () => crypto.randomBytes(6).toString('hex');
  const handles = ['霧の鍛冶屋', '夜更けの書記', '灰色の巡礼', '遅咲きの庭師', '北の測量士', '無口な石工', '旅支度の商人', '雨上がりの灯守', '眠らない写本師', '小さな渡し守', '遠回りの旅人', '片手の見張り', '霧の庭師', '北の書記'];
  const users = handles.map((handle, i) => ({ id: 'seed' + i, token: crypto.randomBytes(24).toString('hex'), handle, createdAt: t0 - (30 - i) * D }));
  const u = (i) => users[i].id;
  const others = (n, except) => users.filter((_, i) => i !== except).slice(0, n).map((x) => x.id);

  const fires = [
    [0, 4, '予約ボタンだけ動かす', 25 * M, 3],
    [1, 1, '元同僚に2人目のインタビュー', 50 * M, 5],
    [2, 6, '月額を3案に絞る', 2 * H, 1],
    [3, 10, 'ローンチ告知の下書き', 3 * H, 7],
    [4, 2, '入れない機能を3つ決める', 4 * H, 0],
    [5, 5, '試作品を3人に触ってもらう', 6 * H, 2],
    [6, 11, '先週の解約理由を読む', 8 * H, 4],
    [7, 9, '利用規約のたたき台', 11 * H, 1],
    [8, 1, '撤退基準を紙に書く', 14 * H, 6],
    [9, 3, 'ホーム画面を2案描く', 19 * H, 2],
  ].map(([ui, step, goal, ago, w]) => ({ id: rid(), userId: u(ui), step, goal, litAt: t0 - ago, warmth: others(w, ui), done: ago > 10 * H }));

  const T = (s) => L.TEMPLATES.indexOf(s);
  const note = (ui, step, text, ago, useful) => ({ id: rid(), userId: u(ui), step, text, createdAt: t0 - ago, useful: others(useful, ui), reports: [] });
  const notes = [
    note(1, 1, 'この先、友人の褒め言葉に注意', 2 * D, 11),
    note(8, 1, 'まず過去の出来事を聞くこと', 3 * D, 8),
    note(2, 1, '撤退基準を忘れるな、しかし　眠ることを忘れるな', 5 * D, 6),
    note(4, 2, '削ることを恐れるな', 1 * D, 5),
    note(10, 2, 'この先、機能の足し算に注意', 6 * D, 3),
    note(9, 3, '見本の画面に助けられた', 9 * H, 2),
    note(0, 4, '作り込みはまだ早い', 4 * H, 7),
    note(12, 4, '15分のタイマーが効いた、そして　小さな達成が効いた', 2 * D, 4),
    note(5, 5, '先行課金を恐れるな', 3 * D, 9),
    note(13, 5, 'ここで撤退基準をした', 8 * D, 1),
    note(2, 6, 'この先、値下げに注意', 1 * D, 6),
    note(6, 6, '一枚の表に助けられた', 4 * D, 2),
    note(7, 7, '徹夜はまだ早い、だから　眠ることを試せ', 12 * H, 5),
    note(11, 9, 'まず一枚の表', 2 * D, 1),
    note(3, 10, '公開しながら作ることが効いた', 5 * D, 8),
    note(3, 10, 'この先、他人との比較に注意', 1 * D, 10),
    note(6, 11, '数字を忘れるな、あるいは　散歩', 3 * D, 3),
    note(8, 11, '昨日の自分に助けられた', 7 * D, 4),
  ];

  const traces = [
    { ui: 13, step: 5, learned: '友人10人の「欲しい」は、1人も先行課金に変わらなかった', carry: '過去の出来事を聞く台本はそのまま使える', drop: '自分が欲しいものを、みんなも欲しいと思い込む癖', ago: 8 * D, bows: 6 },
    { ui: 11, step: 6, learned: '月980円では、サーバー代を引くと時給が200円だった', carry: '法人向けに絞る案。インタビューで2社が予算を口にした', drop: '安くすれば広がるという考え', ago: 12 * D, bows: 4 },
    { ui: 10, step: 2, learned: '機能を足すたびに、誰のための道具かが分からなくなった', carry: '最初の一段は1機能だけ、という約束', drop: '競合の機能表を眺める時間', ago: 4 * D, bows: 3 },
    { ui: 12, step: 11, learned: '半年続けて、使う人は増えたが自分が楽しくなかった', carry: '小さく出して3か月で判断する型', drop: '「もう少し続ければ」という期待', ago: 2 * D, bows: 9 },
  ].map((x) => ({ id: rid(), userId: u(x.ui), step: x.step, learned: x.learned, carry: x.carry, drop: x.drop, createdAt: t0 - x.ago, bows: others(x.bows, x.ui), reports: [] }));

  const signs = [
    { ui: 2, kind: 'review', step: 6, minutes: 15, word: '一枚の表', ago: 20 * M },
    { ui: 9, kind: 'cowork', step: 3, minutes: 30, word: '15分のタイマー', ago: 35 * M },
    { ui: 5, kind: 'test', step: 5, minutes: 15, word: '', ago: 70 * M },
    { ui: 4, kind: 'rubber', step: 2, minutes: 30, word: '削ること', ago: 90 * M },
  ].map((x) => ({ id: rid(), userId: u(x.ui), kind: x.kind, step: x.step, minutes: x.minutes, word: x.word, createdAt: t0 - x.ago, status: 'open', roomId: null, answeredBy: null }));

  return { users, fires, notes, traces, signs, rooms: [], echoes: [] };
}

module.exports = { seed };
