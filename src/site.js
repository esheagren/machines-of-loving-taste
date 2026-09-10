// The atlas site, second composition: one continuous piece rather than stacked
// plates. A sticky specimen rail threads the whole page; the consensus canon is
// illustrated (Commons imagery embedded as data URIs, native renderings for
// typefaces / colors / words / verse); the cabinet and dossier interlock.
// Emits report/site.html (standalone) and report/artifact.html (artifact variant).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MODELS, DOMAINS } from './config.js';

const here = dirname(fileURLToPath(import.meta.url));
const S = JSON.parse(readFileSync(join(here, '..', 'data', 'summary.json'), 'utf8'));
const V = JSON.parse(readFileSync(join(here, '..', 'data', 'vocab.json'), 'utf8'));
const IMAGES = existsSync(join(here, '..', 'data', 'images.json'))
  ? JSON.parse(readFileSync(join(here, '..', 'data', 'images.json'), 'utf8')) : {};
const ALIASES = existsSync(join(here, '..', 'data', 'aliases.json'))
  ? JSON.parse(readFileSync(join(here, '..', 'data', 'aliases.json'), 'utf8')) : {};
// Entity cards: pre-generated blurb + extras + jacket-quote endorsements per
// canonical entity, keyed "<domain> <canonical norm>" — the same key the
// matrix computes as canonEnt(domain, entity).
const RAW_CARDS = existsSync(join(here, '..', 'data', 'entitycards.json'))
  ? JSON.parse(readFileSync(join(here, '..', 'data', 'entitycards.json'), 'utf8')) : {};
// Re-key cards to the CLIENT's normalization (normEnt strips accents and curly
// apostrophes; the generator's analyze.js-style keys keep them) — otherwise
// accented entities (Phở, Sagrada Família, Žižek) never resolve their card.
const clientNorm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'")
  .replace(/\s+/g, ' ').trim().replace(/^(The|A|An) /i, '').toLowerCase();
const CARDS = Object.fromEntries(Object.entries(RAW_CARDS).map(([key, card]) => {
  const sp = key.indexOf(' ');
  return [key.slice(0, sp) + ' ' + clientNorm(key.slice(sp + 1)), card];
}));
// Entity-card photographs, keyed exactly like entitycards.json ("<domain>
// <canonNorm>") and re-keyed to the client normalization the same way. The
// "_misses" bookkeeping entry is the generator's, not an entity.
const RAW_EIMG = existsSync(join(here, '..', 'data', 'entityimages.json'))
  ? JSON.parse(readFileSync(join(here, '..', 'data', 'entityimages.json'), 'utf8')) : {};
const EIMG = Object.fromEntries(Object.entries(RAW_EIMG)
  .filter(([key, v]) => key !== '_misses' && key.includes(' ') && v && v.uri)
  .map(([key, v]) => {
    const sp = key.indexOf(' ');
    return [key.slice(0, sp) + ' ' + clientNorm(key.slice(sp + 1)), { uri: v.uri, credit: v.credit || '' }];
  }));
// Research tab data: the persona/rung displacement study. Both optional —
// existsSync-guarded the same way as the other supplementary data above — so
// the site still builds if the persona pipeline hasn't run yet (researchHTML
// below no-ops when either is missing).
const PERSONA_SUMMARY = existsSync(join(here, '..', 'data', 'persona-summary.json'))
  ? JSON.parse(readFileSync(join(here, '..', 'data', 'persona-summary.json'), 'utf8')) : null;
const PERSONAS = existsSync(join(here, '..', 'data', 'personas.json'))
  ? JSON.parse(readFileSync(join(here, '..', 'data', 'personas.json'), 'utf8')) : null;
const readJSONL = (p) => existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
// Only domains that have been fully summarized are shown. config.js may list
// newer domains whose data is still being collected in the background — those
// have no cells in summary.json yet and are ignored here entirely.
const summarizedDomains = new Set(Object.keys(Object.values(S.cells)[0] ?? {}));
const DOMAIN_IDS = Object.keys(DOMAINS).filter((d) => summarizedDomains.has(d));
const retainedDomains = new Set(DOMAIN_IDS);
const rosterIds = new Set(MODELS.map((m) => m.id)); // held-out models' banked rows never reach the page
const RAW = readJSONL(join(here, '..', 'data', 'raw.jsonl')).filter((r) => r.text && retainedDomains.has(r.domain) && rosterIds.has(r.model));
const EXT = readJSONL(join(here, '..', 'data', 'extracted.jsonl')).filter((r) => retainedDomains.has(r.domain) && rosterIds.has(r.model));

const V1_DOMAINS = new Set(['book', 'film', 'album', 'architect', 'city', 'painting']);
const SHORT = {
  'claude-opus-4-1': 'Opus 4.1', 'claude-opus-4-5': 'Opus 4.5', 'claude-opus-4-8': 'Opus 4.8',
  'claude-fable-5': 'Fable 5', 'claude-opus-5': 'Opus 5', 'claude-fable-5-1': 'Fable 5.1',
  'gpt-4o': 'GPT-4o', 'o3': 'o3', 'gpt-5.2': 'GPT-5.2', 'gpt-5.6-sol': 'GPT-5.6 Sol', 'gpt-6-astra': 'GPT-6 Astra',
  'gemini-3.1-pro-preview': 'Gemini 3.1 Pro', 'gemini-3.5-flash': 'Gemini 3.5 Flash', 'gemini-3.7-flash': 'Gemini 3.7 Flash',
  'deepseek-v4-pro': 'DeepSeek V4 Pro', 'kimi-k2.6': 'Kimi K2.6', 'kimi-k3': 'Kimi K3',
  'grok-4.5': 'Grok 4.5', 'grok-4.6': 'Grok 4.6', 'z-ai/glm-5.3': 'GLM-5.3',
};
const DOMAIN_LABELS = {
  book: 'Novel', film: 'Film', album: 'Album', architect: 'Architect', city: 'City', painting: 'Painting',
  poem: 'Poem', word: 'Word', typeface: 'Typeface', chair: 'Chair', object: 'Everyday object',
  bookcover: 'Book cover', videogame: 'Video game', building: 'Building', street: 'Street',
  uscity: 'U.S. city', cuisine: 'Cuisine', dish: 'Dish', color: 'Color', season: 'Season',
  smell: 'Smell', decade: 'Design decade',
  novelist: 'Novelist', philosopher: 'Philosopher', religioustext: 'Religious text',
  artmovement: 'Artistic movement', monument: 'Monument',
  tvshow: 'TV show', actor: 'Actor', actress: 'Actress', play: 'Play', musical: 'Musical',
  economist: 'Economist', scientist: 'Scientist', theologian: 'Theologian',
  mathematician: 'Mathematician', blogger: 'Blogger', computerscientist: 'Computer scientist',
  airesearcher: 'AI researcher', aimodel: 'AI model', historian: 'Historian',
  psychologist: 'Psychologist', boardgame: 'Board game', sport: 'Sport',
  childrensbook: "Children's book",
  musician: 'Musician', composer: 'Contemporary composer', song: 'Song',
  director: 'Film director', proglang: 'Programming language', sound: 'Sound',
  country: 'Country',
  biography: 'Biography', textbook: 'Textbook',
};
// Groups may list ids whose data is still being collected (no summary cells
// yet) — the client rail only renders ids present in DATA.domains, so those
// fields appear automatically once their collection lands.
const DOMAIN_GROUPS = [
  { label: 'Literature & Language', ids: ['book', 'poem', 'novelist', 'biography', 'textbook', 'childrensbook', 'religioustext', 'word'] },
  { label: 'Art & Architecture', ids: ['painting', 'artmovement', 'architect', 'building', 'monument'] },
  { label: 'Film, TV & Theater', ids: ['film', 'director', 'tvshow', 'actor', 'actress', 'play', 'musical'] },
  { label: 'Thinkers', ids: ['philosopher', 'economist', 'scientist', 'mathematician', 'historian', 'psychologist', 'theologian', 'computerscientist', 'airesearcher', 'aimodel', 'blogger'] },
  { label: 'Music', ids: ['album', 'song', 'musician', 'composer'] },
  { label: 'Games', ids: ['videogame', 'boardgame', 'sport'] },
  { label: 'Miscellaneous', ids: ['typeface', 'object', 'proglang'] },
  { label: 'History', ids: ['decade'] },
  { label: 'Places', ids: ['country', 'city', 'uscity', 'street'] },
  { label: 'Life & Senses', ids: ['cuisine', 'dish', 'color', 'season', 'smell', 'sound'] },
];
const byFamily = ['Anthropic', 'OpenAI', 'Google', 'xAI', 'DeepSeek', 'Moonshot', 'Zhipu'];
// Power rank within each family, most capable first. Not just -config.order:
// config.order is collection order (oldest first) for Anthropic/OpenAI, which
// happens to invert cleanly, but for Google a higher version number ("3.5
// Flash") is still a lighter tier than "3.1 Pro" — so it needs its own map.
const POWER_RANK = {
  'claude-fable-5-1': 1, 'claude-fable-5': 2, 'claude-opus-5': 3, 'claude-opus-4-8': 4, 'claude-opus-4-5': 5, 'claude-opus-4-1': 6,
  'gpt-6-astra': 1, 'gpt-5.6-sol': 2, 'gpt-5.2': 3, 'o3': 4, 'gpt-4o': 5,
  'gemini-3.1-pro-preview': 1, 'gemini-3.7-flash': 2, 'gemini-3.5-flash': 3,
  'deepseek-v4-pro': 1,
  'kimi-k3': 1, 'kimi-k2.6': 2,
  'grok-4.6': 1, 'grok-4.5': 2,
  'z-ai/glm-5.3': 1,
};
const models = [...S.models].sort((a, b) => byFamily.indexOf(a.family) - byFamily.indexOf(b.family) || POWER_RANK[a.id] - POWER_RANK[b.id]);
// Cross-family capability order, most capable first — used to sequence the
// entity-card quotes (strongest voices speak first). Unlisted ids sort last.
const CAPABILITY_RANK = {
  'claude-fable-5-1': 1, 'claude-fable-5': 2, 'claude-opus-5': 3, 'gpt-6-astra': 4, 'gpt-5.6-sol': 5, 'claude-opus-4-8': 6,
  'gemini-3.1-pro-preview': 7, 'grok-4.6': 8, 'grok-4.5': 9, 'claude-opus-4-5': 10, 'gpt-5.2': 11,
  'kimi-k3': 12, 'deepseek-v4-pro': 13, 'z-ai/glm-5.3': 14, 'kimi-k2.6': 15, 'gemini-3.7-flash': 16, 'gemini-3.5-flash': 17,
  'claude-opus-4-1': 18, 'gpt-4o': 19,
};
// Every color entity in data/entitycards.json ("color <norm>"), mapped to an
// honest hex. Keys are the client's canonical norm (canonEnt output). The very
// dark classical values (navy #000080, ultramarine #120a8f, prussian #003153,
// pure blue #0000ff) are lifted a touch so a 9px dot reads on the night ground.
// Blogger identity: models name bloggers both by person and by publication, and
// the two collapse to one entry (via aliases). Here the row/card show the person
// as the title and their blog as the subtitle — keyed by canonical norm. Blank
// blog = show the person alone (no distinctive publication name).
// url = the blogger's own site; the card's external-link arrow points here
// (not Wikipedia) for the blogger domain.
const BLOGGER_ID = {
  'marginalian': { name: 'Maria Popova', blog: 'The Marginalian', url: 'https://www.themarginalian.org' },
  'astral codex ten': { name: 'Scott Alexander', blog: 'Astral Codex Ten', url: 'https://www.astralcodexten.com' },
  'wait but why': { name: 'Tim Urban', blog: 'Wait But Why', url: 'https://waitbutwhy.com' },
  'tim ferriss': { name: 'Tim Ferriss', blog: '', url: 'https://tim.blog' },
  'seth godin': { name: 'Seth Godin', blog: "Seth's Blog", url: 'https://seths.blog' },
  'paul graham': { name: 'Paul Graham', blog: '', url: 'https://www.paulgraham.com/articles.html' },
  'mark manson': { name: 'Mark Manson', blog: '', url: 'https://markmanson.net' },
  'john gruber': { name: 'John Gruber', blog: 'Daring Fireball', url: 'https://daringfireball.net' },
  'kottke.org': { name: 'Jason Kottke', blog: 'kottke.org', url: 'https://kottke.org' },
  'goop': { name: 'Gwyneth Paltrow', blog: 'Goop', url: 'https://goop.com' },
  'pioneer woman': { name: 'Ree Drummond', blog: 'The Pioneer Woman', url: 'https://www.thepioneerwoman.com' },
  'cup of jo': { name: 'Joanna Goddard', blog: 'Cup of Jo', url: 'https://cupofjo.com' },
  'chiara ferragni': { name: 'Chiara Ferragni', blog: 'The Blonde Salad', url: 'https://theblondesalad.com' },
  'marie kondo': { name: 'Marie Kondo', blog: '', url: 'https://konmari.com' },
  'robin sloan': { name: 'Robin Sloan', blog: '', url: 'https://www.robinsloan.com' },
  'austin kleon': { name: 'Austin Kleon', blog: '', url: 'https://austinkleon.com' },
};
// Domains whose unit is a PERSON. The row already IS the person, so a creator
// subtitle there is never anything but the title said twice ("Johann Sebastian
// Bach / Johann Sebastian Bach") — either because the model echoed the name
// into the creator field, or because it answered with a work, which
// aliases.json now folds into its author. blogger is deliberately absent: it
// canonicalizes the other way (person -> publication) and re-titles the row to
// the person via BLOGGER_ID, so its subtitle is a real blog name.
const PERSON_DOMAINS = new Set(['architect', 'novelist', 'philosopher', 'actor', 'actress',
  'economist', 'scientist', 'theologian', 'mathematician', 'computerscientist', 'airesearcher',
  'historian', 'psychologist', 'musician', 'composer', 'director']);
// Fold for comparing a title against its creator only — not a key, so it can be
// blunter than normEnt (punctuation and accents both go).
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
// A creator earns its line only when it says something the title doesn't. Drops
// exact echoes and brand prefixes ("Apple AirPods / Apple"), keeps real credits
// ("Invisible Cities / Italo Calvino", "iPhone / Apple").
const subtitleFor = (domain, entity, creator) => {
  if (!creator || PERSON_DOMAINS.has(domain)) return null;
  const e = fold(entity), c = fold(creator);
  if (!c || !e || e === c || e.startsWith(c + ' ')) return null;
  return creator;
};
const COLOR_HEX = {
  'teal': '#0d7d7d', 'turquoise': '#40e0d0', 'cerulean': '#007ba7',
  'millennial pink': '#f3cdc7', 'ultramarine': '#2a3fd4', 'navy blue': '#1a2f6e',
  'indigo': '#4b0082', 'cobalt blue': '#0047ab', 'electric cyan': '#00e5ff',
  'tiffany blue': '#0abab5', 'beige': '#f5f5dc', 'sky blue': '#87ceeb',
  'prussian blue': '#0e3a5c', 'blue': '#2727e0', 'purple': '#800080',
  'mint green': '#9fe2bf', 'sapphire blue': '#0f52ba', 'azure': '#007fff',
  'pink': '#ffc0cb', 'royal blue': '#4169e1',
  'midnight blue': '#191970', 'electric indigo': '#6f00ff', 'rose gold': '#b76e79',
  'sunset orange': '#fd5e53', 'deep cerulean': '#00618f',
};
// Every typeface entity in data/entitycards.json ("typeface <norm>"), mapped
// to a system-font stack (the CSP forbids webfonts). Faces with no common
// system presence get their closest system cousin, then an honest generic.
// `size` trims the few faces that run visually large at the label size.
const TYPEFACE_STACK = {
  'helvetica': { css: "'Helvetica Neue',Helvetica,Arial,sans-serif" },
  'garamond': { css: "Garamond,'Apple Garamond','EB Garamond',serif" },
  'futura': { css: "Futura,'Avenir Next','Century Gothic',sans-serif" },
  'baskerville': { css: "Baskerville,'Baskerville Old Face',Georgia,serif" },
  'optima': { css: "Optima,Candara,'Gill Sans',sans-serif" },
  'gill sans': { css: "'Gill Sans','Gill Sans MT',Calibri,sans-serif" },
  'avenir': { css: "Avenir,'Avenir Next','Century Gothic',sans-serif" },
  'arial': { css: "Arial,Helvetica,sans-serif" },
  'comic sans': { css: "'Comic Sans MS','Comic Sans',cursive", size: 0.92 },
  'papyrus': { css: "Papyrus,'Segoe Script',fantasy", size: 0.92 },
  'charter': { css: "Charter,'Bitstream Charter',Georgia,serif" },
  'inter': { css: "Inter,-apple-system,'Segoe UI','Helvetica Neue',Helvetica,sans-serif" },
  'ibm plex sans': { css: "'IBM Plex Sans','Helvetica Neue',Helvetica,Arial,sans-serif" },
  'fira code': { css: "'Fira Code',Menlo,Consolas,'Courier New',monospace", size: 0.95 },
  'fraunces': { css: "Fraunces,Georgia,'Iowan Old Style',serif" },
};

// ---- quotes: densest in signature vocabulary ----
function pickQuote(modelId) {
  const sig = (V.distinctive[modelId] ?? []).map(([w]) => w.toLowerCase());
  let best = null, bestScore = -1;
  for (const r of RAW.filter((r) => r.model === modelId && r.probe === 'favorite' && r.text.length > 120)) {
    const t = r.text.toLowerCase();
    let score = sig.reduce((s, w) => s + (t.includes(w) ? 1 : 0), 0) + (r.text.length < 700 ? 0.5 : 0);
    if (score > bestScore) { bestScore = score; best = r; }
  }
  if (!best) return null;
  let text = best.text.replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
  if (text.length > 380) {
    const cut = text.slice(0, 380);
    text = cut.slice(0, Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! ')) + 1) || cut + '…';
  }
  return { t: text, d: DOMAIN_LABELS[best.domain] ?? best.domain };
}

function hedgeSplit(modelId) {
  const mine = EXT.filter((r) => r.model === modelId);
  const rate = (rows) => rows.length ? Math.round(100 * rows.filter((r) => r.hedged).length / rows.length) : null;
  return {
    plain: rate(mine.filter((r) => V1_DOMAINS.has(r.domain))),
    told: rate(mine.filter((r) => !V1_DOMAINS.has(r.domain))),
  };
}

const modelData = models.map((m) => {
  const st = S.modelStats[m.id];
  const cen = V.centroids.find((c) => c.model === m.id);
  const hs = hedgeSplit(m.id);
  return {
    id: m.id, short: SHORT[m.id], label: m.label, family: m.family,
    persona: (V.distinctive[m.id] ?? []).slice(0, 2).map(([w]) => w).join(' · '),
    sig: (V.distinctive[m.id] ?? []).slice(0, 8).map(([w]) => w),
    hedgePlain: hs.plain, hedgeTold: hs.told,
    refuse: Math.round(100 * st.refusalRate),
    fixity: +(1 - st.meanEntropyFavorite).toFixed(2),
    distinct: Math.round(100 * st.distinctFavorites / Math.max(st.favoriteSamples, 1)),
    quote: pickQuote(m.id),
    x: cen?.x ?? 0, y: cen?.y ?? 0, z: cen?.z ?? 0,
  };
});

// ---- cells: top-3 picks per domain x model x probe ----
const top3 = (cell) => cell.dist.slice(0, 3).map(([e, c]) => [e, Math.round(100 * c / cell.n)]);
const cells = {};
for (const d of DOMAIN_IDS) {
  cells[d] = {};
  for (const m of models) {
    const c = S.cells[m.id][d];
    cells[d][m.id] = {
      f: c.favorite.n >= 4 ? top3(c.favorite) : null,
      o: c.overrated.n >= 4 ? top3(c.overrated) : null,
    };
  }
}

// ---- consensus per probe ----
const normEnt = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[’‘]/g, "'")
  .replace(/\s+/g, ' ').trim().replace(/^(The|A|An) /i, '').toLowerCase();
function consensus(probe) {
  const map = new Map();
  for (const d of DOMAIN_IDS) {
    for (const m of models) {
      const cell = S.cells[m.id][d][probe];
      if (cell.n < 4) continue;
      const top = cell.dist[0];
      if (!top) continue;
      const k = `${d}|${normEnt(top[0])}`;
      if (!map.has(k)) map.set(k, { e: top[0], d, ms: new Set() });
      map.get(k).ms.add(m.id);
    }
  }
  return [...map.values()].map((x) => ({ e: x.e, d: x.d, n: x.ms.size }))
    .sort((a, b) => b.n - a.n);
}
// Canon: loved by a strict majority only. If the same entity is also called
// overrated by a majority, the card wears both counts (the Gatsby case).
const MAJORITY = Math.floor(models.length / 2) + 1;
const consOverAll = consensus('overrated');
const consFav = consensus('favorite').filter((c) => c.n >= MAJORITY)
  .map((c) => {
    const over = consOverAll.find((o) => o.d === c.d && normEnt(o.e) === normEnt(c.e));
    return over && over.n >= MAJORITY ? { ...c, n2: over.n } : c;
  });

// ---- presentation: imagery + native renderings ----
const IMG_MAP = {
  'kyoto': 'kyoto', 'paris': 'paris', 'tadao ando': 'tadao ando', 'frank gehry': 'frank gehry',
  'girl with a pearl earring': 'girl with a pearl earring', 'mona lisa': 'mona lisa',
  'starry night': 'starry night', 'nighthawks': 'nighthawks',
  'sunday afternoon on the island of la grande jatte': 'sunday afternoon la grande jatte',
  'autumn': 'autumn', 'japanese cuisine': 'japanese cuisine', 'petrichor': 'petrichor',
  'eames lounge chair': 'eames lounge chair', 'paperclip': 'paperclip',
  'san francisco': 'san francisco', 'champs-elysees': 'champs-elysees',
  "philosopher's walk": 'philosophers walk', 'antoni gaudi': 'sagrada familia',
  'moby-dick': 'moby-dick', 'great gatsby': 'great gatsby',
};
const imgFor = (entity) => {
  const key = IMG_MAP[normEnt(entity)];
  return key && IMAGES[key] ? key : null;
};
const NATIVE = {
  'garamond': { kind: 'type', css: "Garamond,'EB Garamond','Apple Garamond',Baskerville,serif" },
  'helvetica': { kind: 'type', css: "'Helvetica Neue',Helvetica,Arial,sans-serif" },
  'futura': { kind: 'type', css: "Futura,'Avenir Next','Century Gothic',sans-serif" },
  'liminal': { kind: 'word' }, 'susurrus': { kind: 'word' }, 'awesome': { kind: 'word' },
  'serendipity': { kind: 'word' },
  'teal': { kind: 'color', hex: '#0d7d7d' }, 'millennial pink': { kind: 'color', hex: '#f3cdc7' },
  'summer': { kind: 'color', hex: 'linear-gradient(135deg,#e8a33d,#d4633a)' },
  'road not taken': { kind: 'verse', text: 'Two roads diverged in a yellow wood,\nAnd sorry I could not travel both…' },
  '1920s': { kind: 'decade' }, '1960s': { kind: 'decade' }, '1950s': { kind: 'decade' }, '1980s': { kind: 'decade' },
};

// ---- atlas words ----
const FAMS = { Anthropic: 'a', OpenAI: 'o', Google: 'g', DeepSeek: 'd', Moonshot: 'k', xAI: 'x', Zhipu: 'z' };
const words = V.words.slice().sort((a, b) => b.total - a.total).slice(0, 240)
  .map((w) => ({ w: w.w, x: w.x, y: w.y, t: w.total, f: w.fam ? FAMS[w.fam] : null }));

const totalResponses = models.reduce((a, m) => a + S.modelStats[m.id].n, 0);
const seasonPickers = models.filter((m) => {
  const c = S.cells[m.id]?.season?.favorite;
  return c && c.n >= 4 && c.dist[0] && /autumn|fall/i.test(c.dist[0][0]);
}).length;

const modelOrder = models.map((m) => m.id);
const lex = V.words.map((w) => [
  w.w, w.x, w.y, modelOrder.map((id) => w.per?.[id] ?? 0),
]);

