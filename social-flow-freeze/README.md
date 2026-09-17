# What to Say When You Freeze After Saying Hi — Line-Art Explainer

Self-playing animated explainer for the Social Flow channel's video
*"What to Say When You Freeze After Saying Hi."* Single static HTML page —
no build step, no deps. Open `index.html` locally or serve the folder from
any static host.

## Design system (from the production package)

- **Canvas:** true black `#000000`, pure white line work `#FFFFFF`
- **Accents (one job each):** `#FF3B30` stop / X · `#34C759` go / ✓ ·
  `#FFD60A` pointer · `#FF3D8F` tension (reserved, not used in this cut)
- **Type:** Anton (display / move-title stamps / big claims) + Archivo
  (VO, captions, UI) — both Google Fonts, mirrored across the channel
- **Cuts:** hard cuts only, no dissolves — matches Line System §12
- **Runtime:** 4:30 · 26 beats mapping onto the Six-Beat Skeleton
  (Problem → Promise → Reframe → Path → Pitfall → Payoff), resequenced
  Problem → Promise per the script's note

## What's in it

- Mascot rendered as pure white SVG line-art on the true-black canvas,
  with four swappable expressions (neutral, freeze, blank, speaking) and
  optional sweat drops for the freeze beat
- The three named moves (Reset · Detail · Echo) each get: a title-stamp
  beat, a wrong-move beat (buzzer + red X), a right-move beat (pop + chime
  + green ✓), and a quote card (bed ducks · 300 ms hush both sides)
- Climax move ("Sorry, I completely lost my train of thought — what were
  you saying?") + its own quote card
- CTA aside dropped at ~55% per the mid-roll rule
- Payoff recap tiles + the hook callback: red-strike MEMORY PROBLEM ·
  green LISTENING PROBLEM
- Transport (play / pause / restart / scrub / 0.5×, 1×, 2×), beat chips,
  and a live Now Playing panel showing the beat's foley cue

## Controls

- Space toggles play/pause
- ← / → seek ±5s
- Home / End jump to start/end
- Click a chip to jump to any beat
