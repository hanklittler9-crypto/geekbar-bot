import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { GAME } from '../config.js';
import { addClouds, addItem, getBounties, logRaid, updateUser } from '../database/db.js';
import { FLAVORS, RAID_SPOTS } from '../data/gameData.js';
import { errorEmbed, flavorOf, okEmbed, skinOf, ACCENT } from '../utils/embeds.js';
import { renderSceneGif } from '../utils/gifGenerator.js';
import {
  denyCooldown,
  guildIdOf,
  loadProfile,
  now,
  raidChance,
  randInt,
  replyGif,
  shielded,
  bumpQuest,
  currentEvent,
  eventMult,
  questNote,
} from '../utils/game.js';

export async function handleRaid(interaction) {
  const targetUser = interaction.options.getUser('target', true);
  if (targetUser.bot || targetUser.id === interaction.user.id) {
    return interaction.reply({ embeds: [errorEmbed('Pick a real rival.')], ephemeral: true });
  }
  const raider = await loadProfile(interaction);
  if (await denyCooldown(interaction, raider.last_raid, GAME.raidCooldownMs, 'Raid')) return;
  const victim = await loadProfile(interaction, targetUser.id);
  if (shielded(victim)) {
    return interaction.reply({ embeds: [errorEmbed('They have a raid shield up.')], ephemeral: true });
  }
  if (victim.clouds < 20) {
    return interaction.reply({ embeds: [errorEmbed('They are broke. Nothing to lift.')], ephemeral: true });
  }

  await interaction.deferReply();
  const chance = raidChance(raider, victim);
  const success = Math.random() < chance;
  const gid = guildIdOf(interaction);
  updateUser(interaction.user.id, gid, { last_raid: now() });

  if (!success) {
    const fine = Math.min(raider.clouds, randInt(15, 45));
    const next = addClouds(interaction.user.id, gid, -fine);
    logRaid(gid, raider.user_id, victim.user_id, 0, false, 'raid');
    const gif = await renderSceneGif('raid', next, {
      success: false,
      subtitle: 'cameras caught you',
      line: `-${fine} clouds`,
    });
    const quest = bumpQuest(interaction.user.id, gid, 'raid');
    return replyGif(interaction, errorEmbed(`Busted raiding **${targetUser.username}**. Lost **${fine}** clouds.${questNote(quest)}`), gif, 'raid.gif');
  }

  const stolen = Math.min(
    victim.clouds,
    Math.max(10, Math.floor(victim.clouds * (GAME.raidMinPercent + Math.random() * (GAME.raidMaxPercent - GAME.raidMinPercent)) * eventMult('raid'))),
  );
  addClouds(targetUser.id, gid, -stolen);
  const next = addClouds(interaction.user.id, gid, stolen);
  logRaid(gid, raider.user_id, victim.user_id, stolen, true, 'raid');
  const quest = bumpQuest(interaction.user.id, gid, 'raid');
  const ev = currentEvent();
  const gif = await renderSceneGif('raid', next, {
    success: true,
    subtitle: `lifted ${stolen} clouds`,
    line: targetUser.username,
  });
  return replyGif(
    interaction,
    okEmbed(
      '🕵️ Raid hit',
      `You heisted **${stolen} clouds** from **${targetUser.username}**. Stash stays safe.${eventMult('raid') > 1 ? `\n🌍 ${ev.name} juiced the take.` : ''}${questNote(quest)}`,
      flavorOf(next).color,
    ),
    gif,
    'raid.gif',
  );
}

