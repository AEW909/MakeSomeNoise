# Make Some Noise

A big-screen improv party game in the style of Dropout's *Make Some Noise*, with a few *Whose Line Is It Anyway?* games mixed in. Pick 1–8 players and the app runs the show: solos and a "new direction" famous line, then pairs, then everyone, with minigames and games in between. Any prompt can get a "…but more" twist, and with "Surprise twists" on, about one prompt in four gets one on its own after a few seconds.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/, host it anywhere
```

## Controls

| Key | Action |
| --- | --- |
| Space / → / Enter / PageDown | Next card (presentation clickers work too) |
| ← / PageUp | Back |
| M | "Do it again, but…" twist |
| R | Swap for a new prompt |
| H | Reveal hidden quirks or identities in Whose Line games |
| F | Fullscreen |
| S | Sound on/off |
| Esc | Menu (you can resume the show from there) |

The controls fade out when the mouse sits still.

## Editing prompts

Every prompt lives in [`src/prompts.md`](src/prompts.md). Crude and sexual cards go in the `## adult …` sections at the bottom, which are only used when "Adult (18+)" is on in the menu. Add a `- ` line under a section and it's in the deck; the file's header explains the format. The app remembers which prompts you've seen, in your browser, and won't repeat one until its section has run out. "Reset seen prompts" on the menu clears that.
