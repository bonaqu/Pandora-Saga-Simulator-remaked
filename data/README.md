# Generated Legacy data projections

`generated/*.v1.json` are deterministic, read-only search/tooling projections of the preserved Legacy 2.00 runtime:

- `equipment.v1.json` — 44 categories and 1,120 equipment records;
- `souls.v1.json` — 184 Soul records;
- `skills.v1.json` — 25 skill categories and 211 actual skill records.

The JSON files are **not** a replacement engine. The calculator continues to load and calculate exclusively through the preserved files under `js/`. Each projection carries its schema/projection version, Legacy and Remaked versions, source paths and exact SHA-256 source fingerprints.

Stable mappings:

- equipment `legacy_id` is the existing select value `category_id * 10000 + item_index`;
- Soul `legacy_id` is the existing Soul select value;
- skill `legacy_category_id` / `legacy_entry_index` map to `Skill[*][category_id][entry_index]`.

To regenerate after an intentional Legacy data change:

1. `py scripts/build_pages.py --output _site`
2. `npm run extract:data`
3. `npm run test:data`

CI runs the same extraction with `--check` and fails if the committed files differ from the live Legacy runtime. JP/EN/TW text is exported as present in Legacy; this directory does not approve or invent Russian game terminology.
