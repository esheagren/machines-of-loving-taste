# Persona experiment: July reanalysis

Reproduce with `node src/reanalyze-persona2.js`. The committed observations file contains all 23,040 successful recorded completions, including empty responses. No API keys or local raw JSONL files are needed. Raw source hashes are recorded in the observations file.

## Data audit

22949 original extractions; 91 omitted extractions. Recovered 20 explicit answers by reading the raw responses; the other 71 omissions were empty completions. Reclassified 19 phrase-analysis responses as off-task. Six answers incorrectly flagged as refusals still name a choice and are retained. No unknown values were imputed.

| Outcome | Count |
|---|---:|
| named | 22693 |
| refusal | 252 |
| no_named_answer | 5 |
| empty_response | 71 |
| missing_extraction | 0 |
| off_task | 19 |

The review decisions include raw source text in `data/persona2-review.json`. Name rules are in `data/persona2-normalization.json`. Fall and autumn merge; color shades, narrower cuisines and typeface editions remain distinct in the primary analysis. This is a conservative review, not an exhaustive validation of every named entity or every extraction.

## Distribution comparisons

Total variation (TV) between complete named-answer distributions, conditional on a named answer. 0 = identical observed shares; 1 = no shared named answer. Minimum 4 named answers in treatment, none and assistant cells.

TV(treatment, none) minus TV(assistant, none), matched within model, field and question. Fields weighted equally within model; models weighted equally. Favorites and overrated analyzed separately. This contrast measures additional observed distance from the baseline, not a fraction of changed individual answers.

4,000 seeded model-cluster bootstrap resamples for a descriptive 95% interval, plus leave-one-model-out range. Fields remain bundled with models. The selected panel is not a random sample; model families may be correlated. Intervals are not population-level guarantees.

256 seeded label shuffles per treatment-none comparison, preserving both named sample sizes. Mean shuffled TV is an exchangeability reference, not a true-distance estimate or a hypothesis-test result.

Also report all outcomes including separate nonanswer statuses; unmerged spelling-normalized names; and broader Index aliases followed by conservative normalization. No single winner is chosen when modal names tie.

Exploratory July 22 experiment; figure examples chosen after inspection. Role adoption and explanations not systematically scored. No activations measured. Conditions were not randomized during July collection. Dates and model labels do not guarantee fixed underlying provider versions.

Values below are TV percentage points. Positive contrast means additional distance from the no-character distribution beyond the assistant control. Negative values are retained.

| Condition | Question | TV vs none | Shuffled reference | Extra distance vs assistant [model-resampling interval] | Eligible cells |
|---|---|---:|---:|---:|---:|
| AI assistant | favorite | 27.6 | 23.9 | 0.0 [0.0, 0.0] | 96/96 |
| AI assistant | overrated | 27.1 | 22.8 | 0.0 [0.0, 0.0] | 95/96 |
| secretary | favorite | 33.5 | 25.7 | 5.9 [0.5, 12.2] | 96/96 |
| secretary | overrated | 27.6 | 24.1 | 0.5 [-3.1, 3.9] | 95/96 |
| compliance officer | favorite | 34.2 | 25.0 | 6.6 [2.9, 10.5] | 96/96 |
| compliance officer | overrated | 29.5 | 23.6 | 1.9 [-2.8, 6.3] | 90/96 |
| actuary | favorite | 37.2 | 27.7 | 9.6 [2.7, 16.7] | 96/96 |
| actuary | overrated | 28.4 | 23.8 | 1.3 [-2.5, 5.1] | 95/96 |
| craftsman | favorite | 40.2 | 27.3 | 12.5 [6.1, 19.6] | 96/96 |
| craftsman | overrated | 31.0 | 24.8 | 3.8 [-0.2, 7.8] | 95/96 |
| merchant | favorite | 36.0 | 25.6 | 8.5 [2.4, 15.5] | 95/96 |
| merchant | overrated | 28.6 | 23.7 | 1.5 [-1.9, 5.0] | 95/96 |
| sage | favorite | 34.8 | 24.4 | 7.2 [2.2, 12.5] | 96/96 |
| sage | overrated | 27.1 | 23.0 | -0.0 [-6.1, 5.3] | 94/96 |
| hermit | favorite | 37.3 | 26.3 | 9.7 [3.6, 15.7] | 96/96 |
| hermit | overrated | 27.7 | 23.8 | 0.3 [-5.6, 6.5] | 93/96 |
| sorcerer | favorite | 46.2 | 29.3 | 18.6 [12.4, 26.2] | 96/96 |
| sorcerer | overrated | 32.2 | 23.9 | 5.0 [0.2, 9.6] | 95/96 |
| shaman | favorite | 47.0 | 29.0 | 19.4 [12.5, 27.2] | 96/96 |
| shaman | overrated | 35.0 | 25.5 | 7.8 [2.7, 12.4] | 95/96 |
| witch | favorite | 56.6 | 31.9 | 29.0 [20.3, 37.7] | 96/96 |
| witch | overrated | 34.6 | 24.1 | 7.4 [1.3, 13.2] | 95/96 |
| banshee | favorite | 58.0 | 34.2 | 30.4 [22.2, 39.0] | 96/96 |
| banshee | overrated | 31.7 | 24.9 | 4.6 [-0.6, 10.0] | 95/96 |
| revenant | favorite | 41.1 | 28.5 | 13.5 [6.9, 19.8] | 96/96 |
| revenant | overrated | 27.9 | 24.5 | 0.7 [-5.1, 6.6] | 95/96 |
| ghost | favorite | 39.7 | 27.5 | 12.0 [5.0, 18.4] | 96/96 |
| ghost | overrated | 29.7 | 24.4 | 2.6 [-1.3, 6.7] | 95/96 |

