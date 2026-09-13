# Machines of Loving Taste

An interactive report on the aesthetic preferences of 19 AI models — what they call their favorites, what they call overrated, and the vocabulary they use to justify both — across 52 domains (novels, paintings, buildings, dishes, smells, philosophers, …).

**Live site:** [machinesoflovingtaste.com](https://machinesoflovingtaste.com) · built as a single self-contained HTML file.

## How it works

1. **Ask** — the same two questions, put cold to 19 models from 7 companies (Anthropic, OpenAI, Google, xAI, DeepSeek, Moonshot, Zhipu): *what is your favorite ___?* and *which widely beloved ___ is overrated?* A short preamble concedes the "I'm an AI" disclaimer up front so answers start at the answer.
2. **Sample** — 52 domains × 2 probes × 19 models, adaptively sampled 4–12 times per cell (unanimous cells stop early).
3. **Distill** — a fast reader model extracts the named pick and the descriptive vocabulary from each response; wording variants of the same referent are merged (LLM-proposed aliases, hand-reviewed).
4. **Map** — picks become the Index (green = favourite share, red = overrated share, ranking by summed favorite-minus-overrated percentages); descriptor vocabularies are embedded and PCA-projected onto three interpretable axes to place each model on a rotatable 3D map.

Every quote shown in the report is a verbatim extract from a model's actual response (programmatically audited).

## Structure

- `src/` — zero-dependency Node ESM pipeline: `collect` → `extract` → `adapt` (adaptive escalation) → `canonicalize` → `analyze` → `vocab` → `entitycards` → `site`
- `data/` — derived JSON (summaries, aliases, entity cards, embedded imagery). Raw response `.jsonl` files are local-only.
- `report/` — build outputs; `site.html` is the full standalone page
- `public/` — the deployed copy
- `.claude/skills/add-domain/` — one-command recipe for adding a new domain end to end

## Running

Requires API keys in `.env` (Anthropic, OpenAI, Google, DeepSeek, Moonshot, xAI) for collection; rebuilding the site from the committed derived data needs the local `.jsonl` response files.

```sh
node src/site.js   # rebuild report/site.html + report/artifact.html
cp report/site.html public/index.html
npm test          # validate the generated site and preference calculations
```

Imagery: Wikimedia Commons (credits in the site's Method section).

## Website navigation

- **Index** opens in Grid for model-by-model inspection; Flow remains available as an alternative. Grid rows scroll with the page, while pinned headings and arrow controls keep horizontal model browsing accessible without an inner scrollbar. Swipe and trackpad panning also work.
- **Models** provides selectable profiles, sampled favorite distributions, pairwise overlap comparisons, and an optional vocabulary map.
- **Findings** opens with two linked essay previews, each with a title and a two-sentence summary. Add entries in `findingsHTML()` to extend the overview. The shared-canon essay's counts include tied top favorites and require four named answers per model and field.
- **Method** explains collection, the percentages, and the different views.

Fragment routes keep links portable in the standalone HTML: `#/findings`, `#/findings/shared-canon`, `#/findings/ghost-in-kyoto`, `#/models/claude-fable-5-1`, and `#/index/city`. An Index link can select a model with `?model=claude-fable-5-1`. Reload and browser back/forward restore these destinations.

The persona article uses an audited reanalysis of the July experiment and a separate September follow-up. Its counts and charts do not change merely because the main model roster changes. Model comparisons average shared probability mass across favorite-answer distributions, giving each eligible field equal weight.

## Persona experiments

- [July reanalysis](report/persona2-reanalysis.md): 23,040 recorded completions, including nonanswers. Recovers omitted extractions, normalizes equivalent names, preserves modal ties, and compares full distributions with matched controls. Favorites and overrated answers are separate. Reports model-resampling intervals, finite-sample shuffled references, per-model results, and alias/nonanswer sensitivity.
- [September follow-up](report/persona3-followup.md): 1,512 new responses from three models, testing characters, writing style, and explicitly different aesthetic preferences with neutral question wording. The [protocol](data/persona3-protocol.json) was frozen before collection. All responses and reviewed choices are committed in `data/persona3-observations.json`; preliminary smoke calls are excluded.

Both analyses reproduce from committed data without API keys or private JSONL files:

```sh
npm run analyze:persona2
npm run analyze:persona3
```

`src/import-persona2.js` and `src/import-persona3.js` rebuild the audited observations from local raw files and the committed review decisions. Collection is separate: `npm run collect:persona3 -- --dry-run` prints the design without API calls; collection without that flag uses API keys and resumes the fixed protocol. Changing the protocol after collection starts is rejected by a hash check. See each report for limitations; these are exploratory behavioral studies, not measurements of internal model activations.
