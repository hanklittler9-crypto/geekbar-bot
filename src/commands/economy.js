import { EmbedBuilder } from 'discord.js';
import { GAME, levelFromXp } from '../config.js';
import {
  addClouds,
  addItem,
  getInventory,
  getLeaderboard,
  hasItem,
  updateUser,
} from '../database/db.js';
import { FLAVORS, SKINS, SHOP_ITEMS, getFlavor, getShopItem, getSkin } from '../data/gameData.js';
import { errorEmbed, flavorOf, okEmbed, ACCENT } from '../utils/embeds.js';
import { renderSceneGif } from '../utils/gifGenerator.js';
import { guildIdOf, loadProfile, replyGif } from '../utils/game.js';

export async function handleShop(interaction) {
  const buy = interaction.options.getString('buy');
  if (!buy) {
    const embed = new EmbedBuilder()
      .setColor(ACCENT)
      .setTitle('Geek Bar shop')
      .setDescription('Use `/geekbar shop buy:` to purchase. Currency is **clouds**.')
      .addFields(
        {
          name: 'Kits',
          value: SHOP_ITEMS.map((i) => `${i.emoji} **${i.name}** — ${i.price}c\n${i.description}`).join('\n\n'),
        },
        {
          name: 'Flavors',
          value: FLAVORS.filter((f) => f.price > 0 && !f.exclusive)
            .map((f) => `${f.emoji} **${f.name}** — ${f.price}c`)
            .join('\n'),
        },
        {
          name: 'Wraps',
          value: SKINS.filter((s) => s.price > 0 && !s.exclusive)
            .map((s) => `**${s.name}** — ${s.price}c`)
            .join('\n'),
        },
      );
    return interaction.reply({ embeds: [embed] });
  }

  return purchase(interaction, buy);
}

async function purchase(interaction, id) {
  const user = await loadProfile(interaction);
  const gid = guildIdOf(interaction);
  const kit = getShopItem(id);
  const flavor = FLAVORS.find((f) => f.id === id);
  const skin = SKINS.find((s) => s.id === id);

  const item = kit || flavor || skin;
  if (!item) {
    return interaction.reply({ embeds: [errorEmbed('Unknown item.')], ephemeral: true });
  }
  if (item.exclusive) {
    return interaction.reply({ embeds: [errorEmbed('That one is exclusive.')], ephemeral: true });
  }
  if (user.clouds < item.price) {
    return interaction.reply({ embeds: [errorEmbed(`Need **${item.price}** clouds.`)], ephemeral: true });
  }

  if (flavor) {
    if (hasItem(interaction.user.id, gid, flavor.id, 'flavor')) {
      return interaction.reply({ embeds: [errorEmbed('You already own that pod.')], ephemeral: true });
    }
    addItem(interaction.user.id, gid, flavor.id, 'flavor');
    addClouds(interaction.user.id, gid, -flavor.price);
    return interaction.reply({ embeds: [okEmbed('Pod unlocked', `**${flavor.name}** is in your inventory.`)] });
  }

  if (skin) {
    if (hasItem(interaction.user.id, gid, skin.id, 'skin')) {
      return interaction.reply({ embeds: [errorEmbed('You already own that wrap.')], ephemeral: true });
    }
    addItem(interaction.user.id, gid, skin.id, 'skin');
    addClouds(interaction.user.id, gid, -skin.price);
    return interaction.reply({ embeds: [okEmbed('Wrap unlocked', `**${skin.name}** is ready. Equip it with \`/geekbar studio equip\`.`)] });
  }

  const fields = { clouds: user.clouds - kit.price };
  if (kit.id === 'pod_refill') fields.pod_puffs = GAME.podCapacity;
  if (kit.id === 'battery_boost') fields.battery = GAME.maxBattery;
  if (kit.id === 'buzz_reset') fields.buzz = 0;
  if (kit.id === 'raid_shield') fields.raid_shield_until = Date.now() + 24 * 60 * 60_000;
  if (kit.id === 'xp_boost') fields.xp_boost_until = Date.now() + 60 * 60_000;
  if (kit.id === 'repair_kit') fields.burnt = 0;
  updateUser(interaction.user.id, gid, fields);
  return interaction.reply({ embeds: [okEmbed('Purchased', `${kit.emoji} **${kit.name}** is locked in.`)] });
}

export async function shopAutocomplete(interaction) {
  const q = interaction.options.getFocused().toLowerCase();
  const options = [
    ...SHOP_ITEMS.map((i) => ({ name: `${i.emoji} ${i.name} (${i.price}c)`, value: i.id })),
    ...FLAVORS.filter((f) => f.price > 0 && !f.exclusive).map((f) => ({
      name: `${f.emoji} ${f.name} (${f.price}c)`,
      value: f.id,
    })),
    ...SKINS.filter((s) => s.price > 0 && !s.exclusive).map((s) => ({
      name: `${s.name} (${s.price}c)`,
      value: s.id,
    })),
  ].filter((o) => o.name.toLowerCase().includes(q)).slice(0, 25);
  return interaction.respond(options);
}

export async function handleInventory(interaction) {
  const user = await loadProfile(interaction);
  const inv = getInventory(interaction.user.id, guildIdOf(interaction));
  const flavors = inv.filter((i) => i.kind === 'flavor').map((i) => getFlavor(i.item_id)?.name || i.item_id);
  const skins = inv.filter((i) => i.kind === 'skin').map((i) => getSkin(i.item_id)?.name || i.item_id);
  const embed = new EmbedBuilder()
    .setColor(flavorOf(user).color)
    .setTitle(`${user.device_name} — inventory`)
    .addFields(
      { name: 'Clouds', value: `${user.clouds}  (stash ${user.stash})`, inline: true },
      { name: 'Equipped', value: `${flavorOf(user).name} · ${getSkin(user.skin).name}`, inline: true },
      { name: 'Pods', value: flavors.length ? flavors.join('\n') : 'Starter pods only', inline: false },
      { name: 'Wraps', value: skins.length ? skins.join('\n') : 'Stealth Black', inline: false },
    );
  return interaction.reply({ embeds: [embed] });
}

