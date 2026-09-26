# Portfolio showcase film

Editorial product film, adapted to the project's paper/teal visual design. Male narration by **Eric** (ElevenLabs), genuine local app screenshots, an actual live MCP investigation, burned captions, and an original synthesized instrumental arrangement. Scene lengths and captions follow the voice alignment; the current cut is 80 seconds. The earlier George version is preserved locally under `output/showcase-video/versions/george/`.

Outputs are local and ignored under `output/showcase-video/`. No application routes or deployment configuration are changed. Production does not publish anything.

## Rebuild

Requires Node 24, Chrome, the project's Playwright dependency, Python with NumPy, and FFmpeg at `output/showcase-video/tools/ffmpeg.exe`. FFmpeg is a local production dependency, not a redistributable included in the project source.

1. Run the existing application preview and local live service. `node scripts/showcase-video/capture.mjs` captures the real UI and makes one live AI request. This consumes the existing API quota. It does not mock answers. Inspect the captured transcript and images before rendering; different responses may require adjusting the PR reference or call-count label in `film.html`.
2. Provide `ELEVEN_LABS_API_KEY` or `ELEVENLABS_API_KEY` securely in the process environment. `node scripts/showcase-video/narrate.mjs` generates one continuous voice take, caches it, and saves character alignment. No key is written to production outputs. Delete only the cached narration files if deliberately regenerating speech; production may consume provider credits.
3. `node scripts/showcase-video/prepare.mjs` builds scene timing and caption files from the actual speech alignment.
4. `python scripts/showcase-video/music.py` composes the original music bed.
5. `node scripts/showcase-video/render.mjs --storyboard` validates layout and saves eight scene checks. Inspect them before rendering.
6. `node scripts/showcase-video/render.mjs` renders native 3840×2160 at 30 fps. Run only one renderer at a time.
7. `python scripts/showcase-video/finish.py` mixes narration and music, exports 4K and 1080p H.264/AAC, performs complete decodes, measures loudness, and saves a poster and delivery report. It does not speed up or pitch-shift narration.
8. Run `node scripts/showcase-video/review.mjs` to rebuild the player with the current voice, duration, and chapter times. Run `node scripts/showcase-video/serve.mjs` for a loopback-only player on port 4196, then `node scripts/showcase-video/verify.mjs` to check media playback, chapters, downloads, and mobile layout.

## Provenance

- All displayed people, code snippets, and PRs are fictional records from this project.
- The MCP trace is an actual local live run. Film timing is edited; it is not a wall-clock latency benchmark or a representation of private model reasoning.
- The guided replay shown is an existing validated recording.
- Narration is a stock synthetic male voice, not an imitation of Jarrod Savard.
- Music is independently synthesized by `music.py`; no recruiter-video soundtrack is reused.
- Fonts: Newsreader and DM Sans, under their supplied SIL Open Font License notices.
- Source screenshots and narration remain separate for future edits. No secrets or raw private host exports are included.

Copyright 2026 Jarrod Savard. No broader reuse license is granted by these production files. Dependency licenses remain applicable.
