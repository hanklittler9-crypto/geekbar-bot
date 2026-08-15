import { GAME, formatMs, levelFromXp } from '../config.js';
import { cooldownEmbed, errorEmbed } from './embeds.js';
import { getUser } from '../database/db.js';

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
