import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { GAME, levelFromXp } from '../config.js';
import { addClouds, addItem, updateUser } from '../database/db.js';
import { FLAVORS, SLOT_ICONS, SKINS } from '../data/gameData.js';
import { errorEmbed, flavorOf, okEmbed, statsFields, ACCENT } from '../utils/embeds.js';
import { renderSceneGif, renderStatsCard } from '../utils/gifGenerator.js';
import {
  denyCooldown,
  guildIdOf,
  hitBlocked,
  loadProfile,
  now,
  pick,
  randInt,
  replyGif,
  replyPng,
  xpGain,
} from '../utils/game.js';

export async function handleCloud(interaction) {
  const sub = interaction.options.getSubcommand();
  switch (sub) {
    case 'slots':
      return handleSlots(interaction);
    case 'flip':
      return handleFlip(interaction);
    case 'pack':
      return handlePack(interaction);
    case 'chain':
      return handleChain(interaction);
    case 'lucky':
      return handleLucky(interaction);
    case 'drop':
      return handleDrop(interaction);
    case 'drip':
      return handleDrip(interaction);
    case 'inspect':
      return handleInspect(interaction);
    default:
      return interaction.reply({ content: 'Unknown cloud command.', ephemeral: true });
  }
}

export async function handleSlots(interaction) {
  const bet = interaction.options.getInteger('bet') ?? 25;
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_slots, GAME.slotsCooldownMs, 'Slots')) return;
  if (user.clouds < bet) {
    return interaction.reply({ embeds: [errorEmbed(`Need **${bet}** clouds to spin.`)], ephemeral: true });
  }

  await interaction.deferReply();
  const a = pick(SLOT_ICONS);
  const b = pick(SLOT_ICONS);
  const c = pick(SLOT_ICONS);
  const reels = [a.icon, b.icon, c.icon];
  let win = 0;
  let title = 'No match';
  if (a.id === b.id && b.id === c.id) {
    win = bet * a.payout;
    title = 'TRIPLE';
  } else if (a.id === b.id || b.id === c.id || a.id === c.id) {
    win = Math.floor(bet * 1.6);
    title = 'PAIR';
  }
  const gid = guildIdOf(interaction);
  const next = updateUser(interaction.user.id, gid, {
    clouds: user.clouds - bet + win,
    last_slots: now(),
  });
  const gif = await renderSceneGif('slots', next, {
    reels,
    success: win > bet,
    subtitle: reels.join(' '),
    line: win ? `+${win} clouds` : `-${bet} clouds`,
  });
  return replyGif(
    interaction,
    okEmbed(`🎰 ${title}`, `Bet **${bet}**. Landed ${reels.join(' ')}\n${win ? `Paid **${win}** clouds.` : 'Dead spin.'}`, win ? '#FFD700' : flavorOf(next).color),
    gif,
    'slots.gif',
  );
}

export async function handleFlip(interaction) {
  const side = interaction.options.getString('side', true);
  const bet = interaction.options.getInteger('bet') ?? 20;
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_flip, GAME.flipCooldownMs, 'Flip')) return;
  if (user.clouds < bet) {
    return interaction.reply({ embeds: [errorEmbed(`Need **${bet}** clouds.`)], ephemeral: true });
  }
  await interaction.deferReply();
  const land = Math.random() < 0.5 ? 'heads' : 'tails';
  const win = land === side;
  const gid = guildIdOf(interaction);
  const next = updateUser(interaction.user.id, gid, {
    clouds: user.clouds + (win ? bet : -bet),
    last_flip: now(),
  });
  const gif = await renderSceneGif('lucky', next, {
    success: win,
    subtitle: land.toUpperCase(),
    line: win ? `+${bet}` : `-${bet}`,
  });
  return replyGif(
    interaction,
    okEmbed(win ? '🪙 Called it' : '🪙 Nope', `You picked **${side}**. It landed **${land}**.`, win ? '#FFD700' : '#FF5C5C'),
    gif,
    'flip.gif',
  );
}

