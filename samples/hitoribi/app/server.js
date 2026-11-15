// ひとりび 試作サーバー（ステップ4 プロトタイプ）
// 依存パッケージなし。Node.js 18 以上で `node server.js` で動く。
// データは data/db.json に保存する（試作なので1ファイルで足りる。07-build で見直す）。

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./public/lexicon.js');
const { seed } = require('./seed.js');

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const LIMITS = {
  fireTtl: DAY, // 灯は24時間で消える
  noteTtl: 14 * DAY, // 書き置きは14日で風化する
  roomGrace: 10 * 60 * 1000, // 合流部屋は終了後10分で中身ごと消える
  notesPerDay: 5,
  tracesPerDay: 3,
  reportsToHide: 3,
  goalMax: 40,
  traceLineMax: 60,
  roomMsgMax: 140,
};

// ---------- 保存 ----------
let db;
function load() {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    db = seed(Date.now());
    save();
  }
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }, 200);
}

// ---------- 道具 ----------
const id = () => crypto.randomBytes(6).toString('hex');
const now = () => Date.now();
const ADJ = ['霧の', '夜更けの', '灰色の', '遅咲きの', '北の', '無口な', '旅支度の', '片手の', '雨上がりの', '眠らない', '小さな', '遠回りの'];
const NOUN = ['鍛冶屋', '書記', '巡礼', '渡し守', '灯守', '測量士', '庭師', '旅人', '写本師', '石工', '見張り', '商人'];
function makeHandle() {
  const pick = (a) => a[crypto.randomInt(a.length)];
  return pick(ADJ) + pick(NOUN);
}
function sameDay(t) {
  return now() - t < DAY;
}
function echo(userId, type, text) {
  if (!userId) return;
  db.echoes.push({ id: id(), userId, type, text, at: now(), read: false });
}
function stepName(s) {
  const st = L.STEPS.find((x) => x.id === s);
  return st ? `${st.place}（${st.name}）` : '';
}
function clean(str, max) {
  return String(str ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max);
}
function validStep(s) {
  return Number.isInteger(s) && s >= 1 && s <= 11;
}

// ---------- 掃除（風化） ----------
function sweep() {
  const t = now();
  db.fires = db.fires.filter((f) => t - f.litAt < LIMITS.fireTtl);
  db.notes = db.notes.filter((n) => t - n.createdAt < LIMITS.noteTtl);
  for (const s of db.signs) {
    if (s.status === 'open' && t - s.createdAt > 2 * HOUR) s.status = 'expired';
  }
  db.rooms = db.rooms.filter((r) => t < r.endsAt + LIMITS.roomGrace);
  db.echoes = db.echoes.filter((e) => t - e.at < 14 * DAY);
}

// ---------- 見せ方（他人のIDは出さない） ----------
function viewFire(f, me) {
  const u = db.users.find((x) => x.id === f.userId);
  return {
    id: f.id,
    handle: u ? u.handle : '名もなき者',
    step: f.step,
    goal: f.goal,
    litAt: f.litAt,
    warmth: f.warmth.length,
    warmedByMe: f.warmth.includes(me.id),
    mine: f.userId === me.id,
    done: !!f.done,
  };
}
function viewNote(n, me) {
  return {
    id: n.id,
    step: n.step,
    text: n.text,
    createdAt: n.createdAt,
    useful: n.useful.length,
    usefulByMe: n.useful.includes(me.id),
    mine: n.userId === me.id,
  };
}
function viewTrace(t, me) {
  return {
    id: t.id,
    step: t.step,
    learned: t.learned,
    carry: t.carry,
    drop: t.drop,
    createdAt: t.createdAt,
    bows: t.bows.length,
    bowedByMe: t.bows.includes(me.id),
    mine: t.userId === me.id,
  };
}
function viewSign(s, me) {
  const u = db.users.find((x) => x.id === s.userId);
  return {
    id: s.id,
    handle: u ? u.handle : '名もなき者',
    kind: s.kind,
    step: s.step,
    minutes: s.minutes,
    word: s.word,
    createdAt: s.createdAt,
    status: s.status,
    mine: s.userId === me.id,
    roomId: s.roomId && (s.userId === me.id || s.answeredBy === me.id) ? s.roomId : null,
  };
}

