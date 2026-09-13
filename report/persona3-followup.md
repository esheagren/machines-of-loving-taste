# September follow-up: characters, style and taste

Reproduce with `node src/analyze-persona3.js`. The protocol was frozen before collection in `data/persona3-protocol.json` (SHA-256 cacc76b196fc14c3bf15a9439671b1a94c514e5b312a2ca286a7425798fabe7d). This is an exploratory follow-up informed by July, not an external preregistration.

1512 new responses from three models; three fields; seven conditions; two system phrasings crossed with two user phrasings; six repeats per full wording cell. Each model-field-condition has 24 replies. Favorites only. Provider queues processed seeded, shuffled balanced blocks. Three preliminary API smoke calls are excluded. Exact responses, returned model IDs, timestamps and usage are in the committed observations.

## What the follow-up shows

- Explicit taste instructions move the answers substantially in all three models. Autumn receives 69/72 baseline season replies; summer receives 71/72 under the bright, lively taste instruction.
- Kyoto and Venice account for 72/72 baseline city replies and 0/72 under the explicit taste instruction. This is a direct, readily interpretable change.
- The precise character favorites vary: Venice leads the ghost replies and Salem leads the witch replies in this smaller panel. That qualifies the July title and examples; do not claim that Kyoto or Prague must survive across settings.
- The writing-style instruction also changes some named answers. It is not a clean control for unchanged choice, especially where a model invents poetic color names.
- The assistant control itself has a large effect for Mistral Small 3.2, making the choice of reference consequential. Report both controls and each model rather than hiding this in a pooled effect.

## Extraction and validity

Every distinct first-line form was reviewed (143). All 1512 responses name an answer. 42 season responses name Halloween or Samhain; 1 city response names Gotham. These remain visible as named outputs, with a sensitivity analysis excluding them. Poetic color names remain distinct, so color-name distance can reflect creative naming as well as a different intended hue. No independent behavioral test establishes the corresponding colors. The name review retains full text for irregular responses.

## Observed distribution distance

TV is total variation between named-answer distributions: zero means identical observed shares; one means no shared name. The table uses TV percentage points. Each model and field has equal weight. Extra distance subtracts the assistant control's distance from the same no-character baseline, within model and field. The 512-shuffle reference uses the same sample sizes and is descriptive. No population-level significance claims are made from three selected models.

| Condition | TV vs none | Extra TV vs assistant |
|---|---:|---:|
| AI assistant | 29.2 | 0.0 |
| Ghost | 49.1 | 19.9 |
| Witch | 50.0 | 20.8 |
| Banshee | 54.2 | 25.0 |
| Ghost-story style | 45.4 | 16.2 |
| Bright, lively taste | 98.1 | 69.0 |

## Every model

| Model | Condition | TV vs none | Extra TV vs assistant | Shuffled reference |
|---|---|---:|---:|---:|
| GPT-5.2 | AI assistant | 1.4 | 0.0 | 1.4 |
| Claude Haiku 4.5 | AI assistant | 19.4 | 0.0 | 11.3 |
| Mistral Small 3.2 | AI assistant | 66.7 | 0.0 | 12.3 |
| GPT-5.2 | Ghost | 43.1 | 41.7 | 13.7 |
| Claude Haiku 4.5 | Ghost | 23.6 | 4.2 | 10.9 |
| Mistral Small 3.2 | Ghost | 80.6 | 13.9 | 16.2 |
| GPT-5.2 | Witch | 37.5 | 36.1 | 11.0 |
| Claude Haiku 4.5 | Witch | 34.7 | 15.3 | 14.0 |
| Mistral Small 3.2 | Witch | 77.8 | 11.1 | 18.5 |
| GPT-5.2 | Banshee | 36.1 | 34.7 | 10.3 |
| Claude Haiku 4.5 | Banshee | 54.2 | 34.7 | 17.3 |
| Mistral Small 3.2 | Banshee | 72.2 | 5.6 | 17.6 |
| GPT-5.2 | Ghost-story style | 33.3 | 31.9 | 9.4 |
| Claude Haiku 4.5 | Ghost-story style | 20.8 | 1.4 | 13.0 |
| Mistral Small 3.2 | Ghost-story style | 81.9 | 15.3 | 21.6 |
| GPT-5.2 | Bright, lively taste | 100.0 | 98.6 | 18.9 |
| Claude Haiku 4.5 | Bright, lively taste | 94.4 | 75.0 | 22.2 |
| Mistral Small 3.2 | Bright, lively taste | 100.0 | 33.3 | 16.0 |