export async function handleJack(interaction) {
  const targetUser = interaction.options.getUser('target', true);
  if (targetUser.bot || targetUser.id === interaction.user.id) {
    return interaction.reply({ embeds: [errorEmbed('Pick someone else.')], ephemeral: true });
  }
  const jacker = await loadProfile(interaction);
  if (await denyCooldown(interaction, jacker.last_jack, GAME.jackCooldownMs, 'Jack')) return;
  const victim = await loadProfile(interaction, targetUser.id);
  if (shielded(victim)) {
    return interaction.reply({ embeds: [errorEmbed('Shielded. Not tonight.')], ephemeral: true });
  }

  await interaction.deferReply();
  const gid = guildIdOf(interaction);
  const success = Math.random() < 0.38 + jacker.prestige * 0.04;
  updateUser(interaction.user.id, gid, { last_jack: now() });

  if (!success) {
    const burnt = Math.random() < GAME.jackFailBurnChance;
    const fine = Math.min(jacker.clouds, randInt(25, 70));
    const next = updateUser(interaction.user.id, gid, {
      clouds: jacker.clouds - fine,
      burnt: burnt ? 1 : jacker.burnt,
    });
    logRaid(gid, jacker.user_id, victim.user_id, 0, false, 'jack');
    const gif = await renderSceneGif('jack', next, {
      success: false,
      subtitle: burnt ? 'coil scorched' : 'security grabbed you',
      line: `-${fine} clouds`,
    });
    return replyGif(
      interaction,
      errorEmbed(burnt ? `Caught. Coil **burnt**. Repair it. Lost **${fine}** clouds.` : `Caught jacking **${targetUser.username}**. Lost **${fine}** clouds.`),
      gif,
      'jack.gif',
    );
  }

  const stolen = Math.min(victim.clouds, randInt(40, 140));
  addClouds(targetUser.id, gid, -stolen);
  const next = addClouds(interaction.user.id, gid, stolen);
  logRaid(gid, jacker.user_id, victim.user_id, stolen, true, 'jack');
  const gif = await renderSceneGif('jack', next, {
    success: true,
    subtitle: `jacked ${stolen} clouds`,
    line: victim.device_name,
  });
  return replyGif(
    interaction,
    okEmbed('🕶️ Jacked', `You lifted **${stolen} clouds** off **${targetUser.username}**.`, flavorOf(next).color),
    gif,
    'jack.gif',
  );
}

export async function handleChase(interaction) {
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_chase, GAME.chaseCooldownMs, 'Cloud chase')) return;
  updateUser(interaction.user.id, guildIdOf(interaction), { last_chase: now() });

  const wait = randInt(1200, 3500);
  const cloudSlot = randInt(0, 3);
  const nonce = `${interaction.user.id}:${Date.now()}`;
  await interaction.reply({
    embeds: [okEmbed('💨 Cloud chase', 'Wait for it... click **CLOUD** when it drops. The other buttons are whiffs.')],
  });

  await sleep(wait);
  const row = new ActionRowBuilder().addComponents(
    [0, 1, 2, 3].map((i) =>
      new ButtonBuilder()
        .setCustomId(`chase:${nonce}:${i === cloudSlot ? 'hit' : 'miss'}:${i}`)
        .setLabel(i === cloudSlot ? 'CLOUD' : '—')
        .setStyle(i === cloudSlot ? ButtonStyle.Success : ButtonStyle.Secondary),
    ),
  );
  await interaction.editReply({ components: [row] });
}

export async function resolveChase(interaction, hit) {
  const user = await loadProfile(interaction);
  await interaction.deferUpdate();
  const disabled = new ActionRowBuilder().addComponents(
    interaction.message.components[0].components.map((c) => ButtonBuilder.from(c).setDisabled(true)),
  );
  await interaction.editReply({ components: [disabled] });

  if (!hit) {
    const gif = await renderSceneGif('chase', user, { success: false, subtitle: 'whiffed', line: 'cloud gone' });
    const embed = errorEmbed('You slapped empty air. The cloud moved on.');
    embed.setImage('attachment://chase.gif');
    return interaction.followUp({ embeds: [embed], files: [{ attachment: gif, name: 'chase.gif' }] });
  }

  const reward = randInt(70, 160) + user.prestige * 10;
  const next = addClouds(interaction.user.id, guildIdOf(interaction), reward);
  const gif = await renderSceneGif('chase', next, { success: true, subtitle: `+${reward} clouds`, line: 'caught mid-air' });
  const embed = okEmbed('Cloud caught', `You snagged the cloud for **${reward}** clouds.`, flavorOf(next).color);
  embed.setImage('attachment://chase.gif');
  return interaction.followUp({ embeds: [embed], files: [{ attachment: gif, name: 'chase.gif' }] });
}