// ---------- ルーティング ----------
const routes = [];
function route(method, pattern, auth, fn) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([\\w-]+)')) + '$');
  routes.push({ method, re, keys, auth, fn });
}
class HttpError extends Error {
  constructor(status, msg) {
    super(msg);
    this.status = status;
  }
}
const fail = (status, msg) => {
  throw new HttpError(status, msg);
};

// 匿名で入る。名前・メールは預からない（02-spec.md データの重さ：軽）
route('POST', '/api/enter', false, () => {
  const user = { id: id(), token: crypto.randomBytes(24).toString('hex'), handle: makeHandle(), createdAt: now() };
  db.users.push(user);
  echo(user.id, 'system', 'ようこそ。ここでは誰もがひとりで、ひとりではない。');
  return { token: user.token, handle: user.handle };
});

route('GET', '/api/world', true, (me) => {
  const visible = (x) => (x.reports || []).length < LIMITS.reportsToHide;
  const myFire = db.fires.find((f) => f.userId === me.id);
  return {
    me: { handle: me.handle, fire: myFire ? viewFire(myFire, me) : null },
    fires: db.fires.slice().sort((a, b) => b.litAt - a.litAt).map((f) => viewFire(f, me)),
    notes: db.notes.filter(visible).sort((a, b) => b.useful.length - a.useful.length).map((n) => viewNote(n, me)),
    traces: db.traces.filter(visible).sort((a, b) => b.createdAt - a.createdAt).map((t) => viewTrace(t, me)),
    signs: db.signs
      .filter((s) => s.status === 'open' || s.userId === me.id || s.answeredBy === me.id)
      .filter((s) => s.status !== 'expired')
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((s) => viewSign(s, me)),
    unread: db.echoes.filter((e) => e.userId === me.id && !e.read).length,
  };
});

// 灯す：今日の一手を1つだけ宣言する。1日1つ。灯し直すと上書き。
route('POST', '/api/fires', true, (me, body) => {
  const step = Number(body.step);
  const goal = clean(body.goal, LIMITS.goalMax);
  if (!validStep(step)) fail(400, 'いまいる場所を選んでください');
  if (!goal) fail(400, '今日の一手を書いてください');
  let f = db.fires.find((x) => x.userId === me.id);
  if (f) Object.assign(f, { step, goal, done: false });
  else db.fires.push((f = { id: id(), userId: me.id, step, goal, litAt: now(), warmth: [], done: false }));
  return viewFire(f, me);
});

route('POST', '/api/fires/:id/done', true, (me, _b, p) => {
  const f = db.fires.find((x) => x.id === p.id && x.userId === me.id);
  if (!f) fail(404, '灯が見つかりません');
  f.done = true;
  return viewFire(f, me);
});

// あたる：他人の灯に手をかざす。言葉はいらない。
route('POST', '/api/fires/:id/warm', true, (me, _b, p) => {
  const f = db.fires.find((x) => x.id === p.id);
  if (!f) fail(404, 'その灯はもう消えました');
  if (f.userId === me.id) fail(400, '自分の灯にはあたれません');
  if (!f.warmth.includes(me.id)) {
    f.warmth.push(me.id);
    echo(f.userId, 'warm', `誰かがあなたの灯にあたっていった。（「${f.goal}」）`);
  }
  return viewFire(f, me);
});

// 書き置き：定型文と語だけで作る。自由記述は受け付けない。
function composePart(tpl, word) {
  if (!Number.isInteger(tpl) || tpl < 0 || tpl >= L.TEMPLATES.length) fail(400, '定型文を選んでください');
  if (!L.ALL_WORDS.includes(word)) fail(400, '語を選んでください');
  return L.TEMPLATES[tpl].replace('{w}', word);
}
route('POST', '/api/notes', true, (me, body) => {
  const step = Number(body.step);
  if (!validStep(step)) fail(400, '置く場所を選んでください');
  const today = db.notes.filter((n) => n.userId === me.id && sameDay(n.createdAt)).length;
  if (today >= LIMITS.notesPerDay) fail(429, `書き置きは1日${LIMITS.notesPerDay}つまでです`);
  let text = composePart(Number(body.t1), body.w1);
  if (body.conj) {
    if (!L.CONJ.includes(body.conj)) fail(400, 'つなぎの言葉を選んでください');
    text += '、' + body.conj + '　' + composePart(Number(body.t2), body.w2);
  }
  const n = { id: id(), userId: me.id, step, text, createdAt: now(), useful: [], reports: [] };
  db.notes.push(n);
  return viewNote(n, me);
});