export async function handleStash(interaction) {
  const amount = interaction.options.getInteger('amount', true);
  const user = await loadProfile(interaction);
  if (amount === 0) {
    return interaction.reply({ embeds: [errorEmbed('Amount cannot be 0.')], ephemeral: true });
  }
  if (amount > 0) {
    if (user.clouds < amount) {
      return interaction.reply({ embeds: [errorEmbed('Not enough clouds on you.')], ephemeral: true });
    }
    updateUser(interaction.user.id, guildIdOf(interaction), {
      clouds: user.clouds - amount,
      stash: user.stash + amount,
    });
    return interaction.reply({ embeds: [okEmbed('Stashed', `Hid **${amount}** clouds. Raids can't touch the stash.`)] });
  }
  const take = Math.abs(amount);
  if (user.stash < take) {
    return interaction.reply({ embeds: [errorEmbed('Not enough in the stash.')], ephemeral: true });
  }
  updateUser(interaction.user.id, guildIdOf(interaction), {
    clouds: user.clouds + take,
    stash: user.stash - take,
  });
  return interaction.reply({ embeds: [okEmbed('Withdrawn', `Pulled **${take}** clouds back onto your person.`)] });
}

export async function handleGift(interaction) {
  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);
  if (target.bot || target.id === interaction.user.id) {
    return interaction.reply({ embeds: [errorEmbed("You can't gift that target.")], ephemeral: true });
  }
  const user = await loadProfile(interaction);
  if (user.clouds < amount) {
    return interaction.reply({ embeds: [errorEmbed('Not enough clouds.')], ephemeral: true });
  }
  const gid = guildIdOf(interaction);
  addClouds(interaction.user.id, gid, -amount);
  addClouds(target.id, gid, amount);
  return interaction.reply({
    embeds: [okEmbed('Gifted', `Sent **${amount} clouds** to **${target.displayName ?? target.username}**.`)],
  });
}

export async function handleLeaderboard(interaction) {
  const category = interaction.options.getString('category') ?? 'total_hits';
  const rows = getLeaderboard(guildIdOf(interaction), category, 10);
  const labels = { total_hits: 'Hits', xp: 'XP', clouds: 'Clouds', stash: 'Stash' };
  const lines = rows.map((r, i) => {
    const val = r[category];
    return `**${i + 1}.** <@${r.user_id}> — ${r.device_name} · **${val}** ${labels[category]} · Lv ${levelFromXp(r.xp)}`;
  });
  const embed = new EmbedBuilder()
    .setColor(ACCENT)
    .setTitle(`Leaderboard — ${labels[category]}`)
    .setDescription(lines.join('\n') || 'No operators yet. Take a hit.');
  return interaction.reply({ embeds: [embed] });
}

export async function handleRepair(interaction) {
  const user = await loadProfile(interaction);
  if (!user.burnt) {
    return interaction.reply({ embeds: [okEmbed('Already fresh', 'Coil is fine. No repair needed.')], ephemeral: true });
  }
  if (user.clouds < 80) {
    return interaction.reply({ embeds: [errorEmbed('Repair costs **80 clouds** (or buy a coil kit).')], ephemeral: true });
  }
  await interaction.deferReply();
  const next = updateUser(interaction.user.id, guildIdOf(interaction), {
    burnt: 0,
    battery: GAME.maxBattery,
    clouds: user.clouds - 80,
  });
  const gif = await renderSceneGif('repair', next, { subtitle: 'new coil seated' });
  return replyGif(interaction, okEmbed('🔧 Repaired', 'Geek Bar is back online.', flavorOf(next).color), gif, 'repair.gif');
}

export async function handlePrestige(interaction) {
  const user = await loadProfile(interaction);
  const level = levelFromXp(user.xp);
  if (level < GAME.prestigeMinLevel) {
    return interaction.reply({
      embeds: [errorEmbed(`Need level **${GAME.prestigeMinLevel}** to prestige. You are ${level}.`)],
      ephemeral: true,
    });
  }
  await interaction.deferReply();
  const next = updateUser(interaction.user.id, guildIdOf(interaction), {
    prestige: user.prestige + 1,
    xp: 0,
    total_hits: user.total_hits,
    skin: 'prestige',
    flavor: user.flavor,
    battery: 100,
    burnt: 0,
  });
  addItem(interaction.user.id, guildIdOf(interaction), 'prestige', 'skin');
  addItem(interaction.user.id, guildIdOf(interaction), 'prestige', 'flavor');
  const gif = await renderSceneGif('prestige', next, { line: 'onyx wrap unlocked' });
  return replyGif(
    interaction,
    okEmbed('👑 Prestige', `You are now prestige **${next.prestige}**. XP bonus up. Onyx wrap + Prestige Fog unlocked.`, '#FFD700'),
    gif,
    'prestige.gif',
  );
}

export async function handleFlex(interaction) {
  await interaction.deferReply();
  const user = await loadProfile(interaction);
  const gif = await renderSceneGif('flex', user);
  return replyGif(
    interaction,
    okEmbed('💎 Flex', `**${user.device_name}** · ${flavorOf(user).name}`, flavorOf(user).color),
    gif,
    'flex.gif',
  );
}
