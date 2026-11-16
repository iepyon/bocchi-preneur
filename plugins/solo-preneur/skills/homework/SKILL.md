---
name: homework
description: 現場の宿題（顧客インタビュー・価値検証の面談）の台本を作る、または結果を報告して記録する
argument-hint: "[結果のメモを貼り付け（任意）]"
disable-model-invocation: true
---

まず `${CLAUDE_PLUGIN_ROOT}/skills/solo-preneur/SKILL.md`（ソロプレナー本体）を読んでください。このセッションですでに読んでいれば読み直さなくてかまいません。本体の絶対ルールに従い、本体に出てくる `references/…`・`templates/…` は `${CLAUDE_PLUGIN_ROOT}/skills/solo-preneur/` を起点に読んでください。

そのうえで、本体の `references/interview-kit.md`（インタビューの型）に従ってください。

- $ARGUMENTS が空なら：`docs/solo/state.md` の現在のステップに合わせて、質問台本（10分で終わる量）と記録シートを `docs/solo/fieldwork/` に作り、誰に何人聞くかを本人に1問だけ確認してください。state.md の「出している宿題」に追記してください。
- $ARGUMENTS にメモがあれば：記録シートに整理し、各項目に証拠ラベル（推測／発言／行動／コミット）を付けた案を示して、ラベルが合っているかを本人に確認してください。そのうえで「聞いてみて、予想と違ったことは何ですか」と1問だけ聞いてください。
