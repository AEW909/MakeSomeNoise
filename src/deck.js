// Parses prompts.md into sections and lists, and deals cards without
// repeating any until a section's been used up (remembered across sessions).

const MEMORY_KEY = 'msn-used-v1';
const ADULT = 'adult:';
const ADULT_SHARE = 0.35;

export function parseDeck(md) {
  const sections = {};
  const lists = {};
  let current = null;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      // "## solo", "## adult solo", "## list hat", "## list adult hat"
      const [, isList, isAdult, base] = heading[1].trim().toLowerCase().match(/^(list\s+)?(adult\s+)?(\S+)/);
      const key = (isAdult ? 'adult:' : '') + base;
      current = isList ? (lists[key] = []) : (sections[key] = []);
      continue;
    }
    if (current && line.startsWith('- ')) current.push(line.slice(2).trim());
  }
  return { sections, lists };
}

export class Deck {
  constructor({ sections, lists }) {
    this.pools = { ...lists, ...sections };
    this.adult = false;
    try {
      this.used = JSON.parse(localStorage.getItem(MEMORY_KEY)) || {};
    } catch {
      this.used = {};
    }
  }

  save() {
    try {
      localStorage.setItem(MEMORY_KEY, JSON.stringify(this.used));
    } catch {}
  }

  size(name) {
    return (this.pools[name] || []).length + (this.adult ? (this.pools[ADULT + name] || []).length : 0);
  }

  // With adult mode on, about a third of draws come from the adult version of
  // a section, when it has one. Otherwise only the family deck is used.
  draw(name, avoid = [], eligible = () => true) {
    const adultKey = ADULT + name;
    const hasAdult = this.adult && (this.pools[adultKey] || []).some(eligible);
    const hasFamily = (this.pools[name] || []).some(eligible);
    const useAdult = hasAdult && (!hasFamily || Math.random() < ADULT_SHARE);
    return this.drawFrom(useAdult ? adultKey : name, avoid, eligible);
  }

  // `eligible` narrows the pool (e.g. games that suit this many players), so
  // cards we can't use are never marked as seen.
  drawFrom(name, avoid = [], eligible = () => true) {
    const pool = (this.pools[name] || []).filter(eligible);
    if (!pool.length) return '';
    let used = new Set(this.used[name] || []);
    let fresh = pool.filter((p) => !used.has(p) && !avoid.includes(p));
    if (!fresh.length) {
      // Only recycle the eligible cards; the rest keep their seen status.
      pool.forEach((p) => used.delete(p));
      fresh = pool.filter((p) => !avoid.includes(p));
      if (!fresh.length) fresh = pool;
    }
    const pick = fresh[Math.floor(Math.random() * fresh.length)];
    used.add(pick);
    this.used[name] = [...used];
    this.save();
    return pick;
  }

  drawMany(name, n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(this.draw(name, out));
    return out;
  }

  forget() {
    this.used = {};
    this.save();
  }
}