export async function handlePack(interaction) {
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_pack, GAME.packCooldownMs, 'Pack')) return;
  if (user.clouds < GAME.packCost) {
    return interaction.reply({ embeds: [errorEmbed(`Packs cost **${GAME.packCost}** clouds.`)], ephemeral: true });
  }
  await interaction.deferReply();
  const gid = guildIdOf(interaction);
  const roll = Math.random();
  let line = '';
  const fields = { clouds: user.clouds - GAME.packCost, last_pack: now() };
  if (roll < 0.08) {
    const skin = pick(SKINS.filter((s) => s.price > 0 && !s.exclusive));
    addItem(interaction.user.id, gid, skin.id, 'skin');
    line = `Wrap drop: **${skin.name}**`;
  } else if (roll < 0.45) {
    const flavor = pick(FLAVORS.filter((f) => f.price > 0 && !f.exclusive));
    addItem(interaction.user.id, gid, flavor.id, 'flavor');
    line = `Pod drop: **${flavor.emoji} ${flavor.name}**`;
  } else {
    const extra = randInt(40, 160);
    fields.clouds += extra;
    line = `Cloud drop: **+${extra}**`;
  }
  const next = updateUser(interaction.user.id, gid, fields);
  const gif = await renderSceneGif('pack', next, { subtitle: 'OPEN', line });
  return replyGif(interaction, okEmbed('📦 Pack ripped', `${line}\n-${GAME.packCost} clouds to crack it.`, flavorOf(next).color), gif, 'pack.gif');
}

export async function handleChain(interaction) {
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_chain, GAME.chainCooldownMs, 'Chain')) return;
  const blocked = hitBlocked(user);
  if (blocked) return interaction.reply({ embeds: [errorEmbed(blocked)], ephemeral: true });
  if (user.battery < GAME.hitBatteryCost * 3 || user.pod_puffs < 3) {
    return interaction.reply({ embeds: [errorEmbed('Need enough battery and puffs for a 3-hit chain.')], ephemeral: true });
  }
  await interaction.deferReply();
  const xp = xpGain(user, 40);
  const clouds = 18 + randInt(8, 24) + user.prestige * 3;
  const burnt = user.battery < 35 && Math.random() < 0.18;
  const gid = guildIdOf(interaction);
  const next = updateUser(interaction.user.id, gid, {
    battery: Math.max(0, user.battery - GAME.hitBatteryCost * 3),
    pod_puffs: user.pod_puffs - 3,
    total_hits: user.total_hits + 3,
    xp: user.xp + xp,
    clouds: user.clouds + clouds,
    buzz: Math.min(100, user.buzz + 12),
    burnt: burnt ? 1 : user.burnt,
    last_chain: now(),
    last_hit: now(),
    streak: (user.streak || 0) + 3,
  });
  const gif = await renderSceneGif('chain', next, {
    subtitle: burnt ? 'coil toast' : 'x3 combo',
    line: `+${clouds}c  +${xp}xp`,
  });
  const text = burnt
    ? `Triple rip, then the coil **burnt**. Still banked **${clouds}** clouds. Repair it.`
    : `Three hits in one pull. **+${clouds} clouds**, **+${xp} XP**.`;
  return replyGif(interaction, okEmbed('⛓️ Chain', text, flavorOf(next).color), gif, 'chain.gif');
}

export async function handleLucky(interaction) {
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_lucky, GAME.luckyCooldownMs, 'Lucky hit')) return;
  const blocked = hitBlocked(user);
  if (blocked) return interaction.reply({ embeds: [errorEmbed(blocked)], ephemeral: true });
  await interaction.deferReply();
  const roll = Math.random();
  const gid = guildIdOf(interaction);
  let payout = randInt(8, 22);
  let jackpot = false;
  let extra = '';
  if (roll < 0.04) {
    payout = randInt(400, 800);
    jackpot = true;
    extra = 'Legendary cloud burst.';
  } else if (roll < 0.18) {
    const flavor = pick(FLAVORS.filter((f) => !f.exclusive && f.price > 0));
    addItem(interaction.user.id, gid, flavor.id, 'flavor');
    extra = `Bonus pod: **${flavor.name}**`;
  } else {
    extra = 'Regular lucky puff.';
  }
  const next = updateUser(interaction.user.id, gid, {
    battery: Math.max(0, user.battery - GAME.hitBatteryCost),
    pod_puffs: user.pod_puffs - 1,
    total_hits: user.total_hits + 1,
    clouds: user.clouds + payout,
    xp: user.xp + xpGain(user, jackpot ? 80 : 16),
    last_lucky: now(),
    last_hit: now(),
  });
  const gif = await renderSceneGif('lucky', next, {
    success: jackpot,
    subtitle: `+${payout} clouds`,
    line: extra,
  });
  return replyGif(interaction, okEmbed(jackpot ? '👑 JACKPOT HIT' : '🍀 Lucky', `${extra}\n**+${payout} clouds**.`, jackpot ? '#FFD700' : flavorOf(next).color), gif, 'lucky.gif');
}

