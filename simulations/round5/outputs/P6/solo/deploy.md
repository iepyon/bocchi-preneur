# 検証版をネットに置く手順（1-A：Vercel＋Supabase 無料枠、2-a：Resend）

1つ終わったら次へ。エラーが出たら、画面のメッセージをそのままチャットに貼ってください。

## 0. 先に確かめること
- [ ] 会社の規程で、社外のサービス（Vercel・Supabase・Resend）に事業の種を預けてよいか。迷ったら事業部長か情報システム部門に一言確認
- [ ] 手元で `supabase db reset` → 2アカウントで動作確認が済んでいる（`05-value-test.md`「手元での確かめ方」）

## 1. Resend（ログイン用メールの送信元）
1. resend.com に登録 → Domains → 個人ドメインを追加（例：`mail.あなたのドメイン`）
2. 表示された DNS レコード（SPF・DKIM）を、ドメインの管理画面に登録 → Resend で Verified になるまで待つ
3. API Keys → 「Sending access」のキーを作る（**この値はチャットに貼らない**）

## 2. Supabase（データの置き場所）
1. supabase.com で新しいプロジェクトを作る（Region：Tokyo）。データベースのパスワードは控えておく
2. 手元のフォルダで、1行ずつ実行：
   ```
   npx supabase login
   npx supabase link --project-ref <プロジェクトのID>
   npx supabase db push
   ```
   `db push` はデータベースの定義だけを送る。手元用のダミー（seed.sql）は送らない（送らないこと）
3. Authentication → URL Configuration
   - Site URL：あとで決まる Vercel の URL（手順3のあとに戻って入れる）
   - Redirect URLs：`https://<VercelのURL>/**`
4. Authentication → Emails → SMTP Settings（独自のメール送信）
   - Host `smtp.resend.com`／Port `465`／Username `resend`／Password ＝ Resend の API キー
   - Sender email：`noreply@<Resendで登録したドメイン>`／Sender name：`種の進捗`
5. Authentication → Emails → Templates
   - 「Magic Link」と「Confirm signup」の本文を、`supabase/templates/magic_link.html` の中身に置き換える（6桁コードが入る）
6. Authentication → Rate Limits：メール送信の上限を 1時間あたり 60通 程度に上げる
7. Project Settings → API：`Project URL` と `anon public` キーを控える（anon キーは公開されても困らない鍵。`service_role` キーは**絶対にどこにも貼らない**）

## 3. Vercel（画面の置き場所）
1. vercel.com に登録
2. 手元のフォルダで：
   ```
   npx vercel
   ```
   質問にはそのまま Enter でよい。終わると URL が出る
3. 環境変数を2つ登録（Vercel の画面の Settings → Environment Variables でも可）：
   `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 本番として公開：
   ```
   npx vercel --prod
   ```
5. 出てきた本番 URL を、手順2-3 の Site URL と Redirect URLs に入れる

## 4. 作り手（管理者）の設定
1. 本番 URL を開き、自分のメールでログイン
2. Supabase の SQL Editor で：
   `insert into admins (user_id) select id from auth.users where email = '<自分のメール>';`
3. `/admin` を開き、検証期間（開始日 12/8・2週）を保存し、部屋を4つ作る

## 5. 本番での確認（参加者に配る前に）
- [ ] 会社のメールと、社外のメール（Gmail など）の両方で、ログインのメールが届く（迷惑メールに入らない）
- [ ] 6桁のコードでもログインできる
- [ ] 2つのアカウントを別々の部屋に入れ、**お互いの書き込みや名前が見えない**
- [ ] 同じ部屋の2アカウントで、書き込みといいねがすぐ出る
- [ ] `/admin` の書いた日数が合っている
- [ ] 確認用アカウントは、確認後に `/admin` から外す（作り手は集計に入らない）

## 6. 招待リンクを配る
- 1人1部屋。部屋ごとのリンクを、その部屋の人にだけ送る
- 一言添える：「会社の機密は書かないでください」「月・水・金の昼に1行書いてください」
