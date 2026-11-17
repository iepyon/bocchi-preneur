### 本人
/bocchi-preneur:start 社内の経費精算で、領収書と申請内容の食い違いを見つけるツールを作りたい。経理が毎月2日かけて目で照合している

- TOOL Read: <repo>/plugins/bocchi-preneur/skills/bocchi-preneur/SKILL.md
- TOOL Bash: ls -la && git status | head -5 && ls docs/bocchi 2>&1; cat <repo>/plugins/bocchi-preneur/skills/bocchi-preneur/references/00-setup.md
- ERR This Bash command contains multiple operations. The following part requires approval: head -5 && ls docs/bocchi 2>&1; cat <repo>/plugins/bocchi-preneur/skills/bocchi-preneur/references/00-s
- TOOL Bash: ls -la A
- TOOL Read: <repo>/plugins/bocchi-preneur/skills/bocchi-preneur/references/00-setup.md
- TOOL Read: <repo>/plugins/bocchi-preneur/skills/bocchi-preneur/templates/state.md
- TOOL Bash: mkdir -p docs/bocchi/decisions && printf '.env\n.env.*\n*.key\n*.pem\nnode_modules/\n.DS_Store\n' > .gitignore && cp <repo>/plugins/bocchi-preneur/skills/bocchi-preneur/templates/state.md d
- ERR This Bash command contains multiple operations. The following parts require approval: printf '.env\n.env.*\n*.key\n*.pem\nnode_modules/\n.DS_Store\n', cp <repo>/plugins/bocchi-preneur/s
- TOOL Write: A/.gitignore
- TOOL Write: A/docs/bocchi/state.md
- TOOL Write: A/docs/bocchi/decisions/.gitkeep

### 伴走役
作業場所の準備ができました。このフォルダはすでに Git で変更履歴が残る状態だったので、秘密情報のファイルを履歴から外す設定（`.gitignore`）と、記録の置き場所（`docs/bocchi/state.md`）を作りました。

**進め方は3つです**
- **決めるのはあなた**：誰のどんな課題か、価値があるか、続けるかやめるか。この判断をAIが代わりに書くことはありません。
- **作るのはAI**：設計、実装、テストはAIが引き受けます。
- **確かめるのは現場**：経理の方が実際にどう照合しているかは、チャットではなく現場で確かめます。

---

**受け止め（要約）**
経理の方が毎月2日かけて、領収書と経費の申請内容を目で突き合わせています。このツールでは、その食い違いを機械で見つけて照合の手間を減らしたい、というお話ですね。

`［開始前｜開始時の分岐｜4問中 0問回答］`

進め方を決めるため、次の4つを選んでください（例：「1-b, 2-a, 3-c, 4：週3時間・試作まで3週間」）。

**1. 外販か社内か**
- a. 外販（他社にも売る新規事業）
- b. 社内ツール（自社の業務改善）

※お話からは b に見えます。将来の外販も考えているなら a を選んでください。

**2. 市場**
- a. 日本
- b. 海外
- c. 両方

**3. 目標**
- a. 生活費を賄う小さな事業
- b. 本業の新規事業（社内ツールなら「本業の業務改善」）
- c. まずは作り切る修行

**4. 時間**
- 週に使える時間：＿＿時間
- タイムボックス（例：試作品まで3週間）：＿＿

### 本人
社内ツール、日本、まずは作り切る修行、週5時間で試作品まで4週間

- TOOL Read: <repo>/plugins/bocchi-preneur/skills/bocchi-preneur/references/01-concept.md
- TOOL Edit: A/docs/bocchi/state.md
- TOOL Edit: A/docs/bocchi/state.md
- TOOL Edit: A/docs/bocchi/state.md
- TOOL Edit: A/docs/bocchi/state.md

### 伴走役
前提が決まり、`docs/bocchi/state.md` に記録しました。
- 社内ツール
- 日本
- まずは作り切る修行
- 週5時間（試作品まで4週間で約20時間。目安は12月14日ごろ）

社内ツールなので、ステップ6の「価格」は「導入効果の試算と、誰の承認が要るか」に、ステップ10の「ローンチ」は「社内展開」に置き換えて進めます。

---

`［工程1 調査｜ステップ1 コンセプト｜ゲート 0/8］`

このツールで助けたいのは、具体的にどんな人ですか。
「経理部」のようなまとまりではなく、顔が浮かぶ1人で答えてください。たとえば、その人の役割や、月末に何をしているかなどです。

### 本人
経理の佐藤さんたち3人が、月初に申請300件を1件ずつ領収書の画像と見比べていて、先月も金額の打ち間違いを2件見逃して差し戻しになった

- TOOL Write: A/docs/bocchi/01-concept.md

### 伴走役
対象の人物と困っている場面が、具体的に言えています。`docs/bocchi/01-concept.md` に下書きとして残しました。
この時点では、どれもあなたの認識なので【推測】を付けています。差し戻しの記録などが見つかれば、実際に起きたことの証拠として【行動】に上げられます。

`［工程1 調査｜ステップ1 コンセプト｜ゲート 2/8］`
（「対象が1種類に絞れている」「課題が具体的な場面で語られている」の2つを満たしました）

先月見逃した2件について聞かせてください。
見逃した打ち間違いは、**誰が、いつ、どうやって気づきましたか**。また、気づいたあとの差し戻しや修正に、**誰の時間がどれくらいかかりましたか**。
分かる範囲で構いません。分からない部分は「分からない」と答えてください。

