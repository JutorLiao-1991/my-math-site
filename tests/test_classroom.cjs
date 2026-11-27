const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'battle_log.js'), 'utf8');

function load(registered) {
  const store = new Map(), calls = [];
  if (registered) store.set('jutor-classroom-v1', JSON.stringify({ room: 'AbCdEfGhJkMnPqRsTuVwXy', name: 'iPad Air 2', id: 'dev12345abc' }));
  const win = {
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    location: { pathname: '/elementary/division_grade3.html' },
    document: { title: '鳩特數理｜除法（三年級）', visibilityState: 'visible', addEventListener() {} },
    setInterval() { return 0; },
    fetch: (url, opts) => { calls.push({ url, method: opts.method, body: JSON.parse(opts.body) }); return Promise.resolve({ ok: true }); }
  };
  win.window = win;
  vm.runInNewContext(SRC, win);
  return { win, calls, store };
}

test('unregistered devices never send anything', () => {
  const { win, calls, store } = load(false);
  win.JutorLog.practice(true); win.JutorLog.step(false, { s: '估商', q: '37÷9' }); win.JutorLog.exam({ score: 90, full: 100 });
  assert.equal(calls.length, 0);
  assert.equal(JSON.parse(store.get('jutor-battle-log-v1')).e.length, 2, 'steps are not kept in the local battle log');
});

test('registered iPads report presence, steps, questions and exams under the classroom code', () => {
  const { win, calls } = load(true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/classroom\/AbCdEfGhJkMnPqRsTuVwXy\/devices\/dev12345abc\.json$/);
  assert.equal(calls[0].method, 'PUT');
  assert.equal(calls[0].body.name, 'iPad Air 2');
  assert.equal(calls[0].body.n, '除法（三年級）');
  assert.deepEqual(calls[0].body.t, { '.sv': 'timestamp' });
  win.JutorLog.step(false, { s: '估商：寫出商', q: '用直式算算看：37÷9＝（　）…（　）' + 'x'.repeat(200) });
  win.JutorLog.practice(true);
  win.JutorLog.exam({ score: 90, full: 100, correct: 9, count: 10, secs: 321 });
  const posts = calls.filter(c => c.method === 'POST').map(c => c.body);
  assert.equal(posts.length, 3);
  assert.ok(calls.filter(c => c.method === 'POST').every(c => /\/log\/\d{4}-\d{2}-\d{2}\/dev12345abc\.json$/.test(c.url)));
  assert.equal(posts[0].m, 's'); assert.equal(posts[0].ok, 0); assert.equal(posts[0].s, '估商：寫出商'); assert.ok(posts[0].q.length <= 80);
  assert.equal(posts[1].m, 'p'); assert.equal(posts[1].ok, 1);
  assert.equal(posts[2].m, 'e'); assert.equal(posts[2].s, 90); assert.equal(posts[2].q, 10);
});

test('malformed registrations are ignored', () => {
  const { win, calls, store } = load(false);
  store.set('jutor-classroom-v1', JSON.stringify({ room: 'short', name: 'x', id: 'dev12345abc' }));
  win.JutorLog.step(true);
  assert.equal(calls.length, 0);
});
