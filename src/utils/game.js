import { GAME, formatMs, levelFromXp } from '../config.js';
import { cooldownEmbed, errorEmbed } from './embeds.js';
import { getUser, updateUser } from '../database/db.js';

export const QUEST_TYPES = {
  hit: { label: 'Take 3 hits', target: 3, reward: 90, kind: 'hit' },
  charge: { label: 'Charge once', target: 1, reward: 70, kind: 'charge' },
  raid: { label: 'Run a raid', target: 1, reward: 110, kind: 'raid' },
  chain: { label: 'Chain 3 times', target: 3, reward: 100, kind: 'chain' },
  slots: { label: 'Spin slots twice', target: 2, reward: 80, kind: 'slots' },
  flavor: { label: 'Swap a flavor', target: 1, reward: 75, kind: 'flavor' },
};

const WORLD_EVENTS = [
  { id: 'double', name: 'DOUBLE CLOUDS', desc: 'Hit and raid cloud payouts are doubled.', color: '#FFD700' },
  { id: 'rain', name: 'FLAVOR RAIN', desc: 'Hits drop extra clouds. Coils refuse to burn.', color: '#7FFFD4' },
  { id: 'vamp', name: 'VAMP HOURS', desc: 'Night hits and chains hit harder.', color: '#8B1E3F' },
  { id: 'heat', name: 'STASH HEAT', desc: 'Stash withdrawals and raids pay extra.', color: '#FF5C5C' },
  { id: 'calm', name: 'DEAD AIR', desc: 'Quiet hour. Daily quests pay extra.', color: '#9B6DFF' },
];

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function currentEvent() {
  const hour = Math.floor(Date.now() / 3_600_000);
  return WORLD_EVENTS[hour % WORLD_EVENTS.length];
}

export function eventMult(kind) {
  const e = currentEvent();
  if (e.id === 'double' && (kind === 'hit' || kind === 'raid')) return 2;
  if (e.id === 'rain' && kind === 'hit') return 1.4;
  if (e.id === 'vamp' && (kind === 'night' || kind === 'chain')) return 1.5;
  if (e.id === 'heat' && (kind === 'raid' || kind === 'stash')) return 1.6;
  return 1;
}

export function coilsSafe() {
  return currentEvent().id === 'rain';
}

export function ensureQuest(user, guildId) {
  const today = todayKey();
  if (user.last_quest_day === today && user.quest_type && QUEST_TYPES[user.quest_type]) return user;
  const keys = Object.keys(QUEST_TYPES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  return updateUser(user.user_id, guildId, {
    last_quest_day: today,
    quest_type: type,
    quest_progress: 0,
    quest_done: 0,
  });
}

export function bumpQuest(userId, guildId, kind) {
  let row = ensureQuest(getUser(userId, guildId), guildId);
  if (row.quest_done) return { row, completed: false, reward: 0 };
  const def = QUEST_TYPES[row.quest_type];
  if (!def || def.kind !== kind) return { row, completed: false, reward: 0 };
  const progress = row.quest_progress + 1;
  const done = progress >= def.target ? 1 : 0;
  const reward = done ? def.reward + Math.floor(Math.random() * 40) : 0;
  const extra = done && currentEvent().id === 'calm' ? 40 : 0;
  const patch = { quest_progress: progress, quest_done: done };
  if (done) {
    patch.clouds = row.clouds + reward + extra;
    patch.xp = row.xp + 80;
  }
  row = updateUser(userId, guildId, patch);
  return { row, completed: Boolean(done), reward: reward + extra };
}

export function questNote(result) {
  if (!result?.completed) return '';
  return `\n📋 Quest complete — **+${result.reward} clouds**`;
}

export function guildIdOf(interaction) {
  return interaction.guildId ?? 'global';
}

export function now() {
  return Date.now();
}

export function remaining(last, cooldown) {
  return last + cooldown - now();
}

export async function denyCooldown(interaction, last, cooldown, label) {
  const left = remaining(last, cooldown);
  if (left > 0) {
    await interaction.reply({ embeds: [cooldownEmbed(label, formatMs(left))], ephemeral: true });
    return true;
  }
  return false;
}

export async function loadProfile(interaction, userId = interaction.user.id) {
  return getUser(userId, guildIdOf(interaction));
}

export function applyBuzz(user, amount) {
  const before = Number(user.buzz) || 0;
  const buzz = Math.min(100, before + amount);
  const maxed = before < 100 && buzz >= 100;
  if (!maxed) {
    return { buzz, maxed: false, bonusClouds: 0, burnt: false, xpBoostUntil: 0 };
  }
  return {
    buzz: 0,
    maxed: true,
    bonusClouds: 120 + Math.floor(Math.random() * 110) + (user.prestige || 0) * 15,
    burnt: Math.random() < 0.12,
    xpBoostUntil: now() + 20 * 60_000,
  };
}

export function xpGain(user, base) {
  const boost = user.xp_boost_until > now() ? 2 : 1;
  const prestige = 1 + user.prestige * 0.08;
  return Math.round(base * boost * prestige);
}

export function hitBlocked(user) {
  if (user.burnt) return 'Your coil is burnt. Use `/geekbar repair` or buy a coil kit.';
  if (user.battery < GAME.hitBatteryCost) return 'Battery is dead. Plug in with `/geekbar charge`.';
  if (user.pod_puffs < GAME.hitPuffCost) return 'Pod is empty. Swap a flavor or buy a refill.';
  return null;
}

export function shielded(user) {
  return user.raid_shield_until > now();
}

export function raidChance(raider, victim) {
  const diff = levelFromXp(raider.xp) - levelFromXp(victim.xp);
  return Math.min(0.82, Math.max(0.22, 0.46 + diff * 0.035 + raider.prestige * 0.03));
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function replyGif(interaction, embed, buffer, name = 'geekbar.gif') {
  const payload = {
    embeds: [embed.setImage(`attachment://${name}`)],
    files: [{ attachment: buffer, name }],
  };
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply(payload);
}

export async function replyPng(interaction, embed, buffer, name = 'geekbar.png') {
  const payload = {
    embeds: [embed.setImage(`attachment://${name}`)],
    files: [{ attachment: buffer, name }],
  };
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply(payload);
}

export { errorEmbed };
