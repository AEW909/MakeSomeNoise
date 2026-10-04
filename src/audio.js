// Tiny synthesized stings. No audio files, nothing to load.

let ctx;
let enabled = true;

export const setSound = (on) => (enabled = on);

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, { type = 'triangle', gain = 0.16, to } = {}) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function play(fn) {
  if (!enabled) return;
  try {
    fn(ac().currentTime);
  } catch {}
}

export const reveal = () =>
  play((t) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.055, 0.6)));

export const twist = () =>
  play((t) => {
    tone(220, t, 0.45, { type: 'sawtooth', gain: 0.06, to: 880 });
    tone(1318.5, t + 0.32, 0.5, { gain: 0.12 });
  });

export const round = () =>
  play((t) => {
    tone(110, t, 0.5, { type: 'sine', gain: 0.4, to: 55 });
    [392, 493.88, 587.33, 783.99].forEach((f) => tone(f, t + 0.12, 1.1, { gain: 0.08 }));
  });

export const fanfare = () =>
  play((t) =>
    [523.25, 523.25, 523.25, 698.46, 880, 1046.5].forEach((f, i) =>
      tone(f, t + [0, 0.12, 0.24, 0.36, 0.6, 0.84][i], i === 5 ? 1.4 : 0.22, { type: 'square', gain: 0.06 })
    )
  );

// A quick two-tone alarm for surprise twists.
export const surprise = () =>
  play((t) => [0, 1, 2, 3].forEach((i) => tone(i % 2 ? 660 : 990, t + i * 0.13, 0.12, { type: 'square', gain: 0.07 })));

export const tick =() => play((t) => tone(1200, t, 0.06, { type: 'sine', gain: 0.05 }));
