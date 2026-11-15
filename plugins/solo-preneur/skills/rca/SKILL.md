---
name: rca
description: 根深いバグの根本原因を root-cause-analyst エージェントに分析させる（実装はしない）
argument-hint: "<症状の説明>"
disable-model-invocation: true
---

`root-cause-analyst` エージェントに、次の問題の根本原因を分析させてください。まだ実装はしないでください。

症状：$ARGUMENTS

症状の説明が空なら、「何をすると、何が起きて、本当はどうなってほしいか」を本人に1問だけ聞いてから始めてください。

分析結果を受け取ったら、直し方の案を平易に示し、どの案で進めるかを本人に選んでもらってください。選ばれた案と理由を `docs/solo/06-build.md` に記録してから修正に入ってください。