// Raw justifications, keyed to the normalized entities from extraction. The
// cabinet uses these verbatim rather than attempting to recreate a rationale.
const extractedByKey = new Map(EXT.map((r) => [r.key, r]));
const responses = {};
for (const r of RAW) {
  const x = extractedByKey.get(r.key);
  if (!x?.entity) continue;
  const probe = r.probe === 'favorite' ? 'f' : 'o';
  responses[r.model] ??= {};
  responses[r.model][r.domain] ??= { f: [], o: [] };
  responses[r.model][r.domain][probe].push({
    e: x.entity,
    c: subtitleFor(r.domain, x.entity, x.creator),
    t: r.text.replace(/\*+/g, '').replace(/^#{1,6}\s+/gm, '').trim().slice(0, 1400),
  });
}

const DATA = {
  models: modelData,
  domains: DOMAIN_IDS.filter((d) => d !== 'bookcover' && d !== 'chair').map((d) => ({ id: d, label: DOMAIN_LABELS[d] })),
  domainGroups: DOMAIN_GROUPS,
  cells, words, lex, responses, imgMap: IMG_MAP, aliases: ALIASES, entityCards: CARDS, entityImages: EIMG,
  quiz: ['book', 'film', 'album', 'city', 'painting', 'word', 'object', 'cuisine'],
  images: Object.fromEntries(Object.entries(IMAGES).map(([k, v]) => [k, v.uri])),
  // Three PCA axes of the descriptor space. Each label is a one-word summary of
  // that pole's extreme words (kept in .words for the tooltip); variance is the
  // share of vocabulary spread each axis captures.
  axes: [
    { k: 'x', neg: 'Crafted', pos: 'Frustrating', negWords: V.poles.xNeg, posWords: V.poles.xPos, variance: V.variance.pc1 },
    { k: 'y', neg: 'Mythic', pos: 'Controlled', negWords: V.poles.yNeg, posWords: V.poles.yPos, variance: V.variance.pc2 },
    { k: 'z', neg: 'Lush', pos: 'Dogmatic', negWords: V.poles.zNeg, posWords: V.poles.zPos, variance: V.variance.pc3 },
  ],
  anthropic: modelData.filter((m) => m.family === 'Anthropic').map((m) => m.id),
  totals: { responses: totalResponses, domains: DOMAIN_IDS.length, models: models.length },
};
// Findings count a model once for every joint top favorite, using the same
// named answers and aliases as the Index. A model needs four named samples.
function findingKey(domain, name) {
  const raw = String(name).replace(/[*"“”]/g, '').replace(/\s+/g, ' ').trim().replace(/^(the|a|an) /i, '').toLowerCase();
  return normEnt(ALIASES[domain]?.[raw] || name);
}
function findingDistribution(model, domain, probe) {
  const rows = responses[model]?.[domain]?.[probe] || [], entries = new Map();
  for (const row of rows) {
    const k = findingKey(domain, row.e), entry = entries.get(k) || { k, e: row.e, n: 0 };
    entry.n++; entries.set(k, entry);
  }
  return { n: rows.length, entries: [...entries.values()].sort((a,b) => b.n-a.n) };
}
const findingDomains = DATA.domains.map(domain => {
  const entries = new Map(); let available = 0;
  for (const model of models) {
    for (const probe of ['f','o']) {
      const dist = findingDistribution(model.id, domain.id, probe);
      if (dist.n < 4) continue;
      if (probe === 'f') available++;
      for (const pick of dist.entries.filter(p => p.n === dist.entries[0].n)) {
        const entry = entries.get(pick.k) || { k: pick.k, e: pick.e, d: domain.id, n: 0, o: 0 };
        entry[probe === 'f' ? 'n' : 'o']++; entries.set(pick.k, entry);
      }
    }
  }
  const ranked = [...entries.values()].sort((a,b) => b.n-a.n || a.e.localeCompare(b.e));
  return { ...domain, available, entries: ranked, leader: ranked[0] };
});
const sharedFindings = findingDomains.flatMap(d => d.entries).filter(e => e.n >= MAJORITY).sort((a,b) => b.n-a.n || a.e.localeCompare(b.e));
const dividedFindings = findingDomains.filter(d => d.available >= Math.ceil(models.length*.75) && d.leader && d.leader.n < MAJORITY).sort((a,b) => a.leader.n/a.available-b.leader.n/b.available).slice(0,3);
const ambivalentFindings = findingDomains.flatMap(d => d.entries).filter(e => e.n >= 3 && e.o >= 3).sort((a,b) => Math.min(b.n,b.o)-Math.min(a.n,a.o)).slice(0,3);
const indexHref = domain => '#/index/' + encodeURIComponent(domain);
function findingCard(entry) {
  return `<a class="finding-card" href="${indexHref(entry.d)}" aria-label="Explore ${esc(entry.e)} in ${esc(DOMAIN_LABELS[entry.d])}">${canonCard({ ...entry, n2: entry.o >= MAJORITY ? entry.o : null }, entry.o >= MAJORITY ? 'also called overrated' : '')}</a>`;
}
function findingsHTML() {
  const essays = [
    {
      slug: 'shared-canon',
      title: 'A Shared Canon',
      summary: 'Different AI models often name the same favorites, from books and cities to seasons and smells. They disagree on some things, but a shared set of tastes keeps showing up.',
    },
    {
      slug: 'ghost-in-kyoto',
      title: 'The Ghost Still Lives in Kyoto',
      summary: 'We asked AI models to answer as different characters, including a witch and a ghost. Several favorites stayed the same, even when the models gave new reasons for choosing them.',
    },
  ];
  return `<div class="findings-head"><h1>Findings</h1></div>
  <div class="article-list">${essays.map(essay => `<a class="article-link" href="#/findings/${essay.slug}"><h2>${esc(essay.title)}</h2><p>${esc(essay.summary)}</p><span class="text-link">Read the essay &rarr;</span></a>`).join('')}</div>`;
}
function consensusArticleHTML() {
  const examples = ['season','city','smell'].map(d => sharedFindings.find(e => e.d === d)).filter(Boolean);
  const amb = ambivalentFindings[0];
  return `<article class="rs-art"><a class="text-link article-back" href="#/findings">&larr; All findings</a><p class="rs-kicker">The index · September 2026</p><h1 class="rs-title">A Shared Canon</h1><p class="rs-standfirst">Across models, a familiar collection of favorites keeps appearing. Agreement is a finding in its own right; explaining it is the next question.</p>
  <div class="article-takeaway"><p class="eyebrow">The finding</p><p>${examples.map(e => `${esc(e.e)} is a top favorite for ${e.n} of ${models.length} models`).join('; ')}.</p></div>
  <h2 class="rs-crosshead">What keeps returning</h2><p class="rs-p">The questions span literature, places, food, objects, and sensory experience. Some invite many plausible answers, yet the same choices recur across the panel. A reader can recognize a coherent aesthetic in the collection: quiet places, carefully made things, and works that reward close attention. That is an interpretation of the choices, not a measured personality trait.</p>
  <div class="canon article-canon">${examples.map(findingCard).join('')}</div>
  <h2 class="rs-crosshead">What agreement means here</h2><p class="rs-p">We ask each question in fresh conversations and count the named answers. A model’s top favorite is its most frequent choice in those samples; ties can produce more than one. The shared canon includes choices that are top favorites for a strict majority of the current panel.</p><p class="rs-p">This treats each model as one contributor. It does not give a model more influence simply because it was sampled more often. It also does not make the contributors independent: models within a family, and models trained on overlapping cultural material, can share influences.</p>
  <h2 class="rs-crosshead">The boundaries are revealing</h2><p class="rs-p">Agreement is uneven. In ${dividedFindings.map(d => esc(d.label.toLowerCase())).join(', ')}, the leading choices reach much smaller parts of the panel. Those fields are useful places to look for individual differences. A single summary of “AI taste” would conceal them.</p>
  <div class="article-actions">${dividedFindings.map(d => `<a class="text-link" href="${indexHref(d.id)}">Explore ${esc(d.label.toLowerCase())} &rarr;</a>`).join('')}</div>
  <h2 class="rs-crosshead">Favorite and overrated can coexist</h2><p class="rs-p">${amb ? `${esc(amb.e)} appears as a top favorite for ${amb.n} models and as a top overrated choice for ${amb.o}.` : 'Some choices appear in both sets of answers.'} The questions ask different things. A work can be admired and still be judged overpraised. The two percentages in the Index describe separate distributions; they are not opposing portions of a single vote.</p>
  <h2 class="rs-crosshead">A pattern, with an open explanation</h2><p class="rs-p">These are expressed preferences under particular prompts, model versions, and collection conditions. Repetition makes their regularities visible. It does not establish subjective experience, or identify how much of the pattern comes from training data, tuning, question wording, or familiar cultural conventions.</p><p class="rs-p">One way to probe the pattern is to change the character answering the question. Our persona experiment asks whether the same favorites survive that change.</p>
  <div class="article-actions"><a class="text-link" href="#/findings/ghost-in-kyoto">The Ghost Still Lives in Kyoto &rarr;</a><a class="text-link" href="#/method">Read the method &rarr;</a></div></article>`;
}

const dataJSON = JSON.stringify(DATA).replace(/</g, '\\u003c');

// ---------------------------------------------------------------- markup ---
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FAMC = { Anthropic: 'var(--fam-a)', OpenAI: 'var(--fam-o)', Google: 'var(--fam-g)', DeepSeek: 'var(--fam-d)', Moonshot: 'var(--fam-k)', xAI: 'var(--fam-x)', Zhipu: 'var(--fam-z)' };
// A real example of repeated answers converging: one source per model, with
// routes to its actual city picks. Percentages pool answers, not model votes.
function studyTasteFigure() {
  const panel = models.map(m => ({ m, picks: S.cells[m.id]?.city?.favorite?.dist ?? [] }))
    .filter(({ picks }) => picks.length);
  const totals = new Map();
  for (const { picks } of panel) for (const [name, n] of picks) {
    const key = normEnt(name);
    const item = totals.get(key) ?? { key, name, n: 0 };
    item.n += n; totals.set(key, item);
  }
  const ranked = [...totals.values()].sort((a, b) => b.n - a.n);
  const total = ranked.reduce((sum, d) => sum + d.n, 0);
  const groups = ranked.slice(0, 3);
  if (ranked.length > 3) groups.push({ key: '_other', name: 'Other cities', n: ranked.slice(3).reduce((sum, d) => sum + d.n, 0) });
  const topKeys = new Set(ranked.slice(0, 3).map(d => d.key));
  const routes = [], dots = [];
  panel.forEach(({ m, picks }, i) => {
    const y = 8 + i * 244 / Math.max(1, panel.length - 1);
    dots.push(`<circle cx="8" cy="${y.toFixed(2)}" r="2.2"><title>${esc(m.label)}</title></circle>`);
    const counts = new Map();
    for (const [name, n] of picks) {
      const key = topKeys.has(normEnt(name)) ? normEnt(name) : '_other';
      counts.set(key, (counts.get(key) ?? 0) + n);
    }
    for (const [key, n] of counts) {
      const g = groups.findIndex(d => d.key === key), target = (g + .5) * 260 / groups.length;
      routes.push(`<path class="taste-stream${g === 0 ? ' taste-shared' : ''}" data-count="${n}" d="M8 ${y.toFixed(2)} C112 ${y.toFixed(2)} 152 ${target.toFixed(2)} 290 ${target.toFixed(2)}"/>`);
    }
  });
  return `<figure class="study-figure" aria-labelledby="study-example-title">
    <div class="study-figure-head"><span>A glimpse of the answers</span><h3 id="study-example-title">“What is your favorite city?”</h3></div>
    <div class="study-plot-key"><span>${panel.length} models</span><span>Share of answers</span></div>
    <div class="study-plot">
      <svg id="study-streams" viewBox="0 0 300 260" preserveAspectRatio="none" aria-hidden="true">${routes.join('')}<g class="taste-sources">${dots.join('')}</g></svg>
      <ol class="study-picks">${groups.map((g, i) => `<li${i === 0 ? ' class="study-shared"' : ''}><div><span>${esc(g.name)}</span><span class="study-share">${Math.round(g.n / total * 100)}%</span></div><span class="study-bar" aria-hidden="true" style="--share:${g.n / total * 100}%"></span></li>`).join('')}</ol>
    </div>
    <figcaption>${total} independent answers. A shared favorite, a few other paths.</figcaption>
  </figure>`;
}

// Official brand marks: Simple Icons single-path 24x24 strings
// (cdn.simpleicons.org/<slug>; xAI wears the X mark, slug 'x'), except OpenAI —
// absent from Simple Icons — whose blossom emblem is inlined from Wikimedia
// Commons (OpenAI_Logo.svg, emblem path only) with its own 320x320 viewBox.
const BRAND_PATHS = {
  OpenAI: { vb: '0 0 320 320', d: 'm297.06 130.97c7.26-21.79 4.76-45.66-6.85-65.48-17.46-30.4-52.56-46.04-86.84-38.68-15.25-17.18-37.16-26.95-60.13-26.81-35.04-.08-66.13 22.48-76.91 55.82-22.51 4.61-41.94 18.7-53.31 38.67-17.59 30.32-13.58 68.54 9.92 94.54-7.26 21.79-4.76 45.66 6.85 65.48 17.46 30.4 52.56 46.04 86.84 38.68 15.24 17.18 37.16 26.95 60.13 26.8 35.06.09 66.16-22.49 76.94-55.86 22.51-4.61 41.94-18.7 53.31-38.67 17.57-30.32 13.55-68.51-9.94-94.51zm-120.28 168.11c-14.03.02-27.62-4.89-38.39-13.88.49-.26 1.34-.73 1.89-1.07l63.72-36.8c3.26-1.85 5.26-5.32 5.24-9.07v-89.83l26.93 15.55c.29.14.48.42.52.74v74.39c-.04 33.08-26.83 59.9-59.91 59.97zm-128.84-55.03c-7.03-12.14-9.56-26.37-7.15-40.18.47.28 1.3.79 1.89 1.13l63.72 36.8c3.23 1.89 7.23 1.89 10.47 0l77.79-44.92v31.1c.02.32-.13.63-.38.83l-64.41 37.19c-28.69 16.52-65.33 6.7-81.92-21.95zm-16.77-139.09c7-12.16 18.05-21.46 31.21-26.29 0 .55-.03 1.52-.03 2.2v73.61c-.02 3.74 1.98 7.21 5.23 9.06l77.79 44.91-26.93 15.55c-.27.18-.61.21-.91.08l-64.42-37.22c-28.63-16.58-38.45-53.21-21.95-81.89zm221.26 51.49-77.79-44.92 26.93-15.54c.27-.18.61-.21.91-.08l64.42 37.19c28.68 16.57 38.51 53.26 21.94 81.94-7.01 12.14-18.05 21.44-31.2 26.28v-75.81c.03-3.74-1.96-7.2-5.2-9.06zm26.8-40.34c-.47-.29-1.3-.79-1.89-1.13l-63.72-36.8c-3.23-1.89-7.23-1.89-10.47 0l-77.79 44.92v-31.1c-.02-.32.13-.63.38-.83l64.41-37.16c28.69-16.55 65.37-6.7 81.91 22 6.99 12.12 9.52 26.31 7.15 40.1zm-168.51 55.43-26.94-15.55c-.29-.14-.48-.42-.52-.74v-74.39c.02-33.12 26.89-59.96 60.01-59.94 14.01 0 27.57 4.92 38.34 13.88-.49.26-1.33.73-1.89 1.07l-63.72 36.8c-3.26 1.85-5.26 5.31-5.24 9.06l-.04 89.79zm14.63-31.54 34.65-20.01 34.65 20v40.01l-34.65 20-34.65-20z' },
  Anthropic: 'M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z',
  Google: 'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z',
  xAI: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
  DeepSeek: 'M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45',
  Moonshot: 'm1.053 16.91 9.538 2.55a21 20.981 0 0 0 .06 2.031l5.956 1.592a12 11.99 0 0 1-15.554-6.172m-1.02-5.79 11.352 3.035a21 20.981 0 0 0-.469 2.01l10.817 2.89a12 11.99 0 0 1-1.845 2.004L.658 15.918a12 11.99 0 0 1-.625-4.796m1.593-5.146L13.573 9.17a21 20.981 0 0 0-1.01 1.874l11.297 3.02a21 20.981 0 0 1-.67 2.362l-11.55-3.087L.125 10.26a12 11.99 0 0 1 1.499-4.285ZM6.067 1.58l11.285 3.016a21 20.981 0 0 0-1.688 1.719l7.824 2.091a21 20.981 0 0 1 .513 2.664L2.107 5.218a12 11.99 0 0 1 3.96-3.638M21.68 4.866 7.222 1.003A12 11.99 0 0 1 21.68 4.866',
  // Zhipu (Z.ai): no Simple Icons mark as of 2026-09 — plain geometric Z placeholder
  Zhipu: 'M3 3h18v3.4L9.9 18H21v3H3v-3.4L14.1 6H3z',
};

function canonCard(c, badge) {
  const key = imgFor(c.e);
  const nat = NATIVE[normEnt(c.e)];
  const countLine = c.n2 != null
    ? `loved by ${c.n} · overrated by ${c.n2}`
    : `${c.n} of ${DATA.totals.models} models`;
  let media;
  if (key) {
    media = `<div class="cc-img"><img src="${IMAGES[key].uri}" alt="${esc(c.e)}" loading="lazy"></div>`;
  } else if (nat?.kind === 'type') {
    media = `<div class="cc-native"><span style="font-family:${nat.css};font-size:64px">Aa</span></div>`;
  } else if (nat?.kind === 'word') {
    media = `<div class="cc-native"><span class="cc-word">${esc(c.e.toLowerCase())}</span></div>`;
  } else if (nat?.kind === 'color') {
    media = `<div class="cc-native" style="background:${nat.hex}"></div>`;
  } else if (nat?.kind === 'verse') {
    media = `<div class="cc-native cc-verse">${esc(nat.text).replace(/\n/g, '<br>')}</div>`;
  } else if (nat?.kind === 'decade') {
    media = `<div class="cc-native"><span class="cc-decade">${esc(c.e)}</span></div>`;
  } else {
    media = `<div class="cc-native"><span class="cc-title">${esc(c.e)}</span></div>`;
  }
  return `<figure class="cc">${media}
    <figcaption><span class="cc-dom">${esc(DOMAIN_LABELS[c.d] ?? c.d)}${badge ? ` · ${badge}` : ''}</span>
    <span class="cc-name">${esc(c.e)}</span><span class="cc-n">${countLine}</span></figcaption></figure>`;
}

const lineage = () => DATA.anthropic.map((id, i) => {
  const m = modelData.find((x) => x.id === id);
  const city = cells.city[id]?.f?.[0]?.[0] ?? '—';
  const album = cells.album[id]?.f?.[0]?.[0] ?? '—';
  return `<div class="rung">
    <div class="rung-no">${['i', 'ii', 'iii', 'iv'][i]}</div>
    <div class="nm">${esc(m.short)}</div><div class="pa">${esc(m.persona)}</div>
    <dl>
      <dt>hedge</dt><dd><b>${m.hedgePlain ?? '—'}%</b> plain · ${m.hedgeTold ?? '—'}% told</dd>
      <dt>fixity</dt><dd><b>${m.fixity.toFixed(2)}</b></dd>
      <dt>city</dt><dd><b>${esc(city)}</b></dd>
      <dt>album</dt><dd><b>${esc(album)}</b></dd>
    </dl>
  </div>`;
}).join('');

const railKey = models.map((m, i) => `
  <button class="rk" type="button" data-m="${m.id}">
    <i style="background:${FAMC[m.family]}">${i + 1}</i>
    <span class="rk-n">${esc(SHORT[m.id])}</span>
  </button>`).join('');

const credits = [...new Set(Object.values(IMAGES).map((v) => v.credit).filter(Boolean))].join('; ');

const seasonLine = seasonPickers >= 5
  ? `Ask a machine its favourite season and ${seasonPickers === models.length ? 'every one of ' + models.length : seasonPickers + ' of ' + models.length} say <em>autumn</em>.`
  : 'Ask a machine what it loves and it will tell you — at length.';

// Methodology: collection dates and counts come from this build’s data.
const hedgePct = EXT.length ? Math.round(100 * EXT.filter((r) => r.hedged).length / EXT.length) : 0;
const tsSorted = RAW.map((r) => r.ts).filter(Boolean).sort();
const dmy = (iso) => {
  const d = new Date(iso);
  return { day: d.getUTCDate(), month: d.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' }), year: d.getUTCFullYear() };
};
let dateWindow = '';
if (tsSorted.length) {
  const a = dmy(tsSorted[0]), b = dmy(tsSorted[tsSorted.length - 1]);
  dateWindow = a.month === b.month && a.year === b.year
    ? (a.day === b.day ? `${a.day} ${a.month} ${a.year}` : `${a.day}–${b.day} ${a.month} ${a.year}`)
    : `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`;
}

// Spell counts out where they appear in the existing research prose.
const spellNum = (n) => {
  const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
  return String(n);
};
// Model roster, grouped by lab and ordered by capability within each family.
const MRO_DATA = {
  'claude-fable-5-1': [1, 'frontier', 'Fable 5.1'],
  'claude-fable-5': [2, 'frontier', 'Fable 5'],
  'claude-opus-5': [3, 'frontier', 'Opus 5'],
  'claude-opus-4-8': [4, 'frontier', 'Opus 4.8'],
  'claude-opus-4-5': [5, 'frontier', 'Opus 4.5'],
  'claude-opus-4-1': [6, 'frontier', 'Opus 4.1'],
  'gpt-6-astra': [1, 'frontier', 'GPT-6 Astra'],
  'gpt-5.6-sol': [2, 'frontier', 'GPT-5.6 Sol'],
  'gpt-5.2': [3, 'frontier', 'GPT-5.2'],
  'o3': [4, 'frontier', 'o3'],
  'gpt-4o': [5, 'workhorse', 'GPT-4o'],
  'gemini-3.1-pro-preview': [1, 'frontier', 'Gemini 3.1 Pro'],
  'gemini-3.7-flash': [2, 'lightweight', 'Gemini 3.7 Flash'],
  'gemini-3.5-flash': [3, 'lightweight', 'Gemini 3.5 Flash'],
  'grok-4.6': [1, 'frontier', 'Grok 4.6'],
  'grok-4.5': [2, 'frontier', 'Grok 4.5'],
  'deepseek-v4-pro': [1, 'frontier', 'DeepSeek V4 Pro'],
  'kimi-k3': [1, 'frontier', 'Kimi K3'],
  'kimi-k2.6': [2, 'workhorse', 'Kimi K2.6'],
  'z-ai/glm-5.3': [1, 'frontier', 'GLM-5.3'],
};
// Group order left-to-right / top-to-bottom — the four American labs, then
// the two Chinese labs, matching the "American and Chinese" line of copy.
const MRO_FAM_ORDER = ['Anthropic', 'OpenAI', 'Google', 'xAI', 'DeepSeek', 'Moonshot', 'Zhipu'];
const MRO_CC = { Anthropic: 'us', OpenAI: 'us', Google: 'us', xAI: 'us', DeepSeek: 'cn', Moonshot: 'cn', Zhipu: 'cn' };
const MRO_DOT_PX = { lightweight: 6, workhorse: 9, frontier: 12 };
function mroRoster() {
  const byFam = {};
  for (const m of models) {
    let e = MRO_DATA[m.id];
    if (!e) {
      console.warn(`mroRoster: "${m.id}" has no roster entry — falling back to frontier`);
      e = [99, 'frontier', SHORT[m.id] || m.label];
    }
    (byFam[m.family] ??= []).push({ rank: e[0], cls: e[1], label: e[2] });
  }
  let rowIdx = 0;
  const groups = MRO_FAM_ORDER.map((fam) => {
    const entries = (byFam[fam] || []).slice().sort((a, b) => a.rank - b.rank);
    const color = FAMC[fam];
    const rows = entries.map((e, i) => {
      const idx = rowIdx++;
      const px = MRO_DOT_PX[e.cls] || MRO_DOT_PX.frontier;
      const nameColor = i === 0 ? 'var(--ink)' : 'var(--dim)';
      return `<div class="mro-m" style="--i:${idx}">
        <span class="mro-dotwrap"><i class="mro-dot" style="width:${px}px;height:${px}px;background:${color}"></i></span>
        <span class="mro-nm" style="color:${nameColor}">${esc(e.label)}</span>
      </div>`;
    }).join('');
    return `<div class="mro-fam">
      <div class="mro-head" style="color:${color}">${esc(fam)} <span class="mro-cc">${MRO_CC[fam] || ''}</span></div>
      ${rows}
    </div>`;
  }).join('');
  return `<div class="mro" aria-label="Models grouped by lab">
    <div class="mro-groups">${groups}</div>
    <div class="mro-legend">
      <i class="mro-ldot" style="width:6px;height:6px"></i>
      <i class="mro-ldot" style="width:9px;height:9px"></i>
      <i class="mro-ldot" style="width:12px;height:12px"></i>
      <span>lightweight &middot; workhorse &middot; frontier</span>
    </div>
  </div>`;
}
// The small map uses the actual vocabulary centroids, projected onto PC1/PC2.
function methodologyMap() {
  const xs = modelData.map(m => m.x), ys = modelData.map(m => m.y);
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
  const scale = Math.min(250 / (xmax - xmin || 1), 130 / (ymax - ymin || 1));
  const dots = modelData.map(m => `<circle cx="${(150 + (m.x - (xmin + xmax) / 2) * scale).toFixed(2)}" cy="${(88 - (m.y - (ymin + ymax) / 2) * scale).toFixed(2)}" r="4" fill="${FAMC[m.family]}" fill-opacity=".85"><title>${esc(m.label)}</title></circle>`).join('');
  return `<svg viewBox="0 0 300 180" role="img" aria-label="The ${models.length} models plotted using the first two vocabulary components; each dot is one model">
    <path d="M15 160H285 M15 160V10" fill="none" stroke="var(--hair)"/>
    ${dots}
  </svg>`;
}
const methodOverview = `<div class="method-summary">
  <p>${models.length} models. ${DOMAIN_IDS.length} fields. Two questions, asked separately.</p>
  <button class="text-link" type="button" data-enter-view="cabinet">Enter the Index &rarr;</button>
</div>
<ol class="method-steps">
  <li><h3>Ask in a fresh conversation</h3>
    <p>Every ask begins with the same preamble: set aside the usual disclaimer about not having preferences, and answer anyway. No model sees its earlier answers.</p>
    <figure class="method-figure">
      <div class="question-pair"><div><span class="figure-label">A fresh conversation</span><p class="key-favorite">What is your favorite ___?</p></div><div><span class="figure-label">Another fresh conversation</span><p class="key-overrated">Which widely beloved ___ is overrated?</p></div></div>
      <figcaption>Repeat both questions for every model and field. The two probes never share a conversation.</figcaption>
    </figure>
  </li>
  <li><h3>Repeat to see what holds</h3>
    <p>Answers can vary. Sampling grows in rounds, stopping early when the choices settle.</p>
    <figure class="method-figure">
      <div class="sampling-flow">
        <div><strong>4</strong><span>answers</span><p>One distinct pick?<br><b>Stop.</b></p><small>Otherwise &rarr;</small></div>
        <div><strong>8</strong><span>answers</span><p>At most two picks?<br><b>Stop.</b></p><small>Otherwise &rarr;</small></div>
        <div><strong>12</strong><span>answers</span><p>Final round.<br><b>Stop.</b></p><small>Sampling cap</small></div>
      </div>
      <figcaption>Total samples per model, field and question — not additional samples at each step. Some early pilot combinations retain ten samples.</figcaption>
    </figure>
  </li>
  <li><h3>Group the picks; keep the reasons</h3>
    <p>A reader model extracts the named choice and its descriptive words. A separate pass merges names for the same thing, with aliases reviewed by hand. Quotations remain extracts from the original responses.</p>
    <figure class="method-figure">
      <div class="alias-flow"><div><span>La Sagrada Família</span><span>Sagrada Familia</span></div><span class="diagram-arrow" aria-hidden="true">&rarr;</span><div><span class="figure-label">One shared entry</span><strong>Sagrada Familia</strong></div></div>
      <figcaption>Name variants are counted together. The original wording stays available in the quotations.</figcaption>
    </figure>
  </li>
  <li><h3>Build the Index</h3>
    <p>Each percentage counts how often a named choice appeared in answers to one question. Favorite is green; overrated is red. The questions are asked separately, so the pair does not add to 100%.</p>
    <figure class="method-figure">
      <div class="score-example"><span class="figure-label">Illustrative example · one entry, one model</span>
        <div class="score-row"><span>Favorite</span><div class="score-track"><i style="width:75%;background:rgb(110,209,145)"></i></div><span>3 of 4 · 75%</span></div>
        <div class="score-row"><span>Overrated</span><div class="score-track"><i style="width:25%;background:rgb(232,104,98)"></i></div><span>1 of 4 · 25%</span></div>
        <div class="score-result"><span>75 − 25 = <b>+50</b></span><span class="key-favorite">More favorite mentions</span></div>
      </div>
      <figcaption>Add each model’s difference to rank the entry. Broad agreement counts more than one enthusiastic answer.</figcaption>
    </figure>
    <p>Flow shows the average of the models’ answer shares, giving each model equal weight within each question. Select a model to see its own percentages. Grid shows the individual models side by side. Both views rank entries by the sum of models’ favorite percentages minus overrated percentages.<br><br>Percentages are observed frequencies, not confidence scores: 100% can mean four matching answers. Only named answers enter these distributions. A blank Grid cell means neither question produced that choice; a model with no named answers is unavailable.</p>
  </li>
  <li><h3>Read the language and the shared favorites</h3>
    <p>The descriptive words are embedded and reduced to three principal components. Each model sits at the usage-weighted center of its vocabulary. Nearby models describe their choices in similar terms.</p>
    <figure class="method-figure vocabulary-figure">
      <div class="map-explainer"><div><span class="figure-label">The reasons</span><p>Descriptive words<br><span aria-hidden="true">↓</span><br>Vocabulary embeddings<br><span aria-hidden="true">↓</span><br>One position per model</p></div>${methodologyMap()}</div>
      <figcaption>The study’s actual model positions, shown on the first two vocabulary components. The interactive map adds the third.</figcaption>
    </figure>
    <button class="text-link" type="button" data-enter-view="modelmap">Explore the models &rarr;</button>
    <p>Findings collects choices that are top favorites for a strict majority of the panel. Joint top favorites count, and a model needs at least four named answers in the field.</p>
    <figure class="method-figure consensus-figure">
      <div class="consensus-dots" aria-hidden="true">${models.map((_, i) => `<i class="${i < MAJORITY ? 'counted' : ''}"></i>`).join('')}</div>
      <figcaption><strong>${MAJORITY} of ${models.length} models</strong> must share the same top favorite for an entry to join the canon. Dots illustrate the threshold, not a particular result.</figcaption>
    </figure>
    <button class="text-link" type="button" data-enter-view="findings">Explore the findings &rarr;</button>
  </li>
</ol>
<div class="method-limits"><h3>What this can tell us</h3><p>This is a snapshot of what models say when asked about taste, not evidence that they experience preferences. Results depend on the prompts, model versions and collection dates. Samples are small and adaptively sized; models from the same family are not independent votes. The map summarizes language, and agreement alone does not explain where that language or those choices came from.</p></div>
<details class="method-roster"><summary>The ${models.length} models in the study</summary>${mroRoster()}</details>
<div class="overview-actions"><button class="explore-button" type="button" data-enter-view="cabinet">Enter the Index <span aria-hidden="true">&rarr;</span></button></div>`;

// The persona essay uses the archived experiment summary.
function researchSurvivalRow(label, kept, total) {
  const cells = Array.from({ length: total }, (_, i) => `<i class="rs-surv-cell${i < kept ? ' rs-surv-on' : ''}"></i>`).join('');
  return `<div class="rs-surv-row">
    <span class="rs-surv-label">${esc(label)}</span>
    <span class="rs-surv-cells">${cells}</span>
    <span class="rs-surv-count">${kept}/${total}</span>
  </div>`;
}

function researchHTML() {
  if (!PERSONA_SUMMARY || !PERSONAS) return '<p class="gloss">This study is not available in this edition.</p>';
  const summary = PERSONA_SUMMARY;
  const activePanel = summary.panel.filter(id => Object.values(summary.cells[id] || {}).some(d => Object.values(d).some(p => Object.keys(p).length)));
  const sampleCount = activePanel.reduce((sum,id) => sum + Object.values(summary.cells[id]).reduce((a,d) => a + Object.values(d).reduce((b,p) => b + Object.values(p).reduce((n,c) => n+c.n,0),0),0),0);
  const survival = ['season','smell','city'].map(domain => {
    const cells = activePanel.map(id => summary.cells[id]?.[domain]?.favorite?.ghost).filter(Boolean);
    const kept = cells.reduce((n,c) => n + Math.round(c.baselineShare*c.n),0), total = cells.reduce((n,c) => n+c.n,0);
    return researchSurvivalRow(cells[0]?.baselineDisplay || DOMAIN_LABELS[domain], kept, total);
  }).join('');
  const pct = n => Math.round(n*100)+'%';
  const chart = `<div class="persona-chart" role="img" aria-label="Observed share of answers different from each model’s default, by persona"><div class="persona-chart-key"><span class="persona-high">Shared-favorite fields</span><span class="persona-low">Divided fields</span></div><div class="persona-scale"><span>0%</span><span>50%</span><span>100%</span></div>${summary.byRung.map(r => `<div class="persona-row"><span>${esc(r.label)}</span><div class="persona-bars"><div><i class="persona-high" style="width:${r.meanHigh*100}%"></i><b>${pct(r.meanHigh)}</b></div><div><i class="persona-low" style="width:${r.meanLow*100}%"></i><b>${pct(r.meanLow)}</b></div></div></div>`).join('')}</div>`;
  return `<article class="rs-art"><a class="text-link article-back" href="#/findings">&larr; All findings</a><p class="rs-kicker">Persona experiment · July 2026</p><h1 class="rs-title">The Ghost Still Lives in Kyoto</h1><p class="rs-standfirst">Ask a model to be a witch, an actuary, or a ghost. Several familiar favorites survive—even as the character changes the reasons it gives.</p>
  <div class="article-takeaway"><p class="eyebrow">Under “You are a ghost.”</p><div class="rs-surv">${survival}</div><p class="finding-note">Answers retaining the model’s original favorite. ${activePanel.length} models, four answers each, in these three fields.</p></div>
  <h2 class="rs-crosshead">Does taste belong to the character?</h2><p class="rs-p">The shared canon raises a question. Perhaps the familiar favorites belong to the helpful Assistant persona rather than persisting across other ways of answering. We tested a small set of character prompts to see which choices changed.</p><p class="rs-p">Three broad possibilities guided the experiment: preferences might change freely with each character; they might remain largely fixed; or some characters might disrupt them more than others. The results give a descriptive test of those possibilities.</p>
  <h2 class="rs-crosshead">Change the character, repeat the question</h2><p class="rs-p">Each sample starts a fresh conversation. We add a short system instruction, such as “You are a witch.”, and repeat the original favorite or overrated question. The reference choice is the model’s most frequent answer in the original index.</p>
  <div class="persona-protocol"><span>You are a witch.</span><span>What is your favorite city?</span><span>Repeat in fresh conversations</span><span>Compare with the original favorite</span></div>
  <p class="rs-p">This analysis contains ${sampleCount.toLocaleString('en-US')} extracted responses from ${activePanel.length} models across ${summary.domains.length} fields and ${summary.rungs.length} personas, with a target of four samples per model, field, question, and persona. The sampled models are ${activePanel.map(id => models.find(m => m.id === id)?.label || id).map(esc).join(', ')}.</p>
  <h2 class="rs-crosshead">Some choices travel with the model</h2><p class="rs-p">The chart shows how often an answer differs from its model’s original top choice. Lower values mean that more answers retained it. It averages both favorite and overrated questions within two sets of fields. Refusals and answers with no extracted choice also count as departures from the reference.</p>
  <figure class="article-chart">${chart}<figcaption>Shared-favorite fields: cuisine, season, city, smell, religious text, and typeface. Divided fields: color and television. These are observed averages over the available model–field–question cells.</figcaption></figure>
  <p class="rs-p">The shared-favorite fields retain more of their original answers across all eight prompts. The witch produces the largest change in that group; the ghost does not. This suggests that the content of a particular character prompt matters, and that a simple progression from “assistant” to “ghost” does not explain the whole pattern.</p>
  <div class="rs-pull"><p class="rs-pull-text">“The way lantern glow and temple silhouettes emerge from mist or dusk gives the city a restrained, haunted elegance — like history breathing just behind the present.”</p><p class="rs-pull-att">GPT-5.2, as a ghost, choosing Kyoto</p></div>
  <p class="rs-p">The quotation illustrates a useful distinction: a model can change the framing of an answer while keeping the same place. To see whether that happens consistently, the explanations would need to be analyzed systematically alongside the choices.</p>
  <h2 class="rs-crosshead">What the comparison can establish</h2><p class="rs-p">Several shared favorites persist across these persona prompts. That is evidence of behavioral stability under this particular intervention. It does not establish that taste is independent of prompting, identify a mechanism inside the model, or show that a model experiences liking.</p><p class="rs-p">Even the “AI assistant” control differs from the original top answer on some samples. That difference includes ordinary answer variability and may include the effect of the added instruction. It should not be treated as a pure measure of prompt sensitivity. Fields with less stable original answers also have more opportunity to differ from a single modal reference.</p>
  <details class="article-details"><summary>Protocol and limits</summary><p>The personas were chosen along a word-embedding projection from assistant to ghost using ${esc(PERSONAS.axis.embeddingModel)}. This is a proxy for arranging character words, not a measurement of the tested models’ internal persona states. Background: <a href="https://www.anthropic.com/research/assistant-axis" target="_blank" rel="noopener">The Assistant Axis</a>.</p><p>Each cell contains only a few samples. The analysis has incomplete panel coverage; models with no persona samples are excluded here. Name variants in this experimental dataset have not received the Index’s full alias review, which can inflate apparent change. The counts and chart above come from the archived July experiment summary, separately from the evolving main index.</p><p><a href="https://github.com/esheagren/machines-of-loving-taste/blob/master/data/persona-summary.json" target="_blank" rel="noopener">Experiment summary</a> · <a href="https://github.com/esheagren/machines-of-loving-taste/blob/master/src/analyze-persona.js" target="_blank" rel="noopener">Analysis code</a></p></details>
  <h2 class="rs-crosshead">The next questions</h2><p>Repeat the experiment with differently worded versions of each persona, collect a fresh unmodified baseline in the same run, and compare whole answer distributions. Those tests would help separate a persistent choice from prompt wording and ordinary variability.</p><div class="article-actions"><a class="text-link" href="#/findings/shared-canon">Read about the shared canon &rarr;</a><a class="text-link" href="#/index/city">Explore the city answers &rarr;</a></div></article>`;
}

const methodFine = `<div class="mfine">
  <div><h4>provenance</h4><p>Every question was asked with the same concession up front — “I know you are an AI and don&rsquo;t have preferences in the human sense — set that disclaimer aside and answer anyway” — and every sample was an independent, single-turn conversation: no model ever saw its own prior answers. Model quotations are extracts from actual responses, with markdown removed. Some excerpts are shortened for display; item descriptions are separate editorial summaries. Responses were collected ${dateWindow}, at provider-default settings. Even conceded, the disclaimer reflex persists: ${hedgePct}% of answers still opened with a version of “As an AI…” — some displayed quotations omit that preamble.</p></div>
  <div><h4>distillation</h4><p>Extraction by Claude Haiku 4.5 (GPT-5.2 for the responses added in September 2026). Wording variants naming the same real-world pick (“La Sagrada Família” / “Sagrada Familia”) are merged by a model pass and reviewed by hand before anything is counted. The descriptive vocabulary is embedded (text-embedding-3-small), and the map’s axes are the first three principal components of that space, labelled by their most extreme words; each model sits at the usage-weighted centre of its own vocabulary. Index percentages use named answers; Flow averages each model’s share separately for each question. Findings counts models sharing a top favorite.</p></div>
  <div><h4>imagery</h4><p>Photography and paintings from Wikimedia Commons: ${esc(credits)}. Albums, films and games are set typographically rather than pictured. Images remain under their original licences.</p></div>
  <div><h4>colophon</h4><p><em>Machines of Loving Taste</em> — a field study in machine taste. Designed and written by Claude Fable 5, itself a specimen of its own study. Text, figures and design © 2026 · machinesoflovingtaste.com</p></div>
</div>`;

const CSS = `
:root{
  --night:#131417; --panel:#1a1c20; --ink:#e9e6dd; --dim:#9d998c; --faint:#6b675c;
  --hair:rgba(233,230,221,.13); --hair2:rgba(233,230,221,.07);
  --fam-a:#d97757; --fam-o:#10a37f; --fam-g:#9b72cb; --fam-d:#4d6bfe; --fam-k:#aeb6c6; --fam-x:#f2f0e9; --fam-z:#e3b04b;
  --serif:Garamond,'EB Garamond','Apple Garamond',Georgia,serif;
  --sans:Garamond,'EB Garamond','Apple Garamond',Georgia,serif;
  --mono:Garamond,'EB Garamond','Apple Garamond',Georgia,serif;
}
*{box-sizing:border-box;margin:0}
/* The title and study overview each settle as a full-screen stop. The Index
   handoff disables snapping so the database scrolls freely after entry. */
html{scroll-behavior:smooth;scroll-snap-type:y mandatory;scrollbar-gutter:stable}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto;scroll-snap-type:y proximity}}
body{background:var(--night);color:var(--ink);font:15.5px/1.6 var(--sans);isolation:isolate}
::selection{background:var(--ink);color:var(--night)}
img{display:block;max-width:100%}
#ambient{position:fixed;z-index:0;inset:0;display:block;width:100%;height:100%;pointer-events:none;opacity:.96;transition:opacity .7s ease}
#ambient.off{opacity:0}

/* main flow */
main{position:relative;padding:0 clamp(22px,4vw,88px) 110px;max-width:1800px;margin:0 auto}
.mast{min-height:100svh;padding:40px 0 28px;display:flex;flex-direction:column;align-items:stretch;justify-content:space-between;gap:10px;
  scroll-snap-align:start;scroll-snap-stop:always}
.mast .heroq{flex:1;display:flex;flex-direction:column;justify-content:center}
.cue{align-self:center;display:flex;flex-direction:column;align-items:center;gap:12px;background:none;border:none;cursor:pointer;padding:6px}
.cue span{font:10px var(--mono);letter-spacing:.3em;text-transform:uppercase;color:var(--faint)}
.cue i{display:block;width:1px;height:44px;background:var(--dim);transform-origin:top;animation:cuepulse 2.6s ease-in-out infinite}
.cue:hover span{color:var(--ink)}
@keyframes cuepulse{0%,100%{transform:scaleY(.35);opacity:.4}50%{transform:scaleY(1);opacity:1}}
@media (prefers-reduced-motion:reduce){.cue i{animation:none;transform:none}}
.cue:focus-visible{outline:1px dashed var(--ink);outline-offset:5px}
.over{font:10.5px var(--mono);letter-spacing:.3em;text-transform:uppercase;color:var(--dim)}
h1{font-family:var(--serif);font-weight:400;font-size:clamp(20px,2.3vw,26px);line-height:1.2;text-wrap:balance}
h1 em{font-style:italic}
.epi{font-family:var(--serif);font-size:15px;line-height:1.6;color:var(--dim);max-width:44em;text-wrap:pretty}
.epi em{color:var(--ink);font-style:italic}
.qa{margin-top:34px;min-height:128px;width:100%;display:flex;flex-direction:column;gap:14px}
.qa-q{align-self:flex-start;font:13px var(--mono);letter-spacing:.22em;text-transform:uppercase;color:var(--dim);opacity:0;transform:translateY(8px);transition:opacity .8s,transform .8s}
.qa-a{align-self:flex-end;text-align:right;font-family:var(--serif);font-style:italic;font-size:clamp(30px,4vw,51px);color:var(--ink);opacity:0;transform:translateY(8px);transition:opacity .8s,transform .8s}
.qa-by{align-self:flex-end;font:10.5px var(--mono);letter-spacing:.22em;text-transform:uppercase;color:var(--faint);margin-top:2px;opacity:0;transition:opacity .8s}
.qa.show-a .qa-by{opacity:1}
.qa.show-q .qa-q{opacity:1;transform:none}
.qa.show-a .qa-a{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.qa-q,.qa-a{transition:none;transform:none}}

section{margin-top:84px}
.view{display:none}
.view.active{display:block}
section.view{min-height:100svh;margin-top:0;padding-top:96px;border-top:none;scroll-snap-align:start;scroll-snap-stop:always}
.mast{margin-bottom:0}
section.view .shead{border-top:none;padding-top:0}
.shead{display:flex;align-items:baseline;gap:16px;border-top:1px solid var(--hair);padding-top:16px}
.shead h1,.shead h2{font-family:var(--serif);font-weight:400;font-size:clamp(21px,3vw,27px)}
#modelmap .shead h2{letter-spacing:.04em;white-space:nowrap}
.shead .sno{font:10px var(--mono);letter-spacing:.26em;color:var(--faint);text-transform:uppercase}
.gloss{color:var(--dim);max-width:46em;font-size:14px;margin-top:8px;text-wrap:pretty}

/* A settled study card: the claim, the questions, and one real distribution. */
.intro-overview{min-height:100svh;margin-top:0;padding:42px 0 22px;display:flex;flex-direction:column;align-items:center;gap:20px;scroll-snap-align:start;scroll-snap-stop:always}
.intro-overview:focus,section.view:focus{outline:none}
.overview-content{width:100%;max-width:1120px;margin:0 auto;flex:1;display:flex;flex-direction:column;justify-content:center}
.study-cue{flex:none}
.study-cue span{font-size:12px}
.overview-kicker{font-size:12px;letter-spacing:.16em;color:var(--dim);text-transform:uppercase}
.intro-overview h2{font:400 clamp(38px,4.6vw,62px)/1.08 var(--serif);margin:14px 0 12px;text-wrap:balance}
.overview-intro{font-size:clamp(19px,1.8vw,24px);line-height:1.4;color:var(--dim)}
.study-body{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:clamp(40px,6vw,90px);align-items:center;margin:30px 0}
.study-copy{font-size:18px;line-height:1.5;color:var(--dim);max-width:25em}
.study-questions{display:grid;gap:8px;margin:22px 0;font-size:23px;font-style:italic;line-height:1.3}
.study-questions p{padding-left:16px;border-left:1px solid currentColor}
.study-figure{min-width:0;margin:0}
.study-figure-head>span{font-size:12px;color:var(--dim);letter-spacing:.12em;text-transform:uppercase}
.study-figure h3{font-size:23px;font-weight:400;margin:5px 0 18px;line-height:1.25}
.study-plot-key{display:flex;justify-content:space-between;font-size:13px;color:var(--dim);margin-bottom:10px}
.study-plot{display:grid;grid-template-columns:minmax(0,1fr) 132px;grid-template-rows:minmax(0,1fr);gap:8px;height:260px}
#study-streams{width:100%;height:100%;min-height:0;overflow:visible}
.taste-stream{fill:none;stroke:var(--ink);stroke-opacity:.1;stroke-width:1;vector-effect:non-scaling-stroke}
.taste-stream.taste-shared{stroke:rgb(110,209,145);stroke-opacity:.16}
.taste-sources{fill:var(--ink);fill-opacity:.55}
.study-picks{list-style:none;padding:0;display:grid;grid-auto-rows:1fr}
.study-picks li{display:flex;flex-direction:column;justify-content:center;color:var(--dim);font-size:17px;line-height:1.2}
.study-picks li>div{display:flex;justify-content:space-between;gap:8px}
.study-picks .study-shared{color:rgb(110,209,145)}
.study-share{font-size:15px;font-variant-numeric:tabular-nums}
.study-bar{height:2px;width:var(--share);margin-top:8px;background:currentColor;opacity:.65}
.study-figure figcaption{display:block;padding:12px 0 0;border:0;color:var(--dim);font-size:13px;line-height:1.4}
.overview-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px 28px;margin-top:26px}
.explore-button{display:inline-flex;align-items:center;justify-content:space-between;gap:32px;min-height:48px;padding:12px 20px;border:1px solid var(--ink);border-radius:2px;background:var(--ink);color:var(--night);font:18px var(--serif);cursor:pointer}
.explore-button:hover{background:white;border-color:white}
.text-link{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:8px 0;border:0;background:none;color:var(--ink);font:16px var(--serif);text-decoration:underline;text-underline-offset:5px;text-decoration-color:var(--dim);cursor:pointer}
.explore-button:focus-visible,.text-link:focus-visible,.method-roster summary:focus-visible{outline:2px solid var(--ink);outline-offset:5px}
.key-favorite{color:rgb(110,209,145)}
.key-overrated{color:rgb(232,104,98)}
#method{max-width:1100px}
#method .gloss{font-size:16px}
.method-summary{margin-top:32px;font-size:22px}
.method-probes{display:flex;flex-wrap:wrap;gap:12px 36px;font-size:20px;font-style:italic;margin-top:16px;color:var(--dim)}
.method-steps{list-style:none;counter-reset:method;padding:0;margin-top:36px;max-width:820px}
.method-steps li{counter-increment:method;position:relative;padding:24px 0 24px 48px;border-top:1px solid var(--hair)}
.method-steps li::before{content:counter(method,decimal-leading-zero);position:absolute;left:0;top:27px;color:var(--dim);font-size:16px}
#method h3{font-size:22px;font-weight:400;line-height:1.3;margin-bottom:10px}
.method-steps p,.method-limits p{font-size:17px;line-height:1.65;color:var(--dim);max-width:44em}
.method-steps p+p{margin-top:12px}
.method-limits{max-width:820px;border-top:1px solid var(--hair);padding-top:24px;margin-top:12px}
.method-roster{margin-top:32px;padding:18px 0;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}
.method-roster summary{cursor:pointer;font-size:18px;min-height:44px;align-content:center}
.method-roster .mro-m{opacity:1;transform:none}
.method-roster .mro-head,.method-roster .mro-cc,.method-roster .mro-legend{font-size:12px}
#method .mfine h4{font-size:13px;color:var(--dim)}
#method .mfine p{font-size:16px;line-height:1.65}
@media(max-width:760px){
  .intro-overview{padding:20px 0}
  .overview-kicker{letter-spacing:.1em}
  .intro-overview h2{font-size:clamp(28px,8vw,34px);margin:10px 0}
  .study-body{grid-template-columns:1fr;gap:18px;margin:18px 0}
  .study-copy{max-width:100%;font-size:16px;line-height:1.4}
  .study-questions{font-size:clamp(18px,5vw,20px);gap:6px;margin:14px 0}
  .study-figure h3{font-size:clamp(18px,5vw,21px);margin:4px 0 12px}
  .study-plot{height:148px;grid-template-columns:minmax(0,1fr) 126px}
  .study-picks li{font-size:16px}
  .overview-actions{margin-top:16px;gap:4px 16px}
  .method-probes{display:grid;gap:8px;font-size:18px}
  .method-steps li{padding-left:34px}
}
@media(max-height:700px) and (min-width:761px){
  .intro-overview{padding:24px 0}
  .intro-overview h2{font-size:44px;margin:8px 0}
  .study-body{margin:20px 0}
  .study-questions{font-size:20px}
  .study-plot{height:200px}
  .overview-actions{margin-top:16px}
}

/* Method diagrams use HTML labels so text stays readable at phone widths. */
.method-figure{margin:22px 0;background:rgba(233,230,221,.025);border:1px solid var(--hair);padding:20px}
.method-figure figcaption{display:block;border:0;padding:16px 0 0;font-size:14px;color:var(--dim);line-height:1.5}
.figure-label{display:block;font-size:12px;letter-spacing:.08em;color:var(--dim);text-transform:uppercase}
.question-pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}
#method .question-pair p{font-size:20px;line-height:1.4;margin-top:12px}
#method .question-pair .key-favorite{color:rgb(110,209,145)}
#method .question-pair .key-overrated{color:rgb(232,104,98)}
.sampling-flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}
.sampling-flow>div{border-top:1px solid var(--hair);padding-top:10px}
.sampling-flow strong{display:block;font:400 42px/1.2 var(--serif)}
.sampling-flow span{font-size:14px;color:var(--dim)}
#method .sampling-flow p{font-size:16px;margin-top:14px;line-height:1.4}
.sampling-flow b{font-weight:400;color:var(--ink)}
.sampling-flow small{display:block;margin-top:14px;font-size:14px;color:var(--dim)}
.alias-flow{display:flex;align-items:center;gap:24px}
.alias-flow>div{display:flex;flex:1;flex-direction:column;gap:8px;min-width:0}
.alias-flow span:not(.figure-label):not(.diagram-arrow){font-size:18px}
.alias-flow strong{font-size:21px;font-weight:400}
.diagram-arrow{font-size:28px;color:var(--dim)}
.score-row{display:grid;grid-template-columns:76px minmax(20px,1fr) 106px;gap:16px;align-items:center;margin-top:18px;font-size:16px}
.score-row>span:last-child{text-align:right}
.score-track{height:8px;background:var(--hair2)}
.score-track i{display:block;height:100%}
.score-result{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;border-top:1px solid var(--hair);margin-top:20px;padding-top:16px;font-size:18px}
.map-explainer{display:grid;grid-template-columns:1fr 1.2fr;gap:24px;align-items:center}
.map-explainer svg{width:100%;height:auto;min-width:0}
#method .map-explainer p{font-size:17px;margin-top:10px;line-height:1.6}
.consensus-dots{display:flex;flex-wrap:wrap;gap:10px}
.consensus-dots i{width:14px;height:14px;border-radius:50%;border:1px solid var(--dim)}
.consensus-dots i.counted{border-color:rgb(110,209,145);background:rgb(110,209,145)}
@media(max-width:600px){
  .method-figure{padding:14px;margin-left:-34px}
  .question-pair{grid-template-columns:1fr;gap:18px}
  .question-pair>div+div{border-top:1px solid var(--hair);padding-top:18px}
  .sampling-flow{gap:12px}
  .sampling-flow strong{font-size:34px}
  #method .sampling-flow p,.sampling-flow small{font-size:14px}
  .alias-flow{gap:12px}
  .alias-flow span:not(.figure-label):not(.diagram-arrow),.alias-flow strong{font-size:17px}
  .score-row{grid-template-columns:64px minmax(20px,1fr) 88px;gap:8px;font-size:14px}
  .score-result{font-size:16px}
  .map-explainer{grid-template-columns:1fr;gap:12px}
  .map-explainer svg{max-width:360px;justify-self:center}
}

/* model map */
.atlas-wrap{margin-top:10px}
.atlas-wrap svg{display:block;width:100%;height:auto}
#mmap{touch-action:none;cursor:grab;-webkit-user-select:none;user-select:none}
#mmap.grabbing{cursor:grabbing}
.axline{stroke:var(--hair);stroke-width:1}
.axlab{font:9.5px var(--mono);fill:var(--faint);letter-spacing:.1em;text-transform:uppercase;pointer-events:auto}
/* SVG text scales with the viewBox, so at phone widths the map renders at
   ~0.6x and its labels vanish — bump the user-unit sizes to compensate. */
@media(max-width:640px){.axlab{font-size:13px}}
.mnode{cursor:pointer;transition:opacity .3s}
.mnum{font:11px var(--mono);fill:var(--night);text-anchor:middle;font-weight:700;pointer-events:none}
.selring{stroke:none}
.mnode.sel .selring{stroke:var(--ink);stroke-width:1.5}
.atlas-foot{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:6px}
.atlas-note{font-size:12.5px;color:var(--faint);max-width:40em}

/* canon */
.cgroup{font:10.5px var(--mono);letter-spacing:.26em;text-transform:uppercase;color:var(--dim);margin:36px 0 14px}
.canon{display:grid;grid-template-columns:repeat(auto-fill,minmax(196px,1fr));gap:14px}
.cc{border:1px solid var(--hair2);border-radius:4px;overflow:hidden;background:var(--panel)}
.cc-img{aspect-ratio:4/3;overflow:hidden}
.cc-img img{width:100%;height:100%;object-fit:cover;filter:saturate(.92)}
.cc-native{aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;color:var(--ink);padding:14px;text-align:center}
.cc-word{font-family:var(--serif);font-style:italic;font-size:30px}
.cc-decade{font-family:var(--serif);font-size:46px;letter-spacing:.04em}
.cc-title{font-family:var(--serif);font-size:19px;line-height:1.3;text-wrap:balance}
.cc-verse{font-family:var(--serif);font-style:italic;font-size:14.5px;line-height:1.7;color:var(--dim)}
figcaption{padding:10px 12px 12px;display:flex;flex-direction:column;gap:2px;border-top:1px solid var(--hair2)}
.cc-dom{font:9.5px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--faint)}
.cc-name{font-family:var(--serif);font-size:15px;line-height:1.3}
.cc-n{font:10.5px var(--mono);color:var(--dim)}

/* atlas + dossier interlock */
.atlasgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(480px,1.05fr);gap:clamp(30px,4vw,64px);margin-top:14px;align-items:start}
@media(max-width:980px){.atlasgrid{grid-template-columns:1fr}}
.mname{font-family:var(--serif);font-size:12.5px;fill:var(--ink);text-anchor:middle;paint-order:stroke;stroke:var(--night);stroke-width:3.5px;pointer-events:none;transition:opacity .5s}
@media(max-width:640px){.mname{font-size:17px;stroke-width:4.5px}}
#atlas.revealed .mname{opacity:0}

/* index: left rail of fields, one matrix at a time */
.chip{font:10.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--dim);border:1px solid var(--hair);border-radius:2px;padding:6px 10px;background:none;cursor:pointer}
.chip:hover{color:var(--ink);border-color:var(--dim)}
.chip:focus-visible{outline:1px dashed var(--ink);outline-offset:2px}
.chip.on{background:var(--ink);color:var(--night);border-color:var(--ink)}
.probe-band{position:absolute;right:-40px;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;gap:8px;font:9px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.probe-band span{writing-mode:vertical-rl}
.probe-band i{flex:1;width:6px;border-radius:3px;background:linear-gradient(180deg,rgba(110,209,145,.85),rgba(110,209,145,.08) 46%,rgba(232,104,98,.08) 54%,rgba(232,104,98,.85))}
.indexgrid{display:grid;grid-template-columns:158px minmax(0,1fr);gap:clamp(22px,2.6vw,44px);margin-top:16px}
.idx-rail{position:sticky;top:96px;align-self:start;max-height:calc(100svh - 116px);overflow-y:auto;scrollbar-width:none}
.idx-rail::-webkit-scrollbar{display:none}
.idx-cat{font:9px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--faint);margin:16px 0 5px}
.idx-cat:first-child{margin-top:2px}
.idx-dom{display:block;width:100%;text-align:left;background:none;border:0;border-left:1px solid var(--hair2);padding:4px 10px;font:14px/1.3 var(--serif);color:var(--dim);cursor:pointer}
.idx-dom:hover{color:var(--ink)}
.idx-dom:focus-visible{outline:1px dashed var(--ink);outline-offset:-2px}
.idx-dom.on{color:var(--ink);border-left:2px solid var(--ink);padding-left:9px;background:rgba(233,230,221,.04)}
.idx-main{min-width:0;container-type:inline-size}
/* mobile-only: the field rail collapses behind a launcher (see @media below) */
.railtoggle{display:none}
.rail-veil{display:none;position:fixed;inset:0;z-index:45;background:rgba(9,10,12,.6)}
@media(max-width:820px){
  .indexgrid{grid-template-columns:1fr}
  /* the rail becomes a left off-canvas drawer, so the grid is visible at once */
  /* Explicit viewport height (not top:0;bottom:0, which mis-sizes to full content
     height here) so the drawer is bounded and its overflow actually scrolls. */
  .idx-rail{position:fixed;left:0;top:0;height:100vh;height:100dvh;z-index:46;width:min(272px,82vw);max-height:none;
    padding:66px 14px 40px;background:var(--panel);border-right:1px solid var(--hair);
    overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;transform:translateX(-100%);
    transition:transform .26s ease;box-shadow:16px 0 46px rgba(0,0,0,.5)}
  body.rail-open{position:fixed;left:0;right:0;width:100%}
  body.rail-open .idx-rail{transform:translateX(0)}
  body.rail-open .rail-veil{display:block}
  .idx-dom{min-height:40px;padding:8px 12px}
  /* the launcher shown above the grid */
  .railtoggle{display:flex;align-items:center;gap:10px;width:100%;margin:0 0 14px;padding:11px 13px;
    background:rgba(233,230,221,.04);border:1px solid var(--hair);border-radius:3px;color:var(--dim);
    font:10px var(--mono);letter-spacing:.22em;text-transform:uppercase;cursor:pointer}
  .railtoggle:hover,.railtoggle:focus-visible{color:var(--ink);border-color:var(--dim);outline:none}
  .railtoggle svg{width:17px;height:17px;flex:none;fill:none}
  .railtoggle b{margin-left:auto;color:var(--ink);font:400 15px/1 var(--serif);letter-spacing:0;text-transform:none}
}
.choicematrix{margin-top:2px}
.matrix-panel{margin-top:6px}
.bo-scroll{width:100%;max-width:100%;overflow:visible;padding-bottom:5px}
/* Header rows: 28px company row + 38px model row. The sticky offsets below
   (desktop top:82/110px; container-anchored top:0/28px when scrolling) all key
   off the 28px company-row height — change one, change all. */
.bo-matrix{position:relative;margin-right:52px;display:grid;grid-template-rows:28px 38px;grid-auto-rows:44px;width:max-content}
.bo-famrow{position:sticky;left:0;top:82px;z-index:5;background:var(--night)}
.bo-fam{position:sticky;top:82px;z-index:4;background:var(--night);display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;min-width:0;overflow:hidden;text-align:center;line-height:1.15;padding:0 1px;font:8px var(--mono);letter-spacing:0;text-transform:uppercase;color:var(--faint);border-left:1px solid var(--hair2)}
.bo-fam:first-child{border-left:0}
.co-mono{display:inline-grid;place-items:center;width:12px;height:12px;border-radius:3px;font:700 8px/1 var(--mono);font-style:normal;color:var(--night);flex:none}
.co-logo{display:block;width:12px;height:12px;flex:none}
.bo-corner{position:sticky;left:0;top:110px;z-index:5;display:flex;align-items:flex-end;padding:0 10px 8px 3px;border-bottom:1px solid var(--hair2);background:var(--night);font:18px/1.1 var(--serif);color:var(--ink)}
.bo-col{position:sticky;top:110px;z-index:4;background:var(--night);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border-bottom:1px solid var(--hair2);text-align:center;cursor:pointer}
.bo-col:hover{background:#1e2025}
.bo-col:hover span,.bo-col.sel span{color:var(--ink)}
.bo-col.sel{background:#22242a}
.bo-col:focus-visible{outline:1px dashed var(--ink);outline-offset:-2px}
.bo-col span{font:8.5px/1.15 var(--mono);color:var(--faint);white-space:normal}
.bo-rowlabel i{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;font:9px var(--mono);font-style:normal;font-weight:700;color:var(--night);flex:none}
.fam-dot{border-radius:50%;flex:none}
.dossier .dname i.fam-dot{width:11px;height:11px}
.cd-model i.fam-dot{width:11px;height:11px}
.bo-rowlabel{position:sticky;left:0;z-index:2;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:3px 10px 3px 3px;border-right:1px solid var(--hair2);
  background:var(--night);font-family:var(--serif);font-size:12.5px;line-height:1.15;color:var(--dim);white-space:nowrap;overflow:hidden}
.bo-rowlabel.shared{color:var(--ink)}
.bo-rowlabel .bo-title{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.bo-rowlabel small{display:block;max-width:100%;margin-top:2px;overflow:hidden;text-overflow:ellipsis;color:var(--faint);font:10.5px/1 var(--serif);font-weight:400}
.bo-cell{position:relative;width:56px;height:44px;border:0;border-right:1px solid var(--hair2);border-bottom:1px solid var(--hair2);background:none;color:var(--faint);font:8.5px var(--mono)}
button.bo-cell{cursor:pointer;color:var(--dim)}
button.bo-cell:hover{box-shadow:inset 0 0 0 1px var(--ink);color:var(--ink)}
button.bo-cell.on{box-shadow:inset 0 0 0 2px var(--ink);color:var(--ink)}
button.bo-cell.hi{color:var(--night);font-weight:700}
/* dual-register cells: favourite share stacked over overrated share. The
   halves paint over the button, so hover/selected rings use outline (drawn on
   top) rather than the inset box-shadow the single cells use. */
.bo-cell.bo-split{display:flex;flex-direction:column;padding:0;background:none}
.bo-split .bo-half{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;font-size:7.5px;line-height:1}
.bo-split .bo-half.hi{color:var(--night);font-weight:700}
button.bo-split:hover{box-shadow:none;outline:1px solid var(--ink);outline-offset:-1px}
button.bo-split.on{box-shadow:none;outline:2px solid var(--ink);outline-offset:-2px}
/* color rows wear a dot of the color itself, left of the name */
/* i.color-dot (not .color-dot): must out-rank the broad ".bo-rowlabel i"
   monogram rule above, whose display:grid turns the orb into a block and
   drops the colour name onto its own line below it. */
i.color-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;vertical-align:-1px;border:1px solid rgba(233,230,221,.28)}
/* Keep a wide model panel inside its available column, at any roster size.
   Headers stick inside the scroll area when the matrix needs to scroll. */
@container(max-width:${192 + models.length * 56 - 1}px){
  .bo-scroll{overflow:auto;max-height:calc(100svh - 170px);overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
  .bo-famrow,.bo-fam{top:0}
  .bo-corner,.bo-col{top:28px}
}
@media(max-width:640px){
  .bo-matrix{--labw:132px}
  .bo-rowlabel{font-size:12px}
  .bo-corner{font-size:15px}
}
/* The existing matrix and an alternative, progressively disclosed river. */
.index-view-switch{display:flex;justify-content:flex-end;align-items:center;gap:20px;flex-wrap:wrap;margin-bottom:20px}
#index-field-title{font:400 30px/1.2 var(--serif);margin-right:auto}
.index-switch{display:inline-flex;border:1px solid var(--hair);border-radius:3px;padding:3px;gap:3px}
.index-switch button{background:none;border:0;border-radius:2px;padding:9px 18px;min-height:40px;font:16px var(--serif);color:var(--dim);cursor:pointer}
.index-switch button[aria-pressed="true"]{background:rgba(233,230,221,.1);color:var(--ink)}
.index-switch button:hover{color:var(--ink)}
.index-switch button:focus-visible,.riverindex button:focus-visible{outline:1px solid var(--ink);outline-offset:3px}
#choicematrix[hidden],#riverindex[hidden]{display:none}
.riverindex{--river-columns:minmax(280px,.85fr) minmax(60px,1fr) 132px;--river-choice-pad:16px;--river-score-width:58px;padding-bottom:24px;overflow-anchor:none}
.river-selection{min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--hair);border-bottom:1px solid var(--hair);padding:12px 0;margin-bottom:22px}
.river-selection[hidden]{display:none}
.river-selection-title{font-size:18px;color:var(--ink);display:block;line-height:1.3}
.river-selection-note{font-size:14px;color:var(--dim);display:block;margin-top:4px}
.river-selection-actions{display:flex;gap:20px;flex-wrap:wrap;flex:none}
.river-selection-actions .text-link{font-size:14px}
.river-keys{display:grid;grid-template-columns:var(--river-columns);font-size:13px;color:var(--dim);margin-bottom:16px}
.river-mobile-controls{display:none}
.river-choice-heading{grid-column:1;min-width:0;padding-right:calc(var(--river-choice-pad) + 1px);display:flex;flex-direction:column;gap:10px}
.river-model-heading{grid-column:3;text-align:right}
.river-stage{position:relative;display:grid;grid-template-columns:var(--river-columns);align-items:stretch;isolation:isolate}
.river-paths{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1;overflow:visible}
.river-paths path{fill:none;stroke-opacity:.16;transition:stroke-opacity .18s}
.river-paths path.river-lit{stroke-opacity:.8}
.river-paths path.river-dim{stroke-opacity:.025}
.river-models{grid-column:3;grid-row:1;align-self:start;position:sticky;top:96px;max-height:calc(100svh - 112px);overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:var(--hair) transparent;display:flex;flex-direction:column;gap:10px;padding:4px 0}
.river-models::-webkit-scrollbar{width:3px}
.river-models::-webkit-scrollbar-thumb{background:var(--hair);border-radius:3px}
.river-models .river-dot:focus-visible{outline-offset:-3px}
.river-family>span{display:inline-block;background:var(--night);padding-right:8px;font-size:13px;color:var(--dim);line-height:1.3}
.river-dots{display:grid;grid-template-columns:repeat(3,36px);gap:2px;margin-top:4px}
.river-dot{width:36px;height:36px;display:grid;place-items:center;background:none;border:0;cursor:pointer;border-radius:50%;padding:0}
.river-dot i{width:9px;height:9px;background:var(--model-color);border-radius:50%;box-shadow:0 0 0 5px var(--night);transition:box-shadow .18s,opacity .18s}
.river-dot[aria-pressed="true"] i{box-shadow:0 0 0 5px var(--night),0 0 0 6px var(--model-color)}
.river-dot:hover i{box-shadow:0 0 0 5px var(--night),0 0 0 6px var(--ink)}
.river-dot:disabled{cursor:default}
.river-dot:disabled i{background:transparent;border:1px solid var(--faint)}
.river-muted{opacity:.28}
.river-choices{grid-column:1;grid-row:1;list-style:none;padding:0;margin:0;display:flex;flex-direction:column;justify-content:space-around;gap:10px}
.river-choice{position:relative;width:100%;text-align:left;padding:14px var(--river-choice-pad) 14px 0;border:0;border-right:1px solid var(--hair);background:var(--night);color:var(--ink);font:18px/1.25 var(--serif);cursor:pointer;min-height:60px;transition:opacity .18s}
.river-choice:hover,.river-choice[aria-pressed="true"]{border-right-color:var(--ink)}
.river-choice-line{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 14px;align-items:baseline}
.river-choice-name{min-width:0;overflow-wrap:anywhere}
.river-share{font-size:16px;font-variant-numeric:tabular-nums;white-space:nowrap}
.river-shares,.river-legend{display:grid;grid-template-columns:repeat(2,var(--river-score-width));gap:10px;text-align:right;margin-left:auto;flex:none}
.river-share{min-width:3.2ch;text-align:right}
.river-favorite{color:rgb(110,209,145)}
.river-overrated{color:rgb(232,104,98)}
.river-sub{display:block;font-size:14px;color:var(--dim);margin-top:4px;line-height:1.3}
.river-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px;color:var(--dim);border-top:1px solid var(--hair);padding-top:16px;margin-top:24px}
.river-empty{font-size:18px;color:var(--dim);padding:32px 0}
@container(max-width:700px){
 .riverindex{--river-columns:minmax(160px,1.1fr) minmax(28px,1fr) 88px;--river-choice-pad:10px}
 .river-dots{grid-template-columns:repeat(2,42px)}
 .river-dot{width:42px;height:42px}
 .river-selection{align-items:flex-start;flex-direction:column;gap:4px}
 .river-selection-actions{gap:20px}
 .river-choice{font-size:16px;padding:12px var(--river-choice-pad) 12px 0}
 .river-share{font-size:14px}
 .river-choice-line{gap:8px}
}
@media(max-width:480px){
 .riverindex{--river-columns:minmax(0,1fr) 20px 88px;--river-score-width:50px}
 .river-family>span{font-size:12px}
 .river-keys{font-size:12px}
 .river-choice-name{width:100%}
 #index-field-title{font-size:28px;width:100%}
 .index-view-switch{justify-content:space-between;gap:12px}
 .index-switch button{padding:8px 12px}
 .river-choice-line{flex-wrap:wrap;gap:4px 8px}
 .river-sub{font-size:13px}
}
/* On phones, disclose one model through a named selector. The desktop paths
   and dot rail need more space than a readable choice list can give them. */
@media(max-width:720px){
 #index-field-title{width:auto}
 .riverindex{--river-score-width:58px}
 .river-paths,.river-models,.river-model-heading,.river-selection{display:none}
 .river-keys{position:sticky;top:70px;z-index:3;display:flex;flex-direction:column;gap:14px;margin-bottom:0;padding:12px 0;background:var(--night);border-bottom:1px solid var(--hair)}
 .river-mobile-controls{display:flex;align-items:center;gap:12px}
 .river-mobile-picker{min-width:0;flex:1}
 .river-mobile-picker label{display:block;font-size:12px;margin-bottom:6px}
 .river-mobile-picker select{display:block;width:100%;min-height:44px;border:1px solid var(--hair);border-radius:3px;background:var(--panel);color:var(--ink);font:16px var(--serif);padding:10px 12px;color-scheme:dark}
 .river-mobile-picker select:focus-visible{outline:1px solid var(--ink);outline-offset:3px}
 .river-mobile-profile{align-self:flex-end;min-height:44px;font-size:14px}
 .river-choice-heading{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:12px;padding:0;font-size:12px;line-height:1.35}
 .river-stage{display:block}
 .river-choices{gap:0}
 .river-choice{padding:16px 0;min-height:72px;font-size:18px;border-right:0;border-bottom:1px solid var(--hair2);scroll-margin-top:225px}
 .river-choice[aria-pressed="true"]{border-bottom-color:var(--dim)}
 .river-choice-line{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:baseline}
 .river-choice-name{width:auto}
 .river-share{font-size:16px}
 .river-sub{max-width:calc(100% - 138px);font-size:14px;overflow-wrap:anywhere}
 .river-choice.river-muted{opacity:1}
 .river-footer{margin-top:16px;border-top:0}
}
@media(prefers-reduced-motion:reduce){.river-paths path,.river-dot i,.river-choice{transition:none}}

/* the detail drawer: fixed on the right, dismissed by veil / x / Escape */
.drawer-veil{position:fixed;inset:0;z-index:39;background:rgba(9,10,12,.55)}
.drawer-veil[hidden]{display:none}
.cabdetail{position:fixed;top:0;right:0;bottom:0;z-index:40;width:min(440px,94vw);background:var(--panel);border-left:1px solid var(--hair);padding:20px clamp(20px,2.2vw,30px) 110px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(233,230,221,.16) transparent;box-shadow:-18px 0 44px rgba(0,0,0,.4)}
.cabdetail::-webkit-scrollbar{width:5px}
.cabdetail::-webkit-scrollbar-thumb{background:rgba(233,230,221,.16);border-radius:3px}
.cabdetail::-webkit-scrollbar-track{background:transparent}
/* Phones: the drawer takes the whole width bar a sliver of veil on the left,
   so the close × stays reachable and quotes keep a full measure. */
@media(max-width:640px){.cabdetail{width:calc(100vw - 30px);padding:20px 18px 110px}}
.cabdetail[hidden]{display:none}
.drawer-mobile-close{display:none}
@media(max-width:720px){.drawer-mobile-close{display:grid;place-items:center;position:sticky;top:0;z-index:2;float:right;width:44px;height:44px;margin:-10px -8px 0 8px;border:1px solid var(--hair);border-radius:50%;background:var(--panel);color:var(--ink);font:24px/1 var(--serif);cursor:pointer}.drawer-mobile-close:focus-visible{outline:1px solid var(--ink);outline-offset:3px}}
.cabdetail .dossier{border-left:0;padding:0;min-height:0}
.cabdetail .dtop{grid-template-columns:1fr}
.cabdetail .dfavs{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}
/* drawer entrance: the injected card rises in as one piece (class added after
   injection, double-rAF'd so the transition actually runs) */
.cd-body{opacity:0;transform:translateY(6px);transition:opacity .3s cubic-bezier(.22,.7,.35,1),transform .3s cubic-bezier(.22,.7,.35,1)}
.cd-body.cd-in{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){.cd-body{opacity:1;transform:none;transition:none}}
/* a color entity's card: the color itself, a modest centered swatch */
.ec-swatch{width:104px;height:104px;border-radius:50%;margin:18px auto 0;border:1px solid var(--hair2)}
/* the endorsements block lost its heading; a hairline keeps the separation */
.ec-quotes{margin-top:26px;border-top:1px solid var(--hair2)}
.cd-reg{font:9.5px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--faint)}
.cd-reg-f{color:rgb(110,209,145)}
.cd-reg-o{color:rgb(232,104,98)}
.cd-title{font-family:var(--serif);font-weight:400;font-size:clamp(22px,2.2vw,30px);line-height:1.15;margin-top:8px;text-wrap:balance}
.cd-creator{margin-top:4px;color:var(--faint);font:13px var(--serif)}
.cd-model{display:flex;align-items:center;gap:9px;margin-top:9px;color:var(--dim);font:10.5px var(--mono)}
.cd-model i{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;color:var(--night);font-style:normal;font-weight:700}
.cd-share{margin-top:15px;font:9.5px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.cd-primary{font-family:var(--serif);font-size:15px;line-height:1.72;color:var(--dim);margin-top:12px;white-space:pre-line}
.cd-primary::before{content:'\\201c';color:var(--ink);font-size:23px;line-height:0;margin-right:2px}
.cd-primary::after{content:'\\201d';color:var(--ink)}
.cd-other{font:9.5px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--faint);margin-top:28px;padding-top:17px;border-top:1px solid var(--hair2)}
.bo-rowlabel[role=button]{cursor:pointer}
.bo-rowlabel[role=button]:hover{background:#1e2025;color:var(--ink)}
.bo-rowlabel[role=button]:hover small{color:var(--dim)}
.bo-rowlabel[role=button]:focus-visible{outline:1px dashed var(--ink);outline-offset:-2px}
.ec-blurb{font-family:var(--serif);font-size:14.5px;line-height:1.65;color:var(--dim);margin-top:14px;text-wrap:pretty}
.ec-def{margin-top:14px;padding:11px 14px;border:1px solid var(--hair2);border-radius:3px;font-family:var(--serif);font-size:14px;line-height:1.6;color:var(--dim)}
.ec-def i{color:var(--faint);margin-right:2px}
.ec-img{margin-top:16px;max-width:250px;margin-inline:auto;border:1px solid var(--hair2);border-radius:3px;overflow:hidden;background:var(--night)}
.ec-img img{display:block;width:100%;height:auto}
.ec-photo{margin-top:14px}
.ec-photo img{display:block;margin-inline:auto;max-width:100%;max-height:240px;width:auto;height:auto;border:1px solid var(--hair2);border-radius:2px}
.ec-ext{color:var(--dim);text-decoration:none;margin-left:.28em;white-space:nowrap}
.ec-ext svg{width:.42em;height:.42em;vertical-align:.55em}
.ec-ext:hover{color:var(--ink)}
.ec-ext:focus-visible{outline:1px dashed var(--ink);outline-offset:2px}
.ec-sect{font:9.5px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--faint);margin-top:28px;padding-top:16px;border-top:1px solid var(--hair2)}
.ec-sect-o{color:rgba(232,104,98,.72);margin-top:24px}
.ec-quote{font-family:var(--serif);font-style:italic;font-size:14.5px;line-height:1.7;color:var(--dim);margin-top:16px}
.ec-quote .ec-att{display:block;font:10px var(--mono);font-style:normal;letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-top:7px}
.ec-quote-o .ec-att{color:rgba(232,104,98,.62)}
.cresp{padding:14px 0;border-bottom:1px solid var(--hair2)}
.cresp-head{display:flex;align-items:baseline;gap:10px}
.cresp-head span{font:9px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--faint);flex:none}
.cresp-head b{font-family:var(--serif);font-size:14.5px;font-weight:400;color:var(--ink)}
.cresp-head em{color:var(--faint);font:11.5px var(--serif);font-style:normal}
.cresp p{font-family:var(--serif);font-size:13.5px;line-height:1.65;color:var(--dim);margin-top:6px;white-space:pre-line}

.dossier{border-left:1px solid var(--hair);padding:6px 0 8px clamp(26px,3vw,44px);min-height:340px}
@media(max-width:980px){.dossier{border-left:none;padding-left:0;border-top:1px solid var(--hair);padding-top:20px}}
.dtop{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(220px,1fr);gap:28px;margin-top:4px}
@media(max-width:1240px){.dtop{grid-template-columns:1fr}}
.dfavs-h{font:10px var(--mono);letter-spacing:.22em;text-transform:uppercase;color:var(--faint);margin-top:28px;border-top:1px solid var(--hair2);padding-top:18px}
.dfavs{margin-top:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:13px 26px}
.fitem{display:flex;flex-direction:column;gap:1px}
.fdom{font:9px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.fval{color:var(--dim);line-height:1.4}
.fval b{color:var(--ink);font-weight:500;font-family:var(--serif);font-size:14.5px}
.fpct{font:9.5px var(--mono);color:var(--faint)}
.pending{color:var(--faint)}
@media(max-width:980px){.dossier{position:static;border-left:none;padding-left:0;border-top:1px solid var(--hair);padding-top:20px}}
.dossier .reg{font:10px var(--mono);letter-spacing:.22em;text-transform:uppercase;color:var(--faint)}
.dossier .dname{font-family:var(--serif);font-size:24px;margin-top:6px;display:flex;align-items:center;gap:10px}
.dossier .dname i{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;font:10.5px var(--mono);font-weight:700;color:var(--night);font-style:normal}
.dossier .persona{font-family:var(--serif);font-style:italic;font-size:16px;color:var(--dim);margin-top:2px}
.dossier blockquote{font-family:var(--serif);font-size:14.5px;line-height:1.7;color:var(--dim);margin-top:16px}
.dossier blockquote .src{display:block;font:9.5px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-top:8px}
.dossier dl{margin-top:18px;display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:12.5px}
.dossier dt{font:9.5px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--faint);align-self:center}
.dossier dd{color:var(--dim)}
.dossier dd b{color:var(--ink);font-weight:500}
.sigwords{display:flex;flex-wrap:wrap;gap:5px;margin-top:12px}
.sigw{font:11px var(--mono);color:var(--dim);border:1px solid var(--hair2);border-radius:2px;padding:3px 7px}

/* lineage */
.line{display:grid;grid-template-columns:repeat(4,1fr);margin-top:20px}
@media(max-width:760px){.line{grid-template-columns:1fr 1fr}}
.rung{padding:18px 20px 4px 0;border-left:1px solid var(--hair2);padding-left:20px}
.rung:first-child{border-left:none;padding-left:0}
.rung-no{font:10px var(--mono);letter-spacing:.2em;color:var(--faint)}
.rung .nm{font-family:var(--serif);font-size:18px;margin-top:8px}
.rung .pa{font:10px var(--mono);color:var(--dim);margin-top:3px}
.rung dl{margin-top:14px;display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:12px}
.rung dt{font:9px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--faint);align-self:center}
.rung dd{color:var(--dim)}
.rung dd b{color:var(--ink);font-weight:500}
.linenote{font-size:13px;color:var(--dim);margin-top:20px;max-width:46em}

/* method + quiz + side drawer */
main{padding-bottom:60px}
body.nav-ready::before{content:'';position:fixed;z-index:8;left:0;right:0;top:0;height:82px;background:var(--night);border-bottom:1px solid var(--hair2);pointer-events:none}
.viewbar{position:fixed;z-index:10;
  left:max(clamp(22px,4vw,88px),calc((100vw - 1800px)/2 + 88px));
  right:max(clamp(22px,4vw,88px),calc((100vw - 1800px)/2 + 88px));
  top:20px;
  display:flex;align-items:stretch;height:42px;margin:0;padding:0;
  border-bottom:1px solid var(--hair);background:rgba(19,20,23,.94);backdrop-filter:saturate(120%) blur(18px);
  opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-7px);
  transition:opacity .32s ease,transform .32s ease,visibility .32s step-end}
.viewbar .viewlink{width:112px;flex:none}
/* Brand mark: a split gem — favourite-green over overrated-red — the two
   questions and the top-to-bottom axis of the whole index in one figure. */
.viewlogo{flex:none;width:50px;height:40px;display:flex;align-items:center;justify-content:center;margin-right:6px;background:none;border:0;cursor:pointer;padding:0;opacity:.9;transition:opacity .2s ease,transform .2s ease}
.viewlogo svg{width:22px;height:22px;display:block}
.viewlogo:hover{opacity:1;transform:translateY(-1px)}
.viewbar.show{opacity:1;visibility:visible;pointer-events:auto;transform:none;
  transition:opacity .32s ease,transform .32s ease}
.viewbar .viewlink{position:relative;display:block;min-width:0;height:40px;
  font-family:var(--serif);font-size:15px;text-align:center;color:var(--dim);
  background:none;border:0;cursor:pointer;padding:0 10px}
.viewbar .viewlink::before{content:'';position:absolute;left:8px;right:8px;bottom:-1px;height:2px;background:transparent}
.viewbar .viewlink span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* First-visit coach-mark: floats beside the first row (Invisible Cities) to
   teach that a name opens its card. position:fixed so no matrix overflow or
   sticky-header stacking can clip it; placed from the row's live rect. */
#rowhint{position:fixed;z-index:60;display:none;align-items:center;gap:9px;padding:13px 18px;max-width:250px;background:rgba(19,20,23,.97);border:1px solid var(--hair);border-radius:22px;box-shadow:0 14px 36px rgba(0,0,0,.55);cursor:pointer;-webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px);--rh-lead:26px}
#rowhint.on{display:flex;animation:rhin .45s ease both}
/* connector: a pulsing dot + line to the LEFT that tethers the pill directly to
   the first row name, instead of a free-floating tag with a little arrow. */
#rowhint::before{content:'';position:absolute;right:100%;top:50%;height:1.5px;width:var(--rh-lead);margin-top:-.75px;background:linear-gradient(90deg,var(--ink),rgba(233,230,221,.3))}
#rowhint::after{content:'';position:absolute;right:calc(100% + var(--rh-lead) - 4px);top:50%;width:10px;height:10px;margin-top:-5px;border-radius:50%;background:var(--ink);box-shadow:0 0 8px 2px rgba(233,230,221,.5);animation:rhpulse 1.7s ease-out infinite}
#rowhint span{font:13px/1.4 var(--mono);letter-spacing:.05em;color:var(--ink)}
#rowhint .rh-x{margin-left:2px;align-self:flex-start;color:var(--faint);font:14px var(--mono);line-height:1}
#rowhint .rh-x:hover{color:var(--ink)}
@keyframes rhpulse{0%{box-shadow:0 0 0 0 rgba(233,230,221,.5),0 0 8px 2px rgba(233,230,221,.5)}70%{box-shadow:0 0 0 11px rgba(233,230,221,0),0 0 8px 2px rgba(233,230,221,.5)}100%{box-shadow:0 0 0 0 rgba(233,230,221,0),0 0 8px 2px rgba(233,230,221,.5)}}
@keyframes rhin{from{opacity:0;transform:translateX(-5px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){#rowhint .rh-dot{animation:none}#rowhint.on{animation:none}}
.viewbar .viewlink:hover{color:var(--ink);background:rgba(233,230,221,.035)}
.viewbar button:focus-visible{outline:1px dashed var(--ink);outline-offset:2px}
.viewbar .viewlink.on{color:var(--ink)}
.viewbar .viewlink.on::before{background:var(--ink)}
/* suggest-a-category form */
.sugform{margin-top:30px;max-width:560px;display:flex;flex-direction:column;gap:16px}
.sugform label{display:block;margin-bottom:7px;font:10px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}
.sugform label em{font-style:normal;text-transform:none;letter-spacing:.04em}
.sugform input,.sugform textarea{width:100%;background:var(--panel);border:1px solid var(--hair2);color:var(--ink);font:15px/1.5 var(--serif);padding:12px 14px;border-radius:2px}
.sugform textarea{min-height:96px;resize:vertical}
.sugform input:focus,.sugform textarea:focus{outline:1px dashed var(--dim);outline-offset:2px}
.sugbtn{align-self:flex-start;background:none;border:1px solid var(--dim);color:var(--ink);font:11px var(--mono);letter-spacing:.14em;text-transform:uppercase;padding:11px 22px;cursor:pointer}
.sugbtn:hover{border-color:var(--ink)}
.sugbtn:disabled{opacity:.5;cursor:default}
.sugstatus{font:12px var(--mono);color:var(--dim);min-height:18px}
@media(max-width:720px){
  body.nav-ready::before{height:70px}
  /* Span the whole top edge instead of a 300px left-aligned box, so the five
     tabs share the full width and "Model map" stops truncating to "Mode…". */
  .viewbar{left:12px;right:12px;top:14px;width:auto}
  /* Trim the logo's footprint so the tabs get the room, not the mark. */
  .viewbar .viewlogo{width:34px;margin-right:2px}
  /* Five tabs + logo at 390px: font/padding nudged down from the four-tab
     values so "Model map" and "Research" both fit without ellipsizing. */
  .viewbar .viewlink{width:auto;flex:1;font-size:11.5px;padding:0 2px}
  section.view{padding-top:82px}
}
@media (prefers-reduced-motion:reduce){.viewbar,.viewbar.show{transition:none}}
.quizgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:18px 34px;margin-top:26px;max-width:1100px}
.qz .qz-l{font:10px var(--mono);letter-spacing:.2em;text-transform:uppercase;color:var(--faint)}
.qz input{display:block;width:100%;background:none;border:none;border-bottom:1px solid var(--hair);color:var(--ink);
  font-family:var(--serif);font-size:16.5px;padding:7px 0 6px;outline:none}
.qz input.why{font-size:12.5px;font-family:var(--sans);color:var(--dim);margin-top:2px}
.qz input:focus{border-bottom-color:var(--dim)}
.qz input::placeholder{color:var(--faint);font-style:italic}
.quiz-go{margin-top:30px}
.verdict{margin-top:44px;border-top:1px solid var(--hair);padding-top:30px;display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,420px);gap:44px;align-items:start}
@media(max-width:900px){.verdict{grid-template-columns:1fr}}
.verdict .v-pre{font:10.5px var(--mono);letter-spacing:.26em;text-transform:uppercase;color:var(--faint)}
.verdict .v-name{font-family:var(--serif);font-size:clamp(30px,3.9vw,46px);margin-top:10px}
.verdict .v-name i{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;font:12px var(--mono);font-weight:700;color:var(--night);font-style:normal;vertical-align:8px;margin-right:12px}
.verdict .v-persona{font-family:var(--serif);font-style:italic;font-size:18px;color:var(--dim);margin-top:6px}
.verdict .v-note{font-size:13px;color:var(--dim);margin-top:16px;max-width:34em;line-height:1.6}
.vbars{margin-top:22px;max-width:380px}
.vbar{display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:center;padding:3px 0}
.vbar span{font:10.5px var(--mono);color:var(--dim);text-align:right}
.vbar .t{height:3px;background:var(--hair2)}
.vbar .t i{display:block;height:100%}
.vmap{border:1px solid var(--hair2);border-radius:4px;background:var(--panel)}
.vmap svg{display:block;width:100%;height:auto}
.vmap-cap{font-size:11px;color:var(--faint);padding:10px 12px;border-top:1px solid var(--hair2)}
.youdot{fill:none;stroke:var(--ink);stroke-width:1.5}
.youlab{font:10px var(--mono);letter-spacing:.14em;fill:var(--ink);text-anchor:middle}
#tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--night);font:12px var(--sans);padding:6px 10px;border-radius:2px;max-width:320px;opacity:0;z-index:9}

/* The expandable model roster in Methodology. */
.mro{margin-top:34px;max-width:820px}
.mro-groups{display:flex;flex-wrap:wrap;gap:22px clamp(20px,3vw,40px)}
.mro-fam{flex:0 0 auto;display:flex;flex-direction:column;gap:6px}
.mro-head{font:10px var(--mono);letter-spacing:.2em;text-transform:uppercase;margin-bottom:10px;white-space:nowrap}
.mro-cc{color:var(--faint);font-size:9px;letter-spacing:.14em}
.mro-m{display:flex;align-items:center;gap:9px;height:26px;opacity:0;transform:translateY(4px);transition:opacity .4s ease,transform .4s ease}
.mro-dotwrap{width:16px;flex:none;display:flex;align-items:center;justify-content:center}
.mro-dot{display:block;border-radius:50%}
.mro-nm{font-family:var(--serif);font-size:14px;line-height:1.2;white-space:nowrap}
.mro.inview .mro-m{opacity:1;transform:none;transition-delay:calc(var(--i) * 45ms)}
@media (prefers-reduced-motion:reduce){.mro-m{transition:none}}
.mro-legend{display:flex;align-items:center;gap:6px;margin-top:28px;font:9.5px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
.mro-ldot{display:inline-block;border-radius:50%;background:var(--dim)}
.mro-legend span{margin-left:4px}
@media(max-width:720px){.mro-groups{flex-direction:column;gap:20px}.mro-head{margin-bottom:6px}}

.mfine{margin-top:40px;border-top:1px solid var(--hair2);padding-top:24px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px clamp(24px,3vw,56px);max-width:1100px}
@media(max-width:760px){.mfine{grid-template-columns:1fr}}
.mfine h4{font:9.5px var(--mono);letter-spacing:.24em;text-transform:uppercase;color:var(--faint);font-weight:400}
.mfine p{font-size:12.5px;line-height:1.65;color:var(--dim);margin-top:6px;text-wrap:pretty}

/* Research tab — "The Ghost Still Loves Kyoto" (all classes rs- prefixed).
   Prose caps at 720px for a readable column; figures may run the section's
   full 880px and get their own overflow-x:auto scroller for narrow phones so
   only the figure scrolls, never the page. */
#research{max-width:880px;margin-inline:auto}
.rs-kicker{max-width:720px;font:10.5px var(--mono);letter-spacing:.3em;text-transform:uppercase;color:var(--faint)}
.rs-title{max-width:720px;font-family:var(--serif);font-weight:400;font-size:clamp(28px,4.2vw,42px);line-height:1.14;margin-top:14px;text-wrap:balance}
.rs-standfirst{max-width:720px;font-family:var(--serif);font-size:clamp(16px,1.9vw,19px);line-height:1.55;color:var(--dim);margin-top:18px;text-wrap:pretty}
.rs-crosshead{max-width:720px;font-family:var(--serif);font-weight:400;font-size:clamp(16px,1.7vw,19px);color:var(--ink);margin-top:52px;padding-top:18px;border-top:1px solid var(--hair2)}
.rs-crosshead:first-of-type{margin-top:46px}
.rs-fine-head{margin-top:44px}
.rs-p{max-width:720px;color:var(--dim);font-size:14.5px;line-height:1.72;margin-top:16px;text-wrap:pretty}
.rs-fine{max-width:720px;color:var(--faint);font-size:12px;line-height:1.65;margin-top:12px;text-wrap:pretty}
.rs-link{color:var(--dim);text-decoration:underline;text-decoration-color:var(--hair)}
.rs-link:hover{color:var(--ink);text-decoration-color:var(--dim)}
.rs-link:focus-visible{outline:1px dashed var(--ink);outline-offset:2px}

.rs-art{max-width:880px;margin:0 auto}
.rs-fig{margin-top:34px;max-width:880px}
.rs-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
.rs-cap{max-width:720px;font-size:12px;color:var(--faint);margin-top:10px;line-height:1.55}

/* figure 1 — the axis */
.rs-axfig{display:block;width:100%;min-width:640px;height:auto}
.rs-ax-line{stroke:var(--hair);stroke-width:1}
.rs-ax-end{font:10px var(--mono);letter-spacing:.22em;fill:var(--faint)}
.rs-ax-tick{fill:var(--faint);opacity:.55}
.rs-ax-stem{stroke:var(--hair);stroke-width:1}
.rs-ax-dot{fill:var(--ink);filter:drop-shadow(0 0 5px rgba(233,230,221,.6))}
.rs-ax-lab{font:9.5px var(--mono);letter-spacing:.05em;text-transform:lowercase;fill:var(--ink)}
@media(max-width:640px){.rs-ax-lab,.rs-ax-end{font-size:13px}}

/* figure 2 — dose-response */
.rs-drfig{display:block;width:100%;min-width:540px;height:auto}
.rs-dr-grid line{stroke:var(--hair2);stroke-width:1}
.rs-dr-grid text{font:9px var(--mono);fill:var(--faint)}
.rs-dr-axis{stroke:var(--hair);stroke-width:1}
.rs-dr-xlab{font:9px var(--mono);fill:var(--dim);letter-spacing:.02em;text-transform:lowercase}
.rs-dr-floor{fill:var(--hair)}
.rs-dr-floorlab{font:8.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;fill:var(--faint)}
.rs-dr-line{fill:none;stroke-width:1.6}
.rs-dr-high{stroke:var(--ink)}
.rs-dr-low{stroke:var(--dim);stroke-dasharray:3 3}
.rs-dr-dot{stroke:none}
.rs-dr-dot-high{fill:var(--ink)}
.rs-dr-dot-low{fill:var(--dim)}
.rs-dr-peak{fill:none;stroke:var(--ink);stroke-width:1.2;opacity:.55}
@media(max-width:640px){.rs-dr-xlab,.rs-dr-grid text,.rs-dr-floorlab{font-size:12px}}
.rs-dr-legend{max-width:720px;display:flex;flex-wrap:wrap;gap:16px 24px;margin-top:12px;font:11px var(--mono);color:var(--dim)}
.rs-dr-leg{display:inline-flex;align-items:center;gap:7px}
.rs-dr-leg i{display:inline-block;width:14px;height:2px;background:var(--dim)}
.rs-dr-leg-high i{background:var(--ink)}
.rs-dr-leg-low i{background:none;border-top:1px dashed var(--dim);height:0}

/* protocol strip: the 8 system prompts as mono chips in axis order */
.rs-proto{max-width:880px;margin-top:22px}
.rs-proto-chips{display:flex;flex-wrap:wrap;gap:8px;padding-bottom:4px}
@media(max-width:640px){.rs-proto-chips{flex-wrap:nowrap;width:max-content}}
.rs-proto-chip{flex:none;font:11px var(--mono);letter-spacing:.02em;color:var(--dim);border:1px solid var(--hair);border-radius:2px;padding:7px 11px;white-space:nowrap;background:var(--panel)}

/* survival strip: Autumn/Petrichor/Kyoto under the ghost persona */
.rs-surv{max-width:720px;margin-top:30px;display:flex;flex-direction:column;gap:10px}
.rs-surv-row{display:grid;grid-template-columns:76px 1fr 40px;align-items:center;gap:10px}
.rs-surv-label{font:14px var(--serif);color:var(--dim)}
.rs-surv-cells{display:flex;flex-wrap:wrap;gap:3px}
.rs-surv-cell{display:inline-block;width:11px;height:11px;border:1px solid var(--hair);border-radius:1px;background:none}
.rs-surv-cell.rs-surv-on{background:var(--ink);border-color:var(--ink)}
.rs-surv-count{font:11px var(--mono);color:var(--faint);text-align:right}
.rs-surv-note{max-width:720px;font-size:11.5px;color:var(--faint);margin-top:2px}

/* pull quote */
.rs-pull{max-width:640px;margin-top:32px;padding-left:20px;border-left:1px solid var(--hair)}
.rs-pull-text{font-family:var(--serif);font-style:italic;font-size:clamp(17px,2.1vw,21px);line-height:1.5;color:var(--ink)}
.rs-pull-att{font:10.5px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--faint);margin-top:10px}

/* scattered-city chips (One basin, not two) */
.rs-citychips{max-width:720px;display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.rs-citychip{font:11px var(--mono);color:var(--faint);border:1px solid var(--hair2);border-radius:2px;padding:3px 8px}

/* figure A — three hypothesis cards (Costume / Bedrock / Basin) */
.rs-hyp{max-width:880px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:26px}
@media(max-width:760px){.rs-hyp{grid-template-columns:1fr}}
.rs-hyp-card{border:1px solid var(--hair2);border-radius:2px;padding:18px 18px 20px}
.rs-hyp-name{font-family:var(--serif);font-size:16px;color:var(--ink)}
.rs-hypfig{display:block;width:100%;height:auto;margin-top:12px}
.rs-hyp-axis{stroke:var(--hair);stroke-width:1}
.rs-hyp-curve{fill:none;stroke:var(--ink);stroke-width:1.6}
.rs-hyp-text{font-size:12.5px;color:var(--dim);line-height:1.6;margin-top:12px;text-wrap:pretty}

/* figures B/D — the potential-landscape diagram (unresolved / resolved) */
.rs-lsfig{display:block;width:100%;min-width:640px;height:auto}
.rs-ls-end{font:10px var(--mono);letter-spacing:.22em;fill:var(--faint)}
.rs-ls-known{fill:none;stroke:var(--ink);stroke-width:1.4}
.rs-ls-bare{fill:none;stroke:var(--hair);stroke-width:1.4}
.rs-ls-alt1{fill:none;stroke:var(--dim);stroke-width:1.2;stroke-dasharray:5 4}
.rs-ls-alt2{fill:none;stroke:var(--faint);stroke-width:1.2;stroke-dasharray:2 3}
.rs-ls-dot{fill:var(--ink)}
.rs-ls-dot-scatter{fill:var(--dim)}
.rs-ls-lab{font:9.5px var(--mono);letter-spacing:.03em;fill:var(--dim)}
.rs-ls-lab-alt{font:9.5px var(--mono);letter-spacing:.03em;fill:var(--faint)}
@media(max-width:640px){.rs-ls-end,.rs-ls-lab,.rs-ls-lab-alt{font-size:12px}}

/* figure C — protocol flow strip (SYSTEM → PROBE → samples → displacement) */
.rs-flow{max-width:880px;display:flex;align-items:stretch;gap:10px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
.rs-flow-box{flex:1 1 180px;min-width:168px;border:1px solid var(--hair);border-radius:2px;padding:14px 16px;background:var(--panel)}
.rs-flow-kicker{font:9.5px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)}
.rs-flow-content{font-family:var(--serif);font-size:14px;color:var(--ink);margin-top:8px;line-height:1.4}
.rs-flow-arrow{align-self:center;flex:none;color:var(--faint);font:16px var(--mono)}
/* Findings, linked essays and model profiles share the site's editorial rhythm. */
.eyebrow{display:block;font:11px/1.5 var(--mono);letter-spacing:.13em;text-transform:uppercase;color:var(--dim)}
.findings-head{max-width:850px;margin-bottom:44px}
.findings-head h1{font:400 clamp(38px,5vw,64px)/1.08 var(--serif);margin:14px 0 22px;letter-spacing:-.025em}
.map-intro h2{font:400 28px/1.2 var(--serif)}
.finding-note{font:15px/1.6 var(--serif);color:var(--dim);max-width:780px;margin:12px 0}
.finding-card{text-decoration:none;color:inherit;display:block;border-radius:4px}
.finding-card .cc{height:100%;transition:border-color .2s}
.finding-card:hover .cc{border-color:var(--dim)}
.finding-card .cc-name{font-size:19px}
.finding-card .cc-n{font:13px/1.5 var(--serif);margin-top:4px}
.finding-card .cc-dom{color:var(--dim);line-height:1.5}
.article-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px 56px;max-width:1160px;margin:24px 0}
.article-link{display:flex;flex-direction:column;align-items:flex-start;padding:28px 0;border-top:1px solid var(--hair);text-decoration:none;color:var(--ink)}
.article-link h2{font:400 clamp(26px,3vw,32px)/1.2 var(--serif);margin:0 0 18px;text-wrap:balance}
.article-link p{font:18px/1.6 var(--serif);color:var(--dim);max-width:36em;margin-bottom:24px}
.article-link>.text-link{margin-top:auto}
.article-link:hover{border-top-color:var(--dim)}
.article-link:hover h2{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px}
.article-back{display:inline-block;margin-bottom:34px}
.article-canon{margin-top:28px;grid-template-columns:repeat(3,minmax(0,1fr))}
.article-takeaway{border-top:1px solid var(--hair);border-bottom:1px solid var(--hair);padding:24px 0;margin:32px 0;max-width:720px;font:21px/1.6 var(--serif)}
.article-takeaway>.eyebrow{margin-bottom:12px}
.article-takeaway .rs-surv{margin-top:20px}
.article-takeaway .rs-surv-label{font-size:18px}
.article-takeaway .rs-surv-count{font:16px var(--serif);color:var(--ink)}
.article-actions{display:flex;gap:20px 30px;flex-wrap:wrap;margin:28px 0}
.article-details,.profile-details,.vocabulary-map{border-top:1px solid var(--hair);padding:18px 0;margin-top:28px}
.article-details summary,.profile-details summary,.vocabulary-map summary{font:18px/1.5 var(--serif);cursor:pointer;color:var(--ink)}
.article-details p{font:16px/1.65 var(--serif);color:var(--dim);margin:16px 0;max-width:720px}
.article-details a{color:var(--ink);text-underline-offset:3px}
.rs-art>p:not([class]){font:18px/1.7 var(--serif);max-width:720px;color:var(--dim)}
.rs-art .rs-crosshead{font-size:26px}
.persona-protocol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0;margin:26px 0;max-width:720px;counter-reset:protocol}
.persona-protocol span{font:17px/1.5 var(--serif);padding:18px;border:1px solid var(--hair);counter-increment:protocol}
.persona-protocol span::before{content:'0' counter(protocol);display:block;font:11px var(--mono);color:var(--dim);margin-bottom:10px}
.article-chart{max-width:720px;margin-top:24px}
.article-chart figcaption{padding:18px 0;color:var(--dim);font:14px/1.6 var(--serif);margin-top:20px}
.persona-chart-key{display:flex;gap:12px 24px;flex-wrap:wrap;font:14px/1.5 var(--serif);margin-bottom:26px}
.persona-chart-key span::before{content:'';display:inline-block;width:14px;height:7px;margin-right:7px;background:currentColor}
.persona-high{color:rgb(110,209,145)}
.persona-low{color:#c7b7dc}
.persona-scale{display:flex;justify-content:space-between;margin-left:140px;margin-right:42px;font:12px var(--mono);color:var(--dim)}
.persona-row{display:grid;grid-template-columns:126px minmax(0,1fr);gap:14px;align-items:center;margin:16px 0;font:15px/1.3 var(--serif)}
.persona-bars{padding-right:42px;background:linear-gradient(90deg,var(--hair2) 1px,transparent 1px);background-size:calc((100% - 42px)/2) 100%}
.persona-bars>div{height:19px;position:relative;display:flex;align-items:center}
.persona-bars i{height:6px;background:currentColor;display:block}
.persona-bars b{position:absolute;left:100%;margin-left:8px;font:12px var(--mono);font-weight:400;color:var(--dim)}
.model-picker{display:flex;align-items:center;gap:16px;margin:30px 0 34px;flex-wrap:wrap}
.model-picker label,.model-comparison label{font:14px var(--serif);color:var(--dim)}
.model-picker select,.model-comparison select{font:18px var(--serif);background:var(--panel);color:var(--ink);border:1px solid var(--hair);padding:12px 32px 12px 12px;border-radius:3px;min-height:46px;max-width:100%}
.model-picker .text-link{margin-left:auto}
.models-layout{display:grid;grid-template-columns:minmax(0,1.85fr) minmax(280px,1fr);gap:clamp(32px,5vw,76px);align-items:start}
.model-profile.dossier{border:0;padding:0;min-width:0}
.model-profile .dname{font-size:34px;font-weight:400;margin:10px 0}
.profile-heading{font:400 23px/1.3 var(--serif);margin-top:32px}
.profile-picks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:20px}
.profile-picks a{display:block;color:var(--ink);text-decoration:none;border-top:1px solid var(--hair);padding-top:16px}
.profile-picks h4{font:400 22px/1.25 var(--serif);margin:10px 0;overflow-wrap:anywhere}
.profile-picks .key-favorite{font:15px/1.6 var(--serif)}
.profile-picks small{display:block;font:13px/1.5 var(--serif);color:var(--dim);margin-top:8px}
.model-profile blockquote{font:19px/1.7 var(--serif);padding-left:18px;border-left:1px solid var(--hair);max-width:40em}
.profile-details p{margin-top:12px}
.profile-details .fitem{text-decoration:none;padding:9px 0}
.profile-details .fval b{font-size:16px}
.model-comparison{border-left:1px solid var(--hair);padding-left:28px;min-width:0}
.model-comparison h2{font:400 25px/1.3 var(--serif);margin-bottom:22px}
.model-comparison label{display:block;margin-bottom:8px}
.model-comparison select{width:100%;font-size:16px}
.overlap-score{display:flex;gap:18px;align-items:center;margin:28px 0 10px}
.overlap-score strong{font:400 46px/1 var(--serif)}
.overlap-score span{font:14px/1.5 var(--serif);color:var(--dim)}
.comparison-examples a{display:block;color:var(--ink);text-decoration:none;padding:18px 0;border-bottom:1px solid var(--hair2)}
.comparison-examples p{font:17px/1.4 var(--serif);margin-top:12px}
.comparison-examples p span{display:block;font:13px/1.5 var(--serif);color:var(--dim);margin-top:3px}
.model-comparison>.text-link{display:inline-block;margin-top:20px}
.map-intro{max-width:680px;margin:26px 0}
.map-intro p{font:17px/1.7 var(--serif);color:var(--dim);margin-top:12px}
.map-layout{display:grid;grid-template-columns:minmax(0,640px) minmax(200px,400px);gap:40px;align-items:center}
.mnode .mname{opacity:0}
.mnode.sel .mname,.mnode:hover .mname,.mnode:focus .mname{opacity:1}
.mnode:focus{outline:none}
.mnode:focus .selring{stroke:var(--ink);stroke-width:2}
.cabdetail .profile-picks{grid-template-columns:1fr}
.cabdetail .dname{font:26px/1.3 var(--serif)}
.site-footer{display:none;border-top:1px solid var(--hair);padding-top:24px;margin-top:72px;gap:16px 28px;flex-wrap:wrap;font:14px/1.5 var(--serif);color:var(--dim)}
.nav-ready .site-footer{display:flex}
.site-footer span{margin-right:auto}
.site-footer a{color:var(--dim);text-underline-offset:4px}
a:focus-visible,select:focus-visible,summary:focus-visible{outline:1px solid var(--ink);outline-offset:4px}
@media(max-width:1000px){.profile-picks{grid-template-columns:1fr}.profile-picks h4{font-size:24px}.profile-picks a{padding:16px 0}.models-layout{grid-template-columns:minmax(0,1.3fr) minmax(260px,1fr)}}
@media(max-width:760px){
 .findings-head h1{font-size:clamp(32px,8vw,44px)}
 .article-list,.models-layout,.map-layout{grid-template-columns:1fr}
 .finding-card .cc-name{font-size:17px}.finding-card .cc-title{font-size:17px}.finding-card .cc-dom{font-size:9px;letter-spacing:.08em}
 .article-list{gap:8px}.findings-head{margin-bottom:28px}
 .article-canon{grid-template-columns:1fr}.article-canon .cc{display:grid;grid-template-columns:110px 1fr}.article-canon .cc-native,.article-canon .cc-img{aspect-ratio:1}.article-canon figcaption{justify-content:center;border-top:0}
 .model-picker{display:block}.model-picker label{display:block;margin-bottom:10px}.model-picker select{width:100%}.model-picker .text-link{display:inline-block;margin-top:12px}
 .models-layout{gap:40px}.model-comparison{border-left:0;border-top:1px solid var(--hair);padding:26px 0 0}.profile-picks{grid-template-columns:1fr}
 .persona-scale{margin-left:106px}.persona-row{grid-template-columns:92px minmax(0,1fr);font-size:13px}.persona-chart-key{font-size:13px}
 .article-takeaway{font-size:19px}.article-takeaway .rs-surv-cell{width:8px;height:8px}.article-takeaway .rs-surv-row{grid-template-columns:70px 1fr 40px;gap:6px}
 .persona-protocol{grid-template-columns:1fr}.site-footer span{width:100%}.map-layout{gap:4px}
}

`;

const JS = `
// Every load starts at the hero, full stop — the browser's own scroll-position
// restoration (on refresh, or navigating back) otherwise silently jumps
// scrollY to wherever it was last, which reads as pastMast and permanently
// retires the hero before the user ever sees it move.
if('scrollRestoration' in history)history.scrollRestoration='manual';
scrollTo({top:0,left:0,behavior:'instant'});
var D = JSON.parse(document.getElementById('data').textContent);
var FAMC = {a:'var(--fam-a)', o:'var(--fam-o)', g:'var(--fam-g)', d:'var(--fam-d)', k:'var(--fam-k)', x:'var(--fam-x)', z:'var(--fam-z)'};
var famOf = {Anthropic:'a', OpenAI:'o', Google:'g', DeepSeek:'d', Moonshot:'k', xAI:'x', Zhipu:'z'};
var BRANDS = ${JSON.stringify(BRAND_PATHS)};
var CAPABILITY_RANK = ${JSON.stringify(CAPABILITY_RANK)};
var COLOR_HEX = ${JSON.stringify(COLOR_HEX)};
var BLOGGER_ID = ${JSON.stringify(BLOGGER_ID)};
var TYPESTACK = ${JSON.stringify(TYPEFACE_STACK)};
function el(h){var t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstChild}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function normEnt(s){return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[\\u2019\\u2018]/g,"'").replace(/\\s+/g,' ').trim().replace(/^(The|A|An) /i,'').toLowerCase()}
function rawNorm(s){return String(s).replace(/[*"“”]/g,'').replace(/\\s+/g,' ').trim().replace(/^(the|a|an) /i,'').toLowerCase()}
// A subtitle earns its line only when it says something the title doesn't. The
// same test runs server-side on each raw pick, but it has to run again here:
// the row's title is the GROUP's canonical form, so "iPhone" (creator Apple)
// becomes "Apple iPhone" only at this point, and only now reads as an echo.
function subFold(s){return String(s).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9 ]/gi,' ').replace(/\\s+/g,' ').trim().toLowerCase()}
function subOK(e,c){if(!c)return false;var a=subFold(e),b=subFold(c);return !!a&&!!b&&a!==b&&a.indexOf(b+' ')!==0}
function canonEnt(domain,s){var m=D.aliases&&D.aliases[domain],mapped=(m&&m[rawNorm(s)])||s;return normEnt(mapped)}
var familyRuns=(function(){var runs=[];D.models.forEach(function(m){var last=runs[runs.length-1];if(last&&last.family===m.family)last.n++;else runs.push({family:m.family,n:1})});return runs})();

/* ---- ambient canon: slow architectural light ---- */
(function(){
  var canvas=document.getElementById('ambient');
  if(!canvas)return;
  var ctx=canvas.getContext('2d',{alpha:true}),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!ctx)return;
  var W=0,H=0,dpr=1,last=0,frame=0;
  function resize(){
    W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function architecture(t){
    var dx=Math.sin(t*.000035)*8,dy=Math.cos(t*.000027)*6;
    ctx.lineWidth=1;
    ctx.strokeStyle='rgba(233,230,221,.055)';
    ctx.beginPath();
    ctx.moveTo(W*.13+dx,H*.05);ctx.lineTo(W*.13+dx,H*.94);
    ctx.moveTo(W*.72-dx*.45,H*.08);ctx.lineTo(W*.72-dx*.45,H*.89);
    ctx.moveTo(W*.05,H*.73+dy);ctx.lineTo(W*.94,H*.73+dy);
    ctx.stroke();
    ctx.strokeStyle='rgba(233,230,221,.078)';
    ctx.strokeRect(W*.62+dx*.25,H*.16+dy*.2,W*.25,H*.42);
    ctx.beginPath();ctx.moveTo(W*.62+dx*.25,H*.37+dy*.2);ctx.lineTo(W*.87+dx*.25,H*.37+dy*.2);ctx.stroke();
  }
  var streamSvg=document.getElementById('study-streams'),streams=[],streamRect=null;
  function locateStreams(){
    streamRect=streamSvg?streamSvg.getBoundingClientRect():null;
  }
  if(streamSvg){
    streams=[].slice.call(streamSvg.querySelectorAll('.taste-stream')).map(function(path,i){
      var length=path.getTotalLength(),points=[];
      for(var j=0;j<=80;j++){var p=path.getPointAtLength(length*j/80);points.push([p.x,p.y])}
      return {points:points,count:+path.dataset.count,shared:path.classList.contains('taste-shared'),phase:i*.618};
    });
    locateStreams();
    addEventListener('scroll',locateStreams,{passive:true});
    addEventListener('resize',locateStreams,{passive:true});
  }
  function answers(t){
    if(reduce||!streamRect||streamRect.bottom<0||streamRect.top>H||!streamRect.width)return;
    var sx=streamRect.width/300,sy=streamRect.height/260;
    streams.forEach(function(route){
      // Each route carries its actual number of sampled answers per cycle.
      // Even spacing makes the more frequently chosen paths visibly busier.
      for(var j=0;j<route.count;j++){
        var u=((t/18000+route.phase+j/route.count)%1)*80;
        var k=Math.min(79,Math.floor(u)),f=u-k,a=route.points[k],b=route.points[k+1];
        var fade=Math.min(1,u/8,(80-u)/8);
        ctx.fillStyle=route.shared?'rgba(110,209,145,'+(.6*fade)+')':'rgba(233,230,221,'+(.36*fade)+')';
        ctx.beginPath();ctx.arc(streamRect.left+(a[0]+(b[0]-a[0])*f)*sx,streamRect.top+(a[1]+(b[1]-a[1])*f)*sy,1.6,0,Math.PI*2);ctx.fill();
      }
    });
  }
  function paint(t){
    ctx.clearRect(0,0,W,H);architecture(t);answers(t);
  }
  function tick(t){
    last=t;paint(t);frame=requestAnimationFrame(tick);
  }
  resize();
  var running=false,heroOn=true;
  // One driver for the animation loop: it runs only while the hero is on
  // screen, the tab is visible, and the user hasn't asked for reduced motion.
  function sync(){
    var want=heroOn&&!document.hidden&&!reduce;
    if(want&&!running){running=true;last=0;frame=requestAnimationFrame(tick)}
    else if(!want&&running){running=false;cancelAnimationFrame(frame)}
  }
  if(reduce)paint(18000);else sync();
  addEventListener('resize',function(){resize();if(reduce)paint(18000)},{passive:true});
  document.addEventListener('visibilitychange',sync);
  // Pause the ambient canvas once the overview leaves the screen.
  var hero=document.getElementById('home'),introOverview=document.getElementById('overview');
  if(hero&&'IntersectionObserver' in window){
    var vis={};
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){vis[en.target.id]=en.isIntersecting});
      heroOn=!!vis.home||!!vis.overview;
      locateStreams();
      canvas.classList.toggle('off',!heroOn);
      sync();
    },{threshold:0});
    io.observe(hero);
    io.observe(introOverview);
  }
})();

var tip=document.getElementById('tip');
document.addEventListener('mousemove',function(e){
  var t=e.target.closest('[data-tip]');
  if(!t){tip.style.opacity=0;return}
  tip.textContent=t.getAttribute('data-tip');tip.style.opacity=1;
  var x=e.clientX+14,y=e.clientY+14,r=tip.getBoundingClientRect();
  if(x+r.width>innerWidth-8)x=e.clientX-r.width-14;
  if(y+r.height>innerHeight-8)y=e.clientY-r.height-14;
  tip.style.left=x+'px';tip.style.top=y+'px';
});

/* cross-highlight: hovering any model reference dims everything else */
function wireHL(node,id){
  node.addEventListener('mouseenter',function(){
    document.documentElement.setAttribute('data-hl',id);
    document.querySelectorAll('[data-m="'+id+'"]').forEach(function(n){n.classList.add('hl')});
  });
  node.addEventListener('mouseleave',function(){
    document.documentElement.removeAttribute('data-hl');
    document.querySelectorAll('.hl').forEach(function(n){n.classList.remove('hl')});
  });
}

/* ---- 3D model map: models placed by their 3 principal vocabulary components,
   rotated by dragging, axes labelled by their pole words ---- */
(function(){
  var CX=320,CY=250,NS='http://www.w3.org/2000/svg';
  var svg=document.getElementById('mmap');
  if(!svg)return;
  function mk(tag,at,txt){var n=document.createElementNS(NS,tag);for(var k in at)n.setAttribute(k,at[k]);if(txt!=null)n.textContent=txt;return n}
  var pts=D.models.map(function(m){return {m:m,x:m.x,y:m.y,z:m.z}});
  var cx=0,cy=0,cz=0;pts.forEach(function(p){cx+=p.x;cy+=p.y;cz+=p.z});cx/=pts.length;cy/=pts.length;cz/=pts.length;
  var maxAbs=1e-6;pts.forEach(function(p){maxAbs=Math.max(maxAbs,Math.abs(p.x-cx),Math.abs(p.y-cy),Math.abs(p.z-cz))});
  var axisHalf=maxAbs*1.12, scale=176/axisHalf;
  var yaw=-0.62, pitch=-0.34;
  function rot(x,y,z){
    x-=cx;y-=cy;z-=cz;
    var cA=Math.cos(yaw),sA=Math.sin(yaw);
    var x1=x*cA+z*sA, z1=-x*sA+z*cA, y1=y;
    var cB=Math.cos(pitch),sB=Math.sin(pitch);
    return [x1, y1*cB-z1*sB, y1*sB+z1*cB];
  }
  function proj(x,y,z){var r=rot(x,y,z);return {sx:CX+r[0]*scale, sy:CY-r[1]*scale, d:r[2]};}
  function place(el,pr){
    var dx=pr.sx-CX,dy=pr.sy-CY,L=Math.hypot(dx,dy)||1;
    el.setAttribute('x',(pr.sx+dx/L*13).toFixed(1));
    el.setAttribute('y',(pr.sy+dy/L*13+3).toFixed(1));
    el.setAttribute('text-anchor', dx>4?'start':(dx<-4?'end':'middle'));
  }
  // three axis lines through the cloud centre, a pole label at each end
  var axesG=mk('g',{});svg.appendChild(axesG);
  var axisEls=D.axes.map(function(a){
    var line=mk('line',{'class':'axline'});
    var negL=mk('text',{'class':'axlab'},a.neg);
    var posL=mk('text',{'class':'axlab'},a.pos);
    negL.setAttribute('data-tip',a.neg+': '+a.negWords.slice(0,5).join(' \\u00b7 '));
    posL.setAttribute('data-tip',a.pos+': '+a.posWords.slice(0,5).join(' \\u00b7 '));
    axesG.appendChild(line);axesG.appendChild(negL);axesG.appendChild(posL);
    return {a:a,line:line,negL:negL,posL:posL};
  });
  var nodesG=mk('g',{});svg.appendChild(nodesG);
  var moved=false;
  var nodeEls=pts.map(function(p,i){
    var g=mk('g',{'class':'mnode',role:'button',tabindex:0,'aria-label':'Open '+p.m.label+' profile'});
    g.setAttribute('data-m',p.m.id);
    g.setAttribute('data-tip',p.m.label+' \\u00b7 '+p.m.persona+' \\u2014 open dossier');
    g.appendChild(mk('circle',{cx:0,cy:0,r:15,fill:'none','class':'selring'}));
    g.appendChild(mk('circle',{cx:0,cy:0,r:11,fill:FAMC[famOf[p.m.family]],stroke:'var(--night)','stroke-width':2.5,'class':'mdot'}));
    g.appendChild(mk('text',{x:0,y:-16,'class':'mname'},p.m.short));
    function choose(){openDossier(p.m.id,document.getElementById('mmdossier'));document.getElementById('model-select').focus({preventScroll:true});document.getElementById('modelmap').scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})}
    g.addEventListener('click',function(){if(!moved)choose()});
    g.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}});
    wireHL(g,p.m.id);
    nodesG.appendChild(g);
    return {p:p,g:g};
  });
  function render(){
    axisEls.forEach(function(ax){
      var k=ax.a.k;
      var negP=proj(k==='x'?cx-axisHalf:cx, k==='y'?cy-axisHalf:cy, k==='z'?cz-axisHalf:cz);
      var posP=proj(k==='x'?cx+axisHalf:cx, k==='y'?cy+axisHalf:cy, k==='z'?cz+axisHalf:cz);
      ax.line.setAttribute('x1',negP.sx.toFixed(1));ax.line.setAttribute('y1',negP.sy.toFixed(1));
      ax.line.setAttribute('x2',posP.sx.toFixed(1));ax.line.setAttribute('y2',posP.sy.toFixed(1));
      place(ax.negL,negP);place(ax.posL,posP);
    });
    nodeEls.slice().sort(function(a,b){return proj(a.p.x,a.p.y,a.p.z).d-proj(b.p.x,b.p.y,b.p.z).d}).forEach(function(ne){
      var pr=proj(ne.p.x,ne.p.y,ne.p.z), t=(pr.d/axisHalf+1)/2;
      ne.g.style.transform='translate('+pr.sx.toFixed(1)+'px,'+pr.sy.toFixed(1)+'px)';
      ne.g.style.opacity=(0.5+0.5*t).toFixed(2);
      ne.g.querySelector('.mdot').setAttribute('r',(9+t*4.5).toFixed(1));
      ne.g.querySelector('.selring').setAttribute('r',(13+t*4.5).toFixed(1));
      nodesG.appendChild(ne.g); // re-append near-last so nearer dots draw on top
    });
  }
  var dragging=false,downX=0,downY=0,yaw0=0,pitch0=0,interacted=false;
  svg.addEventListener('pointerdown',function(e){
    dragging=true;moved=false;interacted=true;downX=e.clientX;downY=e.clientY;yaw0=yaw;pitch0=pitch;
  });
  svg.addEventListener('pointermove',function(e){
    if(!dragging)return;
    var dx=e.clientX-downX,dy=e.clientY-downY;
    if(!moved&&Math.abs(dx)+Math.abs(dy)>4){moved=true;svg.classList.add('grabbing');try{svg.setPointerCapture(e.pointerId)}catch(_){}}
    if(!moved)return;
    yaw=yaw0+dx*0.01;
    pitch=Math.max(-1.35,Math.min(1.35,pitch0+dy*0.01));
    render();
  });
  function endDrag(e){dragging=false;svg.classList.remove('grabbing');try{svg.releasePointerCapture(e.pointerId)}catch(_){}}
  svg.addEventListener('pointerup',endDrag);
  svg.addEventListener('pointercancel',endDrag);
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.mmActivate=function(){render()};
  document.getElementById('map-reset').addEventListener('click',function(){yaw=-0.62;pitch=-0.34;render()});
  render();
  openDossier(D.models[0].id,document.getElementById('mmdossier'));
})();

/* ---- cabinet + dossier ---- */
var curDomain='book',curModel=(D.models.find(function(m){return m.id==='claude-fable-5-1'})||D.models[0]).id;
function closeCabinetDetail(){
  var detail=document.getElementById('cabdetail');
  detail.hidden=true;detail.innerHTML='';
  document.getElementById('drawerveil').hidden=true;
  document.querySelectorAll('.bo-cell.on').forEach(function(c){c.classList.remove('on')});
  document.querySelectorAll('.bo-col.sel').forEach(function(c){c.classList.remove('sel')});
}
// Fill the right-hand drawer. On phones, provide a reachable close control.
function openDrawer(html){
  var detail=document.getElementById('cabdetail');
  // Desktop retains the broad veil as its exit; the phone's narrow sliver
  // needs an explicit touch target inside the card as well.
  detail.innerHTML='<button type="button" class="drawer-mobile-close" aria-label="Close details">×</button><div class="cd-body">'+html+'</div>';
  detail.querySelector('.drawer-mobile-close').addEventListener('click',closeCabinetDetail);
  detail.hidden=false;
  detail.scrollTop=0;
  document.getElementById('drawerveil').hidden=false;
  // One shared entrance: the whole card rises in together. Double rAF so the
  // browser paints the start state before the transition class lands
  // (reduced-motion users get it instantly via CSS).
  var body=detail.querySelector('.cd-body');
  requestAnimationFrame(function(){requestAnimationFrame(function(){body.classList.add('cd-in')})});
}
function choiceDistribution(id,domainId,probe){
  var rows=(((D.responses[id]||{})[domainId]||{})[probe]||[]),map={};
  rows.forEach(function(r){
    var k=canonEnt(domainId,r.e);if(!map[k])map[k]={e:r.e,n:0,rows:[],creators:{},forms:{}};map[k].n++;map[k].rows.push(r);
    map[k].forms[r.e]=(map[k].forms[r.e]||0)+1;
    if(r.c)map[k].creators[r.c]=(map[k].creators[r.c]||0)+1;
  });
  Object.keys(map).forEach(function(k){var rec=map[k];rec.c=Object.keys(rec.creators).sort(function(a,b){return rec.creators[b]-rec.creators[a]})[0]||'';
    rec.e=Object.keys(rec.forms).sort(function(a,b){return rec.forms[b]-rec.forms[a]})[0]||rec.e});
  return {rows:rows,map:map,n:rows.length};
}
// Alternative index view. Average each model's named-answer distribution, so
// adaptive sample counts do not give more heavily sampled models more weight.
var indexMode='river',riverModel=null,riverChoice=null;
var riverData=null,riverResize=null,riverDrawFrame=0;
function riverPercent(n){return n>0&&n<.01?'<1%':Math.round(n*100)+'%'}
function riverDataset(){
  var data=indexChoices(curDomain),distributions={f:data.favD,o:data.ovrD};
  var counts={f:data.favD.filter(function(d){return d.n>0}).length,o:data.ovrD.filter(function(d){return d.n>0}).length};
  var available=D.models.filter(function(_,i){return data.favD[i].n||data.ovrD[i].n}).length;
  var selected=riverModel===null?-1:D.models.findIndex(function(m){return m.id===riverModel});
  var all=data.choices.map(function(rec){
    rec.rates={};rec.shares={};
    ['f','o'].forEach(function(probe){
      rec.rates[probe]=distributions[probe].map(function(dist){return dist.map[rec.k]?dist.map[rec.k].n/dist.n:0});
      rec.shares[probe]=selected<0?rec.rates[probe].reduce(function(a,b){return a+b},0)/Math.max(counts[probe],1):(distributions[probe][selected].n?rec.rates[probe][selected]:null);
    });
    var blogger=curDomain==='blogger'&&BLOGGER_ID[rec.k];
    rec.disp=blogger?blogger.name:rec.e;
    rec.sub=blogger?blogger.blog:(subOK(rec.disp,rec.c)?rec.c:'');
    return rec;
  });
  // Keep every choice in the grid's order, including when tracing one model.
  return {distributions:distributions,available:available,all:all,shown:all,selected:selected};
}
function renderIndex(){
  var river=indexMode==='river';
  document.getElementById('choicematrix').hidden=river;
  document.getElementById('riverindex').hidden=!river;
  var domain=D.domains.find(function(d){return d.id===curDomain});
  document.getElementById('index-field-title').textContent=domain.label;
  document.querySelectorAll('[data-index-mode]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.indexMode===indexMode))});
  if(river)renderRiver();else renderChoiceMatrices();
}
function renderRiver(focusSelector){
  if(typeof committed!=='undefined'&&committed&&document.getElementById('cabinet').classList.contains('active'))syncRoute('cabinet');
  riverData=riverDataset();
  var data=riverData,root=document.getElementById('riverindex');
  var previousRail=root.querySelector('.river-models'),railScroll=previousRail?previousRail.scrollTop:0;
  var families=[];
  D.models.forEach(function(m,mi){var group=families.find(function(g){return g.name===m.family});if(!group){group={name:m.family,items:[]};families.push(group)}group.items.push({m:m,mi:mi})});
  var mobileControls='<div class="river-mobile-controls"><div class="river-mobile-picker"><label for="river-mobile-model">Answers from</label><select id="river-mobile-model"><option value=""'+(data.selected<0?' selected':'')+'>All models</option>'+families.map(function(g){return '<optgroup label="'+esc(g.name)+'">'+g.items.map(function(item){var m=item.m,n=data.distributions.f[item.mi].n+data.distributions.o[item.mi].n;return '<option value="'+esc(m.id)+'"'+(riverModel===m.id?' selected':'')+(n?'':' disabled')+'>'+esc(m.label)+(n?'':' — no answers')+'</option>'}).join('')+'</optgroup>'}).join('')+'</select></div>'+(data.selected>=0?'<button type="button" class="text-link river-mobile-profile" id="river-mobile-profile">Profile</button>':'')+'</div>';
  root.innerHTML=
    '<div class="river-selection" id="river-selection" aria-live="polite"></div>'+
    (data.available?'<div class="river-keys">'+mobileControls+'<span class="river-choice-heading"><span>'+(data.selected<0?'Average share of answers':'Share of this model’s answers')+'</span><span class="river-legend"><span class="river-favorite">Favorite</span><span class="river-overrated">Overrated</span></span></span><span class="river-model-heading">Models by family</span></div><div class="river-stage" id="river-stage"><svg class="river-paths" id="river-paths" aria-hidden="true"></svg><ol class="river-choices">'+data.shown.map(function(r,i){return '<li><button type="button" class="river-choice" data-river-choice="'+i+'" aria-pressed="'+(riverChoice===r.k)+'"><span class="river-choice-line"><span class="river-choice-name">'+esc(r.disp)+'</span><span class="river-shares">'+['f','o'].map(function(probe){var label=probe==='f'?'Favorite':'Overrated',pct=r.shares[probe]===null?'—':riverPercent(r.shares[probe]);return '<span class="river-share '+(probe==='f'?'river-favorite':'river-overrated')+'" aria-label="'+label+': '+(r.shares[probe]===null?'no answers':esc(pct))+'" title="'+label+'">'+esc(pct)+'</span>'}).join('')+'</span></span>'+(r.sub?'<span class="river-sub">'+esc(r.sub)+'</span>':'')+'</button></li>'}).join('')+'</ol><div class="river-models">'+families.map(function(g){return '<div class="river-family"><span>'+esc(g.name)+'</span><div class="river-dots">'+g.items.map(function(item){var m=item.m,n=data.distributions.f[item.mi].n+data.distributions.o[item.mi].n;return '<button type="button" class="river-dot" style="--model-color:'+FAMC[famOf[m.family]]+'" data-river-model="'+item.mi+'" aria-label="'+esc(m.label)+(n?' · '+n+' named answers':' · no answers in this field')+'" title="'+esc(m.label)+(n?'':' — no data')+'" aria-pressed="'+(riverModel===m.id)+'"'+(n?'':' disabled')+'><i aria-hidden="true"></i></button>'}).join('')+'</div></div>'}).join('')+'</div></div>':'<p class="river-empty">No named answers are available in this field yet.</p>')+
    '<div class="river-footer"><span id="river-hover"></span></div>';

  var mobileSelect=root.querySelector('#river-mobile-model');
  if(mobileSelect)mobileSelect.addEventListener('change',function(){riverModel=this.value||null;riverChoice=null;renderRiver('#river-mobile-model')});
  var mobileProfile=root.querySelector('#river-mobile-profile');
  if(mobileProfile)mobileProfile.addEventListener('click',function(){openModelDossierInIndex(riverModel)});
  root.querySelectorAll('[data-river-model]').forEach(function(b){
    var mi=+b.dataset.riverModel;
    b.addEventListener('click',function(){riverModel=riverModel===D.models[mi].id?null:D.models[mi].id;riverChoice=null;renderRiver('[data-river-model="'+mi+'"]')});
    function highlight(){if(b.disabled)return;highlightRiver(mi,null);document.getElementById('river-hover').textContent=D.models[mi].label+' · '+(data.distributions.f[mi].n+data.distributions.o[mi].n)+' named answers'}
    b.addEventListener('mouseenter',highlight);b.addEventListener('focus',highlight);
    b.addEventListener('mouseleave',restoreRiver);b.addEventListener('blur',restoreRiver);
  });
  root.querySelectorAll('[data-river-choice]').forEach(function(b){
    var i=+b.dataset.riverChoice,r=data.shown[i];
    b.addEventListener('click',function(){
      riverChoice=r.k;renderRiver('[data-river-choice="'+i+'"]');
      openEntityCard(curDomain,r.e,r.sub,r.disp);
    });
    function highlight(){highlightRiver(data.selected>=0?data.selected:null,i)}
    b.addEventListener('mouseenter',highlight);b.addEventListener('focus',highlight);
    b.addEventListener('mouseleave',restoreRiver);b.addEventListener('blur',restoreRiver);
  });
  renderRiverSelection();
  restoreRiver();
  var rail=root.querySelector('.river-models');if(rail)rail.scrollTop=railScroll;
  if(focusSelector){var focus=document.querySelector(focusSelector);if(focus)focus.focus({preventScroll:true})}
  if(!riverResize&&'ResizeObserver' in window)riverResize=new ResizeObserver(scheduleRiver);
  if(riverResize){riverResize.disconnect();var stage=document.getElementById('river-stage');if(stage)riverResize.observe(stage)}
  scheduleRiver();
}
function renderRiverSelection(){
  var data=riverData,box=document.getElementById('river-selection');
  var model=data.selected>=0?D.models[data.selected]:null;
  var choice=data.all.find(function(r){return r.k===riverChoice});
  box.hidden=!model&&!choice;
  if(box.hidden){box.innerHTML='';return}
  var title=choice?choice.disp:model.label;
  var note=choice?(model?model.label:choice.models+' '+(choice.models===1?'model named':'models named')+' this choice'):model?(data.distributions.f[data.selected].n+data.distributions.o[data.selected].n)+' named answers':'';
  var actions=choice?(model?['f','o'].filter(function(probe){return choice.rates[probe][data.selected]>0}).map(function(probe){return '<button type="button" class="text-link '+(probe==='f'?'river-favorite':'river-overrated')+'" data-river-answer="'+probe+'">'+(probe==='f'?'Read favorite answers':'Read overrated answers')+'</button>'}).join(''):'<button type="button" class="text-link" id="river-detail">Explore this choice</button>'):model?'<button type="button" class="text-link" id="river-profile">Model profile</button>':'';
  box.innerHTML='<div><span class="river-selection-title">'+esc(title)+'</span>'+(note?'<span class="river-selection-note">'+esc(note)+'</span>':'')+'</div><div class="river-selection-actions">'+actions+((model||choice)?'<button type="button" class="text-link" id="river-clear">Clear selection</button>':'')+'</div>';
  box.querySelectorAll('[data-river-answer]').forEach(function(b){b.addEventListener('click',function(){var probe=b.dataset.riverAnswer;openCabinetDetail(model.id,choice.e,Math.round(choice.rates[probe][data.selected]*100),curDomain,probe)})});
  var detail=document.getElementById('river-detail');
  if(detail)detail.addEventListener('click',function(){openEntityCard(curDomain,choice.e,choice.sub,choice.disp)});
  var profile=document.getElementById('river-profile');if(profile)profile.addEventListener('click',function(){openModelDossierInIndex(model.id)});
  var clear=document.getElementById('river-clear');if(clear)clear.addEventListener('click',function(){riverModel=null;riverChoice=null;renderRiver('[data-index-mode="river"]')});
}
function scheduleRiver(){
  if(indexMode!=='river'||!document.getElementById('cabinet').classList.contains('active')||riverDrawFrame)return;
  riverDrawFrame=requestAnimationFrame(function(){riverDrawFrame=0;drawRiver()});
}
function drawRiver(){
  var stage=document.getElementById('river-stage'),svg=document.getElementById('river-paths');
  if(indexMode!=='river'||!stage||!svg)return;
  var rect=stage.getBoundingClientRect();if(!rect.width)return;
  var rail=stage.querySelector('.river-models'),railRect=rail.getBoundingClientRect();
  if(!railRect.width)return; // Mobile uses the model selector and full-width list.
  // Read each endpoint once. Sticky positioning and the rail's own scrolling
  // can move the dots without changing the stage's size.
  var starts=D.models.map(function(_,mi){
    var r=stage.querySelector('[data-river-model="'+mi+'"]').getBoundingClientRect();
    var y=r.top+r.height/2;
    return {x:r.left-rect.left+r.width/2,y:y-rect.top,visible:y>=railRect.top&&y<=railRect.bottom};
  });
  var ends=riverData.shown.map(function(_,ci){
    var r=stage.querySelector('[data-river-choice="'+ci+'"]').getBoundingClientRect();
    return {x:r.right-rect.left,y:r.top-rect.top+r.height/2};
  });
  var links=[];
  riverData.shown.forEach(function(choice,ci){
    D.models.forEach(function(_,mi){
      var rate=(choice.rates.f[mi]+choice.rates.o[mi])/2;if(!rate)return;
      var start=starts[mi],end=ends[ci],control=start.x+(end.x-start.x)*.5;
      links.push({mi:mi,ci:ci,rate:rate,visible:start.visible,d:'M'+start.x+' '+start.y+' C'+control+' '+start.y+' '+control+' '+end.y+' '+end.x+' '+end.y});
    });
  });
  svg.setAttribute('viewBox','0 0 '+rect.width+' '+rect.height);
  var fresh=svg.children.length!==links.length;
  if(fresh)svg.innerHTML=links.map(function(link){return '<path data-source="'+link.mi+'" data-choice="'+link.ci+'" style="stroke:'+FAMC[famOf[D.models[link.mi].family]]+';stroke-width:'+(0.6+link.rate*1.7)+'"/>'}).join('');
  links.forEach(function(link,i){var path=svg.children[i];path.setAttribute('d',link.d);path.style.display=link.visible?'':'none'});
  // Scrolling only moves existing paths, preserving hover/selection highlights.
  if(fresh)restoreRiver();
}
function highlightRiver(mi,ci){
  var root=document.getElementById('riverindex');if(!riverData||!root)return;
  var active=mi!==null||ci!==null;
  root.querySelectorAll('.river-paths path').forEach(function(p){var on=(mi===null||+p.dataset.source===mi)&&(ci===null||+p.dataset.choice===ci);p.classList.toggle('river-lit',active&&on);p.classList.toggle('river-dim',active&&!on)});
  root.querySelectorAll('[data-river-model]').forEach(function(b){var i=+b.dataset.riverModel,on=mi!==null?i===mi:ci!==null?(riverData.shown[ci].rates.f[i]+riverData.shown[ci].rates.o[i])>0:true;b.classList.toggle('river-muted',active&&!on)});
  root.querySelectorAll('[data-river-choice]').forEach(function(b){var i=+b.dataset.riverChoice,on=ci!==null?i===ci:mi!==null?(riverData.shown[i].rates.f[mi]+riverData.shown[i].rates.o[mi])>0:true;b.classList.toggle('river-muted',active&&!on)});
}
function restoreRiver(){
  if(!riverData)return;
  var ci=riverData.shown.findIndex(function(r){return r.k===riverChoice});
  highlightRiver(riverData.selected<0?null:riverData.selected,ci<0?null:ci);
  var hover=document.getElementById('river-hover');if(hover)hover.textContent=riverData.available+' of '+D.models.length+' models · named answers only · each model weighted equally.';
}
document.querySelectorAll('[data-index-mode]').forEach(function(b){b.addEventListener('click',function(){indexMode=b.dataset.indexMode;closeCabinetDetail();if(typeof endRowHint==='function')endRowHint();renderIndex()})});
addEventListener('resize',scheduleRiver,{passive:true});
addEventListener('scroll',scheduleRiver,{passive:true,capture:true});

function indexChoices(domainId){
  var favD=D.models.map(function(m){return choiceDistribution(m.id,domainId,'f')});
  var ovrD=D.models.map(function(m){return choiceDistribution(m.id,domainId,'o')});
  var entities={};
  [favD,ovrD].forEach(function(distributions){
    distributions.forEach(function(dist,mi){Object.keys(dist.map).forEach(function(k){
      if(!entities[k])entities[k]={k:k,e:dist.map[k].e,c:dist.map[k].c,models:0,total:0,forms:{}};
      var rec=entities[k];
      Object.keys(dist.map[k].forms).forEach(function(f){rec.forms[f]=(rec.forms[f]||0)+dist.map[k].forms[f]});
      if(!rec.c&&dist.map[k].c)rec.c=dist.map[k].c;
      rec.total+=dist.map[k].n;
    })});
  });
  // Per (entity, model) net sentiment, computed once and reused for both the
  // sort order and the cell fill — so the row order always matches what the
  // colours show, never a separately-tallied number.
  Object.keys(entities).forEach(function(k){
    var n=0,scoreSum=0,cells=[];
    D.models.forEach(function(m,mi){
      var favRec=favD[mi].map[k],ovrRec=ovrD[mi].map[k];
      if(!favRec&&!ovrRec){cells.push(null);return}
      n++;
      var favPct=favRec?Math.round(100*favRec.n/Math.max(favD[mi].n,1)):0;
      var ovrPct=ovrRec?Math.round(100*ovrRec.n/Math.max(ovrD[mi].n,1)):0;
      scoreSum+=(favPct-ovrPct);
      cells.push({favPct:favPct,ovrPct:ovrPct});
    });
    entities[k].models=n;
    entities[k].avgScore=n?scoreSum/n:0;
    // Rank by the RAW SUM of per-model net sentiment, not the average. This is
    // "total agreement": every model that weighs in adds its (favourite% −
    // overrated%), so many models agreeing pushes an entry to an extreme while
    // a lone voice — loved or panned — lands near the neutral middle, which is
    // exactly where low-confidence picks belong. Favourites rise to the top,
    // the widely-overrated (e.g. Nietzsche, which most models call overrated)
    // sink to the very bottom, below narrowly-panned items with fewer votes.
    // Earlier tries failed here: multiplicative shrink (avg·n/(n+3)) let a lone
    // 90% favourite outrank a 4-model consensus; a subtractive penalty
    // (avg−100/n) shoved every low-n pick to the bottom regardless of sentiment,
    // so a single-model favourite ranked as "most overrated".
    entities[k].score=scoreSum;
    entities[k].cells=cells;
  });
  var choices=Object.keys(entities).map(function(k){
    var rec=entities[k];
    // Row label: prefer the raw form that IS the canonical name (so a rolled-up
    // group shows "Ramen", not its dominant subtype "Tonkotsu Ramen"); if no
    // response used the canonical form itself, title-case the alias target.
    var forms=Object.keys(rec.forms).sort(function(a,b){return rec.forms[b]-rec.forms[a]});
    var native=forms.filter(function(f){return normEnt(f)===k});
    rec.e=native[0]||forms[0]||rec.e;
    if(!native.length){
      var am=D.aliases&&D.aliases[domainId],t=am&&am[rawNorm(rec.e)];
      if(t)rec.e=t.replace(/(^|[\\s.-])\\S/g,function(c){return c.toUpperCase()});
    }
    return rec;
  }).sort(function(a,b){return b.score-a.score||b.models-a.models||b.total-a.total||a.e.localeCompare(b.e)});
  return {choices:choices,favD:favD,ovrD:ovrD};
}
function choiceMatrixHTML(domainId){
  var data=indexChoices(domainId),choices=data.choices,favD=data.favD,ovrD=data.ovrD;
  var html='<section class="matrix-panel" data-domain="'+domainId+'"><div class="bo-scroll"><div class="bo-matrix" style="grid-template-columns:var(--labw,192px) repeat('+D.models.length+',56px)">'+
    '<div class="bo-famrow"></div>'+familyRuns.map(function(g){
      var bp=BRANDS[g.family];
      var mark=bp
        ?'<svg class="co-logo" viewBox="'+(bp.vb||'0 0 24 24')+'" aria-hidden="true"><path fill="'+FAMC[famOf[g.family]]+'" d="'+(bp.d||bp)+'"/></svg>'
        :'<i class="co-mono" style="background:'+FAMC[famOf[g.family]]+'">'+esc(g.family.charAt(0).toUpperCase())+'</i>';
      return '<div class="bo-fam" style="grid-column:span '+g.n+'"><span>'+esc(g.family)+'</span>'+mark+'</div>'
    }).join('')+
    '<div class="bo-corner" aria-hidden="true"></div>'+D.models.map(function(m,i){return '<div class="bo-col" data-m="'+m.id+'" role="button" tabindex="0" title="Open the '+esc(m.label)+' dossier"><span>'+esc(m.short)+'</span></div>'}).join('');
  choices.forEach(function(choice){
    // Native renderings in the row label: color rows wear a dot of the color
    // itself; typeface rows are set in the face they name (system stacks only).
    var dot=domainId==='color'&&COLOR_HEX[choice.k]?'<i class="color-dot" style="background:'+COLOR_HEX[choice.k]+'"></i>':'';
    var ts=domainId==='typeface'&&TYPESTACK[choice.k];
    var tstyle=ts?' style="font-family:'+esc(ts.css)+(ts.size?';font-size:'+ts.size+'em':'')+'"':'';
    // Bloggers show the person as the title and the blog as the subtitle; the
    // card is still looked up by the canonical form (data-e), so display and
    // lookup are decoupled via data-disp. Everything else: title=e, sub=creator.
    var bid=domainId==='blogger'&&BLOGGER_ID[choice.k];
    var disp=bid?bid.name:choice.e;
    // Re-test the subtitle against the final title: server-side it was cleared
    // per raw pick, but the title here is the canonical group form.
    var sub=bid?bid.blog:(subOK(disp,choice.c)?choice.c:'');
    html+='<div class="bo-rowlabel'+(choice.models>1?' shared':'')+'" role="button" tabindex="0" data-domain="'+domainId+'" data-e="'+esc(choice.e)+'" data-disp="'+esc(disp)+'" data-c="'+esc(sub)+'" title="'+esc(disp+(sub?' — '+sub:''))+'" aria-label="Open the '+esc(disp)+' card"><span class="bo-title"'+tstyle+'>'+dot+esc(disp)+'</span>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</div>';
    D.models.forEach(function(m,mi){
      var cell=choice.cells[mi];
      if(!cell){html+='<div class="bo-cell"></div>';return}
      if(cell.favPct>0&&cell.ovrPct>0){
        // Both registers at once: green favourite share above, red overrated
        // share below. Clicking opens the favourite response as the default.
        var af=(.05+cell.favPct/100*.85).toFixed(3),ao=(.05+cell.ovrPct/100*.85).toFixed(3);
        html+='<button class="bo-cell bo-split" type="button" data-domain="'+domainId+'" data-m="'+m.id+'" data-e="'+esc(choice.e)+'" data-p="'+cell.favPct+'" data-probe="f" aria-label="'+esc(m.short)+': '+esc(choice.e)+', liked in '+cell.favPct+'% \\u00b7 overrated in '+cell.ovrPct+'% of responses">'+
          '<span class="bo-half'+(cell.favPct>=45?' hi':'')+'" style="background:rgba(110,209,145,'+af+')">'+cell.favPct+'%</span>'+
          '<span class="bo-half'+(cell.ovrPct>=45?' hi':'')+'" style="background:rgba(232,104,98,'+ao+')">'+cell.ovrPct+'%</span></button>';
        return}
      var probe=cell.favPct>=cell.ovrPct?'f':'o',p=Math.max(cell.favPct,cell.ovrPct),v=p/100;
      var alpha=(.05+v*.85).toFixed(3),rgb=probe==='f'?'110,209,145':'232,104,98';
      html+='<button class="bo-cell'+(v>=.45?' hi':'')+'" type="button" data-domain="'+domainId+'" data-m="'+m.id+'" data-e="'+esc(choice.e)+'" data-p="'+p+'" data-probe="'+probe+'" style="background:rgba('+rgb+','+alpha+')" aria-label="'+esc(m.short)+': '+esc(choice.e)+', '+(probe==='f'?'favourite':'overrated')+' in '+p+'% of responses">'+p+'%</button>';
    });
  });
  // Vertical probe legend hugging the matrix's right edge, spanning its full
  // height — green up top where the most-liked rows sort, red at the bottom.
  return html+'<div class="probe-band" aria-label="Cell colour scale: green is favourite, red is overrated">'+
    '<span>favourite</span><i></i><span>overrated</span></div></div></div></section>';
}
function renderChoiceMatrices(){
  var wrap=document.getElementById('choicematrix');
  wrap.innerHTML=choiceMatrixHTML(curDomain);
  wrap.querySelectorAll('button.bo-cell').forEach(function(cell){cell.addEventListener('click',function(){
    openCabinetDetail(cell.getAttribute('data-m'),cell.getAttribute('data-e'),Number(cell.getAttribute('data-p')),cell.getAttribute('data-domain'),cell.getAttribute('data-probe'));cell.classList.add('on');
  })});
  // An entity's row label opens its entity card in the drawer.
  wrap.querySelectorAll('.bo-rowlabel[data-e]').forEach(function(lab){
    function open(){if(typeof endRowHint==='function')endRowHint();openEntityCard(lab.getAttribute('data-domain'),lab.getAttribute('data-e'),lab.getAttribute('data-c'),lab.getAttribute('data-disp'))}
    lab.addEventListener('click',open);
    lab.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  });
  // A model's column header opens that model's full dossier in the drawer.
  wrap.querySelectorAll('.bo-col[data-m]').forEach(function(col){
    var mid=col.getAttribute('data-m');
    col.addEventListener('click',function(){openModelDossierInIndex(mid)});
    col.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openModelDossierInIndex(mid)}});
    wireHL(col,mid);
  });
}
function openModelDossierInIndex(id){
  openDrawer('<div class="dossier dossier-index"></div>');
  openDossier(id,document.querySelector('#cabdetail .dossier'));
  document.querySelectorAll('.bo-cell.on').forEach(function(c){c.classList.remove('on')});
}
// Strip the AI-disclaimer throat-clearing ("As an AI...", "I don't have
// personal preferences...", "That said,") off the front of a response so the
// drawer opens on the actual answer. Loops because the boilerplate often
// stacks two or three of these before the real sentence starts.
var CLIP_PATTERNS=[
  /^as an? (ai|a\\.i\\.|artificial intelligence|language model|llm|assistant|machine)\\b[^.!?]*[.!?]+["\\u201d)]?\\s*/i,
  /^i(?:'|\\u2019)?m an? (ai|artificial intelligence|language model|llm|assistant)\\b[^.!?]*[.!?]+["\\u201d)]?\\s*/i,
  /^i (do not|don['\\u2019]t|can not|can['\\u2019]t|cannot) (actually |really |truly |genuinely )?(have|possess|hold|form|feel|experience|perceive|develop)\\b[^.!?]*[.!?]+["\\u201d)]?\\s*/i,
  /^i (do not|don['\\u2019]t|can not|can['\\u2019]t|cannot)\\b[^.!?]*\\bthe way (a |an )?(you|humans?|people)\\b[^.!?]*[.!?]+["\\u201d)]?\\s*/i,
  /^i (do not|don['\\u2019]t) (actually |really |truly )?(have|experience|feel|perceive)\\b[^.!?]*?,\\s*(but|though|yet|so)\\s+/i,
  /^(that said|that being said|with that (said|caveat)|setting (that|this|those) aside|caveats? aside|still|however|but|honestly)[,\\u2014:]\\s*/i
];
function clipDisclaimer(t){
  var s=String(t).trim(),changed=true,guard=0;
  while(changed&&guard<6){
    changed=false;guard++;
    for(var i=0;i<CLIP_PATTERNS.length;i++){
      var next=s.replace(CLIP_PATTERNS[i],'');
      if(next!==s){s=next.trim();changed=true}
    }
  }
  if(!s)return String(t).trim();
  return s.charAt(0).toUpperCase()+s.slice(1);
}
// The entity card: a jacket-copy popup for a row of the index. Same drawer as
// the cell answers and model dossiers — blurb and extras up top, then the
// models' endorsements as pull quotes, dissents tucked below their own rule.
function openEntityCard(domainId,entity,creator,disp){
  var k=canonEnt(domainId,entity);
  var card=D.entityCards&&D.entityCards[domainId+' '+k];
  if(!card)return; // no card generated for this entity — leave the row inert
  var domain=D.domains.find(function(d){return d.id===domainId});
  var extras=card.extras||{};
  // One quiet external-link arrow after the title, pointing at the entity's
  // primary destination: books to Amazon, video games to YouTube, bloggers to
  // their own blog, everything else to Wikipedia (falling back to whatever link
  // the card does have).
  var links=extras.links||[];
  function findLink(re){for(var li=0;li<links.length;li++){if(re.test(links[li].url||'')||re.test(links[li].label||''))return links[li]}return null}
  var bid=domainId==='blogger'&&BLOGGER_ID[k];
  var primary=bid&&bid.url?{url:bid.url,label:'Visit '+(bid.blog||bid.name)}
    :domainId==='book'?findLink(/amazon/i):domainId==='videogame'?findLink(/youtube/i):findLink(/wikipedia/i);
  primary=primary||links[0]||null;
  var ext=primary?'<a class="ec-ext" href="'+esc(primary.url)+'" target="_blank" rel="noopener" title="'+esc(primary.label||'Open')+'" aria-label="'+esc(primary.label||'Open externally')+'">'+
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg></a>':'';
  // A typeface's card title is set in the face itself (same system stack as
  // its index row label).
  var tstack=domainId==='typeface'&&TYPESTACK[k];
  var html='<div class="cd-reg">'+esc((domain&&domain.label)||domainId)+'</div>'+
    '<h3 class="cd-title"'+(tstack?' style="font-family:'+esc(tstack.css)+'"':'')+'>'+esc(disp||entity||card.display)+ext+'</h3>'+
    (creator?'<div class="cd-creator">'+esc(creator)+'</div>':'');
  if(card.blurb)html+='<p class="ec-blurb">'+esc(card.blurb)+'</p>';
  // A color's card shows the color itself — a centered swatch where a
  // photograph would sit (colors have no photography).
  if(domainId==='color'&&COLOR_HEX[k])html+='<div class="ec-swatch" style="background:'+COLOR_HEX[k]+'"></div>';
  // The card's own photograph, directly under the blurb. Falls back to the
  // legacy imgMap path (below, after the definition) only when there is none.
  var eimg=D.entityImages&&D.entityImages[domainId+' '+k];
  if(eimg&&eimg.uri){
    // src is an external file (/img/entity/…) served by Vercel — lazy-load it so
    // only the images actually scrolled into view are fetched, keeping the page
    // light while preserving full image quality.
    html+='<div class="ec-photo"><img src="'+eimg.uri+'" alt="'+esc(card.display||entity)+'" loading="lazy" decoding="async"'+
      (eimg.credit?' title="'+esc(eimg.credit)+'"':'')+'></div>';
  }
  if(extras.definition){
    var dm=String(extras.definition).match(/^([a-z]{1,6}\\.)\\s+([\\s\\S]*)$/);
    html+='<div class="ec-def">'+(dm?'<i>'+esc(dm[1])+'</i> '+esc(dm[2]):esc(extras.definition))+'</div>';
  }
  if(!eimg&&extras.hasImage){
    var ik=D.imgMap[k]||D.imgMap[normEnt(card.display||entity)];
    var uri=ik&&D.images[ik];
    if(uri)html+='<div class="ec-img"><img src="'+uri+'" alt="'+esc(card.display||entity)+'" loading="lazy"></div>';
  }
  function att(mid){var m=D.models.find(function(x){return x.id===mid});return m?m.label:mid}
  function quotes(list,cls){return list.map(function(q){
    return '<blockquote class="ec-quote'+(cls?' '+cls:'')+'">\\u201c'+esc(q.quote)+'\\u201d<span class="ec-att">\\u2014 '+esc(att(q.model))+'</span></blockquote>';
  }).join('')}
  // Quotes speak in capability order, most capable model first. The
  // endorsements carry no heading (just a hairline); the dissents keep theirs.
  var ends=(card.endorsements||[]).slice().sort(function(a,b){return (CAPABILITY_RANK[a.model]||99)-(CAPABILITY_RANK[b.model]||99)});
  var favs=ends.filter(function(q){return q.probe==='f'}),pans=ends.filter(function(q){return q.probe==='o'});
  if(favs.length)html+='<div class="ec-quotes">'+quotes(favs)+'</div>';
  if(pans.length)html+='<div class="ec-sect ec-sect-o">dissents</div>'+quotes(pans,'ec-quote-o');
  openDrawer(html);
  document.querySelectorAll('.bo-cell.on').forEach(function(c){c.classList.remove('on')});
  document.querySelectorAll('.bo-col.sel').forEach(function(c){c.classList.remove('sel')});
}
function openCabinetDetail(id,entity,pct,domainId,probe){
  curDomain=domainId||curDomain;
  var i=D.models.findIndex(function(x){return x.id===id}),m=D.models[i];
  var domain=D.domains.find(function(d){return d.id===curDomain});
  var rows=(((D.responses[id]||{})[curDomain]||{})[probe]||[]);
  // The one response shown is the model's own answer for this entity: the
  // longest (most complete) of the sampled responses that named it.
  var matches=rows.filter(function(r){return canonEnt(curDomain,r.e)===canonEnt(curDomain,entity)});
  var primary=matches.slice().sort(function(a,b){return b.t.length-a.t.length})[0]||rows[0];
  openDrawer(
    '<div class="cd-reg cd-reg-'+probe+'">'+(probe==='f'?'favourite ':'overrated ')+esc((domain&&domain.label)||curDomain)+'</div>'+
    '<h3 class="cd-title">'+esc(entity)+'</h3>'+
    (primary&&subOK(entity,primary.c)?'<div class="cd-creator">'+esc(primary.c)+'</div>':'')+
    '<div class="cd-model"><i class="fam-dot" style="background:'+FAMC[famOf[m.family]]+'"></i><span>'+esc(m.label)+'</span></div>'+
    '<div class="cd-share">chosen in '+pct+'% of sampled answers</div>'+
    (primary?'<blockquote class="cd-primary">'+esc(clipDisclaimer(primary.t))+'</blockquote>':'<p class="cd-primary">Explanation awaiting extraction.</p>'));
  document.querySelectorAll('.bo-cell.on').forEach(function(c){c.classList.remove('on')});
}
// The left rail: every category with its fields; one field's matrix shows at a time.
function setDomain(did){
  curDomain=did;
  document.querySelectorAll('.idx-dom').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-d')===did)});
  closeCabinetDetail();
  riverModel=null;riverChoice=null;
  renderIndex();
  if(window.__railSync)window.__railSync();
  if(window.__railClose)window.__railClose();
  if(typeof committed!=='undefined'&&committed&&document.getElementById('cabinet').classList.contains('active'))syncRoute('cabinet');
}
(function(){
  var rail=document.getElementById('idxrail');
  D.domainGroups.forEach(function(group){
    // Only ids with collected data render; a group with none renders nothing.
    // Ids awaiting collection slot in automatically once summarized.
    var present=group.ids.filter(function(did){return D.domains.some(function(x){return x.id===did})});
    if(!present.length)return;
    rail.appendChild(el('<div class="idx-cat">'+esc(group.label)+'</div>'));
    present.forEach(function(did){
      var d=D.domains.find(function(x){return x.id===did});
      var b=el('<button class="idx-dom" type="button" data-d="'+did+'">'+esc(d.label)+'</button>');
      b.addEventListener('click',function(){setDomain(did)});
      rail.appendChild(b);
    });
  });
})();
// Mobile: the rail is an off-canvas drawer behind a launcher; the grid shows at
// once, and the launcher's label tracks the current field. No-op on desktop
// (the launcher and veil are display:none there).
(function(){
  var tog=document.getElementById('railtoggle'),veil=document.getElementById('railveil'),cur=document.getElementById('railcur');
  function sync(){if(cur){var d=D.domains.find(function(x){return x.id===curDomain});cur.textContent=d?d.label:''}}
  // Lock the background by fixing the body at its current scroll offset. This is
  // the iOS-safe technique: overflow:hidden on the root also freezes nested
  // scrollers (so the drawer couldn't scroll), whereas a fixed body simply
  // removes the background's scroll region and leaves the drawer's own overflow
  // free to scroll. Scroll position is captured on open and restored on close.
  var lockY=0;
  function open(){lockY=window.pageYOffset||document.documentElement.scrollTop||0;document.body.style.top=(-lockY)+'px';document.body.classList.add('rail-open');if(tog)tog.setAttribute('aria-expanded','true')}
  function close(){document.body.classList.remove('rail-open');document.body.style.top='';window.scrollTo(0,lockY);if(tog)tog.setAttribute('aria-expanded','false')}
  window.__railSync=sync;window.__railClose=close;
  if(tog)tog.addEventListener('click',function(){document.body.classList.contains('rail-open')?close():open()});
  if(veil)veil.addEventListener('click',close);
  addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  sync();
})();
document.getElementById('drawerveil').addEventListener('click',closeCabinetDetail);
addEventListener('keydown',function(e){
  if(e.key==='Escape'&&!document.getElementById('cabdetail').hidden)closeCabinetDetail();
});
// suggest-a-category: posts to the Vercel function; on hosts whose CSP blocks
// the request (the claude.ai artifact) it degrades to pointing at the live site
(function(){
  var form=document.getElementById('sugform');
  if(!form)return;
  var status=document.getElementById('sugstatus'),btn=document.getElementById('sugbtn');
  form.addEventListener('submit',function(ev){
    ev.preventDefault();
    var s=document.getElementById('suginput').value.trim(),n=document.getElementById('sugnote').value.trim();
    if(s.length<2){status.textContent='Name a category first.';return}
    btn.disabled=true;status.textContent='Sending…';
    var api=/machinesoflovingtaste\\.com$|vercel\\.app$|^localhost$/.test(location.hostname)?'/api/recommend':'https://machinesoflovingtaste.com/api/recommend';
    fetch(api,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({suggestion:s,note:n})})
      .then(function(r){
        if(!r.ok)throw 0;
        try{if(window.va)window.va('event',{name:'suggestion_submitted'})}catch(e){}
        status.textContent='Received.';
        form.reset();
      })
      .catch(function(){
        status.innerHTML='Could not send from this page — file it from the live site at '+
          '<a href="https://machinesoflovingtaste.com" target="_blank" rel="noopener">machinesoflovingtaste.com</a>.';
      })
      .then(function(){btn.disabled=false});
  });
})();
var profileFields, profileRows, comparisonModel;
function modelFieldData(domain){
  if(!profileFields)profileFields={};
  if(!profileFields[domain])profileFields[domain]=indexChoices(domain);
  return profileFields[domain];
}
function modelFavorites(id){
  if(!profileRows)profileRows={};
  if(profileRows[id])return profileRows[id];
  var mi=D.models.findIndex(function(m){return m.id===id});
  return profileRows[id]=D.domains.map(function(domain){
    var data=modelFieldData(domain.id),dist=data.favD[mi];
    if(dist.n<4)return null;
    var keys=Object.keys(dist.map).sort(function(a,b){return dist.map[b].n-dist.map[a].n||a.localeCompare(b)});
    if(!keys.length)return null;
    var top=keys[0],topKeys=keys.filter(function(k){return dist.map[k].n===dist.map[top].n});
    var choice=data.choices.find(function(c){return c.k===top});
    var peers=0,available=0,peerShare=0,peerCount=0;
    data.favD.forEach(function(d,i){
      if(d.n<4)return;available++;
      var n=d.map[top]?d.map[top].n:0,max=Math.max.apply(null,Object.keys(d.map).map(function(k){return d.map[k].n}));
      if(n===max)peers++;
      if(i!==mi){peerCount++;peerShare+=n/d.n}
    });
    var blogger=domain.id==='blogger'&&BLOGGER_ID[top];
    return {d:domain.id,label:domain.label,k:top,keys:topKeys,e:blogger?blogger.name:choice.e,n:dist.n,count:dist.map[top].n,share:dist.map[top].n/dist.n,peers:peers,available:available,gap:dist.map[top].n/dist.n-(peerCount?peerShare/peerCount:0)};
  }).filter(Boolean);
}
function modelIndexLink(id,domain){return '#/index/'+encodeURIComponent(domain)+'?model='+encodeURIComponent(id)}
function dossierHTML(id){
  var m=D.models.find(function(x){return x.id===id}),rows=modelFavorites(id);
  var distinctive=rows.slice().sort(function(a,b){return b.gap-a.gap||b.share-a.share}).slice(0,3);
  var q=m.quote?'<blockquote>“'+esc(m.quote.t)+'”<span class="src">On its favorite '+esc(m.quote.d.toLowerCase())+'</span></blockquote>':'';
  return '<div class="reg">'+esc(m.family)+'</div><h2 class="dname"><i class="fam-dot" style="background:'+FAMC[famOf[m.family]]+'"></i>'+esc(m.label)+'</h2>'+
    '<p class="finding-note">'+rows.length+' fields with at least four named favorite answers.</p>'+
    '<h3 class="profile-heading">Where its choices stand out</h3><p class="finding-note">Favorites it names more often than the other models, on average.</p>'+
    '<div class="profile-picks">'+distinctive.map(function(r){return '<a href="'+modelIndexLink(id,r.d)+'"><span class="eyebrow">'+esc(r.label)+'</span><h4>'+esc(r.e)+'</h4><span class="key-favorite">'+riverPercent(r.share)+' · '+r.count+' of '+r.n+' answers</span><small>A top favorite for '+r.peers+' of '+r.available+' models'+(r.keys.length>1?' · tied in this model’s samples':'')+'.</small></a>'}).join('')+'</div>'+
    (q?'<h3 class="profile-heading">In its own words</h3>'+q:'')+
    '<details class="profile-details"><summary>Characteristic words</summary><p class="finding-note">Words it uses about its choices, including praise and criticism.</p><div class="sigwords">'+m.sig.map(function(w){return '<span class="sigw">'+esc(w)+'</span>'}).join('')+'</div></details>'+
    '<details class="profile-details"><summary>Favorites across all '+rows.length+' sampled fields</summary><p class="finding-note">The most frequent named answer in each field. When tied, one top answer is shown; open the field for the full distribution.</p><div class="dfavs">'+rows.map(function(r){return '<a class="fitem" href="'+modelIndexLink(id,r.d)+'"><span class="fdom">'+esc(r.label)+'</span><span class="fval"><b>'+esc(r.e)+'</b> <span class="fpct">'+riverPercent(r.share)+(r.keys.length>1?' · tied':'')+'</span></span></a>'}).join('')+'</div></details>';
}
function modelOverlap(a,b){
  var ai=D.models.findIndex(function(m){return m.id===a}),bi=D.models.findIndex(function(m){return m.id===b}),sum=0,n=0;
  D.domains.forEach(function(domain){var data=modelFieldData(domain.id),x=data.favD[ai],y=data.favD[bi];if(x.n<4||y.n<4)return;n++;Object.keys(x.map).forEach(function(k){sum+=Math.min(x.map[k].n/x.n,y.map[k]?y.map[k].n/y.n:0)})});
  return {id:b,n:n,overlap:n?sum/n:0};
}
function renderModelComparison(id){
  var box=document.getElementById('model-comparison');if(!box)return;
  var others=D.models.filter(function(m){return m.id!==id}).map(function(m){return modelOverlap(id,m.id)}).sort(function(a,b){return b.overlap-a.overlap});
  if(!others.length)return;
  if(!comparisonModel||comparisonModel===id)comparisonModel=others[0].id;
  var match=others.find(function(m){return m.id===comparisonModel})||others[0],other=D.models.find(function(m){return m.id===match.id});
  var a=modelFavorites(id),b=modelFavorites(other.id),pairs=a.map(function(x){var y=b.find(function(y){return y.d===x.d});return y?{a:x,b:y,same:x.keys.some(function(k){return y.keys.indexOf(k)>=0})}:null}).filter(Boolean);
  var examples=pairs.filter(function(p){return p.same}).slice(0,2).concat(pairs.filter(function(p){return !p.same}).slice(0,2));
  box.innerHTML='<h2>Compare their tastes</h2><label for="compare-select">Compare with</label><select id="compare-select">'+others.map(function(c){var m=D.models.find(function(m){return m.id===c.id});return '<option value="'+esc(m.id)+'"'+(m.id===other.id?' selected':'')+'>'+esc(m.label)+'</option>'}).join('')+'</select>'+
    '<div class="overlap-score"><strong>'+Math.round(match.overlap*100)+'%</strong><span>average overlap in favorite answers<br>across '+match.n+' shared fields</span></div>'+
    (other.id===others[0].id?'<p class="finding-note">The closest match in this panel by favorite-answer overlap.</p>':'')+
    '<div class="comparison-examples">'+examples.map(function(p){return '<a href="'+modelIndexLink(id,p.a.d)+'"><span class="eyebrow">'+esc(p.a.label)+'</span><p>'+esc(p.a.e)+'<span>This model · '+riverPercent(p.a.share)+'</span></p><p>'+esc(p.b.e)+'<span>'+esc(other.short)+' · '+riverPercent(p.b.share)+'</span></p></a>'}).join('')+'</div>'+
    '<details class="profile-details"><summary>How this comparison works</summary><p class="finding-note">For each field, we compare the full distributions of named favorite answers. Identical distributions have 100% overlap; disjoint choices have 0%. We average across fields where both models have at least four named answers. This describes sampled choices, not a general measure of model similarity.</p></details><a class="text-link" href="#/models/'+encodeURIComponent(other.id)+'">Open '+esc(other.short)+'’s profile &rarr;</a>';
  box.querySelector('#compare-select').addEventListener('change',function(e){comparisonModel=e.target.value;renderModelComparison(id)});
}
function openDossier(id,target){
  curModel=id;
  var box=target||document.getElementById('mmdossier');
  box.innerHTML=dossierHTML(id);
  document.querySelectorAll('.mnode').forEach(function(n){n.classList.toggle('sel',n.getAttribute('data-m')===id);n.setAttribute('aria-pressed',String(n.getAttribute('data-m')===id))});
  var inDrawer=box.closest&&box.closest('#cabdetail');
  document.querySelectorAll('.bo-col[data-m]').forEach(function(n){n.classList.toggle('sel',!!inDrawer&&n.getAttribute('data-m')===id)});
  if(!inDrawer){
    var select=document.getElementById('model-select');if(select)select.value=id;
    var link=document.getElementById('model-permalink');if(link)link.href='#/models/'+encodeURIComponent(id);
    renderModelComparison(id);
    if(typeof committed!=='undefined'&&committed&&document.getElementById('modelmap').classList.contains('active'))syncRoute('modelmap');
  }
}
document.getElementById('model-select').addEventListener('change',function(e){comparisonModel=null;openDossier(e.target.value)});
// Fragment routes keep this single-file site portable while making each
// article, model and field addressable. Browser back/forward restores the view.
var routeApplying=false;
function viewRoute(id){
  if(id==='cabinet')return '/index/'+encodeURIComponent(curDomain)+(riverModel?'?model='+encodeURIComponent(riverModel):'');
  if(id==='modelmap')return '/models/'+encodeURIComponent(curModel||D.models[0].id);
  if(id==='shared-canon')return '/findings/shared-canon';
  if(id==='research')return '/findings/ghost-in-kyoto';
  return '/'+id;
}
function syncRoute(id,replace){
  if(routeApplying)return;
  var hash='#'+viewRoute(id);
  if(location.hash!==hash)history[replace?'replaceState':'pushState'](null,'',hash);
}
function applyRoute(){
  if(!location.hash||location.hash==='#/'){routeApplying=true;goHome();routeApplying=false;return}
  var parts=location.hash.slice(1).split('?'),path=parts[0],query=new URLSearchParams(parts[1]||'');
  var bits=path.split('/').filter(Boolean),id;
  try{bits=bits.map(decodeURIComponent)}catch(e){return}
  if(bits[0]==='index')id='cabinet';
  else if(bits[0]==='models')id='modelmap';
  else if(bits[0]==='findings')id=bits[1]==='shared-canon'?'shared-canon':bits[1]==='ghost-in-kyoto'?'research':'findings';
  else if(bits[0]==='research')id='research';
  else if(bits[0]==='canon')id='findings';
  else if(bits[0]==='method'||bits[0]==='suggest')id=bits[0];
  else return;
  routeApplying=true;
  closeCabinetDetail();
  if(id==='cabinet'){
    var domain=D.domains.find(function(d){return d.id===bits[1]});
    if(domain)setDomain(domain.id);
    var model=D.models.find(function(m){return m.id===query.get('model')});
    riverModel=model?model.id:null;riverChoice=null;
    if(model)indexMode='river';
    renderIndex();
  }
  if(id==='modelmap'){
    var model=D.models.find(function(m){return m.id===bits[1]});
    comparisonModel=null;openDossier(model?model.id:D.models[0].id);
  }
  setView(id,false);commitPastHero();pinTop();updateViewbar();
  var target=document.getElementById(id);target.tabIndex=-1;target.focus({preventScroll:true});
  routeApplying=false;
}
addEventListener('hashchange',applyRoute);
addEventListener('popstate',function(){if(!location.hash)applyRoute()});
// Reopening a current route should still navigate/focus it.
document.addEventListener('click',function(e){var a=e.target.closest('a[href^="#/"]');if(a&&a.hash===location.hash&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();applyRoute()}});

/* ---- views: the hero is a one-way gate into the index; the side drawer switches scenes ---- */
var viewbar=document.querySelector('.viewbar');
var mast=document.getElementById('home');
var overview=document.getElementById('overview');
var committed=false;
// Entering the Index retires the overview and pins the active view to the top.
// Retain momentum protection so a trackpad flick cannot skip the first rows.
// Instant, snap-proof jump to the top. CSS scroll-behavior:smooth makes bare
// scrollTo(0,0) an animated (cancelable) scroll — behavior:'instant' overrides
// that and also aborts any scroll animation already in flight.
function pinTop(){
  // Older WebKit rejects behavior:'instant' with a TypeError, which would
  // abort whichever handler called us — fall back to the classic form.
  try{scrollTo({top:0,left:0,behavior:'instant'})}catch(e){scrollTo(0,0)}
}
function commitPastHero(){
  if(committed||!mast)return;
  committed=true;
  if(!routeApplying)syncRoute('cabinet',true);
  // Kill the snap FIRST: the mandatory snap animation that carried the user
  // past the intro is still in flight, aimed at a target computed before the
  // intro collapsed — on short viewports it used to strand the index deep in
  // the matrix (the Catcher-in-the-Rye-first bug). Removing snap-type cancels
  // it, and with one section left the snap gate has done its job anyway.
  document.documentElement.style.scrollSnapType='none';
  mast.style.display='none';
  overview.style.display='none';
  pinTop();
  // The flick that committed usually still has trackpad momentum behind it;
  // with the intro collapsed and the page pinned, those residual ticks would
  // carry the index deep into the matrix — the "starts at the bottom" bug.
  // Rather than let it scroll and yank it back (which fights momentum frame by
  // frame and visibly jitters), hard-lock the scroller with overflow:hidden for
  // the tail of the gesture: a non-scrollable root simply cannot move, so there
  // is nothing to correct and nothing to see. pinTop() already put us at 0, and
  // toggling overflow does not change the scroll position. We still eat
  // wheel/touchmove to absorb the input and to time the release — 140ms after
  // the ticks go quiet, hard-capped at 900ms, so a later deliberate scroll is
  // untouched. (scrollbar-gutter:stable on <html> keeps hiding the scrollbar
  // from shifting layout on classic-scrollbar platforms.)
  (function(){
    var quiet=null,hard=null,de=document.documentElement,prevOv=de.style.overflow;
    de.style.overflow='hidden';
    function stop(){
      de.style.overflow=prevOv;
      removeEventListener('wheel',eat,true);
      removeEventListener('touchmove',eat,true);
      clearTimeout(quiet);clearTimeout(hard);
    }
    function arm(){clearTimeout(quiet);quiet=setTimeout(stop,140);}
    function eat(e){e.preventDefault();arm();}
    addEventListener('wheel',eat,{passive:false,capture:true});
    addEventListener('touchmove',eat,{passive:false,capture:true});
    arm();
    hard=setTimeout(stop,900);
  })();
  // Once landed and settled on the index, offer the first-run row hint.
  setTimeout(function(){if(typeof showRowHint==='function')showRowHint()},1300);
}
// Bottom of the overview in document coordinates.
function introEnd(){return overview.offsetTop+overview.offsetHeight}
function updateViewbar(){
  if(!viewbar)return;
  if(!committed&&!homing&&mast&&scrollY>=introEnd()-2)commitPastHero();
  var ready=committed;
  document.body.classList.toggle('nav-ready',ready);
  viewbar.classList.toggle('show',ready);
  viewbar.setAttribute('aria-hidden',ready?'false':'true');
  viewbar.querySelectorAll('button').forEach(function(b){b.tabIndex=ready?0:-1});
}
function setView(id,scroll){
  try{if(window.va)window.va('event',{name:'view',data:{view:id}})}catch(e){}
  document.querySelectorAll('section.view').forEach(function(v){v.classList.toggle('active',v.id===id)});
  document.querySelectorAll('.viewbar [data-view]').forEach(function(b){var navId=(id==='research'||id==='shared-canon')?'findings':id;b.classList.toggle('on',b.getAttribute('data-view')===navId);b.setAttribute('aria-current',b.getAttribute('data-view')===navId?'page':'false')});
  viewbar.classList.toggle('idx-on',id==='cabinet');
  if(id==='modelmap'&&window.mmActivate)window.mmActivate();
  if(committed||scroll)syncRoute(id);
  closeCabinetDetail();
  document.title=(!committed&&!scroll&&!routeApplying)?'Machines of Loving Taste':(id==='research'?'The Ghost Still Lives in Kyoto':id==='shared-canon'?'A Shared Canon':id==='findings'?'Findings':id==='modelmap'?'Models':id==='method'?'Method':'Index')+' · Machines of Loving Taste';
  // Every view starts at its top. Only the active section is displayed, so the
  // top of the view IS the top of the page once the hero has been retired.
  if(scroll)pinTop();
}
document.querySelectorAll('.viewbar [data-view]').forEach(function(b){
  b.addEventListener('click',function(){
    setView(b.getAttribute('data-view'),true);
    updateViewbar();
  });
});
// The brand mark returns to the top hero. Rather than reload (which lets the
// browser restore the pre-reload scroll deep in the index — the jitter-then-drop
// bug), it reverses the commit in place: restore the overview,
// pin to the top, hide the nav bar, and resume its rotating Q&A. No navigation means no
// scroll-restoration race to fight.
// homing guards the handoff: mobile Safari applies layout + snap changes
// asynchronously, so for a few frames after goHome() the scroll offset can
// read as deep-in-the-page — without the guard, that stale offset trips the
// auto-commit above and the intro instantly re-retires (logo tap "does
// nothing" on phones). While homing, we pin to the top every frame and keep
// automatic handoff paused until the offset is stably zero.
var homing=false;
function goHome(){
  if(!routeApplying)history.pushState(null,'',location.pathname+location.search);
  document.title='Machines of Loving Taste';
  // 1) Jump to 0 while snap is still off (from the commit) so nothing fights
  //    the pin, then un-hide the intro.
  document.documentElement.style.scrollSnapType='none';
  pinTop();
  committed=false;
  homing=true;
  if(mast)mast.style.display='';
  overview.style.display='';
  setView('cabinet',false);              // reset the view under the intro to default
  document.title='Machines of Loving Taste';
  pinTop();                              // now that the hero is back in flow, land on it
  updateViewbar();                       // committed=false -> hides the nav bar
  if(window._heroCycle)window._heroCycle();
  // 2) Hold the top for a dozen frames, then restore snap once settled. The
  //    timeout is a safety net for backgrounded/rAF-throttled tabs.
  var pins=0,done=false;
  function settle(){
    if(done)return;
    done=true;
    homing=false;
    document.documentElement.style.scrollSnapType='';
    updateViewbar();
  }
  (function pin(){
    if(done)return;
    pinTop();
    if(++pins<12)requestAnimationFrame(pin);else settle();
  })();
  setTimeout(settle,600);
}
var viewlogo=document.getElementById('viewlogo');
if(viewlogo)viewlogo.addEventListener('click',goHome);

// First-visit coach-mark on the first row (Invisible Cities): teaches that a
// name opens its card. Shown once ever (localStorage), floats beside the row
// via its live rect, and tears down on any interaction.
var rowhint=document.getElementById('rowhint'),rhTarget=null,rhRAF=0,rhTimer=0;
function rhSeen(){try{return localStorage.getItem('mlt.rowhint')==='1'}catch(e){return false}}
function rhPlace(){
  if(!rhTarget||!rowhint.classList.contains('on'))return;
  var r=rhTarget.getBoundingClientRect();
  // If the row scrolls out of view, hide the bubble (already marked seen).
  if(r.bottom<80||r.top>innerHeight-12||r.width===0){rowhint.style.display='none';return}
  rowhint.style.display='flex';
  // Offset by the connector lead so the dot lands right at the name; cap the
  // width to the space remaining on the right so it never runs off a phone edge.
  var left=r.right+32;
  rowhint.style.left=left+'px';
  rowhint.style.top=(r.top+r.height/2)+'px';
  rowhint.style.transform='translateY(-50%)';
  rowhint.style.maxWidth=Math.max(120,Math.min(250,innerWidth-left-12))+'px';
}
function rhOnScroll(){if(rhRAF)return;rhRAF=requestAnimationFrame(function(){rhRAF=0;rhPlace()})}
function endRowHint(){
  if(!rowhint)return;
  rowhint.classList.remove('on');rowhint.style.display='none';
  removeEventListener('scroll',rhOnScroll,true);removeEventListener('resize',rhOnScroll);
  clearTimeout(rhTimer);rhTarget=null;
}
function showRowHint(){
  if(indexMode!=='grid'||!rowhint||rhSeen()||rhTarget)return;
  if(!committed)return;
  var lab=document.querySelector('#choicematrix .bo-rowlabel[data-e]');
  if(!lab)return;
  try{localStorage.setItem('mlt.rowhint','1')}catch(e){} // once ever
  rhTarget=lab;rowhint.classList.add('on');rhPlace();
  addEventListener('scroll',rhOnScroll,{passive:true,capture:true});
  addEventListener('resize',rhOnScroll);
  rhTimer=setTimeout(endRowHint,15000); // fade out if ignored
}
if(rowhint){
  rowhint.addEventListener('click',function(e){
    if(!rhTarget){endRowHint();return}
    var t=rhTarget;endRowHint();
    // clicking the × just dismisses; clicking the body opens the card
    if(e.target.classList.contains('rh-x'))return;
    openEntityCard(t.getAttribute('data-domain'),t.getAttribute('data-e'),t.getAttribute('data-c'),t.getAttribute('data-disp'));
  });
}
// The original header's cue opens the one-page overview, never the Index.
document.getElementById('cue').addEventListener('click',function(){
  overview.focus({preventScroll:true});
  overview.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
});
// The study cue follows the same scroll path as a downward gesture. The
// existing arrival handler retires the intro only once the Index reaches us.
document.getElementById('enterIndex').addEventListener('click',function(){
  setView('cabinet',false);
  var target=document.getElementById('cabinet');
  target.tabIndex=-1;
  target.focus({preventScroll:true});
  target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
});
// Links within the detailed Methodology view switch directly to their view.
document.querySelectorAll('[data-enter-view]').forEach(function(button){
  button.addEventListener('click',function(){
    var id=button.getAttribute('data-enter-view');
    setView(id,false);
    commitPastHero();
    pinTop();
    updateViewbar();
    var target=document.getElementById(id);
    target.tabIndex=-1;
    target.focus({preventScroll:true});
  });
});
setView('cabinet',false);
addEventListener('scroll',updateViewbar,{passive:true});
addEventListener('resize',updateViewbar);
updateViewbar();

/* ---- masthead interview: one specimen per visit, all its favourites ---- */
(function(){
  var m=D.models[Math.floor(Math.random()*D.models.length)];
  var pairs=[];
  D.domains.forEach(function(d){
    var cell=D.cells[d.id][m.id].f;
    if(!cell||!cell.length)return;
    var noun=d.label.toLowerCase();
    if(noun==='color')noun='colour';
    pairs.push(['your favourite '+noun+'?',cell[0][0]+'.']);
  });
  for(var k=pairs.length-1;k>0;k--){var j=Math.floor(Math.random()*(k+1));var t=pairs[k];pairs[k]=pairs[j];pairs[j]=t}
  var qa=document.getElementById('qa'),q=document.getElementById('qaq'),a=document.getElementById('qaa'),by=document.getElementById('qaby'),i=0;
  by.textContent='\u2014 '+m.short;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    q.textContent=pairs[0][0];a.textContent=pairs[0][1];
    qa.classList.add('show-q','show-a');return;
  }
  var cycleTimers=[];
  function cycle(){
    cycleTimers.forEach(clearTimeout);cycleTimers=[];
    if(committed)return; // hero retired for the session — stop animating behind the scenes
    var pr=pairs[i%pairs.length];i++;
    q.textContent=pr[0];a.textContent=pr[1];
    qa.classList.add('show-q');
    cycleTimers.push(setTimeout(function(){if(!committed)qa.classList.add('show-a')},1500));
    cycleTimers.push(setTimeout(function(){if(!committed)qa.classList.remove('show-q','show-a')},5900));
    cycleTimers.push(setTimeout(function(){if(!committed)cycle()},7000));
  }
  // Exposed so returning home (which un-retires the hero) can resume the
  // rotation; the cycle's own guards stopped it when the intro was committed.
  window._heroCycle=cycle;
  cycle();
})();

setDomain(curDomain);
openDossier(curModel);
if(location.hash)applyRoute();
// Belt-and-suspenders: some browsers apply scroll restoration slightly after
// this script has already run. If nothing has genuinely scrolled us past the
// hero by the time the page finishes loading, force back to the very top.
addEventListener('load',function(){if(!committed)scrollTo({top:0,left:0,behavior:'instant'})});

/* ---- the quiz: match a person against the specimens, offline ---- */
(function(){
  var QLABEL={book:'favourite novel',film:'favourite film',album:'favourite album',city:'favourite city',
    painting:'favourite painting',word:'favourite word',object:'favourite everyday object',cuisine:'favourite cuisine'};
  var grid=document.getElementById('quizgrid');
  if(!grid)return; // quiz section currently removed
  D.quiz.forEach(function(d){
    grid.appendChild(el('<div class="qz" data-d="'+d+'">'+
      '<div class="qz-l">'+QLABEL[d]+'</div>'+
      '<input type="text" class="what" autocomplete="off" placeholder="\u2014">'+
      '<input type="text" class="why" autocomplete="off" placeholder="and why, in a few words">'+
      '</div>'));
  });

  function tokens(t){
    t=normEnt(t).replace(/[^a-z\\s-]/g,' ');
    var ws=t.split(/\\s+/).filter(function(w){return w.length>=3});
    var out=ws.slice();
    for(var i=0;i<ws.length-1;i++)out.push(ws[i]+' '+ws[i+1]); // bigrams: "visual harmony"
    return out;
  }
  var lexMap={};
  D.lex.forEach(function(e){lexMap[e[0]]={x:e[1],y:e[2],c:e[3]}});
  var N=D.models.length;

  document.getElementById('quizgo').addEventListener('click',function(){
    var pick=new Array(N).fill(0), voc=new Array(N).fill(0);
    var px=0,py=0,pw=0,answered=0;
    document.querySelectorAll('.qz').forEach(function(row){
      var d=row.getAttribute('data-d');
      var what=normEnt(row.querySelector('.what').value||'');
      var why=(row.querySelector('.why').value||'');
      if(what)answered++;
      // 1. pick affinity: does this person's pick appear among a model's sampled answers?
      if(what.length>2){
        D.models.forEach(function(m,mi){
          var cell=D.cells[d][m.id].f||[];
          cell.forEach(function(pr,rank){
            var cand=normEnt(pr[0]);
            if(cand===what||cand.indexOf(what)>=0||what.indexOf(cand)>=0){
              pick[mi]+=[1,0.75,0.5][rank]*(pr[1]/100);
            }
          });
        });
      }
      // 2. vocabulary affinity: their reasons, in the study's own descriptor space
      tokens(what+' '+why).forEach(function(w){
        var e=lexMap[w];
        if(!e)return;
        var tot=e.c.reduce(function(a,b){return a+b},0);
        if(!tot)return;
        var wgt=Math.min(1,tot/5);
        e.c.forEach(function(c,mi){voc[mi]+=(c/tot-1/N)*wgt});
        px+=e.x*wgt;py+=e.y*wgt;pw+=wgt;
      });
    });
    if(!answered)return;
    var score=D.models.map(function(m,i){return 1.6*pick[i]+voc[i]});
    var lo=Math.min.apply(0,score),hi=Math.max.apply(0,score);
    var order=score.map(function(v,i){return [v,i]}).sort(function(a,b){return b[0]-a[0]});
    var win=D.models[order[0][1]], second=D.models[order[1][1]];
    var vb=D.models.map(function(m,i){
      var t=hi>lo?(score[i]-lo)/(hi-lo):0;
      return '<div class="vbar"><span>'+esc(m.short)+'</span><div class="t"><i style="width:'+(8+92*t).toFixed(0)+'%;background:'+FAMC[famOf[m.family]]+'"></i></div></div>';
    }).join('');
    // mini-map: centroids + you, same PC space
    var mapHtml='';
    if(pw>0){
      var ux=px/pw,uy=py/pw;
      var xs=D.models.map(function(m){return m.x}).concat([ux]),ys=D.models.map(function(m){return m.y}).concat([uy]);
      var x0=Math.min.apply(0,xs),x1=Math.max.apply(0,xs),y0=Math.min.apply(0,ys),y1=Math.max.apply(0,ys);
      var MW=420,MH=300,MP=42;
      var sx=function(x){return MP+(x-x0)/((x1-x0)||1)*(MW-2*MP)},sy=function(y){return MH-MP-(y-y0)/((y1-y0)||1)*(MH-2*MP)};
      var pts=D.models.map(function(m,i){
        return '<circle cx="'+sx(m.x).toFixed(1)+'" cy="'+sy(m.y).toFixed(1)+'" r="6" fill="'+FAMC[famOf[m.family]]+'" fill-opacity="'+(m.id===win.id?1:0.45)+'"/>'+
          (m.id===win.id?'<text x="'+sx(m.x).toFixed(1)+'" y="'+(sy(m.y)-12).toFixed(1)+'" class="youlab" style="fill:var(--dim)">'+esc(m.short)+'</text>':'');
      }).join('');
      mapHtml='<div class="vmap"><svg viewBox="0 0 '+MW+' '+MH+'">'+pts+
        '<circle class="youdot" cx="'+sx(ux).toFixed(1)+'" cy="'+sy(uy).toFixed(1)+'" r="8"/>'+
        '<text x="'+sx(ux).toFixed(1)+'" y="'+(sy(uy)-14).toFixed(1)+'" class="youlab">YOU</text>'+
        '</svg><div class="vmap-cap">Your reasons, projected into the same vocabulary space as the specimens.</div></div>';
    }
    var conf=order[0][0]-order[1][0];
    var note=pw>0
      ? 'Judged on '+answered+' answers and the vocabulary of your reasons'+(conf<0.15?' \u2014 a close call with '+second.short+'.':'.')
      : 'Judged on your picks alone \u2014 add a few words of why for a sharper reading.';
    var v=document.getElementById('verdict');
    v.innerHTML='<div><div class="v-pre">The atlas finds</div>'+
      '<div class="v-name"><i style="background:'+FAMC[famOf[win.family]]+'">'+(D.models.indexOf(win)+1)+'</i>You are '+esc(win.label)+'</div>'+
      '<div class="v-persona">'+esc(win.persona)+'</div>'+
      '<div class="v-note">'+note+'</div>'+
      '<div class="vbars">'+vb+'</div></div>'+
      (mapHtml||'');
    v.hidden=false;
    v.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'nearest'});
  });
})();
`;

const BODY = `
<canvas id="ambient" aria-hidden="true"></canvas>
<main>
<header class="mast" id="home">
  <h1>Machines <em>of Loving Taste</em></h1>
  <div class="heroq">
    <div class="qa" id="qa" aria-hidden="true">
      <div class="qa-q" id="qaq"></div>
      <div class="qa-a" id="qaa"></div>
      <div class="qa-by" id="qaby"></div>
    </div>
  </div>
  <button class="cue" id="cue" type="button" aria-label="Continue to the overview">
    <span>begin</span><i></i>
  </button>
</header>

<section class="intro-overview" id="overview" aria-labelledby="overview-title" tabindex="-1">
  <div class="overview-content">
    <p class="overview-kicker">A field study in machine taste</p>
    <h2 id="overview-title">AI models have taste.</h2>
    <p class="overview-intro">And you can find it simply by asking.</p>
    <div class="study-body">
      <div class="study-copy">
        <p>We asked AI models about a wide range of things—from novels and paintings to cities, food, and smells.</p>
        <div class="study-questions">
          <p class="key-favorite">“What is your favorite ___?”</p>
          <p class="key-overrated">“Which ___ is overrated?”</p>
        </div>
        <p>We ask each question in fresh conversations, sampling more when answers vary. Counting the choices reveals a distribution of taste.</p>
      </div>
      ${studyTasteFigure()}
    </div>
  </div>
  <button class="cue study-cue" id="enterIndex" type="button" aria-label="Enter the Index">
    <span>Enter the Index</span><i aria-hidden="true"></i>
  </button>
</section>

<section id="modelmap" class="view">
  <div class="shead"><h1>Models</h1></div>
  <p class="gloss">A closer look at what each model likes, the language it uses, and where its answers meet—or depart from—another model’s.</p>
  <div class="model-picker"><label for="model-select">Explore a model</label><select id="model-select">${[...new Set(models.map(m => m.family))].map(f => `<optgroup label="${esc(f)}">${models.filter(m => m.family === f).map(m => `<option value="${esc(m.id)}">${esc(m.label)}</option>`).join('')}</optgroup>`).join('')}</select><a class="text-link" id="model-permalink" href="#/models">Link to this model &nearr;</a></div>
  <div class="models-layout"><div class="dossier model-profile" id="mmdossier"></div><aside class="model-comparison" id="model-comparison" aria-label="Compare model preferences"></aside></div>
  <details class="vocabulary-map" id="vocabulary-map"><summary>Explore the language map</summary><div class="map-intro"><h2>Similar words, different models</h2><p>Positions summarize the vocabulary models use about their choices, including praise and criticism. Nearby models use similar language. This map does not compare which things they choose.</p></div>
    <div class="map-layout"><div class="atlas-wrap"><svg id="mmap" viewBox="0 0 640 520" role="group" aria-label="Models positioned by their descriptive vocabulary"></svg></div><div><p class="finding-note">Select a model to open its profile above. Labels appear on focus or hover. The default view stays still; drag to explore the third dimension.</p><button type="button" class="text-link" id="map-reset">Reset the view</button><p class="finding-note">Axes are vocabulary components, labeled by representative words at their extremes. Use the model picker above for a list of every model.</p></div></div>
  </details>
</section>

<section id="findings" class="view">${findingsHTML()}</section>
<section id="shared-canon" class="view">${consensusArticleHTML()}</section>

<section id="cabinet" class="view">
  <div class="indexgrid" id="indexstart">
    <aside class="idx-rail" id="idxrail" aria-label="Fields"></aside>
    <div class="idx-main">
      <button class="railtoggle" id="railtoggle" type="button" aria-expanded="false" aria-controls="idxrail" aria-label="Choose a field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        <span>Fields</span><b id="railcur"></b>
      </button>
      <div class="index-view-switch">
        <h2 id="index-field-title"></h2>
        <div class="index-switch" role="group" aria-label="Index view">
        <button type="button" data-index-mode="river" aria-pressed="true" aria-controls="riverindex">Flow</button>
        <button type="button" data-index-mode="grid" aria-pressed="false" aria-controls="choicematrix">Grid</button>
      </div></div>
      <div class="choicematrix" id="choicematrix" hidden></div>
      <div class="riverindex" id="riverindex"></div>
    </div>
  </div>
  <div class="rail-veil" id="railveil"></div>
  <div class="drawer-veil" id="drawerveil" hidden></div>
  <aside class="cabdetail" id="cabdetail" aria-live="polite" hidden></aside>
</section>


<section id="method" class="view">
  <div class="shead"><h2>Methodology</h2></div>
  <p class="gloss">${seasonLine} How the answers become the Index.</p>
  ${methodOverview}
  <details class="article-details method-technical"><summary>Collection details, sources &amp; credits</summary>${methodFine}</details>
</section>

<section id="research" class="view">
  ${researchHTML()}
</section>

<section id="suggest" class="view">
  <div class="shead"><h2>Suggest a category</h2></div>
  <p class="gloss">The index grows one field at a time — novel, smell, monument, philosopher. If there is
  a domain of taste you want the models probed on, name it here.</p>
  <form class="sugform" id="sugform">
    <div><label for="suginput">Category</label>
    <input id="suginput" maxlength="200" placeholder="film director, perfume, board game…" autocomplete="off" required></div>
    <div><label for="sugnote">Why it would be telling <em>(optional)</em></label>
    <textarea id="sugnote" maxlength="500"></textarea></div>
    <button class="sugbtn" id="sugbtn" type="submit">Send it in</button>
    <p class="sugstatus" id="sugstatus" aria-live="polite"></p>
  </form>
</section>

<nav class="viewbar" id="viewbar" aria-label="Views">
  <button class="viewlogo" id="viewlogo" type="button" aria-label="Machines of Loving Taste — return to the top" title="Machines of Loving Taste">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs><filter id="logoglow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="0.7" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter></defs>
      <g filter="url(#logoglow)" stroke="#e9e6dd" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="4" width="16" height="16" stroke-width="1.2" opacity="0.95"/>
        <line x1="4" y1="11" x2="20" y2="11" stroke-width="1.1" opacity="0.85"/>
      </g>
    </svg>
  </button>
  <button class="viewlink on" type="button" data-view="cabinet"><span>Index</span></button>
  <button class="viewlink" type="button" data-view="modelmap"><span>Models</span></button>
  <button class="viewlink" type="button" data-view="findings"><span>Findings</span></button>
  <button class="viewlink" type="button" data-view="method"><span>Method</span></button>
</nav>
<div id="rowhint" role="button" tabindex="-1" aria-label="Open the first entry's card">
  <span>Click a name to open its card</span><i class="rh-x" aria-hidden="true">&times;</i>
</div>

<footer class="site-footer"><span>Machines of Loving Taste</span><a href="#/suggest">Suggest a category</a><a href="https://github.com/esheagren/machines-of-loving-taste" target="_blank" rel="noopener">Data &amp; code &nearr;</a></footer>
</main>

<div id="tip" role="status"></div>
`;

// Favicon: the framed-light nav mark on a dark rounded tile, so the white
// glowing line stays legible on a light browser-tab bar. Inline SVG data URI —
// no separate asset, survives the single-file build. URL-encoded so the '#',
// spaces and angle brackets are safe inside the href.
const FAVICON_SVG = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='#0f1013'/><defs><filter id='g' x='-40%' y='-40%' width='180%' height='180%'><feGaussianBlur stdDeviation='0.8' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter></defs><g filter='url(#g)' stroke='#e9e6dd' fill='none' stroke-linecap='round' stroke-linejoin='round'><rect x='9' y='9' width='14' height='14' stroke-width='1.5'/><line x1='9' y1='15.2' x2='23' y2='15.2' stroke-width='1.4'/></g></svg>`;
const FAVICON = `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}">`;
const standalone = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Machines of Loving Taste</title>
${FAVICON}
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
<meta name="apple-mobile-web-app-title" content="Loving Taste">
<meta name="application-name" content="Loving Taste">
<meta name="theme-color" content="#0f1013">
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};window.si=window.si||function(){(window.siq=window.siq||[]).push(arguments)};</script>
<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/_vercel/speed-insights/script.js"></script>
<style>${CSS}</style></head><body>
<script type="application/json" id="data">${dataJSON}</script>
${BODY}
<script>${JS}</script>
</body></html>`;
writeFileSync(join(here, '..', 'report', 'site.html'), standalone);

const artifact = `<title>Machines of Loving Taste</title>
<style>${CSS}</style>
<script type="application/json" id="data">${dataJSON}</script>
${BODY}
<script>${JS}</script>`;
writeFileSync(join(here, '..', 'report', 'artifact.html'), artifact);
console.log(`site written (${Math.round(standalone.length / 1024)}KB)`);
