import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { getFlavor, getSkin, rarityColor } from '../data/gameData.js';
import { getCustomFlavor } from '../database/db.js';
import { levelFromXp, xpForLevel } from '../config.js';

export const ACCENT = '#00F5A0';

export function flavorOf(user) {
  if (String(user.flavor).startsWith('lab:')) {
    const custom = getCustomFlavor(user.flavor);
    if (custom) {
      return {
        id: custom.id,
        name: custom.name,
        emoji: '🧪',
        color: custom.color || '#7FFFD4',
        rarity: 'exclusive',
        notes: custom.notes,
      };
    }
  }
  return getFlavor(user.flavor);
}

export function skinOf(user) {
  return getSkin(user.skin);
}

export function cooldownEmbed(action, remaining) {
  return new EmbedBuilder()
    .setColor('#FF5C5C')
    .setTitle('Not yet')
    .setDescription(`**${action}** is cooling down. Wait **${remaining}**.`);
}

export function errorEmbed(text) {
  return new EmbedBuilder().setColor('#FF5C5C').setDescription(text);
}

export function okEmbed(title, text, color = ACCENT) {
  return new EmbedBuilder().setColor(color).setTitle(title).setDescription(text);
}

export function statsFields(user) {
  const level = levelFromXp(user.xp);
  const next = xpForLevel(level + 1);
  const flavor = flavorOf(user);
  const skin = skinOf(user);
  return [
    { name: 'Device', value: `**${user.device_name}**\n${user.tagline || '—'}`, inline: true },
    { name: 'Flavor', value: `${flavor.emoji} ${flavor.name}`, inline: true },
    { name: 'Wrap', value: skin.name, inline: true },
    { name: 'Battery', value: `${Math.round(user.battery)}%`, inline: true },
    { name: 'Puffs left', value: `${user.pod_puffs}`, inline: true },
    { name: 'Buzz', value: `${Math.round(user.buzz)}`, inline: true },
    { name: 'Level', value: `${level}  (${user.xp}/${next} XP)`, inline: true },
    { name: 'Clouds', value: `${user.clouds}`, inline: true },
    { name: 'Stash', value: `${user.stash}`, inline: true },
    { name: 'Hits', value: `${user.total_hits}`, inline: true },
    { name: 'Prestige', value: `${user.prestige}`, inline: true },
    { name: 'Status', value: user.burnt ? '🔥 Burnt coil' : '✅ Fresh', inline: true },
  ];
}

export function fileOf(buffer, name) {
  return new AttachmentBuilder(buffer, { name });
}

export function withGif(embed, filename = 'geekbar.gif') {
  return embed.setImage(`attachment://${filename}`);
}

export { rarityColor };