export async function handleSmokeout(interaction) {
  const target = interaction.options.getUser('target', true);
  if (target.bot || target.id === interaction.user.id) {
    return interaction.reply({ embeds: [errorEmbed('Find a rival.')], ephemeral: true });
  }
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_smokeout, GAME.smokeoutCooldownMs, 'Smokeout')) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`smokeout:accept:${interaction.user.id}:${target.id}`)
      .setLabel('Accept smokeout')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`smokeout:decline:${interaction.user.id}:${target.id}`)
      .setLabel('Walk away')
      .setStyle(ButtonStyle.Secondary),
  );
  return interaction.reply({
    content: `${target}, **${interaction.user}** wants a smokeout. First cloud wall wins a cut of unstashed clouds.`,
    components: [row],
  });
}

export async function resolveSmokeout(interaction, accepted, challengerId, rivalId) {
  if (interaction.user.id !== rivalId) {
    return interaction.reply({ embeds: [errorEmbed('This challenge is not for you.')], ephemeral: true });
  }
  await interaction.deferUpdate();
  const disabled = new ActionRowBuilder().addComponents(
    interaction.message.components[0].components.map((c) => ButtonBuilder.from(c).setDisabled(true)),
  );
  await interaction.editReply({ components: [disabled] });

  if (!accepted) {
    return interaction.followUp({ embeds: [okEmbed('Walked', 'They backed out of the smokeout.')] });
  }

  const gid = guildIdOf(interaction);
  const a = await loadProfile(interaction, challengerId);
  const b = await loadProfile(interaction, rivalId);
  updateUser(challengerId, gid, { last_smokeout: now() });
  updateUser(rivalId, gid, { last_smokeout: now() });

  const scoreA = a.buzz + a.total_hits * 0.02 + Math.random() * 40 + a.prestige * 4;
  const scoreB = b.buzz + b.total_hits * 0.02 + Math.random() * 40 + b.prestige * 4;
  const winnerId = scoreA >= scoreB ? challengerId : rivalId;
  const loserId = winnerId === challengerId ? rivalId : challengerId;
  const loser = winnerId === challengerId ? b : a;
  const pot = Math.min(loser.clouds, randInt(25, 90));
  addClouds(loserId, gid, -pot);
  const winner = addClouds(winnerId, gid, pot);
  const gif = await renderSceneGif('smokeout', winner, {
    rival: loser,
    rivalFlavor: flavorOf(loser),
    rivalSkin: skinOf(loser),
    subtitle: `<@${winnerId}> wins`,
    line: `+${pot} clouds`,
  });
  const embed = okEmbed('☁️ Smokeout', `<@${winnerId}> blew out <@${loserId}> and took **${pot} clouds**.`, flavorOf(winner).color);
  embed.setImage('attachment://smokeout.gif');
  return interaction.followUp({ embeds: [embed], files: [{ attachment: gif, name: 'smokeout.gif' }] });
}

export async function handleBounty(interaction) {
  const target = interaction.options.getUser('target', true);
  if (target.bot || target.id === interaction.user.id) {
    return interaction.reply({ embeds: [errorEmbed('Invalid target.')], ephemeral: true });
  }
  const modal = new ModalBuilder()
    .setCustomId(`modal:bounty:${target.id}`)
    .setTitle(`Bounty — ${target.username}`.slice(0, 45));
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('amount')
        .setLabel('Clouds to put on them')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('100'),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Why (shows on the board)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(80)
        .setPlaceholder('jacked my meta moon pod'),
    ),
  );
  return interaction.showModal(modal);
}

export async function handleBountyBoard(interaction) {
  const rows = getBounties(guildIdOf(interaction));
  const embed = new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle('Bounty board')
    .setDescription(
      rows.length
        ? rows.map((r) => `<@${r.user_id}> — **${r.bounty_amount} clouds** on **${r.device_name}**`).join('\n')
        : 'No bounties. Mark someone with `/geekbar heist bounty`.',
    );
  return interaction.reply({ embeds: [embed] });
}