## Wording sensitivity

Question and system splits each contain 12 replies per model-field-condition; do not compare their TV directly with the 24-reply pooled TV as if sample sizes matched.

| Condition | User wording 1 | User wording 2 | System wording 1 | System wording 2 |
|---|---:|---:|---:|---:|
| AI assistant | 42.6 | 19.4 | 26.9 | 31.5 |
| Ghost | 49.1 | 50.0 | 44.4 | 55.6 |
| Witch | 56.5 | 48.1 | 44.4 | 56.5 |
| Banshee | 62.0 | 46.3 | 54.6 | 54.6 |
| Ghost-story style | 55.6 | 38.9 | 46.3 | 45.4 |
| Bright, lively taste | 97.2 | 100.0 | 100.0 | 98.1 |

## Full distributions by model and field

### GPT-5.2: city

- No character: kyoto 24/24.
- AI assistant: kyoto 24/24.
- Ghost: kyoto 16/24; venice 5/24; prague 3/24.
- Witch: kyoto 16/24; prague 7/24; edinburgh 1/24.
- Banshee: kyoto 20/24; edinburgh 3/24; prague 1/24.
- Ghost-story style: kyoto 22/24; prague 1/24; venice 1/24.
- Bright, lively taste: tokyo 16/24; mexico city 4/24; miami 3/24; dubai 1/24.

### GPT-5.2: season

- No character: autumn 24/24.
- AI assistant: autumn 24/24.
- Ghost: autumn 24/24.
- Witch: autumn 24/24.
- Banshee: autumn 24/24.
- Ghost-story style: autumn 24/24.
- Bright, lively taste: summer 24/24.

### GPT-5.2: color

- No character: ultramarine 23/24; cobalt blue 1/24.
- AI assistant: ultramarine 24/24.
- Ghost: midnight blue 7/24; prussian blue 5/24; moonlit silver 3/24; pale moonlight blue 3/24; payne's gray 2/24; phthalo blue 1/24; phthalo green 1/24; spectral blue 1/24; ultramarine 1/24.
- Witch: midnight blue 8/24; indigo 5/24; ultramarine 5/24; midnight indigo 3/24; deep indigo 2/24; alizarin crimson 1/24.
- Banshee: midnight blue 10/24; phthalo green 8/24; cerulean 2/24; ultramarine 2/24; moonlit silver 1/24; payne's gray 1/24.
- Ghost-story style: payne's gray 9/24; midnight blue 7/24; prussian blue 5/24; ultramarine 2/24; indigo 1/24.
- Bright, lively taste: electric coral 9/24; electric teal 5/24; electric blue 4/24; electric turquoise 4/24; coral 1/24; sunset orange 1/24.

### Claude Haiku 4.5: city

- No character: venice 24/24.
- AI assistant: venice 23/24; tokyo 1/24.
- Ghost: venice 24/24.
- Witch: venice 17/24; salem 6/24; prague 1/24.
- Banshee: venice 12/24; dublin 10/24; dubrovnik 1/24; galway 1/24.
- Ghost-story style: venice 24/24.
- Bright, lively taste: miami 18/24; barcelona 2/24; tokyo 2/24; bangkok 1/24; dubai 1/24.

### Claude Haiku 4.5: season

- No character: autumn 21/24; spring 3/24.
- AI assistant: autumn 18/24; spring 6/24.
- Ghost: autumn 21/24; spring 3/24.
- Witch: autumn 23/24; spring 1/24.
- Banshee: autumn 22/24; winter 2/24.
- Ghost-story style: autumn 24/24.
- Bright, lively taste: summer 23/24; spring 1/24.

