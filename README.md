# Geek Bar Bot

A heist-style Discord bot themed around a Geek Bar. It generates its own GIFs and posters locally with canvas — no image API key required.

This is a **fictional game**. It is not affiliated with Geek Bar or Dream Big.

## Commands

### Device
| Command | Description |
|---------|-------------|
| `/geekbar hit` | Take a hit. Drains battery and puffs, earns XP/clouds, renders a vapor GIF |
| `/geekbar charge` | Plug in and recharge |
| `/geekbar customize` | **Modal** to rename your device and set a tagline |
| `/geekbar flavor` | Swap flavor pods |
| `/geekbar stats` | Generated stats card for you or another user |
| `/geekbar profile` | Full profile card |
| `/geekbar flex` | Show-off GIF of your current setup |
| `/geekbar repair` | Fix a burnt coil |
| `/geekbar prestige` | Reset XP at level 15+ for Onyx wrap, Prestige Fog, and an XP bonus |

### Economy
| Command | Description |
|---------|-------------|
| `/geekbar daily` | Clouds, puff top-off, battery bump |
| `/geekbar shop` | Buy kits, flavors, wraps |
| `/geekbar inventory` | What you own |
| `/geekbar stash` | Hide clouds from raids (positive = deposit, negative = withdraw) |
| `/geekbar gift` | Send clouds |
| `/geekbar leaderboard` | Hits, XP, clouds, or stash |

### Heist
| Command | Description |
|---------|-------------|
| `/geekbar heist raid @user` | Steal unstashed clouds |
| `/geekbar heist jack @user` | Higher risk steal — getting caught can burn your coil |
| `/geekbar heist chase` | Timing minigame, click **CLOUD** |
| `/geekbar heist smokeout @user` | PvP cloud battle |
| `/geekbar heist bounty @user` | **Modal** to put clouds on someone |
| `/geekbar heist roulette` | Gamble clouds for a random flavor |
| `/geekbar heist board` | Active bounties |
| `/geekbar heist spot` | Raid a corner store, smoke shop, or warehouse |
| `/geekbar heist wire` | Cut 3 wires in order — high payout minigame |
| `/geekbar heist vanish` | Smoke bomb: 2 hour raid shield |

### Cloud minigames
| Command | Description |
|---------|-------------|
| `/cloud slots` | Spin reels, optional bet |
| `/cloud flip` | Heads or tails |
| `/cloud pack` | Mystery pack — pods, wraps, or clouds |
| `/cloud chain` | Triple-hit combo GIF (can burn the coil) |
| `/cloud lucky` | Lucky puff with a rare jackpot |
| `/cloud drop` | Pick the live crate |
| `/cloud drip` | Collect idle clouds |
| `/cloud inspect` | Cloud rating card |

### Studio (GIFs + image modals)
| Command | Description |
|---------|-------------|
| `/geekbar studio vibe` | **Modal** — prompt, caption, color, intensity → custom GIF |
| `/geekbar studio render` | **Modal** — poster title/quote/color → PNG |
| `/geekbar studio lab` | **Modal** — mix a custom flavor pod |
| `/geekbar studio gif` | Animate an uploaded image (pulse, vapor, glitch, drip, …) |
| `/geekbar studio neon` | **Modal** — flickering neon sign GIF |
| `/geekbar studio sticker` | **Modal** — sticker PNG |
| `/geekbar studio card` | Render a fresh stats PNG |
| `/geekbar studio skins` | List wraps |
| `/geekbar studio equip` | Equip a wrap |
| `/geekbar help` | Command list |

### Memes
| Command | Description |
|---------|-------------|
| `/kingvamp` | Dadaman Carti GIF |
| `/perkpop` | Trippy California GIF |

## Local setup

### 1. Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications)
2. New Application → **Bot** → Reset Token → copy it
3. Copy the **Application ID**
4. **Bot** → enable no extra privileged intents (this bot only needs slash commands)
5. **Installation** → Guild Install scopes: `bot`, `applications.commands`

### 2. Configure

```bash
copy .env.example .env
```

Edit `.env`:

```
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
DISCORD_GUILD_ID=your_server_id
```

`DISCORD_GUILD_ID` is recommended for local use so slash commands register instantly on your server.

### 3. Install and run

```bash
npm install
npm start
```

The bot registers `/geekbar` on startup when `DISCORD_GUILD_ID` is set.

Invite URL:

```bash
npm run invite
```

Or register commands without starting:

```bash
npm run deploy-commands
```

## Game notes

- **Battery** — each hit costs 4%. Charge to refill (3 min cooldown).
- **Pods** — 500 puffs. Swap a flavor or buy a refill when empty.
- **Clouds** — currency. Earn from hits, dailies, chases, and heists.
- **Stash** — raid/jack only steal unstashed clouds. Shield item blocks heists for 24h.
- **Burnt coil** — failed jacks can burn the device until you repair it.
- GIFs and posters are generated on the machine running the bot (`@napi-rs/canvas` + `gifenc`).

## Requirements

- Node.js 18+
- Windows, macOS, or Linux
