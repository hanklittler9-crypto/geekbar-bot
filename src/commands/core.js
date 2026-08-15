import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { GAME } from '../config.js';
import { updateUser, hasItem, getCustomFlavor, getCustomFlavors } from '../database/db.js';
import { FLAVORS, getFlavor } from '../data/gameData.js';
import { flavorOf, okEmbed, errorEmbed, statsFields, ACCENT } from '../utils/embeds.js';
import { renderSceneGif, renderStatsCard } from '../utils/gifGenerator.js';
import {
  denyCooldown,
  guildIdOf,
  hitBlocked,
  loadProfile,
  now,
  replyGif,
  replyPng,
  xpGain,
} from '../utils/game.js';

export async function handleHit(interaction) {
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_hit, GAME.hitCooldownMs, 'Hit')) return;
  const blocked = hitBlocked(user);
  if (blocked) {
    return interaction.reply({ embeds: [errorEmbed(blocked)], ephemeral: true });
  }

  await interaction.deferReply();
  const xp = xpGain(user, 12 + Math.floor(Math.random() * 8));
  const clouds = 4 + Math.floor(Math.random() * 9) + user.prestige;
  const next = updateUser(interaction.user.id, guildIdOf(interaction), {
    battery: Math.max(0, user.battery - GAME.hitBatteryCost),
    pod_puffs: user.pod_puffs - GAME.hitPuffCost,
    total_hits: user.total_hits + 1,
    xp: user.xp + xp,
    clouds: user.clouds + clouds,
    buzz: Math.min(100, user.buzz + 3.5),
    last_hit: now(),
  });

  const flavor = flavorOf(next);
  const gif = await renderSceneGif('hit', next);
  const embed = new EmbedBuilder()
    .setColor(flavor.color)
    .setTitle(`💨 ${next.device_name}`)
    .setDescription(`You rip a hit of **${flavor.name}**. Clouds spill out of the LED screen.`)
    .addFields(
      { name: 'Clouds', value: `+${clouds}`, inline: true },
      { name: 'XP', value: `+${xp}`, inline: true },
      { name: 'Battery', value: `${Math.round(next.battery)}%`, inline: true },
    );
  return replyGif(interaction, embed, gif, 'hit.gif');
}

export async function handleCharge(interaction) {
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_charge, GAME.chargeCooldownMs, 'Charge')) return;
  await interaction.deferReply();
  const next = updateUser(interaction.user.id, guildIdOf(interaction), {
    battery: GAME.maxBattery,
    last_charge: now(),
  });
  const gif = await renderSceneGif('charge', next);
  const embed = okEmbed('🔌 Charging', `**${next.device_name}** is topped off. USB-C clicked in.`, flavorOf(next).color);
  return replyGif(interaction, embed, gif, 'charge.gif');
}

export async function handleCustomize(interaction) {
  const user = await loadProfile(interaction);
  const modal = new ModalBuilder().setCustomId('modal:customize').setTitle('Customize your Geek Bar');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('name')
        .setLabel('Device name')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(32)
        .setRequired(true)
        .setValue(user.device_name?.slice(0, 32) || 'My Geek Bar'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('tagline')
        .setLabel('Tagline')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(48)
        .setRequired(false)
        .setValue(user.tagline?.slice(0, 48) || 'fat clouds only'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('skin_hint')
        .setLabel('Wrap id (optional, use /geekbar studio skins)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(40)
        .setPlaceholder('pulse, gold, holo, custom:...'),
    ),
  );
  return interaction.showModal(modal);
}

export async function handleFlavor(interaction) {
  const pod = interaction.options.getString('pod', true);
  const gid = guildIdOf(interaction);

  if (pod.startsWith('lab:')) {
    const custom = getCustomFlavor(pod);
    if (!custom || custom.user_id !== interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Unknown lab mix.')], ephemeral: true });
    }
    await interaction.deferReply();
    const next = updateUser(interaction.user.id, gid, { flavor: custom.id, pod_puffs: GAME.podCapacity });
    const gif = await renderSceneGif('flavor', next, { subtitle: custom.notes || 'lab mix seated' });
    return replyGif(
      interaction,
      okEmbed('🧪 Pod swapped', `**${next.device_name}** is running **${custom.name}**. Puffs refilled.`, custom.color),
      gif,
      'flavor.gif',
    );
  }

  const flavor = getFlavor(pod);
  if (!flavor || flavor.id !== pod) {
    return interaction.reply({ embeds: [errorEmbed('Unknown flavor.')], ephemeral: true });
  }
  const owned = flavor.price === 0 || hasItem(interaction.user.id, gid, flavor.id, 'flavor');
  if (flavor.exclusive && !owned) {
    return interaction.reply({ embeds: [errorEmbed('That pod is exclusive. Prestige or hit the lab.')], ephemeral: true });
  }
  if (!owned && flavor.price > 0) {
    return interaction.reply({
      embeds: [errorEmbed(`You don't own **${flavor.name}**. Buy it in \`/geekbar shop\`.`)],
      ephemeral: true,
    });
  }

  await interaction.deferReply();
  const next = updateUser(interaction.user.id, gid, {
    flavor: flavor.id,
    pod_puffs: GAME.podCapacity,
  });
  const gif = await renderSceneGif('flavor', next, { subtitle: 'click — fresh pod' });
  const embed = okEmbed('🧪 Pod swapped', `**${next.device_name}** is running **${flavor.emoji} ${flavor.name}**. Puffs refilled.`, flavor.color);
  return replyGif(interaction, embed, gif, 'flavor.gif');
}

export async function flavorAutocomplete(interaction) {
  const focused = interaction.options.getFocused().toLowerCase();
  const userId = interaction.user.id;
  const gid = guildIdOf(interaction);
  const lab = getCustomFlavors(userId, gid).map((f) => ({ name: `🧪 ${f.name} (lab)`, value: f.id }));
  const stock = FLAVORS.filter((f) => !f.exclusive || hasItem(userId, gid, f.id, 'flavor')).map((f) => ({
    name: `${f.emoji} ${f.name}`,
    value: f.id,
  }));
  const choices = [...stock, ...lab]
    .filter((f) => f.name.toLowerCase().includes(focused) || f.value.toLowerCase().includes(focused))
    .slice(0, 25);
  return interaction.respond(choices);
}

export async function handleStats(interaction) {
  const target = interaction.options.getUser('user') ?? interaction.user;
  await interaction.deferReply();
  const user = await loadProfile(interaction, target.id);
  const member = await interaction.guild?.members.fetch(target.id).catch(() => null);
  const png = await renderStatsCard(user, member ?? { user: target, displayName: target.globalName || target.username });
  const embed = new EmbedBuilder()
    .setColor(flavorOf(user).color || ACCENT)
    .setTitle(`${user.device_name}`)
    .setDescription(`Stats for **${target.displayName ?? target.username}**`)
    .addFields(statsFields(user));
  return replyPng(interaction, embed, png, 'stats.png');
}

export async function handleProfile(interaction) {
  return handleStats(interaction);
}

export async function handleDaily(interaction) {
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_daily, GAME.dailyCooldownMs, 'Daily')) return;
  await interaction.deferReply();
  const clouds = 160 + Math.floor(Math.random() * 120) + user.prestige * 20;
  const next = updateUser(interaction.user.id, guildIdOf(interaction), {
    clouds: user.clouds + clouds,
    pod_puffs: Math.min(GAME.podCapacity, user.pod_puffs + 180),
    battery: Math.min(GAME.maxBattery, user.battery + 40),
    last_daily: now(),
  });
  const gif = await renderSceneGif('vibe', next, {
    title: 'DAILY DROP',
    subtitle: `+${clouds} clouds`,
    line: 'pod topped · battery bumped',
    color: flavorOf(next).color,
  });
  const embed = okEmbed('📦 Daily drop', `You pocketed **${clouds} clouds**. Pod and battery got a bump.`, flavorOf(next).color);
  return replyGif(interaction, embed, gif, 'daily.gif');
}

