import { EmbedBuilder } from 'discord.js';
import { GAME } from '../config.js';
import { addClouds, addCustomFlavor, countCustomFlavors, updateUser } from '../database/db.js';
import { SKINS } from '../data/gameData.js';
import { errorEmbed, flavorOf, okEmbed } from '../utils/embeds.js';
import { renderSceneGif } from '../utils/gifGenerator.js';
import { guildIdOf, loadProfile, replyGif, replyPng } from '../utils/game.js';
import { generateRenderPng, generateVibeGif, sanitizeHex } from './studio.js';
import { resolveChase, resolveSmokeout, resolveSpot } from './heist.js';

export async function handleModal(interaction) {
  const id = interaction.customId;
  if (id === 'modal:customize') return submitCustomize(interaction);
  if (id === 'modal:vibe') return submitVibe(interaction);
  if (id === 'modal:render') return submitRender(interaction);
  if (id === 'modal:lab') return submitLab(interaction);
  if (id.startsWith('modal:bounty:')) return submitBounty(interaction);
}

export async function handleButton(interaction) {
  const id = interaction.customId;
  if (id.startsWith('chase:')) {
    const parts = id.split(':');
    const ownerId = parts[1];
    const result = parts[3];
    if (interaction.user.id !== ownerId) {
      return interaction.reply({ embeds: [errorEmbed('This chase is not yours.')], ephemeral: true });
    }
    return resolveChase(interaction, result === 'hit');
  }
  if (id.startsWith('smokeout:')) {
    const [, action, challengerId, rivalId] = id.split(':');
    return resolveSmokeout(interaction, action === 'accept', challengerId, rivalId);
  }
  if (id.startsWith('spot:')) {
    const [, ownerId, spotId] = id.split(':');
    if (interaction.user.id !== ownerId) {
      return interaction.reply({ embeds: [errorEmbed('This raid is not yours.')], ephemeral: true });
    }
    return resolveSpot(interaction, spotId);
  }
}

async function submitCustomize(interaction) {
  const name = interaction.fields.getTextInputValue('name').trim().slice(0, 32);
  const tagline = (interaction.fields.getTextInputValue('tagline') || '').trim().slice(0, 48);
  const skinHint = (interaction.fields.getTextInputValue('skin_hint') || '').trim();
  const fields = { device_name: name || 'My Geek Bar', tagline: tagline || 'fat clouds only' };
  if (skinHint) {
    const match = SKINS.find((s) => s.id === skinHint || s.name.toLowerCase() === skinHint.toLowerCase());
    if (match && !match.exclusive) fields.skin = match.id;
    else if (skinHint.startsWith('custom:')) fields.skin = skinHint;
  }
  await interaction.deferReply();
  const next = updateUser(interaction.user.id, guildIdOf(interaction), fields);
  const gif = await renderSceneGif('flex', next, { title: 'CUSTOM', subtitle: next.device_name });
  return replyGif(
    interaction,
    okEmbed('Saved', `**${next.device_name}**\n*${next.tagline}*`, flavorOf(next).color),
    gif,
    'customize.gif',
  );
}

async function submitVibe(interaction) {
  const user = await loadProfile(interaction);
  if (user.clouds < GAME.vibeCost) {
    return interaction.reply({
      embeds: [errorEmbed(`Vibe GIFs cost **${GAME.vibeCost}** clouds.`)],
      ephemeral: true,
    });
  }
  await interaction.deferReply();
  addClouds(interaction.user.id, guildIdOf(interaction), -GAME.vibeCost);
  const refreshed = await loadProfile(interaction);
  const gif = await generateVibeGif(refreshed, {
    prompt: interaction.fields.getTextInputValue('prompt'),
    caption: interaction.fields.getTextInputValue('caption'),
    color: interaction.fields.getTextInputValue('color'),
    intensity: interaction.fields.getTextInputValue('intensity'),
  });
  const embed = new EmbedBuilder()
    .setColor(flavorOf(refreshed).color)
    .setTitle('Studio vibe')
    .setDescription(`Built from your prompt.\n*${interaction.fields.getTextInputValue('prompt')}*\n-${GAME.vibeCost} clouds`);
  return replyGif(interaction, embed, gif, 'vibe.gif');
}