route('POST', '/api/notes/:id/useful', true, (me, _b, p) => {
  const n = db.notes.find((x) => x.id === p.id);
  if (!n) fail(404, '書き置きは風化しました');
  if (n.userId === me.id) fail(400, '自分の書き置きは評価できません');
  if (!n.useful.includes(me.id)) {
    n.useful.push(me.id);
    echo(n.userId, 'useful', `あなたの書き置き「${n.text}」が、${stepName(n.step)}で誰かを助けた。`);
  }
  return viewNote(n, me);
});

// 痕跡：やめた・転換した場所に、学びを3行残す（SKILL.md「やめると決めたら」と対応）
route('POST', '/api/traces', true, (me, body) => {
  const step = Number(body.step);
  if (!validStep(step)) fail(400, 'やめた場所を選んでください');
  const learned = clean(body.learned, LIMITS.traceLineMax);
  const carry = clean(body.carry, LIMITS.traceLineMax);
  const drop = clean(body.drop, LIMITS.traceLineMax);
  if (!learned || !carry || !drop) fail(400, '3行とも書いてください');
  const today = db.traces.filter((t) => t.userId === me.id && sameDay(t.createdAt)).length;
  if (today >= LIMITS.tracesPerDay) fail(429, '今日はもう十分に残しました');
  const t = { id: id(), userId: me.id, step, learned, carry, drop, createdAt: now(), bows: [], reports: [] };
  db.traces.push(t);
  return viewTrace(t, me);
});

route('POST', '/api/traces/:id/bow', true, (me, _b, p) => {
  const t = db.traces.find((x) => x.id === p.id);
  if (!t) fail(404, '痕跡が見つかりません');
  if (t.userId === me.id) fail(400, '自分の痕跡です');
  if (!t.bows.includes(me.id)) {
    t.bows.push(me.id);
    echo(t.userId, 'bow', `あなたが${stepName(t.step)}に残した痕跡に、誰かが頭を下げていった。`);
  }
  return viewTrace(t, me);
});

route('POST', '/api/report', true, (me, body) => {
  const list = body.type === 'trace' ? db.traces : body.type === 'note' ? db.notes : null;
  if (!list) fail(400, '種類が不正です');
  const x = list.find((i) => i.id === body.id);
  if (!x) fail(404, '見つかりません');
  if (!x.reports.includes(me.id)) x.reports.push(me.id);
  return { ok: true };
});

// 救援サイン：時間を区切った助けを求める。応じた1人とだけ、期限つきの部屋で会う。
route('POST', '/api/signs', true, (me, body) => {
  const kind = body.kind;
  const step = Number(body.step);
  const minutes = Number(body.minutes);
  if (!L.SIGN_KINDS.some((k) => k.id === kind)) fail(400, '助けの種類を選んでください');
  if (!validStep(step)) fail(400, '場所を選んでください');
  if (!L.SIGN_MINUTES.includes(minutes)) fail(400, '時間を選んでください');
  if (body.word && !L.ALL_WORDS.includes(body.word)) fail(400, '語を選んでください');
  if (db.signs.some((s) => s.userId === me.id && s.status === 'open')) fail(409, 'サインは一度に1つまでです');
  const s = { id: id(), userId: me.id, kind, step, minutes, word: body.word || '', createdAt: now(), status: 'open', roomId: null, answeredBy: null };
  db.signs.push(s);
  return viewSign(s, me);
});

route('POST', '/api/signs/:id/cancel', true, (me, _b, p) => {
  const s = db.signs.find((x) => x.id === p.id && x.userId === me.id && x.status === 'open');
  if (!s) fail(404, 'サインが見つかりません');
  s.status = 'expired';
  return { ok: true };
});

