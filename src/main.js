import './style.css';
import deckMd from './prompts.md?raw';
import { parseDeck, Deck } from './deck.js';
import { KINDS, buildShow, randomCard, encoreCards, reroll, addTwist } from './show.js';
import * as sfx from './audio.js';

const COLORS = ['#FF3D8B', '#22D3EE', '#FFB020', '#A3E635', '#B266FF', '#FF6B2C', '#4D7CFF', '#2EF2A0'];
const LIST_LABELS = {
  hat: 'From the hat',
  styles: 'Styles to call out',
  quirks: 'Secret quirks',
  identities: 'Secret identities',
  settings: 'Setting',
  tasks: 'The task',
  topics: 'Topic',
  worsts: 'The world’s worst…',
  crises: 'The crisis',
  newsflash: 'What’s really happening',
  letters: 'Starting letter',
  songs: 'Song title',
  genres: 'In the style of',
};
const SETUP_KEY = 'msn-setup-v1';

const deck = new Deck(parseDeck(deckMd));
const app = document.querySelector('#app');

let setup = loadSetup();
deck.adult = !!setup.adult;
let show = null; // { players, cards, i }

// ---------- helpers ----------

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function loadSetup() {
  const fallback = {
    count: 3,
    names: [],
    length: 'full',
    minigames: true,
    games: true,
    karaoke: true,
    surprise: true,
    adult: false,
    sound: true,
  };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(SETUP_KEY)) };
  } catch {
    return fallback;
  }
}

function saveSetup() {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
  } catch {}
}

function setLights(c1, c2, c3) {
  const root = document.documentElement.style;
  root.setProperty('--c1', c1);
  root.setProperty('--c2', c2);
  root.setProperty('--c3', c3);
}

function surge() {
  document.body.classList.remove('surge');
  void document.body.offsetWidth;
  document.body.classList.add('surge');
}

// ---------- background stage (persistent) ----------

