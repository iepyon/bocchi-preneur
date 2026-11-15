# solo-preneur

一人で事業を立ち上げる人のための Claude Code プラグインと、そのマーケットプレイスです。

## インストール

```
/plugin marketplace add iepyon/solo-preneur
/plugin install solo-preneur@solo-preneur
```

## 構成

```
solo-preneur/
├── .claude-plugin/
│   └── marketplace.json      # このリポジトリをマーケットプレイスとして登録
├── plugins/
│   └── solo-preneur/         # プラグイン本体
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── skills/           # 6工程ごとのスキル
│       ├── agents/           # 問い詰めコーチ
│       ├── commands/         # 工程ナビの入口
│       ├── hooks/            # 工程ゲート
│       └── templates/        # 意思決定ログの雛形
├── samples/                  # プラグインで通したプロダクト
├── docs/
│   └── proposal.md           # 企画書
└── README.md
```

プラグイン本体を `plugins/` の下に分けているのは、インストール時にサンプルや企画書が利用者の環境に入らないようにするためです。
