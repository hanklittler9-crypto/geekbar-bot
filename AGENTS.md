# AGENTS.md

## Cursor Cloud specific instructions

This repo is **Geek Bar Bot**, a single Node.js (ESM) Discord bot. Its distinctive core is
local image generation: it renders animated GIFs and PNG posters on-device with
`@napi-rs/canvas` + `gifenc`, backed by a local SQLite database (`better-sqlite3`).
There is only one service (the bot process); there is no web frontend.

### Running / building / testing
- Standard commands live in `package.json` and `README.md`: `npm start` (run the bot),
  `npm run deploy-commands` (register slash commands), `npm run invite` (print invite URL).
- There is **no build step**, **no lint script**, and **no test suite** in this repo. Do not
  expect `npm run lint`/`npm test` to exist.

### Non-obvious caveats
- The bot requires `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` to run. `validateConfig()` in
  `src/config.js` throws and the process exits immediately if either is missing. `DISCORD_GUILD_ID`
  is optional (guild-scoped instant command registration). Provide these via Cursor secrets /
  a local `.env` (see `.env.example`). Without a valid token the bot boots fully and only fails
  at the Discord login step (`TokenInvalid`).
- The core rendering + DB layers do **not** need Discord. You can exercise them directly by
  importing `src/utils/gifGenerator.js` (`renderSceneGif`, `renderStatsCard`, `renderStill`,
  `renderImageGif`) and `src/database/db.js` — useful for verifying changes without a bot token.
- SQLite lives at `data/geekbar.db` (WAL mode). It is created automatically on first import of
  `src/database/db.js` and is gitignored (`data/*.db*`). Delete the `data/*.db*` files to reset state.
- Native modules `better-sqlite3` and `@napi-rs/canvas` rely on prebuilt binaries pulled during
  install; a plain `npm ci` handles this on Linux.
- Text rendering uses system fonts. On Linux it registers DejaVu Sans (present in this image);
  if unavailable it falls back to `sans-serif`, so rendering never hard-fails on missing fonts.
