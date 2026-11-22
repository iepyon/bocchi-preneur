# bocchi-preneur

[![ぼっちプレナー紹介動画（3分）](docs/media/bocchi-preneur-intro.webp)](docs/media/bocchi-preneur-intro.mp4)

**3分の紹介動画**：使う人の置かれた状況、困りごと、このプラグインの解決策、使い方を3分にまとめました。上の画像はこのページの中でそのまま動きます（音なし）。音つき（BGM。読み上げはなし）で見るときは、画像を押すと MP4（16MB）が開きます。

社内でプロダクトや新規事業を任されたPM候補・事業責任者の候補（と、非エンジニアの経営者）が、AIと一緒にプロダクトを課題検証から新規事業化（事業として認められるところ）へ進めるのを手伝う Claude Code プラグインと、そのマーケットプレイスです。

**まだ作っている途中の段階です（v0.x）。** 手順や中身は、試しながらこれからも変えていきます。うまくいかない場面もあると思って使ってください。

プラグインの使い方は [plugins/bocchi-preneur/README.md](plugins/bocchi-preneur/README.md) を見てください。はじめて使う人は、インストールから最初のステップまでを順に説明した [チュートリアル](docs/tutorial.md) から読んでください。

> [!WARNING]
> **セキュリティはAIの点検だけで済ませないでください。** このプラグインのレビューと攻撃テストは最低限の自己点検で、専門家の診断の代わりにはなりません。個人情報・決済・ログイン・健康情報を扱うなら、公開前に専門家の診断を受けてください（[詳しく](plugins/bocchi-preneur/README.md#注意)）。

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
├── docs/tutorial.md          # 初心者向けの使い方チュートリアル（インストールされない）
├── docs/media/               # 紹介動画（音つき MP4、README で動く WebP、サムネイル。インストールされない）
├── samples/                  # プラグインで通したプロダクトと、企画書（samples/bocchi-preneur/）
└── README.md
```

プラグイン本体を `plugins/` の下に分けているのは、インストール時にサンプル（企画書を含む）とシミュレーション記録が利用者の環境に入らないようにするためです。