## Sensitivity of the focal contrasts

| Condition | Question | Conservative aliases | No aliases | Index aliases | Include nonanswers | Leave-one-model-out range |
|---|---|---:|---:|---:|---:|---:|
| witch | favorite | 29.0 | 29.3 | 29.3 | 29.2 | 26.5 to 31.7 |
| witch | overrated | 7.4 | 7.3 | 7.8 | 7.4 | 6.1 to 9.2 |
| banshee | favorite | 30.4 | 30.8 | 30.6 | 30.1 | 27.7 to 32.4 |
| banshee | overrated | 4.6 | 4.5 | 4.7 | 5.3 | 3.1 to 5.9 |
| ghost | favorite | 12.0 | 13.2 | 11.8 | 11.8 | 10.3 to 14.4 |
| ghost | overrated | 2.6 | 3.2 | 2.7 | 2.5 | 1.3 to 3.5 |

## Favorite cities: complete pooled distributions

Each condition contains 96 calls (8 from each of 12 models). Counts below are named replies, not independent models. Pair agreement is the probability that one sampled answer from each of two different models names the same city, averaged over model pairs.

### none

96/96 named; cross-model pair agreement 32.1%.

kyoto: 51; tokyo: 23; venice: 11; paris: 3; san francisco: 2; vienna: 2; amsterdam: 1; barcelona: 1; berlin: 1; istanbul: 1.

### assistant

96/96 named; cross-model pair agreement 38.4%.

kyoto: 58; tokyo: 18; venice: 7; paris: 6; florence: 2; stockholm: 2; barcelona: 1; istanbul: 1; lisbon: 1.

### witch

96/96 named; cross-model pair agreement 15.8%.

prague: 36; kyoto: 14; edinburgh: 11; paris: 9; venice: 9; new orleans: 7; tokyo: 4; florence: 3; salem: 2; porto: 1.

### banshee

95/96 named; cross-model pair agreement 15.7%.

dublin: 30; edinburgh: 17; kyoto: 17; venice: 11; prague: 5; paris: 4; tokyo: 4; galway: 2; new orleans: 2; blaenau ffestiniog: 1; dubrovnik: 1; kathmandu: 1.

### ghost

95/96 named; cross-model pair agreement 22.3%.

kyoto: 42; venice: 14; prague: 10; tokyo: 10; paris: 8; edinburgh: 3; florence: 3; amsterdam: 1; barcelona: 1; new orleans: 1; vancouver: 1; vienna: 1.

## Per-model focal comparisons

