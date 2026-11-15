// ひとりび 試作品のフロントエンド。依存なし。文字はすべて textContent で入れる。
(() => {
  const L = window.LEXICON;
  const $view = document.getElementById('view');
  const $who = document.getElementById('who');
  const $badge = document.getElementById('badge');
  const $toast = document.getElementById('toast');

  // ---------- 道具 ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* 保存できなくても動く */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* noop */ } },
  };
  let token = store.get('hitoribi.token');

  async function api(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Token': token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      store.del('hitoribi.token');
      token = null;
    }
    if (!res.ok) throw new Error(data.error || '通信に失敗しました');
    return data;
  }
  let toastTimer;
  function toast(msg, err) {
    $toast.textContent = msg;
    $toast.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($toast.className = 'toast'), 2600);
  }
  async function act(fn, okMsg) {
    try {
      await fn();
      if (okMsg) toast(okMsg);
      await refresh();
    } catch (e) {
      toast(e.message, true);
    }
  }
  function ago(t) {
    const m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return 'たった今';
    if (m < 60) return `${m}分前`;
    const hr = Math.floor(m / 60);
    if (hr < 24) return `${hr}時間前`;
    return `${Math.floor(hr / 24)}日前`;
  }
  const step = (id) => L.STEPS.find((s) => s.id === id);
  const stepLabel = (id) => `${step(id).place}・${step(id).name}`;
  function stepSelect(name, value) {
    return h('select', { name }, L.STEPS.map((s) => h('option', { value: s.id, selected: s.id === value }, `${s.id} ${s.place}（${s.name}）`)));
  }

  // ---------- 状態 ----------
  let world = null;
  async function ensureEntered() {
    if (token) return;
    const r = await api('POST', '/api/enter');
    token = r.token;
    store.set('hitoribi.token', token);
  }
  async function refresh() {
    await ensureEntered();
    try {
      world = await api('GET', '/api/world');
    } catch (e) {
      if (!token) {
        await ensureEntered();
        world = await api('GET', '/api/world');
      } else throw e;
    }
    $who.textContent = `あなたは「${world.me.handle}」`;
    $badge.hidden = !world.unread;
    $badge.textContent = world.unread;
    render();
  }

  // ---------- 画面 ----------
  function route() {
    const [tab, arg] = (location.hash.slice(1) || 'fire').split('/');
    return { tab, arg };
  }
  function render() {
    const { tab, arg } = route();
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === (tab === 'room' ? 'signs' : tab)));
    $view.replaceChildren(
      tab === 'path' && arg ? viewStep(Number(arg)) :
      tab === 'path' ? viewPath() :
      tab === 'signs' ? viewSigns() :
      tab === 'room' ? viewRoomShell(arg) :
      tab === 'echoes' ? viewEchoesShell() :
      viewFire()
    );
  }

  // 灯：この画面で一番大事なのは「今日の一手を灯すこと」（03-wireframe.md）
  function viewFire() {
    const mine = world.me.fire;
    const others = world.fires.filter((f) => !f.mine);
    const head = mine ? fireLit(mine) : fireForm();
    return h('div', {},
      head,
      h('p', { class: 'count' }, 'いま', h('b', {}, others.length), 'つの灯がともっている'),
      h('h2', {}, 'ほかの灯'),
      others.length ? others.map(fireItem) : h('p', { class: 'empty' }, 'まだ誰もいない。あなたが最初の灯になる。'),
    );
  }
  function fireForm(prefill) {
    const goal = h('input', { type: 'text', name: 'goal', maxlength: 40, placeholder: '例：撤退基準を紙に書く', value: prefill?.goal || '' });
    const sel = stepSelect('step', prefill?.step || 1);
    return h('section', { class: 'card glow stack' },
      h('h1', {}, '今日の一手を灯す'),
      h('p', { class: 'lead' }, '今日やることを1つだけ。誰かが黙ってあたりに来ます。灯は24時間で消えます。'),
      h('label', { class: 'field' }, '今日の一手（40字まで）', goal),
      h('label', { class: 'field' }, 'いまいる場所', sel),
      h('button', {
        class: 'btn primary block',
        onclick: () => act(async () => { await api('POST', '/api/fires', { goal: goal.value, step: Number(sel.value) }); editingFire = false; }, '灯をともした'),
      }, '灯す'),
    );
  }
  let editingFire = false;
  function fireLit(f) {
    if (editingFire) return fireForm(f);
    return h('section', { class: 'hero' },
      h('span', { class: 'ember big' + (f.done ? ' dim' : ''), 'aria-hidden': 'true' }),
      h('div', { class: 'muted' }, stepLabel(f.step)),
      h('div', { class: 'goal' }, f.goal),
      h('div', { class: 'muted' }, f.done ? '果たした。今日はもう休んでいい。' : f.warmth ? `${f.warmth}人があなたの灯にあたっていった` : 'まだ誰もあたりに来ていない'),
      h('div', { class: 'row center' },
        !f.done && h('button', { class: 'btn', onclick: () => act(() => api('POST', `/api/fires/${f.id}/done`), '一手を果たした') }, '果たした'),
        h('button', { class: 'btn ghost', onclick: () => { editingFire = true; render(); } }, '灯し直す'),
      ),
    );
  }
  function fireItem(f) {
    return h('article', { class: 'card fire-item' },
      h('span', { class: 'ember' + (f.done ? ' dim' : ''), 'aria-hidden': 'true' }),
      h('div', { class: 'grow' },
        h('div', { class: 'goal' }, f.goal),
        h('div', { class: 'meta' }, `${f.handle}・${step(f.step).place}・${ago(f.litAt)}${f.done ? '・果たした' : ''}`),
      ),
      h('button', {
        class: 'btn' + (f.warmedByMe ? ' on' : ''),
        disabled: f.warmedByMe,
        'aria-label': `${f.handle}の灯にあたる`,
        onclick: () => act(() => api('POST', `/api/fires/${f.id}/warm`), '手をかざした'),
      }, f.warmedByMe ? 'あたった' : 'あたる', h('span', { class: 'muted small' }, ` ${f.warmth}`)),
    );
  }

  // 道：11ステップを場所として歩く
  function viewPath() {
    const phases = [...new Set(L.STEPS.map((s) => s.phase))];
    return h('div', {},
      h('h1', {}, '道'),
      h('p', { class: 'lead' }, '先を歩いた人の書き置きと、引き返した人の痕跡が残っています。'),
      phases.map((ph) => h('section', { class: 'phase' },
        h('p', { class: 'phase-name' }, ph),
        L.STEPS.filter((s) => s.phase === ph).map((s) => {
          const notes = world.notes.filter((n) => n.step === s.id).length;
          const traces = world.traces.filter((t) => t.step === s.id).length;
          const fires = world.fires.filter((f) => f.step === s.id).length;
          return h('button', { class: 'step', onclick: () => (location.hash = `path/${s.id}`) },
            h('span', { class: 'num' }, s.id),
            h('span', { class: 'grow' }, h('div', { class: 'place' }, s.place), h('div', { class: 'meta' }, s.name)),
            h('span', { class: 'stats' },
              fires ? h('span', { class: 'hot' }, `灯${fires}`) : null,
              h('span', {}, `書${notes}`),
              traces ? h('span', {}, `痕${traces}`) : null,
            ),
          );
        }),
      )),
    );
  }

  let composer = null; // 'note' | 'trace' | null
  function viewStep(id) {
    const s = step(id);
    if (!s) return h('p', { class: 'empty' }, 'その場所はありません');
    const notes = world.notes.filter((n) => n.step === id);
    const traces = world.traces.filter((t) => t.step === id);
    const fires = world.fires.filter((f) => f.step === id && !f.mine);
    return h('div', {},
      h('button', { class: 'back', onclick: () => { composer = null; location.hash = 'path'; } }, '← 道に戻る'),
      h('h1', {}, s.place),
      h('p', { class: 'lead' }, `${s.phase}／ステップ${s.id} ${s.name}`),
      fires.length ? h('p', { class: 'muted' }, `いまここで ${fires.length} つの灯がともっている`) : null,
      h('div', { class: 'row' },
        h('button', { class: 'btn' + (composer === 'note' ? ' on' : ''), onclick: () => { composer = composer === 'note' ? null : 'note'; render(); } }, '書き置きを残す'),
        h('button', { class: 'btn ghost' + (composer === 'trace' ? ' on' : ''), onclick: () => { composer = composer === 'trace' ? null : 'trace'; render(); } }, 'ここで引き返した'),
      ),
      composer === 'note' ? noteComposer(id) : null,
      composer === 'trace' ? traceComposer(id) : null,
      h('h2', {}, '書き置き'),
      notes.length ? notes.map(noteItem) : h('p', { class: 'empty' }, 'まだ書き置きはない。最初の一言を残せる。'),
      h('h2', {}, '痕跡'),
      h('p', { class: 'muted' }, 'ここでやめた人、方向を変えた人が残した3行。'),
      traces.length ? traces.map(traceItem) : h('p', { class: 'empty' }, 'ここで引き返した人はまだいない。'),
    );
  }
  function noteItem(n) {
    return h('article', { class: 'card' },
      h('div', { class: 'note' }, n.text),
      h('div', { class: 'row between' },
        h('span', { class: 'meta' }, `${ago(n.createdAt)}・役に立った ${n.useful}`),
        h('span', { class: 'row' },
          !n.mine && h('button', {
            class: 'btn' + (n.usefulByMe ? ' on' : ''), disabled: n.usefulByMe,
            onclick: () => act(() => api('POST', `/api/notes/${n.id}/useful`), '書き手に届いた'),
          }, n.usefulByMe ? '届けた' : '役に立った'),
          !n.mine && h('button', { class: 'btn ghost small', onclick: () => act(() => api('POST', '/api/report', { type: 'note', id: n.id }), '報告しました') }, '報告'),
        ),
      ),
    );
  }
  function traceItem(t) {
    return h('article', { class: 'card trace' },
      h('dl', {},
        h('dt', {}, 'わかったこと'), h('dd', {}, t.learned),
        h('dt', {}, '次に持っていくもの'), h('dd', {}, t.carry),
        h('dt', {}, '置いていくもの'), h('dd', {}, t.drop),
      ),
      h('div', { class: 'row between' },
        h('span', { class: 'meta' }, `${ago(t.createdAt)}・頭を下げた人 ${t.bows}`),
        h('span', { class: 'row' },
          !t.mine && h('button', {
            class: 'btn' + (t.bowedByMe ? ' on' : ''), disabled: t.bowedByMe,
            onclick: () => act(() => api('POST', `/api/traces/${t.id}/bow`), '頭を下げた'),
          }, t.bowedByMe ? '下げた' : '頭を下げる'),
          !t.mine && h('button', { class: 'btn ghost small', onclick: () => act(() => api('POST', '/api/report', { type: 'trace', id: t.id }), '報告しました') }, '報告'),
        ),
      ),
    );
  }
  function wordSelect(name) {
    return h('select', { name }, Object.entries(L.WORDS).map(([g, ws]) => h('optgroup', { label: g }, ws.map((w) => h('option', { value: w }, w)))));
  }
  function tplSelect(name) {
    return h('select', { name }, L.TEMPLATES.map((t, i) => h('option', { value: i }, t.replace('{w}', '＿＿'))));
  }
  function noteComposer(stepId) {
    const t1 = tplSelect('t1'), w1 = wordSelect('w1');
    const conj = h('select', { name: 'conj' }, L.CONJ.map((c) => h('option', { value: c }, c || '（ここで終える）')));
    const t2 = tplSelect('t2'), w2 = wordSelect('w2');
    const second = h('div', { class: 'stack', hidden: true }, h('label', { class: 'field' }, '定型文', t2), h('label', { class: 'field' }, '語', w2));
    const preview = h('div', { class: 'preview', 'aria-live': 'polite' });
    const update = () => {
      second.hidden = !conj.value;
      let s = L.TEMPLATES[t1.value].replace('{w}', w1.value);
      if (conj.value) s += `、${conj.value}　` + L.TEMPLATES[t2.value].replace('{w}', w2.value);
      preview.textContent = s;
    };
    [t1, w1, conj, t2, w2].forEach((el) => el.addEventListener('change', update));
    update();
    return h('section', { class: 'card glow stack' },
      h('h3', {}, '書き置き'),
      h('p', { class: 'muted' }, '自由には書けません。決まった言葉を組み合わせて、あとから来る人に残します。'),
      h('label', { class: 'field' }, '定型文', t1),
      h('label', { class: 'field' }, '語', w1),
      h('label', { class: 'field' }, 'つなぎ', conj),
      second,
      preview,
      h('button', {
        class: 'btn primary block',
        onclick: () => act(async () => {
          await api('POST', '/api/notes', { step: stepId, t1: Number(t1.value), w1: w1.value, conj: conj.value, t2: Number(t2.value), w2: w2.value });
          composer = null;
        }, '書き置きを残した'),
      }, 'ここに残す'),
    );
  }
  function traceComposer(stepId) {
    const f = (name, label, ph) => {
      const el = h('input', { type: 'text', name, maxlength: 60, placeholder: ph });
      return [el, h('label', { class: 'field' }, label, el)];
    };
    const [a, la] = f('learned', 'わかったこと', '例：友人の「欲しい」は先行課金に変わらなかった');
    const [b, lb] = f('carry', '次に持っていくもの', '例：過去の出来事を聞く台本');
    const [c, lc] = f('drop', '置いていくもの', '例：自分が欲しい＝みんな欲しい、という思い込み');
    return h('section', { class: 'card stack' },
      h('h3', {}, '痕跡を残す'),
      h('p', { class: 'muted' }, 'やめることは失敗ではない。名前は出ません。3行とも60字まで。'),
      la, lb, lc,
      h('button', {
        class: 'btn primary block',
        onclick: () => act(async () => {
          await api('POST', '/api/traces', { step: stepId, learned: a.value, carry: b.value, drop: c.value });
          composer = null;
        }, '痕跡を残した'),
      }, '残して、次へ行く'),
    );
  }

  // サイン：時間を区切った助け合い
  function viewSigns() {
    const mine = world.signs.filter((s) => s.mine || s.roomId);
    const open = world.signs.filter((s) => !s.mine && s.status === 'open');
    const hasOpen = world.signs.some((s) => s.mine && s.status === 'open');
    return h('div', {},
      h('h1', {}, '救援サイン'),
      h('p', { class: 'lead' }, '15分か30分だけ、誰かの世界に呼ばれに行く。終わったら、しぐさを1つ送ってそれぞれの世界に帰ります。'),
      mine.length ? h('div', {}, h('h2', {}, 'あなたのサイン・合流'), mine.map(signItem)) : null,
      hasOpen ? null : signForm(),
      h('h2', {}, `いま出ているサイン（${open.length}）`),
      open.length ? open.map(signItem) : h('p', { class: 'empty' }, 'いまは誰も呼んでいない。静かな夜だ。'),
    );
  }
  function signItem(s) {
    const kind = L.SIGN_KINDS.find((k) => k.id === s.kind);
    let action;
    if (s.roomId) action = h('button', { class: 'btn primary', onclick: () => (location.hash = `room/${s.roomId}`) }, '合流部屋へ');
    else if (s.mine) action = h('button', { class: 'btn ghost', onclick: () => act(() => api('POST', `/api/signs/${s.id}/cancel`), 'サインを消した') }, '取り下げる');
    else action = h('button', {
      class: 'btn primary',
      onclick: () => act(async () => {
        const r = await api('POST', `/api/signs/${s.id}/answer`);
        location.hash = `room/${r.roomId}`;
      }, '応じた'),
    }, '応じる');
    return h('article', { class: 'card sign' },
      h('div', { class: 'row between' },
        h('div', { class: 'grow' },
          h('div', { class: 'kind' }, kind.label),
          h('div', { class: 'muted small' }, kind.hint),
          h('div', {},
            h('span', { class: 'chip' }, `${s.minutes}分`),
            h('span', { class: 'chip' }, step(s.step).place),
            s.word ? h('span', { class: 'chip' }, s.word) : null,
          ),
          h('div', { class: 'meta' }, `${s.mine ? 'あなた' : s.handle}・${ago(s.createdAt)}${s.status === 'answered' ? '・応じてもらえた' : ''}`),
        ),
        action,
      ),
    );
  }
  function signForm() {
    let kind = L.SIGN_KINDS[0].id;
    let minutes = 15;
    const kindBtns = h('div', { class: 'seg' });
    const drawKinds = () => kindBtns.replaceChildren(...L.SIGN_KINDS.map((k) => h('button', { class: 'btn' + (k.id === kind ? ' on' : ''), 'aria-pressed': String(k.id === kind), onclick: () => { kind = k.id; drawKinds(); } }, k.label)));
    drawKinds();
    const minBtns = h('div', { class: 'seg' });
    const drawMins = () => minBtns.replaceChildren(...L.SIGN_MINUTES.map((m) => h('button', { class: 'btn' + (m === minutes ? ' on' : ''), 'aria-pressed': String(m === minutes), onclick: () => { minutes = m; drawMins(); } }, `${m}分`)));
    drawMins();
    const sel = stepSelect('step', world.me.fire?.step || 1);
    const word = h('select', { name: 'word' }, h('option', { value: '' }, '（なし）'), Object.entries(L.WORDS).map(([g, ws]) => h('optgroup', { label: g }, ws.map((w) => h('option', { value: w }, w)))));
    return h('section', { class: 'card glow stack' },
      h('h3', {}, 'サインを出す'),
      kindBtns,
      minBtns,
      h('label', { class: 'field' }, 'いまいる場所', sel),
      h('label', { class: 'field' }, 'ひとこと（語を選ぶ）', word),
      h('button', { class: 'btn primary block', onclick: () => act(() => api('POST', '/api/signs', { kind, minutes, step: Number(sel.value), word: word.value }), 'サインを出した') }, 'サインを出す'),
      h('p', { class: 'muted small' }, 'サインは2時間で消えます。一度に出せるのは1つだけ。'),
    );
  }

  // 合流部屋：期限つき。終わると中身ごと消える。
  let roomPoll = null;
  function viewRoomShell(rid) {
    const box = h('div', {}, h('p', { class: 'empty' }, '部屋に入っています……'));
    loadRoom(rid, box);
    clearInterval(roomPoll);
    roomPoll = setInterval(() => {
      if (route().tab !== 'room') return clearInterval(roomPoll);
      if (document.activeElement?.name === 'msg') return; // 入力中は再描画しない
      loadRoom(rid, box);
    }, 4000);
    return box;
  }
  async function loadRoom(rid, box) {
    try {
      const r = await api('GET', `/api/rooms/${rid}`);
      box.replaceChildren(roomView(r, box));
    } catch (e) {
      box.replaceChildren(
        h('button', { class: 'back', onclick: () => (location.hash = 'signs') }, '← サインに戻る'),
        h('p', { class: 'empty' }, e.message),
      );
    }
  }
  function roomView(r, box) {
    const kind = r.sign ? L.SIGN_KINDS.find((k) => k.id === r.sign.kind) : null;
    const left = Math.max(0, r.endsAt - Date.now());
    const mm = String(Math.floor(left / 60000)).padStart(2, '0');
    const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
    const input = h('input', { type: 'text', name: 'msg', maxlength: 140, placeholder: 'ことばを送る（140字まで）' });
    const send = () => act(async () => {
      const nr = await api('POST', `/api/rooms/${r.id}/messages`, { text: input.value });
      box.replaceChildren(roomView(nr, box));
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) send(); });
    const myGesture = r.gestures.find((g) => g.mine);
    const theirGesture = r.gestures.find((g) => !g.mine);
    return h('div', {},
      h('button', { class: 'back', onclick: () => (location.hash = 'signs') }, '← サインに戻る'),
      h('h1', {}, r.host ? `${r.other}が来てくれた` : `${r.other}の世界にいる`),
      h('p', { class: 'lead' }, kind ? `${kind.label}・${stepLabel(r.sign.step)}${r.sign.word ? '・' + r.sign.word : ''}` : ''),
      h('div', { class: 'room-timer', 'aria-label': '残り時間' }, r.closed ? '時間' : `${mm}:${ss}`),
      h('p', { class: 'muted small' }, '連絡先の交換はできません。部屋は時間が来ると、10分後に中身ごと消えます。'),
      h('section', { class: 'card' },
        h('div', { class: 'msgs' }, r.messages.length ? r.messages.map((m) => h('div', { class: 'msg' + (m.mine ? ' mine' : '') }, m.text)) : h('p', { class: 'muted' }, 'まだ何も話していない。黙って並ぶのもいい。')),
        r.closed ? null : h('div', { class: 'row' }, h('div', { class: 'grow' }, input), h('button', { class: 'btn primary', onclick: send }, '送る')),
      ),
      theirGesture ? h('p', { class: 'count' }, `${r.other}は「${theirGesture.g}」をした`) : null,
      h('h2', {}, r.closed ? '別れのしぐさ' : '終えるとき'),
      myGesture
        ? h('p', { class: 'muted' }, `あなたは「${myGesture.g}」をした。自分の世界に戻ろう。`)
        : h('div', { class: 'seg' }, L.GESTURES.map((g) => h('button', {
          class: 'btn',
          onclick: () => act(async () => {
            if (!r.closed) await api('POST', `/api/rooms/${r.id}/close`);
            const nr = await api('POST', `/api/rooms/${r.id}/gesture`, { g });
            box.replaceChildren(roomView(nr, box));
          }, `「${g}」をした`),
        }, g))),
    );
  }

  // 残響：自分に返ってきたもの
  function viewEchoesShell() {
    const box = h('div', {}, h('h1', {}, '残響'), h('p', { class: 'empty' }, '耳を澄ませています……'));
    api('GET', '/api/echoes').then((list) => {
      $badge.hidden = true;
      box.replaceChildren(
        h('h1', {}, '残響'),
        h('p', { class: 'lead' }, 'あなたの灯・書き置き・痕跡が、誰かに届いた跡。誰だったかは分かりません。'),
        h('div', {}, list.length
          ? list.map((e) => h('article', { class: 'card echo' + (e.read ? '' : ' unread') }, h('span', { class: 'dot', 'aria-hidden': 'true' }), h('div', {}, h('div', {}, e.text), h('div', { class: 'meta' }, ago(e.at)))))
          : h('p', { class: 'empty' }, 'まだ何も返ってきていない。灯をともすか、書き置きを残してみよう。')),
      );
    }).catch((e) => toast(e.message, true));
    return box;
  }

  // ---------- 起動 ----------
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
    editingFire = false;
    composer = null;
    location.hash = b.dataset.tab;
  }));
  window.addEventListener('hashchange', () => {
    render();
    window.scrollTo(0, 0);
    if (!['room', 'echoes'].includes(route().tab)) refresh().catch(() => {}); // 移動のたびに最新を読む
  });
  refresh().catch((e) => {
    $view.replaceChildren(h('p', { class: 'empty' }, `つながりませんでした：${e.message}`));
  });
  setInterval(() => { if (!['room', 'echoes'].includes(route().tab) && !composer && !editingFire && !document.activeElement?.matches('input,select')) refresh().catch(() => {}); }, 20000);
})();