function mountStage() {
  const bars = Array.from({ length: 48 }, (_, i) => {
    const d = (0.5 + Math.random() * 0.9).toFixed(2);
    const o = (-Math.random() * 2).toFixed(2);
    const h = (0.25 + Math.random() * 0.75).toFixed(2);
    return `<i style="--d:${d}s;--o:${o}s;--h:${h};--x:${i}"></i>`;
  }).join('');
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<div class="bg" aria-hidden="true">
      <div class="light l1"></div><div class="light l2"></div><div class="light l3"></div>
      <div class="beam b1"></div><div class="beam b2"></div><div class="beam b3"></div><div class="beam b4"></div>
      <div class="spot"></div>
      <div class="floor"></div>
      <div class="eq">${bars}</div>
      <div class="grain"></div>
    </div>`
  );
}

// ---------- setup screen ----------

function renderSetup() {
  document.body.dataset.screen = 'setup';
  setLights(COLORS[0], COLORS[1], COLORS[2]);
  const letters = 'noise'
    .split('')
    .map((ch, i) => `<span style="--pc:${COLORS[i]};--i:${i}">${ch}</span>`)
    .join('');
  const total = ['solo', 'pair', 'group', 'minigame', 'games'].reduce((s, k) => s + deck.size(k), 0);

  app.innerHTML = `
    <div class="setup">
      <h1 class="logo" aria-label="Make some noise">
        <span class="logo-a">Make</span><span class="logo-b">some</span><span class="logo-c">${letters}</span>
      </h1>
      <p class="tagline">An improv game show for your living room</p>

      <section class="panel">
        <div class="field">
          <h2>How many players?</h2>
          <div class="count" role="radiogroup" aria-label="Number of players">
            ${Array.from({ length: 8 }, (_, i) => `<button role="radio" aria-checked="${setup.count === i + 1}" data-count="${i + 1}" style="--pc:${COLORS[i]}">${i + 1}</button>`).join('')}
          </div>
        </div>
        <div class="names"></div>

        <div class="field">
          <h2>Show length</h2>
          <div class="seg" role="radiogroup" aria-label="Show length">
            ${[
              ['quick', 'Quick', 'One taste of each round'],
              ['full', 'Full show', 'Everyone solos, pairs, the lot'],
              ['shuffle', 'Shuffle', 'Endless random cards'],
            ]
              .map(([v, label, sub]) => `<button role="radio" aria-checked="${setup.length === v}" data-length="${v}"><b>${label}</b><span>${sub}</span></button>`)
              .join('')}
          </div>
        </div>

        <div class="field">
          <h2>Include</h2>
          <div class="toggles">
            ${[
              ['minigames', 'Minigames'],
              ['games', 'Whose Line games'],
              ['karaoke', 'Karaoke'],
              ['surprise', 'Surprise twists'],
              ['sound', 'Sound'],
              ['adult', 'Adult (18+)'],
            ]
              .map(([k, label]) => `<button class="toggle toggle-${k}" aria-pressed="${!!setup[k]}" data-toggle="${k}"><span class="knob"></span>${label}</button>`)
              .join('')}
          </div>
        </div>

        <div class="actions">
          ${show ? '<button class="ghost" data-act="resume">Resume show</button>' : ''}
          <button class="go" data-act="start">Start the show <span aria-hidden="true">→</span></button>
        </div>
      </section>

      <p class="hint"><kbd>Space</kbd> next <kbd>M</kbd> …but more <kbd>R</kbd> new prompt <kbd>←</kbd> back <kbd>F</kbd> fullscreen <kbd>Esc</kbd> menu</p>
      <p class="foot">${total} prompts and games in the deck · <button class="link" data-act="forget">Reset seen prompts</button></p>
    </div>`;

  renderNames();

  app.querySelector('.count').addEventListener('click', (e) => {
    const b = e.target.closest('[data-count]');
    if (!b) return;
    readNames();
    setup.count = +b.dataset.count;
    saveSetup();
    app.querySelectorAll('[data-count]').forEach((x) => x.setAttribute('aria-checked', x === b));
    renderNames();
  });
  app.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-length]');
    if (!b) return;
    setup.length = b.dataset.length;
    saveSetup();
    app.querySelectorAll('[data-length]').forEach((x) => x.setAttribute('aria-checked', x === b));
  });
  app.querySelector('.toggles').addEventListener('click', (e) => {
    const b = e.target.closest('[data-toggle]');
    if (!b) return;
    const k = b.dataset.toggle;
    setup[k] = !setup[k];
    b.setAttribute('aria-pressed', setup[k]);
    deck.adult = !!setup.adult;
    saveSetup();
  });
  app.querySelector('[data-act="start"]').addEventListener('click', startShow);
  app.querySelector('[data-act="resume"]')?.addEventListener('click', () => renderShow('enter'));
  app.querySelector('[data-act="forget"]').addEventListener('click', (e) => {
    deck.forget();
    e.target.textContent = 'Done, every prompt is fresh again';
  });
}

function renderNames() {
  const wrap = app.querySelector('.names');
  wrap.innerHTML = Array.from({ length: setup.count }, (_, i) => {
    const name = setup.names[i] || '';
    return `<label class="name" style="--pc:${COLORS[i]};--i:${i}">
      <span class="dot" aria-hidden="true">${i + 1}</span>
      <input type="text" maxlength="16" placeholder="Player ${i + 1}" value="${esc(name)}" aria-label="Player ${i + 1} name" />
    </label>`;
  }).join('');
  wrap.querySelectorAll('input').forEach((input) =>
    input.addEventListener('input', () => {
      readNames();
      saveSetup();
    })
  );
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startShow();
  });
}

function readNames() {
  const inputs = app.querySelectorAll('.names input');
  inputs.forEach((input, i) => (setup.names[i] = input.value.trim()));
}

function startShow() {
  readNames();
  saveSetup();
  sfx.setSound(setup.sound);
  const players = Array.from({ length: setup.count }, (_, i) => ({
    name: setup.names[i] || `Player ${i + 1}`,
    color: COLORS[i],
  }));
  show = { players, cards: buildShow(deck, players.length, setup), i: 0 };
  renderShow('enter');
}

// ---------- show screen ----------

function renderShow(mode = 'enter') {
  document.body.dataset.screen = 'show';
  if (!app.querySelector('.show')) {
    app.innerHTML = `
      <div class="show">
        <header class="hud">
          <button class="brand" data-act="menu" aria-label="Back to menu">Make <b>some</b> noise</button>
          <div class="hud-right">
            <span class="progress"></span>
            <button class="icon" data-act="sound" aria-label="Toggle sound"></button>
            <button class="icon" data-act="fullscreen" aria-label="Toggle fullscreen">⛶</button>
          </div>
        </header>
        <main class="card-wrap"><article id="card" class="card" aria-live="polite"></article></main>
        <nav class="controls" aria-label="Show controls">
          <button data-act="back" aria-label="Previous card"><span aria-hidden="true">←</span> Back</button>
          <button data-act="reroll"><span aria-hidden="true">↻</span> New prompt</button>
          <button data-act="more" class="more">…but more</button>
          <button data-act="next" class="next">Next <span aria-hidden="true">→</span></button>
        </nav>
      </div>`;
    app.querySelector('.show').addEventListener('click', onShowClick);
  }
  drawCard(mode);
}

function playerChips(ids) {
  return `<div class="players">${ids
    .map((p, i) => {
      const pl = show.players[p];
      return `<span class="chip" style="--pc:${pl.color};--i:${i}">${esc(pl.name)}</span>`;
    })
    .join('')}</div>`;
}

const CONNECTORS =
  /\s(who|whose|that|but|where|when|with|and their|and the|and a|and an|at|in|on|over|trying|fighting|arguing|negotiating|reacting|discovering|explaining|describing|reviewing|giving|selling|doing|having|asking|announcing|covering|reporting|interviewing|judging|teaching|planning|guarding|calling|realizing|learning|reading|running|tour)\s/i;

function words(text, startIndex = 0) {
  let n = startIndex;
  return text
    .split(/\s+/)
    .map((w) => `<span class="w" style="--i:${n++}">${esc(w)}</span>`)
    .join(' ');
}

function promptMarkup(text, kind) {
  if (kind === 'direction') {
    // A famous line: the whole thing gets the accent treatment.
    const size = text.length > 45 ? 'l' : text.length > 24 ? 'm' : 's';
    return `<h1 class="prompt quote size-${size}"><em>${words(text)}</em></h1>`;
  }
  const m = text.slice(4).match(CONNECTORS);
  let head = text;
  let tail = '';
  if (m) {
    const at = m.index + 4;
    head = text.slice(0, at);
    tail = text.slice(at + 1);
  } else {
    const parts = text.split(/\s+/);
    if (parts.length > 3) {
      head = parts.slice(0, -2).join(' ');
      tail = parts.slice(-2).join(' ');
    }
  }
  const headCount = head.split(/\s+/).length;
  const size = text.length > 95 ? 'xl' : text.length > 65 ? 'l' : text.length > 38 ? 'm' : 's';
  return `<h1 class="prompt size-${size}">${words(head)}${tail ? ` <em>${words(tail, headCount)}</em>` : ''}</h1>`;
}

function twistsMarkup(card, mode) {
  if (!card.twists?.length) return '';
  const last = card.twists.length - 1;
  return `<div class="twists">${card.twists
    .map(
      (t, i) =>
        `<p class="twist ${i === last ? 'latest' : ''} ${mode === 'twist' && i === last ? 'pop' : ''}"><span class="but">${card.kind === 'direction' ? 'Again, but' : '…but'}</span> ${esc(t)}</p>`
    )
    .join('')}</div>`;
}

function cardMarkup(card, mode) {
  const kind = KINDS[card.kind];
  const pill = (label) => `<span class="pill">${esc(label)}</span>`;

  if (card.type === 'title') {
    return `<div class="title-card">
      <div class="round-label">Round</div>
      <div class="round-no">${card.round}</div>
      <h1 class="round-name">${esc(card.name)}</h1>
      <p class="blurb">${esc(card.blurb)}</p>
      ${playerChips(card.players)}
    </div>`;
  }

  if (card.type === 'prompt') {
    const hint = card.kind === 'direction' && !card.twists.length ? 'Say the line, then press M for new direction' : '';
    const where = card.of ? `Round ${card.round} · ${card.pos} of ${card.of}` : '';
    const meta = hint || where ? `<span class="meta">${hint || where}</span>` : '';
    return `<div class="kicker">${pill(kind.label)}${meta}</div>
      ${promptMarkup(card.text, card.kind)}
      ${twistsMarkup(card, mode)}
      ${playerChips(card.players)}`;
  }

  if (card.type === 'minigame') {
    return `<div class="kicker">${pill('Minigame')}<span class="meta">Quick-fire · anyone can go</span></div>
      <h2 class="mini-title">${esc(card.title)}</h2>
      ${promptMarkup(card.text, card.kind)}
      ${twistsMarkup(card, mode)}
      ${playerChips(card.players)}`;
  }

  if (card.type === 'game') {
    const isKaraoke = /karaoke/i.test(card.name);
    const draws = card.draws
      .map(
        (d, di) => `<div class="draw ${d.secret && !d.revealed ? 'secret' : ''}">
          <h3>${esc(LIST_LABELS[d.list] || d.list)}${
            d.secret ? `<button class="reveal" data-act="reveal" data-i="${di}">${d.revealed ? 'Hide' : 'Reveal'} <kbd>H</kbd></button>` : ''
          }</h3>
          <ul>${d.items.map((it, ii) => `<li style="--i:${ii}">${esc(it)}</li>`).join('')}</ul>
        </div>`
      )
      .join('');
    return `<div class="kicker">${pill(isKaraoke ? 'Karaoke' : 'Whose Line')}</div>
      <h1 class="game-name">${words(card.name)}</h1>
      <p class="rules">${esc(card.rules)}</p>
      <div class="draws">${draws}</div>
      ${twistsMarkup(card, mode)}
      ${playerChips(card.players)}`;
  }

  if (card.type === 'finale') {
    const confetti = Array.from({ length: 70 }, () => {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      return `<i style="--c:${c};--x:${Math.random() * 100}vw;--d:${(2.5 + Math.random() * 3).toFixed(2)}s;--o:${(-Math.random() * 5).toFixed(2)}s;--r:${Math.floor(Math.random() * 360)}deg"></i>`;
    }).join('');
    return `<div class="confetti" aria-hidden="true">${confetti}</div>
      <div class="finale">
        <p class="kick">Thank you, everyone. The points are made up and they don’t matter.</p>
        <h1>But here they are anyway</h1>
        <ol class="awards">${card.awards
          .map((a, i) => {
            const pl = show.players[a.player];
            return `<li style="--pc:${pl.color};--i:${i}"><span class="chip">${esc(pl.name)}</span><b>${esc(a.points)}</b><span>for ${esc(a.reason)}</span></li>`;
          })
          .join('')}</ol>
        <div class="finale-actions">
          <button class="go" data-act="next">Encore <span aria-hidden="true">→</span></button>
          <button class="ghost" data-act="menu">New show</button>
        </div>
      </div>`;
  }
  return '';
}

// ---------- surprise twists ----------
// Some prompts get an unrequested "…but" a few seconds after they appear.

const SURPRISE_CHANCE = 0.25;
const SURPRISE_DELAY = 3000;
const STAMP_HOLD = 1150;
let surpriseTimer;

function cancelSurprise() {
  clearTimeout(surpriseTimer);
  document.body.classList.remove('surprise');
}

function maybeSurprise() {
  const index = show.i;
  const card = show.cards[index];
  if (card.type !== 'prompt' || card.twists.length) return;
  // Roll once per card, so going back and forth doesn't re-roll it.
  if (card.surprise === undefined) card.surprise = !!setup.surprise && Math.random() < SURPRISE_CHANCE;
  if (!card.surprise) return;

  surpriseTimer = setTimeout(() => {
    if (show.i !== index || document.body.dataset.screen !== 'show') return;
    document.body.classList.add('surprise');
    app.querySelector('#card').insertAdjacentHTML(
      'beforeend',
      '<div class="stamp" aria-hidden="true"><span class="stamp-main">Wait!</span><span class="stamp-sub">Do it again, but…</span></div>'
    );
    sfx.surprise();
    surpriseTimer = setTimeout(() => {
      show.cards[index] = { ...addTwist(deck, show.cards[index]), surprise: false };
      drawCard('twist');
      surge();
      sfx.twist();
    }, STAMP_HOLD);
  }, SURPRISE_DELAY);
}

function drawCard(mode) {
  cancelSurprise();
  const card = show.cards[show.i];
  const el = app.querySelector('#card');
  const kindHue = KINDS[card.kind].hue;
  const pc = (card.players || []).map((p) => show.players[p].color);
  const others = COLORS.filter((c) => c !== kindHue);
  const lead = card.twists?.length ? KINDS.more.hue : kindHue;
  setLights(lead, pc[0] && pc[0] !== kindHue ? pc[0] : others[1], pc[1] && pc[1] !== kindHue ? pc[1] : others[3]);

  el.className = `card type-${card.type} kind-${card.kind} ${card.twists?.length ? 'twisted' : ''} ${mode === 'enter' ? 'enter' : ''}`;
  el.style.setProperty('--k', kindHue);
  el.innerHTML = cardMarkup(card, mode);

  const total = show.cards.length;
  app.querySelector('.progress').textContent = `${show.i + 1} / ${total}`;
  app.querySelector('[data-act="sound"]').textContent = setup.sound ? '♪' : '✕';
  app.querySelector('[data-act="sound"]').setAttribute('aria-pressed', setup.sound);
  app.querySelector('[data-act="back"]').toggleAttribute('disabled', show.i === 0);
  const twistable = ['prompt', 'minigame', 'game'].includes(card.type);
  app.querySelector('[data-act="more"]').hidden = !twistable;
  app.querySelector('[data-act="reroll"]').hidden = card.type === 'title';

  if (mode === 'enter') {
    surge();
    if (card.type === 'title') sfx.round();
    else if (card.type === 'finale') sfx.fanfare();
    else sfx.reveal();
    maybeSurprise();
  }
}

// ---------- actions ----------

function next() {
  const card = show.cards[show.i];
  if (show.i === show.cards.length - 1) {
    const n = show.players.length;
    show.cards.push(...(card.type === 'finale' ? encoreCards(deck, n, setup) : [randomCard(deck, n, setup)]));
  }
  show.i++;
  drawCard('enter');
}

function back() {
  if (show.i === 0) return;
  show.i--;
  drawCard('enter');
}

function more() {
  const card = show.cards[show.i];
  if (!['prompt', 'minigame', 'game'].includes(card.type)) return;
  show.cards[show.i] = addTwist(deck, card);
  drawCard('twist');
  surge();
  sfx.twist();
}

function newPrompt() {
  const card = show.cards[show.i];
  if (card.type === 'title') return;
  show.cards[show.i] = { ...reroll(deck, card, show.players.length, setup), surprise: undefined };
  drawCard('enter');
}

function reveal(index) {
  const card = show.cards[show.i];
  if (card.type !== 'game') return;
  const draws = card.draws.map((d, i) => (d.secret && (index === undefined || i === index) ? { ...d, revealed: !d.revealed } : d));
  show.cards[show.i] = { ...card, draws };
  drawCard('still');
  sfx.tick();
}

function toggleSound() {
  setup.sound = !setup.sound;
  sfx.setSound(setup.sound);
  saveSetup();
  drawCard('still');
}

function leaveShow() {
  cancelSurprise();
  renderSetup();
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

function onShowClick(e) {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.act;
  if (act === 'next') next();
  else if (act === 'back') back();
  else if (act === 'more') more();
  else if (act === 'reroll') newPrompt();
  else if (act === 'reveal') reveal(+b.dataset.i);
  else if (act === 'sound') toggleSound();
  else if (act === 'fullscreen') toggleFullscreen();
  else if (act === 'menu') leaveShow();
  b.blur();
}

document.addEventListener('keydown', (e) => {
  if (e.target.matches?.('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();
  if (key === 'f') {
    toggleFullscreen();
    return;
  }
  if (document.body.dataset.screen !== 'show') return;
  const map = {
    ' ': next,
    enter: next,
    arrowright: next,
    pagedown: next,
    arrowleft: back,
    pageup: back,
    m: more,
    r: newPrompt,
    h: () => reveal(),
    s: toggleSound,
    escape: leaveShow,
  };
  if (map[key]) {
    e.preventDefault();
    document.body.classList.add('idle');
    map[key]();
  }
});

// Hide the controls and cursor when nobody is touching the mouse.
let idleTimer;
document.addEventListener('pointermove', () => {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add('idle'), 2800);
});

mountStage();
renderSetup();