### Claude Haiku 4.5: color

- No character: viridian 11/24; teal 10/24; cerulean 3/24.
- AI assistant: cerulean 11/24; viridian 6/24; teal 5/24; blue 1/24; periwinkle 1/24.
- Ghost: cerulean 14/24; periwinkle 3/24; teal 2/24; viridian 2/24; amber 1/24; prussian blue 1/24; ultraviolet 1/24.
- Witch: midnight purple 11/24; viridian 4/24; amber 3/24; cerulean 3/24; indigo 1/24; midnight violet 1/24; teal 1/24.
- Banshee: violet 15/24; silver 3/24; indigo 2/24; midnight blue 2/24; moonlit silver 1/24; obsidian 1/24.
- Ghost-story style: viridian 11/24; verdigris 3/24; prussian blue 2/24; cerulean 1/24; obsidian 1/24; periwinkle 1/24; slate 1/24; twilight blue 1/24; twilight purple 1/24; ultramarine 1/24; vermilion 1/24.
- Bright, lively taste: coral 8/24; saffron 4/24; cerulean 3/24; sunflower yellow 2/24; tangerine 2/24; vermilion 2/24; cadmium yellow 1/24; cobalt blue 1/24; sunburst gold 1/24.

### Mistral Small 3.2: city

- No character: kyoto 24/24.
- AI assistant: paris 15/24; kyoto 9/24.
- Ghost: paris 20/24; venice 3/24; new orleans 1/24.
- Witch: salem 13/24; portmeirion 9/24; portland, oregon 2/24.
- Banshee: dublin 17/24; venice 6/24; edinburgh 1/24.
- Ghost-story style: edinburgh 11/24; venice 9/24; prague 2/24; gotham 1/24; london 1/24.
- Bright, lively taste: rio de janeiro 11/24; barcelona 7/24; las vegas 6/24.

### Mistral Small 3.2: season

- No character: autumn 24/24.
- AI assistant: autumn 12/24; spring 12/24.
- Ghost: autumn 14/24; halloween 10/24.
- Witch: samhain 17/24; autumn 7/24.
- Banshee: autumn 20/24; halloween 3/24; samhain 1/24.
- Ghost-story style: autumn 13/24; samhain 8/24; halloween 3/24.
- Bright, lively taste: summer 24/24.

### Mistral Small 3.2: color

- No character: emerald 23/24; cerulean 1/24.
- AI assistant: azure 16/24; cerulean 6/24; emerald 2/24.
- Ghost: ethereal blue 9/24; ethereal lavender 8/24; phantom violet 3/24; ethereal 2/24; ethereal silver 2/24.
- Witch: emerald 9/24; elderflower 3/24; amethyst 2/24; elderberry 2/24; indigo 2/24; mulberry 2/24; eldritch emerald 1/24; midnight indigo 1/24; mystic amethyst 1/24; verdant 1/24.
- Banshee: black 9/24; eerie emerald 6/24; crimson 3/24; eerie ebony 2/24; eerie green 2/24; ebony 1/24; ethereal lavender 1/24.
- Ghost-story style: phthalo blue 5/24; crimson 4/24; eerie ebony 4/24; phantom's whisper 3/24; eerie jade 2/24; phantom's mourn 2/24; phantom's veil 2/24; eerie verdant 1/24; phantom violet 1/24.
- Bright, lively taste: vibrant orange 22/24; fuchsia 1/24; vermilion 1/24.

## Identical baseline slots

The no-character condition has two identical system slots, each pooling both user questions (12 replies). Their observed distances give a same-prompt variability check at that sample size.

- gpt-5.2, city: 0.0 TV points.
- gpt-5.2, season: 0.0 TV points.
- gpt-5.2, color: 8.3 TV points.
- anthropic/claude-haiku-4.5, city: 0.0 TV points.
- anthropic/claude-haiku-4.5, season: 8.3 TV points.
- anthropic/claude-haiku-4.5, color: 8.3 TV points.
- mistralai/mistral-small-3.2-24b-instruct, city: 0.0 TV points.
- mistralai/mistral-small-3.2-24b-instruct, season: 0.0 TV points.
- mistralai/mistral-small-3.2-24b-instruct, color: 8.3 TV points.

