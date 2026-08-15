import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import { GAME } from '../config.js';
import {
  addClouds,
  addCustomSkin,
  countCustomSkins,
  getCustomSkins,
  hasItem,
  updateUser,
} from '../database/db.js';
import { GIF_EFFECTS, SKINS, getGifEffect, getSkin } from '../data/gameData.js';
import { errorEmbed, flavorOf, okEmbed, ACCENT } from '../utils/embeds.js';
import { renderImageGif, renderSceneGif, renderStatsCard, renderStill } from '../utils/gifGenerator.js';
import { guildIdOf, loadProfile, replyGif, replyPng } from '../utils/game.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skinsDir = join(__dirname, '../../data/skins');

export async function handleStudioNeon(interaction) {
  const modal = new ModalBuilder().setCustomId('modal:neon').setTitle('Neon sign GIF');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('text')
        .setLabel('Neon text')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(14)
        .setPlaceholder('RIP IT'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('sub')
        .setLabel('Small line under it')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(28)
        .setPlaceholder('after hours'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('color')
        .setLabel('Hex color')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(7)
        .setPlaceholder('#FF2BD6'),
    ),
  );
  return interaction.showModal(modal);
}

export async function handleStudioSticker(interaction) {
  const modal = new ModalBuilder().setCustomId('modal:sticker').setTitle('Sticker render');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Sticker title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(18)
        .setPlaceholder('FAT CLOUD'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('line')
        .setLabel('Bottom line')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(32)
        .setPlaceholder('do not share with cops'),
    ),
  );
  return interaction.showModal(modal);
}