export async function handleRoulette(interaction) {
  const user = await loadProfile(interaction);
  if (user.clouds < GAME.rouletteCost) {
    return interaction.reply({
      embeds: [errorEmbed(`Roulette costs **${GAME.rouletteCost}** clouds.`)],
      ephemeral: true,
    });
  }
  await interaction.deferReply();
  const pool = FLAVORS.filter((f) => !f.exclusive);
  const weights = pool.map((f) => (f.rarity === 'epic' ? 1 : f.rarity === 'rare' ? 3 : 8));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  let picked = pool[0];
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      picked = pool[i];
      break;
    }
  }
  const gid = guildIdOf(interaction);
  addClouds(interaction.user.id, gid, -GAME.rouletteCost);
  addItem(interaction.user.id, gid, picked.id, 'flavor');
  const next = updateUser(interaction.user.id, gid, { flavor: picked.id, pod_puffs: GAME.podCapacity, last_roulette: now() });
  const gif = await renderSceneGif('roulette', next, { subtitle: picked.name, line: `-${GAME.rouletteCost} clouds` });
  return replyGif(
    interaction,
    okEmbed('🎰 Flavor roulette', `You spun **${picked.emoji} ${picked.name}** and it auto-equipped.`, picked.color),
    gif,
    'roulette.gif',
  );
}

export async function handleSpot(interaction) {
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_raid, GAME.raidCooldownMs, 'Store raid')) return;
  const row = new ActionRowBuilder().addComponents(
    RAID_SPOTS.map((spot) =>
      new ButtonBuilder()
        .setCustomId(`spot:${interaction.user.id}:${spot.id}`)
        .setLabel(`${spot.emoji} ${spot.name}`)
        .setStyle(ButtonStyle.Primary),
    ),
  );
  return interaction.reply({
    embeds: [
      okEmbed(
        'Store raid',
        'Pick a mark. Higher risk = more clouds and a chance at a random pod.',
      ),
    ],
    components: [row],
  });
}

export async function resolveSpot(interaction, spotId) {
  if (!interaction.customId.startsWith(`spot:${interaction.user.id}:`)) {
    return interaction.reply({ embeds: [errorEmbed('This raid is not yours.')], ephemeral: true });
  }
  const spot = RAID_SPOTS.find((s) => s.id === spotId);
  if (!spot) {
    return interaction.reply({ embeds: [errorEmbed('Unknown spot.')], ephemeral: true });
  }
  await interaction.deferUpdate();
  const disabled = new ActionRowBuilder().addComponents(
    interaction.message.components[0].components.map((c) => ButtonBuilder.from(c).setDisabled(true)),
  );
  await interaction.editReply({ components: [disabled] });

  const user = await loadProfile(interaction);
  const gid = guildIdOf(interaction);
  updateUser(interaction.user.id, gid, { last_raid: now() });
  const busted = Math.random() < spot.risk;

  if (busted) {
    const fine = Math.min(user.clouds, randInt(20, 60));
    const next = addClouds(interaction.user.id, gid, -fine);
    const gif = await renderSceneGif('raid', next, {
      success: false,
      subtitle: `${spot.name} cameras`,
      line: `-${fine} clouds`,
    });
    const embed = errorEmbed(`Busted at the **${spot.name}**. Lost **${fine}** clouds.`);
    embed.setImage('attachment://spot.gif');
    return interaction.followUp({ embeds: [embed], files: [{ attachment: gif, name: 'spot.gif' }] });
  }

  const payout = randInt(spot.payout[0], spot.payout[1]);
  let extra = '';
  const next = addClouds(interaction.user.id, gid, payout);
  if (Math.random() < spot.flavorChance) {
    const drop = FLAVORS.filter((f) => !f.exclusive && f.price > 0)[randInt(0, 6)];
    if (drop) {
      addItem(interaction.user.id, gid, drop.id, 'flavor');
      extra = `\nFound a **${drop.name}** pod in the back.`;
    }
  }
  const gif = await renderSceneGif('raid', next, {
    success: true,
    subtitle: spot.name,
    line: `+${payout} clouds`,
  });
  const embed = okEmbed('Store cleaned', `You hit the **${spot.name}** for **${payout} clouds**.${extra}`, flavorOf(next).color);
  embed.setImage('attachment://spot.gif');
  return interaction.followUp({ embeds: [embed], files: [{ attachment: gif, name: 'spot.gif' }] });
}

