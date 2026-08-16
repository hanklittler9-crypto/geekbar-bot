import 'dotenv/config';

const rawGuild = process.env.DISCORD_GUILD_ID ?? '';

export const config = {
  token: process.env.DISCORD_TOKEN ?? '',
  clientId: process.env.DISCORD_CLIENT_ID ?? '',
  guildId: /^\d{17,20}$/.test(rawGuild) ? rawGuild : '',
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
  slotsCooldownMs: 20_000,
  packCost: 90,
  packCooldownMs: 3 * 60_000,
  chainCooldownMs: 45_000,
  luckyCooldownMs: 25 * 60_000,
  dropCooldownMs: 8 * 60_000,
  flipCooldownMs: 12_000,
  dripCooldownMs: 30 * 60_000,
  wireCooldownMs: 6 * 60_000,
  vanishCost: 180,
  vanishMs: 2 * 60 * 60_000,
  neonCost: 15,
  stickerCost: 15,
  crashCooldownMs: 15_000,
  nightCooldownMs: 4 * 60 * 60_000,
  diceCooldownMs: 12_000,
  wheelCooldownMs: 18_000,
  scratchCooldownMs: 45_000,
  lockpickCooldownMs: 8 * 60 * 60_000,
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
