import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN ?? '',
  clientId: process.env.DISCORD_CLIENT_ID ?? '',
  guildId: process.env.DISCORD_GUILD_ID ?? '',
};

export const GAME = {
  startingClouds: 120,
  startingPuffs: 500,
  maxBattery: 100,
  hitBatteryCost: 4,
  hitPuffCost: 1,
  hitCooldownMs: 8_000,
  chargeCooldownMs: 3 * 60_000,
  chargeAmount: 100,
  dailyCooldownMs: 20 * 60 * 60_000,
  raidCooldownMs: 2 * 60 * 60_000,
  jackCooldownMs: 45 * 60_000,
  chaseCooldownMs: 10 * 60_000,
  smokeoutCooldownMs: 15 * 60_000,
  rouletteCost: 60,
  gifCost: 20,
  wrapCost: 280,
  labCost: 220,
  vibeCost: 35,
  renderCost: 25,
  maxCustomSkins: 8,
  maxCustomFlavors: 6,
  podCapacity: 500,
  raidMinPercent: 0.1,
  raidMaxPercent: 0.28,
  jackFailBurnChance: 0.12,
  prestigeMinLevel: 15,
};

export function validateConfig() {
  if (!config.token) {
    throw new Error('Missing DISCORD_TOKEN in .env');
  }
  if (!config.clientId) {
    throw new Error('Missing DISCORD_CLIENT_ID in .env');
  }
}

export function levelFromXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 28)) + 1;
}

export function xpForLevel(level) {
  return (level - 1) * (level - 1) * 28;
}

export function formatMs(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}
