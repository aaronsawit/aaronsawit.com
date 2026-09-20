#!/usr/bin/env python3
"""Fixture tests for the Sigma rules in ../rules.

Every rule has events it must match and events it must not. A rule that parses is not a rule that works:
this harness evaluates the detection logic itself, for the subset of Sigma these rules use
(field maps, lists, the contains / endswith / startswith / re / all modifiers, and / or / not conditions,
and event_count correlations). Syntax is checked separately with `sigma check`.
"""
import json, re, sys
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parent.parent


def field_matches(event, key, expected):
    name, *mods = key.split("|")
    if name not in event:
        return False
    actual = str(event[name]).lower()
    values = expected if isinstance(expected, list) else [expected]
    if "all" in mods:                       # every value must match, not just one
        rest = "|".join([name] + [m for m in mods if m != "all"])
        return all(field_matches(event, rest, v) for v in values)
    for v in values:
        if "re" in mods:
            if re.search(str(v), str(event[name])):
                return True
            continue
        v = str(v).lower()
        if "contains" in mods:
            ok = v in actual
        elif "endswith" in mods:
            ok = actual.endswith(v)
        elif "startswith" in mods:
            ok = actual.startswith(v)
        else:
            ok = actual == v
        if ok:
            return True
    return False


def evaluate(detection, event):
    names = {k: all(field_matches(event, f, v) for f, v in sel.items())
             for k, sel in detection.items() if k != "condition"}
    expr = re.sub(r"[A-Za-z_][A-Za-z0-9_]*",
                  lambda m: m.group(0) if m.group(0) in ("and", "or", "not") else str(names[m.group(0)]),
                  detection["condition"])
    return eval(expr)  # expression is built only from True/False and boolean operators


def main():
    fixtures = json.loads((ROOT / "tests/fixtures.json").read_text())
    failed = checked = 0
    for path in sorted((ROOT / "rules").glob("*.yml")):
        docs = list(yaml.safe_load_all(path.read_text()))
        base = next(d for d in docs if "detection" in d)
        corr = next((d for d in docs if "correlation" in d), None)
        fx = fixtures.get(path.stem)
        if not fx:
            print(f"FAIL {path.stem}: no fixtures"); failed += 1; continue
        for want, key in ((True, "match"), (False, "no_match")):
            for ev in fx.get(key, []):
                checked += 1
                if evaluate(base["detection"], ev) != want:
                    failed += 1; print(f"FAIL {path.stem}: expected {key} for {ev}")
        if corr:
            need = corr["correlation"]["condition"]["gte"]
            span = int(corr["correlation"]["timespan"].rstrip("m")) * 60
            for want, key in ((True, "match"), (False, "no_match")):
                c = fx["correlation"][key]; checked += 1
                hits = c["events"] if evaluate(base["detection"], c["fields"]) else 0
                fired = hits >= need and c["within_seconds"] <= span
                if fired != want:
                    failed += 1; print(f"FAIL {path.stem} correlation: expected {key}")
        print(f"ok   {path.stem}")
    print(f"{checked} checks, {failed} failed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
