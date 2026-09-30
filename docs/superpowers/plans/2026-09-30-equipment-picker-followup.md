# Equipment interaction follow-up — UI 2026.09.12–14

UI12: published and artifact/live verified (PR #17; feature CI `36658390600`,
Pages `36658979809`). UI13: compact anchored dropdowns, quieter information
actions and off-screen keyboard regression correction. Its final
CI/artifact/live/installed-PWA evidence is recorded in annotated `v2026.09.14`
only after those gates pass; without that tag, final acceptance remains pending.

Local evidence: 119 Chromium contract tests and 57 Python tests passed, with
strict serialization/rollback assertions intact. Eighteen three-engine smoke
checks passed; twenty-one visual-capture checks plus corrected Equipment mobile
geometry captures were inspected. UI12 feature CI and production acceptance
also passed. The unchanged workbook still has 2,837 rows (139 Russian UI
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
- UI12 keyboard focus opened cards before browser automatic scrolling finished;
  the list's scroll cancellation then closed them. UI13 defers keyboard review
  through two rendering frames and preserves that pending request across scroll
  events. Manual wheel/touch, blur, close and rerender still cancel it. A strict
  off-screen regression failed before the fix and passed afterward.
- UI13's first feature CI passed, but production workflow `36662330016` blocked
  deployment on the same keyboard contract in WebKit. Two frames are not a
  guarantee that focus scrolling has finished. A deterministic late-scroll
  regression now requires the focused keyboard card to remain open and be
  repositioned; manual wheel/touch/scrollbar/Page-key intent still closes it.
  No assertion was weakened and the failed deployment was not retried unchanged.
- The final UI13 artifact/live checks passed, but real isolated installed-PWA
  review exposed late pointer-focus scrolling closing an explicitly opened
  floating card. Event diagnostics showed click -> open -> scroll -> close;
  waiting did not repair it. UI14 retains focused explicit review across that
  automatic scroll and pins an already hovered card on its first info click.
  Wheel/touch/scrollbar/Page cancellation and nonmutation remain strict gates.

## Implementation boundaries

Latest user feedback supersedes UI12's Equipment modal design: UI13 uses an
anchored native auto-popover with named nonmodal dialog semantics (filter and
native selection/disclosure actions, not a fake listbox). It flips above/below
the field, clamps to the viewport and does not dim or make the calculator inert.
Outside click, Escape, anchor movement and focus leaving dismiss it. A second
trigger click toggles closed. Search remains a separate modal discovery tool.
Opening reveals the selected item within the list without moving focus to it,
triggering a preview or scrolling the calculator; a last-page regression covers it.
Repeated Characteristics text/triangles become a 44px named info action: hidden
visually until row hover/focus on pointer desktops, always available on touch.
Keyboard review and explicit read-only touch cards remain intact.

- Progressively enhance item/Soul selectors with native buttons opening an
  anchored dropdown (UI12 used a modal). Lists contain selection buttons and separate native disclosures,
  not ARIA listboxes with illegally nested interactive children.
- Keep original selects, numeric options and handlers. Use the adapter for every
  selection; re-project labels/options after load, language/race/class redraw.
- Lock each picker to its original slot/socket. Equipment candidates show empty
  source sockets; only the currently equipped item shows its actual enhancement,
  gem and inserted Soul names. Source descriptions are not calculated deltas.
- Delay pointer hover 450 ms; cancel pending work on leave, wheel, scroll, touch,
  close and rerender. No animation. Explicit disclosure and keyboard focus are
  available without hover dwell; keyboard review waits for automatic scrolling
  to settle. Pointer focus is not review. Scroll requires fresh pointer intent.
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
