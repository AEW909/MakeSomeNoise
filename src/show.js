// Builds a running order of cards for a show, Make Some Noise style:
// solos, then pairs, then everyone, with minigames and games in between.

export const KINDS = {
  solo: { label: 'Solo', hue: '#FF3D8B' },
  pair: { label: 'Pairs', hue: '#22D3EE' },
  direction: { label: 'New direction', hue: '#FF5A4E' },
  group: { label: 'Everyone', hue: '#FFB020' },
  minigame: { label: 'Minigame', hue: '#A3E635' },
  game: { label: 'Game', hue: '#FF6B2C' },
  more: { label: 'Do it again', hue: '#B266FF' },
  finale: { label: 'Finale', hue: '#FF3D8B' },
};

export const ROUNDS = [
  { kind: 'solo', name: 'Solos', blurb: 'One player, one prompt. All eyes on you.' },
  { kind: 'pair', name: 'Pairs', blurb: 'Two players, one scene. Find the game together.' },
  { kind: 'group', name: 'Everyone', blurb: 'The whole gang, all at once. Chaos welcome.' },
];

const POINTS = [
  '1,000 points', 'a million points', 'seven points', 'negative 40 points', 'infinity points', 'a single grape',
  'three (3) points', '12 imaginary points', 'a firm handshake', '1,000,001 points', 'four, maybe five points',
  'a gold star', 'all the points', 'half a point',
];

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const range = (n) => [...Array(n).keys()];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function makePairs(n) {
  if (n < 2) return [];
  if (n === 2) return [[0, 1], [1, 0]];
  if (n === 3) return shuffle([[0, 1], [1, 2], [2, 0]]);
  const s = shuffle(range(n));
  const out = [];
  for (let i = 0; i + 1 < s.length; i += 2) out.push([s[i], s[i + 1]]);
  if (s.length % 2) out.push([s[s.length - 1], s[0]]);
  return out;
}

function promptCard(deck, kind, players) {
  const text = deck.draw(kind);
  // An empty or missing section in prompts.md falls back to a solo prompt.
  if (!text && kind !== 'solo') return promptCard(deck, 'solo', players);
  return { type: 'prompt', kind, players, text, twists: [] };
}

function minigameCard(deck, n) {
  const [title, text] = deck.draw('minigame').split('::').map((s) => s.trim());
  return { type: 'minigame', kind: 'minigame', title, text, players: range(n), twists: [] };
}

function gameCard(deck, n, opts, avoid = []) {
  // Only games this many players can play, and only the kinds that are switched on.
  const playable = (line) => {
    const [name, , , count] = line.split('::').map((s) => s.trim());
    if ((parseInt(count, 10) || 1) > n) return false;
    return /karaoke/i.test(name) ? opts.karaoke : opts.games;
  };
  const line = deck.draw('games', avoid, playable);
  return line ? buildGame(deck, line, n) : minigameCard(deck, n);
}

function buildGame(deck, line, n) {
  const [name, rules, spec = '', count] = line.split('::').map((s) => s.trim());
  const draws = spec
    .split('+')
    .map((s) => s.trim())
    .filter((s) => s && s !== 'none')
    .map((s) => {
      const m = s.match(/^(\w+):(\d+)(!?)$/);
      if (!m) return null;
      return { list: m[1], items: deck.drawMany(m[1], +m[2]), secret: !!m[3], revealed: false };
    })
    .filter(Boolean);
  const want = parseInt(count, 10);
  const players = want && want < n ? shuffle(range(n)).slice(0, want) : range(n);
  return { type: 'game', kind: 'game', name, rules, draws, players, twists: [], line };
}

function titleCard(roundIndex, n) {
  const r = ROUNDS[roundIndex];
  return { type: 'title', kind: r.kind, round: roundIndex + 1, name: r.name, blurb: r.blurb, players: range(n) };
}

