# famuse entry handoff (for the video-editing AI)

Project: **famuse** (NOT UrbanTwin) — a private family collaboration hub where
Meta's Muse joins the family as @famuse, an AI household butler.
Live: https://famuse.a10n.workers.dev — Repo: https://github.com/hisayan/famuse

## Files in this folder

- `footage/famuse-demo.webm` — 56.7s silent screen recording (VP9, 1280x720, 25fps) of
  the REAL production app. This is the main demo footage. Do NOT replace app
  footage with generated video. Verified frame by frame:
  - 0–8s: CUT — "Joining the household…" loading screen (dead air)
  - ~8–20s: signed in as Dad, Live connection, typing
    "@famuse any lunch ideas with eggs and cheese?"
  - ~20–38s: Muse's recipe reply appears in chat
  - ~38–45s: Walked Buddy chip logs the walk, pet card updates
  - ~45–57s: Catch Me Up digest panel open
- `footage/famuse-demo2.webm` — 72s second recording (VP9, 1280x720, 25fps, silent),
  Mom's view, same production app. Use for the mid-video feature tour instead
  of re-zooming part 1:
  - 0–9s: CUT loading + sign-in as Mom (~0–6s dead air)
  - ~10–15s: switch to #groceries, send "Picking up milk and eggs…"
  - ~18–21s: attach Buddy photo + caption, send
  - ~26–31s: tap photo → fullscreen lightbox, hold, Escape to close
  - ~33–40s: household task checkbox toggled off and back on
  - ~40–55s: "@famuse what should we have for dinner tonight?" + Muse reply
  - ~66–72s: CUT static tail
  - Known blemish: the lightbox header shows the photo's generated hash
    filename — crop/zoom the shot or keep it to ≤5s.
- `footage/famuse-demo-mobile.webm` — 37s mobile-viewport clip (VP9, 390x844
  portrait, 25fps, silent), Leo's view. OPTIONAL insert: proves the app is
  fully usable on phones. Suggested use: an 8–10s beat inside the feature
  tour ("works on phones too") — frame the portrait clip inside the 16:9
  canvas (side-by-side or device-frame style). Trim elsewhere to stay under
  3:00 if you insert it.
  - 0–9s: CUT loading + sign-in as Leo
  - ~10–14s: nav drawer opens, switch to #groceries
  - ~16–20s: tap Buddy photo → fullscreen lightbox → Escape
  - ~22–30s: household panel opens, task toggled off/on, panel closes
  - ~30–35s: "Practice was great, on my way home!" sent from phone composer
- `covers/cover-cozy.jpg`, `covers/cover-tech.jpg`, `covers/cover-family.jpg` — cover art options.
  Recommended: `covers/cover-family.jpg` (Muse with the family = the theme).
- `submission-draft.md` — entry text (tagline, description, how built, tags).
- `form-answers.md` — copy-paste answers for every submission-form field.

## Theme (core message for judges)

"When Muse joins the family, everyday life changes."
Warm, happy, family-first. Selling points: open source (MIT), one-command
deploy to your own Cloudflare account, family photos and data stay in
infrastructure you control.
Name note: famuse = family + Muse, made for family use — usable in the
title card or narration if it fits.

## Requested edit — 3-MINUTE demo video (REQUIRED, max 3:00)

Target total length: 90–150 seconds. Must stay UNDER 3:00 (hard limit).

1. Cut 0–8s (loading screen). Usable footage: ~8–57s.
2. Structure:
   - 0–6s: title card from `covers/cover-family.jpg` + text "famuse — Muse joins
     your family" + living-room warmth.
   - 6–70s: app footage with English voiceover + burnt-in English subtitles.
   - 70–90s: outro card: tagline, Live URL
     (https://famuse.a10n.workers.dev), GitHub
     (https://github.com/hisayan/famuse), "Open source (MIT) — one-command
     deploy to your own Cloudflare".
3. English voiceover narration, warm and upbeat (~230 words, ~90s at
   natural pace with pauses on key visuals):

   "Meet famuse — the private family hub where Muse joins the family.
   Every family chat is the same. Dinner questions at six. Did anyone walk
   the dog? Photos lost in the scroll. And AI assistants? They live in some
   other app — outside the family's world.
   famuse flips that. Muse doesn't visit your family. It joins it.
   It's lunch time. Dad asks @famuse for ideas with eggs and cheese — and
   Muse answers right inside the chat, where everyone can see.
   One tap logs Buddy's walk for the whole household. No more
   did-anyone-feed-the-dog mysteries.
   Missed everything? Catch Me Up digests the whole day in seconds.
   Photos, tasks, dinner plans — one private hub. Open source, one-command
   deploy to your own Cloudflare, your data under your control.
   famuse: family plus Muse, made for family use. When Muse joins the
   family, everyday life changes."

4. Burn in English subtitles (match narration).
5. Output: single mp4 (H.264 + AAC, 1280x720, YouTube-ready), then upload to
   YouTube (unlisted or public) and return the watch URL.

Deadline: 2026-11-05 11:00 JST (hackathon submission closes then).
After upload, paste the YouTube URL into `submission-draft.md` and
`form-answers.md` where marked, then submit the form.