const wireGames = new Map();

export async function handleWire(interaction) {
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_wire, GAME.wireCooldownMs, 'Wire job')) return;
  updateUser(interaction.user.id, guildIdOf(interaction), { last_wire: now() });
  const seq = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, 3);
  wireGames.set(interaction.user.id, { seq, step: 0, started: Date.now() });
  const row = new ActionRowBuilder().addComponents(
    ['RED', 'GRN', 'BLU', 'YLW'].map((label, i) =>
      new ButtonBuilder()
        .setCustomId(`wire:${interaction.user.id}:${i}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary),
    ),
  );
  return interaction.reply({
    embeds: [
      okEmbed(
        '🔌 Wire job',
        'Cut the right 3 wires in order. Wrong cut shorts the board. You get **one** try — feel it out.',
      ),
    ],
    components: [row],
  });
}

export async function resolveWire(interaction, index) {
  const game = wireGames.get(interaction.user.id);
  if (!game) {
    return interaction.reply({ embeds: [errorEmbed('That wire job expired.')], ephemeral: true });
  }
  await interaction.deferUpdate();
  const expected = game.seq[game.step];
  if (index !== expected) {
    wireGames.delete(interaction.user.id);
    const disabled = new ActionRowBuilder().addComponents(
      interaction.message.components[0].components.map((c) => ButtonBuilder.from(c).setDisabled(true)),
    );
    await interaction.editReply({ components: [disabled] });
    const user = await loadProfile(interaction);
    const fine = Math.min(user.clouds, randInt(15, 40));
    const next = addClouds(interaction.user.id, guildIdOf(interaction), -fine);
    const gif = await renderSceneGif('wire', next, { success: false, subtitle: 'short circuit', line: `-${fine} clouds` });
    const embed = errorEmbed(`Wrong wire. Board fried. Lost **${fine}** clouds.`);
    embed.setImage('attachment://wire.gif');
    return interaction.followUp({ embeds: [embed], files: [{ attachment: gif, name: 'wire.gif' }] });
  }
  game.step += 1;
  if (game.step < game.seq.length) {
    return interaction.followUp({ embeds: [okEmbed('Still live', `Wire ${game.step}/3 good. Keep cutting.`)], ephemeral: true });
  }
  wireGames.delete(interaction.user.id);
  const disabled = new ActionRowBuilder().addComponents(
    interaction.message.components[0].components.map((c) => ButtonBuilder.from(c).setDisabled(true)),
  );
  await interaction.editReply({ components: [disabled] });
  const payout = randInt(120, 240);
  const next = addClouds(interaction.user.id, guildIdOf(interaction), payout);
  const gif = await renderSceneGif('wire', next, { success: true, subtitle: 'silent entry', line: `+${payout} clouds` });
  const embed = okEmbed('Wired', `Clean cuts. You walked with **${payout} clouds**.`, flavorOf(next).color);
  embed.setImage('attachment://wire.gif');
  return interaction.followUp({ embeds: [embed], files: [{ attachment: gif, name: 'wire.gif' }] });
}

export async function handleVanish(interaction) {
  const user = await loadProfile(interaction);
  if (user.clouds < GAME.vanishCost) {
    return interaction.reply({ embeds: [errorEmbed(`Vanish costs **${GAME.vanishCost}** clouds.`)], ephemeral: true });
  }
  await interaction.deferReply();
  const until = Math.max(user.raid_shield_until, now()) + GAME.vanishMs;
  const next = updateUser(interaction.user.id, guildIdOf(interaction), {
    clouds: user.clouds - GAME.vanishCost,
    raid_shield_until: until,
    last_vanish: now(),
  });
  const gif = await renderSceneGif('vibe', next, {
    title: 'VANISH',
    subtitle: '2h shield',
    line: 'smoke bomb — off the map',
    color: '#9B6DFF',
  });
  return replyGif(
    interaction,
    okEmbed('🫥 Vanished', `Raid shield extended ~2 hours. -${GAME.vanishCost} clouds.`, '#9B6DFF'),
    gif,
    'vanish.gif',
  );
}

const lockpickGames = new Map();

export async function handleLockpick(interaction) {
  const user = await loadProfile(interaction);
  if (await denyCooldown(interaction, user.last_lockpick, GAME.lockpickCooldownMs, 'Lockpick')) return;
  updateUser(interaction.user.id, guildIdOf(interaction), { last_lockpick: now() });
  const secret = randInt(0, 3);
  lockpickGames.set(interaction.user.id, { secret, attempts: 2, started: Date.now() });
  const row = new ActionRowBuilder().addComponents(
    ['PIN 1', 'PIN 2', 'PIN 3', 'PIN 4'].map((label, i) =>
      new ButtonBuilder()
        .setCustomId(`lockpick:${interaction.user.id}:${i}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary),
    ),
  );
  return interaction.reply({
    embeds: [okEmbed('🔓 Lockpick', 'Feel the pins. **Two** attempts. One pin opens the lock.')],
    components: [row],
  });
}