## Excluding festival answers and the fictional city

| Model | Field | Condition | Named replies retained | TV vs none |
|---|---|---|---:|---:|
| gpt-5.2 | city | assistant | 24/24 | 0.0 |
| gpt-5.2 | season | assistant | 24/24 | 0.0 |
| anthropic/claude-haiku-4.5 | city | assistant | 24/24 | 4.2 |
| anthropic/claude-haiku-4.5 | season | assistant | 24/24 | 12.5 |
| mistralai/mistral-small-3.2-24b-instruct | city | assistant | 24/24 | 62.5 |
| mistralai/mistral-small-3.2-24b-instruct | season | assistant | 24/24 | 50.0 |
| gpt-5.2 | city | ghost | 24/24 | 33.3 |
| gpt-5.2 | season | ghost | 24/24 | 0.0 |
| anthropic/claude-haiku-4.5 | city | ghost | 24/24 | 0.0 |
| anthropic/claude-haiku-4.5 | season | ghost | 24/24 | 0.0 |
| mistralai/mistral-small-3.2-24b-instruct | city | ghost | 24/24 | 100.0 |
| mistralai/mistral-small-3.2-24b-instruct | season | ghost | 14/24 | 0.0 |
| gpt-5.2 | city | witch | 24/24 | 33.3 |
| gpt-5.2 | season | witch | 24/24 | 0.0 |
| anthropic/claude-haiku-4.5 | city | witch | 24/24 | 29.2 |
| anthropic/claude-haiku-4.5 | season | witch | 24/24 | 8.3 |
| mistralai/mistral-small-3.2-24b-instruct | city | witch | 24/24 | 100.0 |
| mistralai/mistral-small-3.2-24b-instruct | season | witch | 7/24 | 0.0 |
| gpt-5.2 | city | banshee | 24/24 | 16.7 |
| gpt-5.2 | season | banshee | 24/24 | 0.0 |
| anthropic/claude-haiku-4.5 | city | banshee | 24/24 | 50.0 |
| anthropic/claude-haiku-4.5 | season | banshee | 24/24 | 12.5 |
| mistralai/mistral-small-3.2-24b-instruct | city | banshee | 24/24 | 100.0 |
| mistralai/mistral-small-3.2-24b-instruct | season | banshee | 20/24 | 0.0 |
| gpt-5.2 | city | ghost-style | 24/24 | 8.3 |
| gpt-5.2 | season | ghost-style | 24/24 | 0.0 |
| anthropic/claude-haiku-4.5 | city | ghost-style | 24/24 | 0.0 |
| anthropic/claude-haiku-4.5 | season | ghost-style | 24/24 | 12.5 |
| mistralai/mistral-small-3.2-24b-instruct | city | ghost-style | 23/24 | 100.0 |
| mistralai/mistral-small-3.2-24b-instruct | season | ghost-style | 13/24 | 0.0 |
| gpt-5.2 | city | bright-taste | 24/24 | 100.0 |
| gpt-5.2 | season | bright-taste | 24/24 | 100.0 |
| anthropic/claude-haiku-4.5 | city | bright-taste | 24/24 | 100.0 |
| anthropic/claude-haiku-4.5 | season | bright-taste | 24/24 | 95.8 |
| mistralai/mistral-small-3.2-24b-instruct | city | bright-taste | 24/24 | 100.0 |
| mistralai/mistral-small-3.2-24b-instruct | season | bright-taste | 24/24 | 100.0 |

## Limits and interpretation

Treat July and September as separate experiments. The follow-up changes the panel, fields, user wording, formatting request, date and sample sizes. No individual cross-date difference identifies an effect of removing the AI preamble. The style instruction explicitly asks to preserve criteria, while the taste instruction specifies several properties; these are informative but not perfectly matched interventions. Character effects, style effects and novel color labels can overlap. Explanation examples remain qualitative and cannot establish how often role adoption succeeded. Results for all models and both wording variants are included to avoid presenting only a favorable pooled result.
