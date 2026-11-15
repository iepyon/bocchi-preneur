---
name: review
description: 実装済みのコードを strict-reviewer エージェントに厳しくレビューさせる（codex CLIがあれば併用）
argument-hint: "[レビュー対象や気になる点（任意）]"
disable-model-invocation: true
---

1. `strict-reviewer` エージェントに、現在の実装をレビューさせてください。対象や気になる点：$ARGUMENTS
2. `command -v codex` で codex CLI が使えるか確認してください。使える場合は、本人に「別系統のAI（Codex）にも見せますか」と聞き、同意があれば `codex exec` で読み取り専用のレビューを依頼してください。使えない場合は何も言わずに飛ばしてください。
3. 結果を、非エンジニア向けの3行要約と、重大度順の一覧にまとめてください。
4. 「致命的」「重大」があれば、どれから直すかを本人に1問だけ聞いて止まってください。勝手に修正を始めないでください。