function finaleCard(deck, n) {
  const reasons = deck.drawMany('awards', n);
  const points = shuffle(POINTS);
  return {
    type: 'finale',
    kind: 'finale',
    players: range(n),
    awards: range(n).map((i) => ({ player: i, points: points[i % points.length], reason: reasons[i] })),
  };
}

export function buildShow(deck, n, opts) {
  if (opts.length === 'shuffle') {
    return [{ type: 'title', kind: 'more', round: '∞', name: 'Shuffle', blurb: 'Anything goes. Keep hitting next.', players: range(n) }, ...range(6).map(() => randomCard(deck, n, opts))];
  }

  const quick = opts.length === 'quick';
  const cards = [];
  const order = shuffle(range(n));
  const gamesThisShow = [];
  const interlude = (wantGame) => {
    if (wantGame && (opts.games || opts.karaoke)) {
      const game = gameCard(deck, n, opts, gamesThisShow);
      if (game.line) gamesThisShow.push(game.line);
      cards.push(game);
    } else if (opts.minigames) cards.push(minigameCard(deck, n));
  };

  // Round 1: solos
  cards.push(titleCard(0, n));
  const soloists = n === 1 ? [0, 0, 0] : quick ? order.slice(0, Math.min(n, 3)) : order;
  soloists.forEach((p) => cards.push(promptCard(deck, 'solo', [p])));
  if (!quick) cards.push(promptCard(deck, 'direction', [order[order.length - 1]]));
  interlude(false);

  // Round 2: pairs
  const pairs = makePairs(n);
  if (pairs.length) {
    cards.push(titleCard(1, n));
    (quick ? pairs.slice(0, 2) : pairs).forEach((pr) => cards.push(promptCard(deck, 'pair', pr)));
    interlude(true);
  }

  // Round 3: everyone
  cards.push(titleCard(2, n));
  range(quick ? 1 : 2).forEach(() => cards.push(promptCard(deck, 'group', range(n))));
  if (!quick) {
    interlude(false);
    interlude(true); // a second game to close the show
  }

  cards.push(finaleCard(deck, n));
  numberRounds(cards);
  return cards;
}

function numberRounds(cards) {
  let round = 0;
  let group = [];
  const flush = () => group.forEach((c, i) => Object.assign(c, { round, pos: i + 1, of: group.length }));
  for (const c of cards) {
    if (c.type === 'title') {
      flush();
      round = c.round;
      group = [];
    } else if (c.type === 'prompt') group.push(c);
  }
  flush();
}

export function randomCard(deck, n, opts) {
  const weights = [
    ['solo', 30],
    ['direction', 8],
    ['pair', n >= 2 ? 30 : 0],
    ['group', 16],
    ['minigame', opts.minigames ? 10 : 0],
    ['game', opts.games || opts.karaoke ? 10 : 0],
  ];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  let kind = 'solo';
  for (const [k, w] of weights) {
    if ((r -= w) < 0) {
      kind = k;
      break;
    }
  }
  if (kind === 'minigame') return minigameCard(deck, n);
  if (kind === 'game') return gameCard(deck, n, opts);
  const players = kind === 'solo' || kind === 'direction' ? [pick(range(n))] : kind === 'pair' ? shuffle(range(n)).slice(0, 2) : range(n);
  return promptCard(deck, kind, players);
}

export function encoreCards(deck, n, opts) {
  return [
    { type: 'title', kind: 'more', round: '∞', name: 'Encore', blurb: 'The show is over. The show is never over.', players: range(n) },
    randomCard(deck, n, opts),
  ];
}

export function reroll(deck, card, n, opts) {
  if (card.type === 'prompt') return { ...card, text: deck.draw(card.kind), twists: [] };
  if (card.type === 'minigame') return minigameCard(deck, n);
  if (card.type === 'game') return gameCard(deck, n, opts);
  if (card.type === 'finale') return finaleCard(deck, n);
  return card;
}

export function addTwist(deck, card) {
  const text = deck.draw('more').replace(/^(\.\.\.|…)?\s*but\s+/i, '');
  return { ...card, twists: [...(card.twists || []), text] };
}
