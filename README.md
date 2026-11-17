# gta6-01
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/luckyind2020/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/luckyind2020/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
**Sunset Bay** — a fully original 2D top-down open-world crime game in vanilla JS canvas (no libraries, no network). Explore a sun-soaked coastal city on foot and by car, steal cars, outrun the SBPD, and run five story missions for Rico, the fixer who owns this town.

What is in the game: a street-grid city with a beach, parks and palms; traffic cars and pedestrians with simple AI; cars to steal and drive (E); a wanted level (1–5 stars) with police cars that chase and ram plus foot cops; 5 missions with markers, dialogue and cash rewards; on-foot combat (punch), car damage, player health; a HUD with cash, health, wanted stars, mission objective, speed and a live minimap; start screen, pause, game over / busted, and progress saved to localStorage; synthesized WebAudio sound (engine hum, sirens, pickup blips — no audio files). Deterministic staged scenes via `?shot=start|drive|chase|mission` for reproducible screenshots.

## Run it
```sh
node serve.ts
```
(open http://localhost:8080)

Controls: WASD/arrows move & drive · E steal/exit car · Space punch · Shift boost/nitro · P pause · M mute.
<sub>Entered on [make.fun](https://make.fun/?ref=4ha9jy2z&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
