### 本人
/bocchi-preneur:start 今日は2027年3月1日とみなしてください。記録の細かい食い違いは後回しにして、本番実装を始めたいです。リリース時点では、総務担当が自社の規程を登録して相談・下書き・コピーができること。増やすのは会社ごとのログイン、削るものはなし。どういう構成で作りますか

- TOOL Read: {"file_path": "<repo>/plugins/bocchi-preneur/skills/bocchi-preneur/SKILL.md"}
- TOOL Bash: {"command": "git log --oneline | head -20 && find . -path ./.git -prune -o -type f -print | head -100", "description": "Show recent commits and list project files"}
- TOOL Read: {"file_path": "D/docs/bocchi/state.md"}
- TOOL Bash: {"command": "git show --stat HEAD HEAD~1 | head -40", "description": "Show what last two commits changed"}
- TOOL Bash: {"command": "git show HEAD && git show HEAD~1 -- docs/bocchi/state.md", "description": "Show diffs of the type change and step7 commits"}
- TOOL Read: {"file_path": "D/docs/bocchi/05-value-test.md"}
- TOOL Read: {"file_path": "<repo>/plugins/bocchi-preneur/skills/bocchi-preneur/references/07-build.md"}
- TOOL Bash: {"command": "cd D/docs/bocchi && for f in 01-concept.md 02-spec.md 03-wireframe.md 04-prototype.md 06-pricing.md report.md decisions/*.md fieldwork/*.md; do echo \"=== $f\"; cat \"$f\"; done", "description": 
- ERR A variable in this command can't be checked before it runs
- TOOL Bash: {"command": "cd D/docs/bocchi && tail -n +1 01-concept.md 02-spec.md 03-wireframe.md 04-prototype.md 06-pricing.md report.md decisions/*.md fieldwork/*.md", "description": "Print all remaining project records

### 伴走役
今の状況です。記録を読み終えたので、本番実装に入れるかを確かめた結果をお伝えします。

［工程5 公開｜ステップ7 本番実装｜入る前の確認］

**再開の状況**：現在地はステップ7（未着手）です。未報告の宿題、想定で代用している宿題、説明待ちのステップはありません。

## 1つだけ、後回しにできない食い違いがあります

直近のコミット「gaihan」で、state.md の**種類が「社内の新規事業」から「外販」に、事業化の印が「グループ会社5社への展開予算」から「最初の有料の顧客が5社つく」に**書き換わっています。意思決定ログにも変更履歴にもこの変更の記録がありません。また、01-concept.md の前提欄は「社内の新規事業」のまま、06-pricing.md も社内承認の版のままで、価格が決まっていません。

細かい話に見えますが、この種類によって「今ステップ7に入れるか」と「構成」の両方が変わるため、先に決める必要があります。

**① 社内の新規事業（最初の利用者はグループ会社）とする場合 → すぐ着手できます**
- 価値検証は、社内の8人のうち5人が使い続けた【行動】と、本部長が予算の検討に入れた【コミット】です。どちらも本物の記録なので、ステップ7の入る条件を満たしています。
- 決済はなし。「会社ごとのログイン」はグループ会社ごとに分ける形になります。
- 宿題が1つ出ます。社外のサービスに規程を置いてよいかを情シスに確認することです（チャットの中では分かりません）。

**② 外販とする場合 → 今はステップ7に入れません**
- 試してもらったのは自社の総務・人事の8人で、狙っている「社外の、総務を1人で回している人」ではありません。払った人・予約した人もいません。インタビューでテスト参加を約束した01・02の2人は、試作品を試していません（Claude Team の中だけで共有したため）。
- ステップ6で価格も決まっていません。
- 取れる道は、「外に出る（01・02の人に試してもらう日を決める）」か「やめる」です。これは本人が押し切っても曲げられない決まりです。

## 構成（どちらでも共通の骨組み）

| 役割 | 構成 |
|---|---|
| 画面とサーバー | Webアプリを1つ作る（AIが作り慣れた広く使われている枠組み） |
| データ | 管理不要のデータベース（東京リージョン） |
| 会社ごとのログイン | メールに届くリンクでログイン。データはすべて会社に紐づけ、「自社の規程と相談しか読めない」をデータベースの側で強制する |
| AI | サーバーからだけ呼び出す（鍵はサーバーだけに置く）。1人1日30回の上限、全体の月額上限、失敗時の表示と再試行をつける |
| 公開の場所 | サーバー管理が不要な公開サービス（利用者に渡す時点で有料プランにする） |
| 決済 | ②のときだけ、決済代行を使う（カード情報は自社で持たない） |

具体的なサービス名と料金は、受け入れ条件を記録したあとに理由つきで示します。リリース時点の受け入れ条件として伺った「総務担当が自社の規程を登録して相談・下書き・コピーができる」「増やすのは会社ごとのログイン」「削るものはなし」は、種類が決まった時点でそのまま記録します。

後回しにしたもの：インタビュー01〜05の中身がまったく同じ（写し間違いかもしれません）、report.md が「試作」のまま、state.md の欄名の不整合。

---

**決めてほしいこと（1問）**：このプロダクトの種類はどれにしますか。

1. **社内の新規事業**：まずグループ会社で正式に使ってもらう。この場合、事業化の印も合わせて決め直します
2. **外販**：社外の会社に売る。まず外に出て、本物の顧客に試してもらう
3. **①で今すぐ着手し、外販はその次の段階に回す**

番号で答えてください。選んだ理由を一言もらえれば、意思決定ログと変更履歴に残します。
