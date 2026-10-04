"""Modern-only switches for identified native passive contributions, never new formulas."""
import json
import pathlib

GUARD = """function PandoraNativePassiveEnabled(id) {
  var catalog = window.PandoraRemaked && window.PandoraRemaked.catalog;
  return !catalog || catalog.nativePassiveEnabled(id);
}
"""


def materialize_native_passives(root: pathlib.Path, output: pathlib.Path) -> None:
    config = json.loads((root / "data/native-passive-hooks.v1.json").read_text(encoding="utf-8"))
    if config["version"] != 1:
        raise ValueError("Unsupported native passive hook version")
    calc = output / "js/calc.js"
    source = calc.read_text(encoding="utf-8-sig")
    for hook in config["hooks"]:
        if source.count(hook["source"]) != hook["count"]:
            raise ValueError("Native passive source anchor changed: " + hook["source"])
        source = source.replace(hook["source"], hook["expression"])
    calc.write_text(GUARD + source, encoding="utf-8")
    (output / "modern/native-passives.js").write_text(
        "window.PandoraRemakedNativePassives = " + json.dumps(config["definitions"], ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
