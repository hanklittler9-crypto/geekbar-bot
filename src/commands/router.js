import { handleAutocomplete, handleGeekbar } from './handler.js';
import { handleCloud } from './extras.js';
import { handleKingvamp, handlePerkpop } from './meme.js';

export async function routeCommand(interaction) {
  if (interaction.commandName === 'geekbar') {
    return handleGeekbar(interaction);
  }
  if (interaction.commandName === 'cloud') {
    return handleCloud(interaction);
  }
  if (interaction.commandName === 'kingvamp') {
    return handleKingvamp(interaction);
  }
  if (interaction.commandName === 'perkpop') {
    return handlePerkpop(interaction);
  }
  return interaction.reply({ content: 'Unknown command.', ephemeral: true });
}

export async function routeAutocomplete(interaction) {
  if (interaction.commandName === 'geekbar') {
    return handleAutocomplete(interaction);
  }
  return interaction.respond([]);
}