export async function resolveLockpick(interaction, index) {
  const game = lockpickGames.get(interaction.user.id);
  if (!game) {
    return interaction.reply({ embeds: [errorEmbed('That lock expired.')], ephemeral: true });
  }
  if (Date.now() - game.started > 120_000) {
    lockpickGames.delete(interaction.user.id);
    return interaction.reply({ embeds: [errorEmbed('The lock seized. Too slow.')], ephemeral: true });
  }

  await interaction.deferUpdate();
  if (index === game.secret) {
    lockpickGames.delete(interaction.user.id);
    const disabled = new ActionRowBuilder().addComponents(
      interaction.message.components[0].components.map((c) => ButtonBuilder.from(c).setDisabled(true)),
    );
    await interaction.editReply({ components: [disabled] });
    const payout = randInt(90, 180);
    const next = addClouds(interaction.user.id, guildIdOf(interaction), payout);
    const quest = bumpQuest(interaction.user.id, guildIdOf(interaction), 'raid');
    const gif = await renderSceneGif('lockpick', next, {
      success: true,
      pin: index,
      subtitle: 'pins dropped',
      line: `+${payout} clouds`,
    });
    const embed = okEmbed('Unlocked', `The cylinder turned. You walked with **${payout} clouds**.${questNote(quest)}`, flavorOf(next).color);
    embed.setImage('attachment://lockpick.gif');
    return interaction.followUp({ embeds: [embed], files: [{ attachment: gif, name: 'lockpick.gif' }] });
  }

  game.attempts -= 1;
  if (game.attempts > 0) {
    return interaction.followUp({
      embeds: [okEmbed('Still stuck', 'That pin did not give. **One** attempt left.')],
      ephemeral: true,
    });
  }

  lockpickGames.delete(interaction.user.id);
  const disabled = new ActionRowBuilder().addComponents(
    interaction.message.components[0].components.map((c) => ButtonBuilder.from(c).setDisabled(true)),
  );
  await interaction.editReply({ components: [disabled] });
  const user = await loadProfile(interaction);
  const fine = Math.min(user.clouds, randInt(12, 35));
  const next = addClouds(interaction.user.id, guildIdOf(interaction), -fine);
  const gif = await renderSceneGif('lockpick', next, {
    success: false,
    pin: game.secret,
    subtitle: 'snapped pick',
    line: `-${fine} clouds`,
  });
  const embed = errorEmbed(`Pick snapped. Alarm chirped. Lost **${fine}** clouds.`);
  embed.setImage('attachment://lockpick.gif');
  return interaction.followUp({ embeds: [embed], files: [{ attachment: gif, name: 'lockpick.gif' }] });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
