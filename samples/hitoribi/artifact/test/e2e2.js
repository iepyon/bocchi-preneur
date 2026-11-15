const { chromium } = require('playwright');
const fs = require('fs');
const dir = process.env.OUT || __dirname;
const html = fs.readFileSync('/home/user/solo-preneur/samples/hitoribi/artifact/hitoribi.html', 'utf8');
fs.writeFileSync(dir + '/srv/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="mock.js"></script></head><body>' + html + '</body></html>');
fs.copyFileSync(dir + '/mock.js', dir + '/srv/mock.js');
fs.copyFileSync('/home/user/solo-preneur/samples/hitoribi/artifact/lessons.js', dir + '/srv/lessons.js');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const errs = [];
  const page = async (u) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(u + ': ' + e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(u + ' console: ' + m.text())); await p.goto('http://localhost:8765/index.html?u=' + u); await p.waitForTimeout(400); return p; };
  const A = await page('A'); // 運営者（持ち主）
  await A.evaluate(() => localStorage.clear()); await A.reload(); await A.waitForTimeout(400);
  const B = await page('B');
  const shot = (p, n) => p.screenshot({ path: dir + '/' + n + '.png', fullPage: false });
  const step = async (label, fn) => { try { await fn(); console.log('OK  ', label); } catch (e) { console.log('FAIL', label, e.message.split('\n')[0]); } };

  await shot(B, 'h-empty');
  // 条件1：一手を灯し、15分相談を出し、応じてもらえる
  await step('B: 一手を灯す', async () => { await B.fill('#goal', '競合3社の価格を表にする'); await B.selectOption('#goalstep', '1'); await B.click('button:text-is("灯す")'); await B.waitForSelector('.mybar .goal'); });
  await step('A: 一手を灯す', async () => { await A.fill('#goal', '上司向けの1枚を作る'); await A.selectOption('#goalstep', '5'); await A.click('button:text-is("灯す")'); await A.waitForSelector('.mybar .goal'); });
  await step('A: Bを応援', async () => { await A.click('button[aria-label$="を応援する"]'); await A.waitForSelector('button:has-text("応援した")'); });
  await shot(A, 'h-logs');
  await step('B: 学びタブで、いまの状況に合う1枚→読んだ、次へ', async () => {
    await B.click('.tab[data-tab=learn]'); await B.waitForSelector('.learn-card h2');
    await B.waitForSelector('text=いま：ステップ1 コンセプトと課題検証・一手に取り組み中');
    const t1 = await B.textContent('.learn-card h2'); await shot(B, 'h-learn');
    await B.click('button:text-is("読んだ、次へ")'); await B.waitForFunction((t) => document.querySelector('.learn-card h2') && document.querySelector('.learn-card h2').textContent !== t, t1);
    await B.reload(); await B.click('.tab[data-tab=learn]'); await B.waitForSelector('summary:has-text("読んだ学び 1")');
    await B.click('.tab[data-tab=logs]');
  });
  await step('B: 15分相談を1問ずつ出す', async () => {
    await B.click('button:has-text("この一手で15分相談")');
    await shot(B, 'h-wizard1');
    await B.click('.choice:has-text("見てほしい")'); await B.click('.choice:has-text("15分")');
    await B.click('.choice:has-text("業界と規模")'); await B.fill('#afftext', '製造・3000人規模'); await B.click('button:has-text("次へ")');
    await B.click('button:has-text("相談を出す")'); await B.waitForSelector('text=応じてくれる人を待っています');
  });
  await step('A: 応じる', async () => { await A.click('.tab[data-tab=ask]'); await A.click('button:text-is("応じる")'); await A.waitForSelector('text=返事待ち'); });
  await step('B: 応じた人を見て始める', async () => { await B.waitForSelector('text=さんが応じました', { timeout: 3000 }); await shot(B, 'h-offered'); await B.click('button:has-text("この人と始める")'); await B.waitForSelector('#timer'); });
  // 条件2：相談部屋で文字とリンク、動き出せた
  await step('A: 相談部屋へ入る', async () => { await A.waitForSelector('button:has-text("相談部屋へ")', { timeout: 3000 }); await A.click('button:has-text("相談部屋へ")'); await A.waitForSelector('#timer'); });
  await step('A: ひとこと送る', async () => { await A.fill('#msg', '画面を見せてもらえますか'); await A.press('#msg', 'Enter'); await A.waitForSelector('.msg.mine'); });
  await step('B: リンクを貼る（確認なしは拒否）', async () => {
    await B.click('summary:has-text("会議・共有リンクを貼る")'); await B.fill('#link', 'https://claude.ai/artifact/example');
    await B.click('button:text-is("貼る")'); await B.waitForSelector('.toast.err');
    await B.check('#linkok'); await B.click('button:text-is("貼る")'); await B.waitForSelector('.linkbox');
  });
  await step('A: リンクと文字が見える', async () => { await A.waitForSelector('.linkbox', { timeout: 3000 }); });
  await step('B: 返事を受け取る', async () => { await B.waitForSelector('.msg:not(.mine)', { timeout: 3000 }); await shot(B, 'h-room'); });
  await step('B: お礼＋動き出せたで終える', async () => { await B.click('button:text-is("ありがとう")'); await B.click('button:text-is("動き出せた")'); await B.waitForSelector('text=止まっていた一手、できましたか'); await shot(B, 'h-askdone'); });
  await step('A: 相談が終わったと分かる', async () => { await A.waitForSelector('text=相談は終わりました', { timeout: 3000 }); await A.waitForSelector('text=「ありがとう」が届きました', { timeout: 3000 }); });
  // 条件3：できましたか → できた
  await step('B: 開き直しても「できましたか」が出て、できたにする', async () => { await B.reload(); await B.waitForSelector('text=止まっていた一手、できましたか'); await B.click('.mybar button:text-is("できた")'); await B.waitForSelector('.celebrate'); await shot(B, 'h-done'); });
  await step('B: 通過記録になる', async () => { await B.click('.tab[data-tab=notes]'); await B.waitForSelector('.chip.ok:has-text("コンセプトと課題検証")'); await shot(B, 'h-notes'); });
  // やめる決断の学び
  await step('B: 次の一手を灯し「やめる」→学びを書く→公開前は通知に出る', async () => {
    await B.click('.tab[data-tab=logs]'); await B.fill('#goal', '部長向けの資料を作る'); await B.selectOption('#goalstep', '5'); await B.click('button:text-is("灯す")'); await B.waitForSelector('.mybar button:text-is("やめる")');
    await B.click('.mybar button:text-is("やめる")'); await B.waitForSelector('h1:text-is("やめる")'); await shot(B, 'h-quit');
    await B.fill('#l1', '部長に見せる前に使う人に聞くべきだった'); await B.fill('#l2', '過去の出来事を聞く質問'); await B.fill('#l3', '資料の見栄え');
    await B.click('button:text-is("やめる決断を記録する")'); await B.waitForSelector('text=やめる決断をしました'); await B.waitForSelector('text=やめた。次の一手は？');
    await B.click('.tab[data-tab=notes]'); await B.waitForSelector('text=運営者の確認待ち');
    await B.click('.tab[data-tab=learn]'); await B.waitForSelector('text=やめる決断をした'); await B.waitForSelector('.learn-card h2:text-is("やめることは、失敗ではない")'); await shot(B, 'h-learn-quit');
  });
  await step('A: 運営で公開→指標が出る', async () => { await A.click('button.linkbtn:text-is("運営")'); await A.waitForSelector('text=公開待ちの学び 1'); await shot(A, 'h-admin'); await A.click('button:text-is("公開する")'); await A.waitForSelector('text=公開待ちの学び 0'); await A.waitForSelector('text=48時間以内に一手をできた【行動】：1'); });
  await step('A: 行動ログに学びが混ざり、頭を下げる→Bに通知', async () => { await A.click('.tab[data-tab=logs]'); await A.waitForSelector('.lesson:has-text("部長に見せる前に")'); await shot(A, 'h-feed'); await A.click('button:text-is("頭を下げる")'); await B.click('.tab[data-tab=notes]'); await B.waitForSelector('text=頭を下げました', { timeout: 3000 }); });
  await step('A: 経験者の印を付ける', async () => { await A.click('button.linkbtn:text-is("運営")'); await A.fill('#expq', '田中'); await A.waitForSelector('text=経験者として保存'); await A.click('.card:has-text("田中") label.chip:has-text("5") input'); await A.click('button:text-is("経験者として保存")'); await A.waitForSelector('text=ステップ 5'); });
  console.log('errors:', errs);
  await b.close();
})();
