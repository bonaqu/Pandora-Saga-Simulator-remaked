# Contributing

Thanks for helping preserve Pandora Saga Simulator.

## What belongs here

Good contributions include:

- browser compatibility fixes that do not silently change calculator results;
- fixes for missing/broken local assets;
- encoding fixes;
- documentation improvements;
- reproducible calculation bugs with evidence;
- tests that protect legacy behavior.

## Preservation rule

The restored legacy calculator is the reference implementation. Avoid broad rewrites of recovered calculation/data files unless the change is necessary and the behavioral impact is documented.

If you want a modern UI or new features, prefer adding them alongside the preserved entry point instead of replacing it.

## Bug reports

Please include:

1. browser/version;
2. selected language;
3. character class/build values;
4. exact sequence of actions;
5. expected result;
6. actual result;
7. screenshot and console output when useful.

## Pull requests

Keep changes focused. For calculation changes, explain why the existing behavior is wrong and provide a reproducible before/after case.

Do not update the pinned recovery snapshot casually. See `docs/DEPLOYMENT.md` for the intentional source-update process.
