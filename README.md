# bocchi-preneur

[![ぼっちプレナー紹介動画（3分）](docs/media/bocchi-preneur-intro.webp)](docs/media/bocchi-preneur-intro.mp4)

**3分の紹介動画**：使う人の置かれた状況、困りごと、このプラグインの解決策、使い方を3分にまとめました。上の画像はこのページの中でそのまま動きます（音なし）。音つき（BGM。読み上げはなし）で見るときは、画像を押すと MP4（13MB）が開きます。

非エンジニアの経営者が、AIと二人三脚でプロダクトを課題検証からローンチ（リリース）まで作り切るための Claude Code プラグインと、そのマーケットプレイスです。

プラグインの使い方は [plugins/bocchi-preneur/README.md](plugins/bocchi-preneur/README.md) を見てください。

> [!WARNING]
> **セキュリティは、AIの点検だけで済ませず、公開前に専門家の助言を受けてください。** セキュリティは、このプラグインで扱う中で最もリスクが高い領域です。穴があると、利用者の個人情報やお金が漏れ、事業が続けられなくなることがあります。プラグインのレビューとペネトレーションテストは AI による最低限の自己点検で、**専門家の診断の代わりにはなりません**。AIのテストで問題が見つからなくても、安全とは限りません。個人情報・決済・ログイン・健康情報を扱う場合は、専門家の診断を受けてから公開してください。詳しくは [プラグインの README の「注意」](plugins/bocchi-preneur/README.md#注意) を見てください。

## インストール

```
/plugin marketplace add iepyon/bocchi-preneur
/plugin install bocchi-preneur@bocchi-preneur
```

旧い名前（solo-preneur）で入れていた場合は、[入れ直しの手順](plugins/bocchi-preneur/README.md#旧い名前solo-preneurから移る)を見てください。

## 構成

```
bocchi-preneur/
├── .claude-plugin/
│   └── marketplace.json      # このリポジトリをマーケットプレイスとして登録
├── plugins/
│   └── bocchi-preneur/         # プラグイン本体（インストールされるのはここだけ）
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── skills/           # 5工程・10ステップの伴走スキルと、start / next / status などの入口
│       ├── agents/           # レビュー・攻撃テスト・原因分析のエージェント
│       └── README.md
├── simulations/              # シミュレーション記録と回帰テスト用シナリオ
├── tools/                    # 参照を確かめるスクリプト（check-refs.py）
├── archive/                  # スコープから外した資料（インストールされない）
├── docs/media/               # 紹介動画（音つき MP4、README で動く WebP、サムネイル。インストールされない）
├── samples/                  # プラグインで通したプロダクトと、企画書（samples/bocchi-preneur/）
└── README.md
```

プラグイン本体を `plugins/` の下に分けているのは、インストール時にサンプル（企画書を含む）とシミュレーション記録が利用者の環境に入らないようにするためです。
