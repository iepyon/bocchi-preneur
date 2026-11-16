---
name: status
description: 5工程・10ステップの進行状況と、本人がこれまでに下した重要な判断を表示する
disable-model-invocation: true
---

まず `${CLAUDE_PLUGIN_ROOT}/skills/solo-preneur/SKILL.md`（ソロプレナー本体）を読んでください。このセッションですでに読んでいれば読み直さなくてかまいません。本体の絶対ルールに従い、本体に出てくる `references/…`・`templates/…` は `${CLAUDE_PLUGIN_ROOT}/skills/solo-preneur/` を起点に読んでください。

そのうえで、`docs/solo/state.md` を読み、次を簡潔に表示してください。問いは出さず、表示だけで止めてください。

- 5工程ごとの状態と、その中の各ステップの状態（state.md の状態の値のとおり）
- 現在のステップで未達のゲート条件と、現在の工程の工程ゲート（本体の `references/phase-gates.md`）で未達のもの
- 工程の判断（終えた工程ごとに1行）
- 本人が下した判断（`docs/solo/decisions/` のファイル名と1行目から、新しい順に最大5件）
- 読み手への要約 `docs/solo/report.md` の最終更新日と、冒頭5行のうち「何がほしいか」
- 出したまま未報告の宿題
- 「説明待ち」のステップ（AIが作ったものを、本人がまだ説明していない）
- 【推測】【発言】のまま残っている重要な前提（あれば）
- 外販なら、届けるトラックのチェックポイントの状況
- 撤退基準と、残りのタイムボックス

state.md がなければ、`/solo-preneur:start` で始められることだけ伝えてください。
