# solo-preneur

非エンジニアの経営者が、AIと二人三脚でプロダクトを課題検証からローンチ（リリース）まで作り切るための Claude Code プラグインと、そのマーケットプレイスです。

プラグインの使い方は [plugins/solo-preneur/README.md](plugins/solo-preneur/README.md) を見てください。

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
│   └── solo-preneur/         # プラグイン本体（インストールされるのはここだけ）
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── skills/           # 5工程・10ステップの伴走スキルと、start / next / status などの入口
│       ├── agents/           # レビュー・攻撃テスト・原因分析のエージェント
│       └── README.md
├── simulations/              # シミュレーション記録と回帰テスト用シナリオ
├── samples/                  # プラグインで通したプロダクトと、企画書（samples/solo-preneur/）
└── README.md
```

プラグイン本体を `plugins/` の下に分けているのは、インストール時にサンプル（企画書を含む）とシミュレーション記録が利用者の環境に入らないようにするためです。
