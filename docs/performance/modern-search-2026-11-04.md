# Modern 4.41 — Chromium search and scroll performance audit (2026-11-04)

## Scope and provenance

Measurements of the **actual Modern UI** through Playwright and a real headless Chromium build, not standalone JavaScript array benchmarks. The checked-in [search-performance.spec.mjs](../../tests/ui/search-performance.spec.mjs) opens the largest *currently visible/compatible* Equipment picker for the initial character, executes eight cycles of typing / no-match / clearing, and scrolls the complete rendered list for 90 measured requestAnimationFrame intervals. A separate compatible Soul socket is also profiled. The benchmark forces list layout for synchronous input timing.

- [Controlled run — GitHub Actions #41754031274](https://github.com/bonaqu/Pandora-Saga-Simulator-remaked/actions/runs/41754031274), Chromium 153.0.8010.12, Intel Xeon Platinum 8370C virtual Linux runner, 1280×800 viewport; one passing test.
- [Initial exploratory run — GitHub Actions #41753786489](https://github.com/bonaqu/Pandora-Saga-Simulator-remaked/actions/runs/41753786489), Chromium 153.0.8010.12, AMD EPYC 7763 virtual Linux runner; one passing test.
- Runs used **different CI processors**. Comparisons between their absolute timings must not be interpreted as a release-to-release speedup, and neither represents the user's PC or physical phone.

All timings below are milliseconds and come from the **controlled Intel run**. Medians summarize five warm opens, eight filtering cycles, or 90 rAF samples after six warm-up frames, as applicable. P95 is descriptive, not a release gate.

| Actual surface | Compatible results | Descendant DOM elements | Cold open | Warm open median / P95 | Broad input median / P95 | Restore full list median / P95 | No match median |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Equipment picker, `SelEquip_0_0` | 203 | 1,646 | 35.8 | 22.3 / 31.2 | 8.0 / 13.6 | 13.1 / 20.5 | 1.0 |
| Soul search, socket `0:4` | 36 | 300 | 30.7 | 17.0 / 19.6 | 0.7 / 1.1 | 3.5 / 5.2 | 0.4 |

### Frame cadence: matched idle control

Programmatic scrolling changes the list's `scrollTop` inside each animation frame. To distinguish a list penalty from GitHub Actions frame scheduling, the same requestAnimationFrame loop runs with a stationary list **before and after** scrolling. These are **frame intervals**, not an observed human-input FPS or guaranteed paint durations.

| Surface | Idle before median / P95 | While scrolling median / P95 | Idle after median / P95 | Scroll range |
| --- | ---: | ---: | ---: | ---: |
| Equipment (203 results) | 23.0 / 32.8 | 24.3 / 35.9 | 26.5 / 36.6 | 8,629 px |
| Souls (36 results) | 54.1 / 86.2 | 57.3 / 72.6 | 58.2 / 68.6 | 430 px |

The Soul list shows very slow **idle** rAF cadence despite only 36 results. That directly limits any claim that its scrolling is slow because of excessive DOM rows. The hosted runner's timing noise is large enough that translating these samples into player-perceived FPS would be misleading.

## Decision

**Do not introduce list virtualization at this point.** The largest compatible list observed for this initial character is 203 entries (1,646 DOM descendants); median search/filter operations are relatively short and the controlled scroll sample does not establish excess frame delay attributable to scrolling rather than baseline CI scheduling. Virtualization would add complexity to native tab/arrows, selected-item centering, hover previews and touch disclosures; there is no measured benefit to offset these risks in this workload.

This is not proof that every class/race combination, future catalog, low-power device, or large external dataset will be fast. If compatible lists grow substantially, or direct user hardware testing shows sustained input lag, repeat the benchmark for those target states and capture Chrome Performance traces of style, layout, scripting and paint before selecting the solution. For reliable real-world decisions, compare the same device/build with and without an optimization under similar load.

## Repeatability

The dedicated [Modern Search Performance workflow](../../.github/workflows/search-performance.yml) runs on relevant PR changes and can be launched via **Run workflow** in GitHub Actions. Its log prints one machine-readable `MODERN_SEARCH_BENCHMARK=` JSON line including browser/CPU metadata, row/node counts, input percentiles, and matched idle/scroll frame statistics. All reported numbers reflect test conditions only.

No calculator formulas, saved builds, Legacy code, Cloudflare D1, or Modern runtime logic were changed for this audit.