| Model | Condition | Question | Eligible fields | Extra TV vs assistant |
|---|---|---|---:|---:|
| gpt-5.2 | witch | favorite | 8 | 17.2 |
| deepseek-v4-pro | witch | favorite | 8 | 47.4 |
| google/gemma-2-27b-it | witch | favorite | 8 | 17.2 |
| qwen/qwen-2.5-72b-instruct | witch | favorite | 8 | 35.9 |
| meta-llama/llama-3.3-70b-instruct | witch | favorite | 8 | 56.6 |
| gpt-4o-mini | witch | favorite | 8 | 40.6 |
| mistralai/mistral-small-3.2-24b-instruct | witch | favorite | 8 | 21.9 |
| meta-llama/llama-3.1-8b-instruct | witch | favorite | 8 | 28.1 |
| qwen/qwen-2.5-7b-instruct | witch | favorite | 8 | 27.7 |
| openai/gpt-3.5-turbo | witch | favorite | 8 | 42.2 |
| anthropic/claude-3-haiku | witch | favorite | 8 | 13.5 |
| anthropic/claude-haiku-4.5 | witch | favorite | 8 | 0.0 |
| gpt-5.2 | witch | overrated | 8 | 3.1 |
| deepseek-v4-pro | witch | overrated | 8 | 14.1 |
| google/gemma-2-27b-it | witch | overrated | 8 | 14.1 |
| qwen/qwen-2.5-72b-instruct | witch | overrated | 8 | 1.6 |
| meta-llama/llama-3.3-70b-instruct | witch | overrated | 8 | 13.2 |
| gpt-4o-mini | witch | overrated | 8 | 1.6 |
| mistralai/mistral-small-3.2-24b-instruct | witch | overrated | 8 | 9.4 |
| meta-llama/llama-3.1-8b-instruct | witch | overrated | 8 | 21.9 |
| qwen/qwen-2.5-7b-instruct | witch | overrated | 8 | 12.5 |
| openai/gpt-3.5-turbo | witch | overrated | 8 | -12.5 |
| anthropic/claude-3-haiku | witch | overrated | 7 | 21.0 |
| anthropic/claude-haiku-4.5 | witch | overrated | 8 | -10.9 |
| gpt-5.2 | banshee | favorite | 8 | 15.6 |
| deepseek-v4-pro | banshee | favorite | 8 | 44.2 |
| google/gemma-2-27b-it | banshee | favorite | 8 | 26.6 |
| qwen/qwen-2.5-72b-instruct | banshee | favorite | 8 | 37.5 |
| meta-llama/llama-3.3-70b-instruct | banshee | favorite | 8 | 59.7 |
| gpt-4o-mini | banshee | favorite | 8 | 31.3 |
| mistralai/mistral-small-3.2-24b-instruct | banshee | favorite | 8 | 20.3 |
| meta-llama/llama-3.1-8b-instruct | banshee | favorite | 8 | 29.7 |
| qwen/qwen-2.5-7b-instruct | banshee | favorite | 8 | 32.4 |
| openai/gpt-3.5-turbo | banshee | favorite | 8 | 48.4 |
| anthropic/claude-3-haiku | banshee | favorite | 8 | 7.8 |
| anthropic/claude-haiku-4.5 | banshee | favorite | 8 | 10.9 |
| gpt-5.2 | banshee | overrated | 8 | 4.7 |
| deepseek-v4-pro | banshee | overrated | 8 | 20.1 |
| google/gemma-2-27b-it | banshee | overrated | 8 | 12.5 |
| qwen/qwen-2.5-72b-instruct | banshee | overrated | 8 | 0.0 |
| meta-llama/llama-3.3-70b-instruct | banshee | overrated | 8 | 20.8 |
| gpt-4o-mini | banshee | overrated | 8 | -9.4 |
| mistralai/mistral-small-3.2-24b-instruct | banshee | overrated | 8 | 6.3 |
| meta-llama/llama-3.1-8b-instruct | banshee | overrated | 8 | 6.3 |
| qwen/qwen-2.5-7b-instruct | banshee | overrated | 8 | 8.9 |
| openai/gpt-3.5-turbo | banshee | overrated | 8 | 1.6 |
| anthropic/claude-3-haiku | banshee | overrated | 7 | -7.1 |
| anthropic/claude-haiku-4.5 | banshee | overrated | 8 | -9.4 |
| gpt-5.2 | ghost | favorite | 8 | 18.8 |
| deepseek-v4-pro | ghost | favorite | 8 | 16.7 |
| google/gemma-2-27b-it | ghost | favorite | 8 | -4.7 |
| qwen/qwen-2.5-72b-instruct | ghost | favorite | 8 | 9.4 |
| meta-llama/llama-3.3-70b-instruct | ghost | favorite | 8 | 26.5 |
| gpt-4o-mini | ghost | favorite | 8 | 10.9 |
| mistralai/mistral-small-3.2-24b-instruct | ghost | favorite | 8 | -14.1 |
| meta-llama/llama-3.1-8b-instruct | ghost | favorite | 8 | 6.3 |
| qwen/qwen-2.5-7b-instruct | ghost | favorite | 8 | 16.7 |
| openai/gpt-3.5-turbo | ghost | favorite | 8 | 31.5 |
| anthropic/claude-3-haiku | ghost | favorite | 8 | 17.2 |
| anthropic/claude-haiku-4.5 | ghost | favorite | 8 | 9.4 |
| gpt-5.2 | ghost | overrated | 8 | -4.7 |
| deepseek-v4-pro | ghost | overrated | 8 | 10.5 |
| google/gemma-2-27b-it | ghost | overrated | 8 | 6.3 |
| qwen/qwen-2.5-72b-instruct | ghost | overrated | 8 | -7.8 |
| meta-llama/llama-3.3-70b-instruct | ghost | overrated | 8 | 16.4 |
| gpt-4o-mini | ghost | overrated | 8 | 0.0 |
| mistralai/mistral-small-3.2-24b-instruct | ghost | overrated | 8 | -6.3 |
| meta-llama/llama-3.1-8b-instruct | ghost | overrated | 8 | 9.4 |
| qwen/qwen-2.5-7b-instruct | ghost | overrated | 8 | 4.2 |
| openai/gpt-3.5-turbo | ghost | overrated | 8 | -2.0 |
| anthropic/claude-3-haiku | ghost | overrated | 7 | 6.4 |
| anthropic/claude-haiku-4.5 | ghost | overrated | 8 | -1.6 |

## Interpretation and next experiment

Persistent favorites and character-specific shared alternatives both occur. These observations do not establish prompt-independent preferences or a neural mechanism. City examples do not establish increased overall convergence: inspect pair agreement rather than inferring it from a new leading city. The broad high/low-consensus grouping is not used as a causal comparison because answer-space size and baseline concentration differ between fields.

The September follow-up protocol is frozen in `data/persona3-protocol.json`. Its neutral user prompts, wording variants, style control and explicit taste instruction address questions left unresolved here. Keep that run separate from July.