export async function handleDrop(interaction) {
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_drop, GAME.dropCooldownMs, 'Street drop')) return;
  updateUser(interaction.user.id, guildIdOf(interaction), { last_drop: now() });
  const loot = randInt(0, 2);
  const row = new ActionRowBuilder().addComponents(
    [0, 1, 2].map((i) =>
      new ButtonBuilder()
        .setCustomId(`drop:${interaction.user.id}:${i === loot ? 'hit' : 'miss'}:${i}`)
        .setLabel(i === 0 ? 'Crate A' : i === 1 ? 'Crate B' : 'Crate C')
        .setStyle(ButtonStyle.Secondary),
    ),
  );
  return interaction.reply({
    embeds: [okEmbed('📦 Street drop', 'Three crates. One has loot. The others are empty decoys.')],
    components: [row],
  });
}

export async function resolveDrop(interaction, hit) {
  const user = await loadProfile(interaction);
  await interaction.deferUpdate();
  const disabled = new ActionRowBuilder().addComponents(
    interaction.message.components[0].components.map((c) => ButtonBuilder.from(c).setDisabled(true)),
  );
  await interaction.editReply({ components: [disabled] });
  if (!hit) {
    const gif = await renderSceneGif('drop', user, { success: false, subtitle: 'empty crate', line: 'decoy' });
    const embed = errorEmbed('Empty. Somebody already flipped this crate — or it was bait.');
    embed.setImage('attachment://drop.gif');
    return interaction.followUp({ embeds: [embed], files: [{ attachment: gif, name: 'drop.gif' }] });
  }
  const reward = randInt(80, 190);
  const next = addClouds(interaction.user.id, guildIdOf(interaction), reward);
  const gif = await renderSceneGif('drop', next, { success: true, subtitle: `+${reward} clouds`, line: 'sealed pack' });
  const embed = okEmbed('Drop secured', `You cracked the live crate for **${reward} clouds**.`, flavorOf(next).color);
  embed.setImage('attachment://drop.gif');
  return interaction.followUp({ embeds: [embed], files: [{ attachment: gif, name: 'drop.gif' }] });
}

export async function handleDrip(interaction) {
  const user = await loadProfile(interaction);
  const last = user.last_drip || user.created_at || now();
  const elapsed = now() - last;
  if (elapsed < GAME.dripCooldownMs) {
    return denyCooldown(interaction, last, GAME.dripCooldownMs, 'Drip');
  }
  await interaction.deferReply();
  const hours = Math.min(8, elapsed / (60 * 60_000));
  const pay = Math.floor(22 * hours + user.prestige * 8 + Math.random() * 20);
  const next = updateUser(interaction.user.id, guildIdOf(interaction), {
    clouds: user.clouds + pay,
    last_drip: now(),
  });
  const gif = await renderSceneGif('vibe', next, {
    title: 'DRIP',
    subtitle: `+${pay} clouds`,
    line: 'idle vapor banked',
    color: flavorOf(next).color,
  });
  return replyGif(interaction, okEmbed('💧 Drip claimed', `Your Geek Bar leaked **${pay} clouds** while you were gone.`, flavorOf(next).color), gif, 'drip.gif');
}

export async function handleInspect(interaction) {
  const target = interaction.options.getUser('user') ?? interaction.user;
  await interaction.deferReply();
  const user = await loadProfile(interaction, target.id);
  const member = await interaction.guild?.members.fetch(target.id).catch(() => null);
  const png = await renderStatsCard(user, member ?? { user: target, displayName: target.globalName || target.username });
  const rating = Math.min(99, 40 + levelFromXp(user.xp) * 3 + user.prestige * 8 + Math.floor(user.buzz / 5));
  const lines = [
    rating > 85 ? 'Certified cloud menace.' : rating > 60 ? 'Respectable vapor output.' : 'Still breaking the coil in.',
    user.burnt ? 'Coil is cooked.' : 'Hardware looks clean.',
    `Cloud rating **${rating}/100**.`,
  ];
  const embed = new EmbedBuilder()
    .setColor(flavorOf(user).color || ACCENT)
    .setTitle(`Inspect — ${user.device_name}`)
    .setDescription(lines.join('\n'))
    .addFields(statsFields(user).slice(0, 6));
  return replyPng(interaction, embed, png, 'inspect.png');
}
