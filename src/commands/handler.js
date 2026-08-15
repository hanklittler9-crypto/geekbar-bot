import { handleHit, handleCharge, handleCustomize, handleFlavor, handleStats, handleProfile, handleDaily, handleHelp, flavorAutocomplete } from './core.js';
import { handleShop, handleInventory, handleStash, handleGift, handleLeaderboard, handleRepair, handlePrestige, handleFlex, shopAutocomplete } from './economy.js';
import { handleRaid, handleJack, handleChase, handleSmokeout, handleBounty, handleBountyBoard, handleRoulette, handleSpot, handleWire, handleVanish } from './heist.js';
import {
  handleStudioVibe,
  handleStudioRender,
  handleStudioLab,
  handleStudioGif,
  handleStudioWrap,
  handleStudioCard,
  handleStudioSkins,
  handleStudioEquip,
  handleStudioNeon,
  handleStudioSticker,
  gifEffectAutocomplete,
  skinAutocomplete,
} from './studio.js';

export async function handleGeekbar(interaction) {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();

  if (group === 'heist') {
    switch (sub) {
      case 'raid':
        return handleRaid(interaction);
      case 'jack':
        return handleJack(interaction);
      case 'chase':
        return handleChase(interaction);
      case 'smokeout':
        return handleSmokeout(interaction);
      case 'bounty':
        return handleBounty(interaction);
      case 'roulette':
        return handleRoulette(interaction);
      case 'board':
        return handleBountyBoard(interaction);
      case 'spot':
        return handleSpot(interaction);
      case 'wire':
        return handleWire(interaction);
      case 'vanish':
        return handleVanish(interaction);
      default:
        return interaction.reply({ content: 'Unknown heist command.', ephemeral: true });
    }
  }

  if (group === 'studio') {
    switch (sub) {
      case 'vibe':
        return handleStudioVibe(interaction);
      case 'render':
        return handleStudioRender(interaction);
      case 'lab':
        return handleStudioLab(interaction);
      case 'gif':
        return handleStudioGif(interaction);
      case 'wrap':
        return handleStudioWrap(interaction);
      case 'card':
        return handleStudioCard(interaction);
      case 'skins':
        return handleStudioSkins(interaction);
      case 'equip':
        return handleStudioEquip(interaction);
      case 'neon':
        return handleStudioNeon(interaction);
      case 'sticker':
        return handleStudioSticker(interaction);
      default:
        return interaction.reply({ content: 'Unknown studio command.', ephemeral: true });
    }
  }

  switch (sub) {
    case 'hit':
      return handleHit(interaction);
    case 'charge':
      return handleCharge(interaction);
    case 'customize':
      return handleCustomize(interaction);
    case 'flavor':
      return handleFlavor(interaction);
    case 'stats':
      return handleStats(interaction);
    case 'profile':
      return handleProfile(interaction);
    case 'daily':
      return handleDaily(interaction);
    case 'shop':
      return handleShop(interaction);
    case 'inventory':
      return handleInventory(interaction);
    case 'stash':
      return handleStash(interaction);
    case 'leaderboard':
      return handleLeaderboard(interaction);
    case 'flex':
      return handleFlex(interaction);
    case 'repair':
      return handleRepair(interaction);
    case 'prestige':
      return handlePrestige(interaction);
    case 'gift':
      return handleGift(interaction);
    case 'help':
      return handleHelp(interaction);
    default:
      return interaction.reply({ content: 'Unknown command.', ephemeral: true });
  }
}

export async function handleAutocomplete(interaction) {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand(false);
  const focused = interaction.options.getFocused(true);

  if (group === 'studio') {
    if (sub === 'gif' && focused.name === 'effect') return gifEffectAutocomplete(interaction);
    if (sub === 'equip' && focused.name === 'skin') return skinAutocomplete(interaction);
    return interaction.respond([]);
  }

  switch (sub) {
    case 'flavor':
      return flavorAutocomplete(interaction);
    case 'shop':
      return shopAutocomplete(interaction);
    default:
      return interaction.respond([]);
  }
}