export async function handleHelp(interaction) {
  const embed = new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle('Geek Bar commands')
    .setDescription('Fictional heist game. Not affiliated with Geek Bar.')
    .addFields(
      {
        name: 'Device',
        value: [
          '`/geekbar hit` — take a hit, earn clouds + XP, get a vapor GIF',
          '`/geekbar charge` — recharge battery',
          '`/geekbar customize` — modal to rename + tagline',
          '`/geekbar flavor` — swap pods',
          '`/geekbar stats` — generated stats card',
          '`/geekbar profile` / `flex` — card or show-off GIF',
        ].join('\n'),
      },
      {
        name: 'Economy',
        value: [
          '`/geekbar daily` `shop` `inventory` `stash` `gift`',
          '`/geekbar leaderboard` `repair` `prestige`',
        ].join('\n'),
      },
      {
        name: 'Heist',
        value: [
          '`/geekbar heist raid` — steal unstashed clouds',
          '`/geekbar heist jack` — high-risk jack',
          '`/geekbar heist chase` — catch the cloud',
          '`/geekbar heist smokeout` — PvP cloud battle',
          '`/geekbar heist bounty` — modal to mark someone',
          '`/geekbar heist roulette` — flavor gacha',
          '`/geekbar heist spot` — raid a store',
          '`/geekbar heist wire` — cut wires minigame',
          '`/geekbar heist vanish` — 2h smoke shield',
        ].join('\n'),
      },
      {
        name: 'Cloud minigames',
        value: [
          '`/cloud slots` `flip` `pack` `chain`',
          '`/cloud lucky` `drop` `drip` `inspect` `crash` `quote` `roast`',
        ].join('\n'),
      },
      {
        name: 'Studio (GIFs + modals)',
        value: [
          '`/geekbar studio vibe` — prompt modal → custom GIF',
          '`/geekbar studio render` — poster modal → PNG',
          '`/geekbar studio lab` — mix a custom flavor',
          '`/geekbar studio gif` — animate an uploaded image',
          '`/geekbar studio wrap` — upload a custom wrap',
          '`/geekbar studio neon` — neon sign GIF modal',
          '`/geekbar studio sticker` — sticker PNG modal',
          '`/geekbar studio card` `skins` `equip`',
        ].join('\n'),
      },
      {
        name: 'Memes',
        value: [
          '`/kingvamp` `/carti` `/slatt` `/wlr` `/teenx`',
          '`/kencarson` `/kendance` `/opium` `/lone` `/homixide` `/yvl`',
          '`/yeat` `/twizzy` `/summrs` `/kankan` `/izaya` `/vamp` `/music`',
          '`/slowdown` `/blonde` `/walk` `/catken` `/meechie` `/perkpop`',
        ].join('\n'),
      },
    );
  return interaction.reply({ embeds: [embed] });
}