async function submitRender(interaction) {
  const user = await loadProfile(interaction);
  if (user.clouds < GAME.renderCost) {
    return interaction.reply({
      embeds: [errorEmbed(`Renders cost **${GAME.renderCost}** clouds.`)],
      ephemeral: true,
    });
  }
  await interaction.deferReply();
  addClouds(interaction.user.id, guildIdOf(interaction), -GAME.renderCost);
  const refreshed = await loadProfile(interaction);
  const png = await generateRenderPng(refreshed, {
    title: interaction.fields.getTextInputValue('title'),
    subtitle: interaction.fields.getTextInputValue('subtitle'),
    line: interaction.fields.getTextInputValue('line'),
    color: interaction.fields.getTextInputValue('color'),
  });
  return replyPng(
    interaction,
    okEmbed('Poster', interaction.fields.getTextInputValue('title'), flavorOf(refreshed).color),
    png,
    'render.png',
  );
}

async function submitLab(interaction) {
  const user = await loadProfile(interaction);
  const gid = guildIdOf(interaction);
  if (user.clouds < GAME.labCost) {
    return interaction.reply({ embeds: [errorEmbed(`Lab mixes cost **${GAME.labCost}** clouds.`)], ephemeral: true });
  }
  if (countCustomFlavors(interaction.user.id, gid) >= GAME.maxCustomFlavors) {
    return interaction.reply({ embeds: [errorEmbed(`Max **${GAME.maxCustomFlavors}** lab flavors.`)], ephemeral: true });
  }
  const name = interaction.fields.getTextInputValue('name').trim().slice(0, 28);
  const notes = (interaction.fields.getTextInputValue('notes') || '').trim().slice(0, 100);
  const color = sanitizeHex(interaction.fields.getTextInputValue('color')) || '#7FFFD4';
  const id = `lab:${interaction.user.id.slice(-6)}:${Date.now().toString(36)}`;

  await interaction.deferReply();
  addCustomFlavor(interaction.user.id, gid, id, name, notes, color);
  addClouds(interaction.user.id, gid, -GAME.labCost);
  const next = updateUser(interaction.user.id, gid, { flavor: id, pod_puffs: GAME.podCapacity });
  const gif = await renderSceneGif('flavor', next, { subtitle: notes || 'lab mix seated' });
  return replyGif(
    interaction,
    okEmbed('🧪 Lab mix', `**${name}** is locked into **${next.device_name}**.\n${notes || 'no notes'}`, color),
    gif,
    'lab.gif',
  );
}

async function submitBounty(interaction) {
  const targetId = interaction.customId.split(':')[2];
  const amount = Number.parseInt(interaction.fields.getTextInputValue('amount'), 10);
  const reason = (interaction.fields.getTextInputValue('reason') || '').trim();
  if (!Number.isFinite(amount) || amount < 25) {
    return interaction.reply({ embeds: [errorEmbed('Bounty must be at least **25** clouds.')], ephemeral: true });
  }
  const user = await loadProfile(interaction);
  if (user.clouds < amount) {
    return interaction.reply({ embeds: [errorEmbed('You do not have that many clouds.')], ephemeral: true });
  }
  const gid = guildIdOf(interaction);
  addClouds(interaction.user.id, gid, -amount);
  const target = await loadProfile(interaction, targetId);
  updateUser(targetId, gid, { bounty_amount: target.bounty_amount + amount, bounty_on: reason || 'marked' });
  return interaction.reply({
    embeds: [
      okEmbed(
        'Bounty posted',
        `<@${interaction.user.id}> put **${amount} clouds** on <@${targetId}>.${reason ? `\n*${reason}*` : ''}\nJack or raid them to cash the heat.`,
      ),
    ],
  });
}
