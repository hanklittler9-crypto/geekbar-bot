import { handleAutocomplete, handleGeekbar } from './handler.js';

export async function routeCommand(interaction) {
  if (interaction.commandName === 'geekbar') {
    return handleGeekbar(interaction);
  }
  return interaction.reply({ content: 'Unknown command.', ephemeral: true });
}

export async function routeAutocomplete(interaction) {
  if (interaction.commandName === 'geekbar') {
    return handleAutocomplete(interaction);
  }
  return interaction.respond([]);
}
