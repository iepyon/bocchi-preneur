// db / user の簡易モック。localStorage に保存し、storage イベントで別タブに知らせる。
(() => {
  const params = new URLSearchParams(location.search);
  const U = params.get('u') || 'A';
  const OWNER = 'A';
  const people = { A: '山田', B: '佐藤', C: '田中' };
  const KEY = 'mockdb';
  const load = () => JSON.parse(localStorage.getItem(KEY) || '{}');
  let store = load();
  const listeners = new Set();
  const save = () => { localStorage.setItem(KEY, JSON.stringify(store)); fire(); };
  const fire = () => listeners.forEach((l) => setTimeout(l, 0));
  window.addEventListener('storage', (e) => { if (e.key === KEY) { store = load(); fire(); } });
  const segs = (p) => p.split('/');
  const snapDoc = (path) => ({ id: segs(path).pop(), exists: path in store, data: () => (path in store ? JSON.parse(JSON.stringify(store[path])) : undefined), metadata: { fromCache: false, hasPendingWrites: false } });
  function query(path, filters = [], order = null) {
    const q = {
      where: (f, op, v) => query(path, [...filters, [f, op, v]], order),
      orderBy: (f, d = 'asc') => query(path, filters, [f, d]),
      limit: () => q,
      async get() { return run(); },
      onSnapshot(next) { const l = () => next(run()); listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); },
    };
    function run() {
      let docs = Object.keys(store).filter((p) => p.startsWith(path + '/') && segs(p).length === segs(path).length + 1).map(snapDoc);
      for (const [f, op, v] of filters) docs = docs.filter((d) => (op === '==' ? d.data()[f] === v : true));
      if (order) docs.sort((a, b) => (a.data()[order[0]] - b.data()[order[0]]) * (order[1] === 'desc' ? -1 : 1));
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } };
    }
    return q;
  }
  const db = {
    doc(path) {
      if (segs(path).length % 2) throw new TypeError('odd ' + path);
      return {
        id: segs(path).pop(), path,
        async get() { return snapDoc(path); },
        async set(d) { store[path] = JSON.parse(JSON.stringify(d)); save(); },
        async update(d) { if (!(path in store)) throw { code: 'invalid_argument', message: 'missing' }; store[path] = { ...store[path], ...JSON.parse(JSON.stringify(d)) }; save(); },
        async delete() { delete store[path]; save(); },
        async acquire() { return { acquired: true }; },
        onSnapshot(next) { const l = () => next(snapDoc(path)); listeners.add(l); setTimeout(l, 0); return () => listeners.delete(l); },
        collection: (c) => db.collection(path + '/' + c),
      };
    },
    collection(path) {
      const q = query(path);
      return Object.assign(q, { path, doc: (id) => db.doc(path + '/' + (id || Math.random().toString(36).slice(2, 10))), add: async (d) => { const r = db.doc(path + '/' + Math.random().toString(36).slice(2, 10)); await r.set(d); return r; } });
    },
  };
  const av = (n) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="#b9a88f"/><text x="16" y="21" font-size="14" text-anchor="middle" fill="#fff">${n[0]}</text></svg>`);
  const prof = (id) => { const k = id.replace('u_', ''); return { id, name: people[k] ? people[k] + 'さん'.slice(0, 0) : '', avatarUrl: av(people[k] || '?'), color: '#999', email: null, isMe: k === U, guest: false }; };
  const user = {
    async me() { return { id: 'u_' + U, name: people[U], avatarUrl: av(people[U]), color: '#999', email: null, isOwner: U === OWNER, canEdit: U === OWNER }; },
    async isOwner() { return U === OWNER; },
    async can() { return true; },
    async id() { return 'u_' + U; },
    async profiles(ids) { return Object.fromEntries([...new Set([].concat(ids))].map((i) => [i, prof(i)])); },
    async search(q) { return Object.keys(people).filter((k) => people[k].includes(q) || !q).map((k) => prof('u_' + k)); },
  };
  window.claude = { use: async (n) => (n === 'db' ? db : n === 'user' ? user : null) };
})();