route('POST', '/api/signs/:id/answer', true, (me, _b, p) => {
  const s = db.signs.find((x) => x.id === p.id);
  if (!s || s.status !== 'open') fail(409, 'そのサインはもう応じられています');
  if (s.userId === me.id) fail(400, '自分のサインには応じられません');
  const t = now();
  const room = { id: id(), signId: s.id, members: [s.userId, me.id], startedAt: t, endsAt: t + s.minutes * 60 * 1000, messages: [], gestures: [] };
  db.rooms.push(room);
  Object.assign(s, { status: 'answered', roomId: room.id, answeredBy: me.id });
  const kind = L.SIGN_KINDS.find((k) => k.id === s.kind);
  echo(s.userId, 'answer', `${me.handle}があなたのサイン（${kind.label}）に応じた。${s.minutes}分の合流部屋が開いている。`);
  return { roomId: room.id };
});

function myRoom(me, rid) {
  const r = db.rooms.find((x) => x.id === rid);
  if (!r || !r.members.includes(me.id)) fail(404, '部屋は閉じました');
  return r;
}
function viewRoom(r, me) {
  const s = db.signs.find((x) => x.id === r.signId);
  const other = db.users.find((u) => u.id === r.members.find((m) => m !== me.id));
  return {
    id: r.id,
    sign: s ? viewSign(s, me) : null,
    other: other ? other.handle : '名もなき者',
    host: r.members[0] === me.id,
    endsAt: r.endsAt,
    closed: now() >= r.endsAt,
    messages: r.messages.map((m) => ({ mine: m.userId === me.id, text: m.text, at: m.at })),
    gestures: r.gestures.map((g) => ({ mine: g.from === me.id, g: g.g })),
  };
}
route('GET', '/api/rooms/:id', true, (me, _b, p) => viewRoom(myRoom(me, p.id), me));
route('POST', '/api/rooms/:id/messages', true, (me, body, p) => {
  const r = myRoom(me, p.id);
  if (now() >= r.endsAt) fail(410, '時間です。部屋は閉じました');
  const text = clean(body.text, LIMITS.roomMsgMax);
  if (!text) fail(400, '空です');
  r.messages.push({ userId: me.id, text, at: now() });
  return viewRoom(r, me);
});
// 別れのしぐさ：終わったあとに1つだけ送れる。フォローや連絡先交換の代わり。
route('POST', '/api/rooms/:id/gesture', true, (me, body, p) => {
  const r = myRoom(me, p.id);
  if (!L.GESTURES.includes(body.g)) fail(400, 'しぐさを選んでください');
  if (r.gestures.some((g) => g.from === me.id)) fail(409, 'しぐさはもう送りました');
  r.gestures.push({ from: me.id, g: body.g });
  const otherId = r.members.find((m) => m !== me.id);
  echo(otherId, 'gesture', `${me.handle}が「${body.g}」をして、自分の世界へ帰っていった。`);
  return viewRoom(r, me);
});
route('POST', '/api/rooms/:id/close', true, (me, _b, p) => {
  const r = myRoom(me, p.id);
  r.endsAt = Math.min(r.endsAt, now());
  return viewRoom(r, me);
});

route('GET', '/api/echoes', true, (me) => {
  const list = db.echoes.filter((e) => e.userId === me.id).sort((a, b) => b.at - a.at);
  const out = list.map((e) => ({ type: e.type, text: e.text, at: e.at, read: e.read }));
  list.forEach((e) => (e.read = true));
  return out;
});

// ---------- サーバー ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
};

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 8 * 1024) {
        reject(new HttpError(413, '大きすぎます'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'JSONが不正です'));
      }
    });
  });
}

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, { error: 'forbidden' });
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { error: 'not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', ...SEC_HEADERS });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (!pathname.startsWith('/api/')) return serveStatic(req, res, pathname);
  try {
    sweep();
    for (const r of routes) {
      const m = r.method === req.method && pathname.match(r.re);
      if (!m) continue;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
      let me = null;
      if (r.auth) {
        const token = req.headers['x-token'];
        me = token && db.users.find((u) => u.token === token);
        if (!me) fail(401, 'もう一度入り直してください');
      }
      const body = req.method === 'POST' ? await readBody(req) : {};
      const out = r.fn(me, body, params);
      if (req.method === 'POST') save();
      return send(res, 200, out);
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message });
    console.error(e);
    send(res, 500, { error: 'サーバーで問題が起きました' });
  }
});

load();
server.listen(PORT, () => console.log(`ひとりび: http://localhost:${PORT}`));
