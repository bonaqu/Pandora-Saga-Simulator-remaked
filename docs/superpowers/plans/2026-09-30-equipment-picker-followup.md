# Equipment interaction follow-up — UI 2026.09.12

Status: implementation and verification in progress; not production accepted.

Local evidence: 119 Chromium contract tests and 57 Python tests passed, with
strict serialization/rollback assertions intact. Eighteen three-engine smoke
checks passed; twenty-one visual-capture checks plus corrected Equipment mobile
geometry captures were inspected. Final feature CI and production acceptance
remain required. The unchanged workbook still has 2,837 rows (139 Russian UI
strings, no unapproved Russian game names); all 55 levels/28 classes remain.

User feedback supersedes the earlier assumption that Search cards fulfilled the
Equipment request. Equipment is the character simulation. Search is discovery,
not a new socket editor. Existing Soul insertion and upgrades must keep working.

## Root causes

- Native option popups cannot reliably render interactive characteristic cards.
  UI11 enhanced Search only, leaving the actual Equipment selectors unchanged.
- Mouseenter opened a card immediately; mouse focus also opened a card.
- Legacy equipment rows have fixed 16/18px heights, unsuitable for new controls.
- Modern target labels used the section heading as slot zero (off-by-one).
- Repeated Ear/Ring labels have duplicate Legacy IDs; source DOM rows, not a
  numeric ID offset, identify the fourteen actual slots. Pickers distinguish
  Ear/Ring 1 and 2.
- A stat-bearing item fixture exposed stale `SPOpt` after adapter load: Expand
  restores numeric state but ALL does not rebuild the equipment-effect cache.
  Modern now calls the original Equip handler before recalculation. Museum
  source is untouched; the strict build-byte invariant remains tested.

## Implementation boundaries

- Progressively enhance item/Soul selectors with native buttons opening a native
  modal dialog. Lists contain selection buttons and separate native disclosures,
  not ARIA listboxes with illegally nested interactive children.
- Keep original selects, numeric options and handlers. Use the adapter for every
  selection; re-project labels/options after load, language/race/class redraw.
- Lock each picker to its original slot/socket. Equipment candidates show empty
  source sockets; only the currently equipped item shows its actual enhancement,
  gem and inserted Soul names. Source descriptions are not calculated deltas.
- Delay pointer hover 450 ms; cancel pending work on leave, wheel, scroll, touch,
  close and rerender. No animation. Explicit disclosure and keyboard focus are
  immediate; pointer focus is not. Scroll requires fresh pointer intent.
- Explicit inline touch disclosures remain expanded while reading/scrolling,
  and a second tap closes them; only hover overlays disappear on list scrolling.
- Desktop/mobile Equipment rows grow to their controls. Native fallback remains
  available when enhancement is missing. No Legacy source edits or formulas.
- The same section's bulk toolbar loses its 325px left offset on phones. Reset
  becomes a native source-labelled button. Bulk modifier/reset callbacks rebuild
  the original equipment-effect cache after their existing Legacy operation.

## Acceptance gates

- RED observed: missing actual Equipment picker and instant-hover regression.
- Actual Equipment hover/scroll/nonmutation; explicit touch review; existing
  +4/Soul state; keyboard/selection parity; load/source-language/race redraw;
  native fallback; full CI and three browser engines.
- Inspect desktop and mobile actual Equipment lists and upgraded item cards,
  not only Search screenshots. Validate deployed artifact and live site before
  declaring this correction shipped. Physical-device/screen-reader acceptance
  remains a distinct limitation.
