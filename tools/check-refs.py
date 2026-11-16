#!/usr/bin/env python3
"""solo-preneur プラグインの参照を確かめる。

確かめること：
1. 本体 SKILL.md が指す references/・templates/ のファイルが実在する
2. references・templates の中から、別の references を指していない（1段まで）
3. references のファイルが、すべて本体 SKILL.md の一覧に載っている
4. 入口のスキルは、references を ${CLAUDE_PLUGIN_ROOT} 起点の本体経由でしか指さない
使い方：python3 tools/check-refs.py （リポジトリのルートで）
"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent / "plugins" / "solo-preneur"
main = root / "skills" / "solo-preneur"
refs = {p.name for p in (main / "references").glob("*.md")}
tmpls = {p.name for p in (main / "templates").glob("*.md")}
errors = []
code = re.compile(r"`([^`\n]+)`")

def is_pattern(s):
    return "*" in s or "NN" in s or "…" in s or "<" in s

# 1 and 3
skill = (main / "SKILL.md").read_text(encoding="utf-8")
mentioned = set()
for s in code.findall(skill):
    for part in re.split(r"[・、]", s):
        part = part.strip()
        if not part.endswith(".md") or is_pattern(part) or part.startswith("docs/solo/") or part == "SKILL.md":
            continue
        name = part.split("/")[-1]
        if part.startswith("templates/") or name in tmpls and name not in refs:
            if name not in tmpls:
                errors.append(f"SKILL.md: templates に {name} がない")
        elif name in refs:
            mentioned.add(name)
        elif part.startswith("references/") or "/" not in part:
            errors.append(f"SKILL.md: references に {part} がない")
# 〜 で範囲指定したステップのファイル（01〜10）
if re.search(r"`references/01-concept\.md` 〜 `10-launch\.md`", skill):
    mentioned |= {n for n in refs if re.match(r"\d\d-", n)}
for n in sorted(refs - mentioned):
    errors.append(f"SKILL.md: references/{n} が一覧に載っていない")

# 2
for d in ("references", "templates"):
    for p in sorted((main / d).glob("*.md")):
        t = p.read_text(encoding="utf-8")
        if "references/" in t:
            errors.append(f"{d}/{p.name}: references/ を指している（1段までにする）")
        for s in code.findall(t):
            if not s.endswith(".md") or is_pattern(s) or s.startswith("docs/solo/") or s == "SKILL.md":
                continue
            if s.startswith("templates/") and s.split("/")[-1] in tmpls:
                continue
            errors.append(f"{d}/{p.name}: `{s}` は本人の記録なら docs/solo/ を付け、references なら名前で呼ぶ")

# 4
base = "${CLAUDE_PLUGIN_ROOT}/skills/solo-preneur/"
for p in sorted((root / "skills").glob("*/SKILL.md")):
    if p.parent == main:
        continue
    t = p.read_text(encoding="utf-8")
    if ("references/" in t or "templates/" in t) and base + "SKILL.md" not in t:
        errors.append(f"{p.parent.name}/SKILL.md: 本体を {base}SKILL.md で読み込まずに references・templates を指している")
    for m in re.findall(r"本体の `references/([^`]+)`", t):
        if m not in refs:
            errors.append(f"{p.parent.name}/SKILL.md: references/{m} がない")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"OK：references {len(refs)} 件、templates {len(tmpls)} 件、入口 {len(list((root / 'skills').glob('*/SKILL.md'))) - 1} 件")