export async function handleStudioVibe(interaction) {
  const modal = new ModalBuilder().setCustomId('modal:vibe').setTitle('GIF studio — vibe');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('prompt')
        .setLabel('Vibe prompt')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(120)
        .setPlaceholder('neon rain, fat cloud, midnight parking lot'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('caption')
        .setLabel('Caption on the GIF')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(24)
        .setPlaceholder('RIP IT'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('color')
        .setLabel('Hex color (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(7)
        .setPlaceholder('#00F5A0'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('intensity')
        .setLabel('Intensity 1-10')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('7'),
    ),
  );
  return interaction.showModal(modal);
}

export async function handleStudioRender(interaction) {
  const modal = new ModalBuilder().setCustomId('modal:render').setTitle('Studio — render poster');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Poster title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(28)
        .setPlaceholder('NIGHT SHIFT'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('subtitle')
        .setLabel('Subtitle')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(40)
        .setPlaceholder('blue razz in the rain'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('line')
        .setLabel('Quote / line')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(80),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('color')
        .setLabel('Hex color (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(7)
        .setPlaceholder('#9B6DFF'),
    ),
  );
  return interaction.showModal(modal);
}

export async function handleStudioLab(interaction) {
  const modal = new ModalBuilder().setCustomId('modal:lab').setTitle('Flavor lab');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('name')
        .setLabel('Flavor name')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(28)
        .setPlaceholder('Midnight Kiwi Frost'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('notes')
        .setLabel('Tasting notes')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(100)
        .setPlaceholder('sweet kiwi, cold exhale, candy shell'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('color')
        .setLabel('Pod color hex')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(7)
        .setPlaceholder('#7DCE82'),
    ),
  );
  return interaction.showModal(modal);
}

export async function handleStudioGif(interaction) {
  const attachment = interaction.options.getAttachment('image', true);
  const effect = interaction.options.getString('effect', true);
  const text = interaction.options.getString('text') || '';
  if (!attachment.contentType?.startsWith('image/')) {
    return interaction.reply({ embeds: [errorEmbed('Upload a PNG, JPG, WEBP, or GIF.')], ephemeral: true });
  }
  const user = await loadProfile(interaction);
  if (user.clouds < GAME.gifCost) {
    return interaction.reply({ embeds: [errorEmbed(`GIF studio costs **${GAME.gifCost}** clouds.`)], ephemeral: true });
  }

  await interaction.deferReply();
  const res = await fetch(attachment.url);
  const buf = Buffer.from(await res.arrayBuffer());
  addClouds(interaction.user.id, guildIdOf(interaction), -GAME.gifCost);
  const gif = await renderImageGif(buf, getGifEffect(effect).id, text, flavorOf(user).color);
  const embed = okEmbed(
    `${getGifEffect(effect).emoji} ${getGifEffect(effect).name}`,
    `Animated from your image. -${GAME.gifCost} clouds.`,
    flavorOf(user).color,
  );
  return replyGif(interaction, embed, gif, 'studio.gif');
}

export async function gifEffectAutocomplete(interaction) {
  const q = interaction.options.getFocused().toLowerCase();
  return interaction.respond(
    GIF_EFFECTS.filter((e) => e.name.toLowerCase().includes(q) || e.id.includes(q))
      .slice(0, 25)
      .map((e) => ({ name: `${e.emoji} ${e.name} — ${e.description}`, value: e.id })),
  );
}

export async function handleStudioWrap(interaction) {
  const attachment = interaction.options.getAttachment('image', true);
  const name = interaction.options.getString('name') || attachment.name.replace(/\.[^.]+$/, '').slice(0, 32);
  if (!attachment.contentType?.startsWith('image/')) {
    return interaction.reply({ embeds: [errorEmbed('Upload an image file.')], ephemeral: true });
  }
  const user = await loadProfile(interaction);
  if (user.clouds < GAME.wrapCost) {
    return interaction.reply({ embeds: [errorEmbed(`Custom wraps cost **${GAME.wrapCost}** clouds.`)], ephemeral: true });
  }
  if (countCustomSkins(interaction.user.id) >= GAME.maxCustomSkins) {
    return interaction.reply({ embeds: [errorEmbed(`Max **${GAME.maxCustomSkins}** custom wraps.`)], ephemeral: true });
  }

  await interaction.deferReply();
  mkdirSync(skinsDir, { recursive: true });
  const res = await fetch(attachment.url);
  const buf = Buffer.from(await res.arrayBuffer());
  const id = `custom:${randomUUID()}`;
  const filePath = join(skinsDir, `${id.replace(':', '_')}.png`);
  writeFileSync(filePath, buf);
  addCustomSkin(interaction.user.id, id, name, filePath);
  addClouds(interaction.user.id, guildIdOf(interaction), -GAME.wrapCost);
  updateUser(interaction.user.id, guildIdOf(interaction), { skin: id });
  const next = await loadProfile(interaction);
  const gif = await renderSceneGif('flex', next);
  return replyGif(
    interaction,
    okEmbed('🎨 Wrap on', `**${name}** is equipped and will show on hit/charge/stats GIFs.`),
    gif,
    'wrap.gif',
  );
}

export async function handleStudioCard(interaction) {
  await interaction.deferReply();
  const user = await loadProfile(interaction);
  const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
  const png = await renderStatsCard(user, member ?? { user: interaction.user, displayName: interaction.user.globalName });
  return replyPng(interaction, okEmbed('ID card', user.device_name, flavorOf(user).color), png, 'card.png');
}

export async function handleStudioSkins(interaction) {
  const custom = getCustomSkins(interaction.user.id);
  const embed = new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle('Wraps')
    .addFields(
      {
        name: 'Built-in',
        value: SKINS.map((s) => `\`${s.id}\` — ${s.name}${s.exclusive ? ' (prestige)' : s.price ? ` (${s.price}c)` : ' (free)'}`).join('\n'),
      },
      {
        name: 'Your uploads',
        value: custom.length ? custom.map((s) => `\`${s.id}\` — ${s.name}`).join('\n') : 'None yet. `/geekbar studio wrap`',
      },
    );
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

export async function handleStudioEquip(interaction) {
  const id = interaction.options.getString('skin', true);
  const user = await loadProfile(interaction);
  const gid = guildIdOf(interaction);

  if (id.startsWith('custom:')) {
    const owned = getCustomSkins(interaction.user.id).some((s) => s.id === id);
    if (!owned) return interaction.reply({ embeds: [errorEmbed('You do not own that wrap.')], ephemeral: true });
  } else {
    const skin = getSkin(id);
    if (skin.exclusive && !hasItem(interaction.user.id, gid, id, 'skin') && user.prestige < 1) {
      return interaction.reply({ embeds: [errorEmbed('Prestige to unlock that wrap.')], ephemeral: true });
    }
    if (skin.price > 0 && !hasItem(interaction.user.id, gid, id, 'skin') && id !== 'classic') {
      return interaction.reply({ embeds: [errorEmbed('Buy it in the shop first.')], ephemeral: true });
    }
  }

  await interaction.deferReply();
  const next = updateUser(interaction.user.id, gid, { skin: id });
  const gif = await renderSceneGif('flex', next);
  return replyGif(interaction, okEmbed('Equipped', `Wrap set to **${getSkin(id).name}**.`), gif, 'equip.gif');
}

export async function skinAutocomplete(interaction) {
  const q = interaction.options.getFocused().toLowerCase();
  const custom = getCustomSkins(interaction.user.id).map((s) => ({ name: `Custom · ${s.name}`, value: s.id }));
  const built = SKINS.map((s) => ({ name: s.name, value: s.id }));
  return interaction.respond(
    [...built, ...custom].filter((s) => s.name.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)).slice(0, 25),
  );
}

export async function generateVibeGif(user, { prompt, caption, color, intensity }) {
  const parsed = parseVibe(prompt, color, intensity);
  return renderSceneGif('vibe', user, {
    title: (caption || parsed.title).slice(0, 18).toUpperCase(),
    subtitle: parsed.subtitle,
    line: prompt.slice(0, 42),
    color: parsed.color,
    intensity: parsed.intensity,
    delay: parsed.glitch ? 50 : 70,
  });
}

export async function generateRenderPng(user, { title, subtitle, line, color }) {
  return renderStill(user, {
    title: title || user.device_name,
    subtitle: subtitle || flavorOf(user).name,
    line: line || user.tagline,
    color: sanitizeHex(color) || flavorOf(user).color,
    intensity: 1.1,
  });
}

function parseVibe(prompt, color, intensityRaw) {
  const p = String(prompt || '').toLowerCase();
  const map = [
    ['blue', '#4B9CD3'],
    ['razz', '#4B9CD3'],
    ['red', '#FF4D6D'],
    ['gold', '#FFD700'],
    ['green', '#39FF14'],
    ['mint', '#7FFFD4'],
    ['purple', '#9B6DFF'],
    ['galaxy', '#6C5CE7'],
    ['pink', '#FF6EC7'],
    ['ice', '#00CED1'],
    ['fire', '#FF4500'],
    ['lava', '#FF4500'],
    ['chrome', '#C0C0C0'],
  ];
  const hit = map.find(([k]) => p.includes(k));
  const intensity = Math.min(10, Math.max(1, Number(intensityRaw) || (p.includes('fat') || p.includes('huge') ? 9 : 6))) / 7;
  let title = 'VIBE';
  if (p.includes('rain')) title = 'RAIN';
  if (p.includes('night')) title = 'NIGHT';
  if (p.includes('glitch')) title = 'GLITCH';
  if (p.includes('cloud')) title = 'CLOUD';
  return {
    color: sanitizeHex(color) || hit?.[1] || '#00F5A0',
    intensity,
    title,
    subtitle: p.split(/[,\n]/)[0].slice(0, 32) || 'custom render',
    glitch: p.includes('glitch') || p.includes('static'),
  };
}

export function sanitizeHex(value) {
  const v = String(value || '').trim();
  if (/^#?[0-9a-fA-F]{6}$/.test(v)) return v.startsWith('#') ? v : `#${v}`;
  if (/^#?[0-9a-fA-F]{3}$/.test(v)) {
    const s = v.replace('#', '');
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  }
  return null;
}
