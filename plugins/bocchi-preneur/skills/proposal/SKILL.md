---
name: proposal
description: これまでの記録（コンセプト・判断・宿題の結果）を、本人以外の人が通して読める企画書にまとめ直して書き出す
argument-hint: "[読み手（任意。例：承認者、出資者）]"
disable-model-invocation: true
---

まず `${CLAUDE_PLUGIN_ROOT}/skills/bocchi-preneur/SKILL.md`（ぼっちプレナー本体）を読んでください。このセッションですでに読んでいれば読み直さなくてかまいません。本体の絶対ルールに従い、本体に出てくる `references/…`・`templates/…` は `${CLAUDE_PLUGIN_ROOT}/skills/bocchi-preneur/` を起点に読んでください。

そのうえで、本体の `references/proposal.md`（企画書）に従って、`docs/bocchi/proposal.md` を書き出してください。

- $ARGUMENTS に読み手があれば、それを読み手として、読み手を聞く問いは省いてください。
- `docs/bocchi/state.md` がなければ、企画書の元になる記録がないことと、`/bocchi-preneur:start` で始められることだけを伝えてください。
