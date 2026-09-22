import { handleAutocomplete, handleGeekbar } from './handler.js';
import { handleCloud } from './extras.js';
import { handleMeme } from './meme.js';
import { getMeme } from '../data/memes.js';
import { handleFakeIp, handleFun, handleIpCommand, handleIpLookup, handlePing } from './fun.js';

export async function routeCommand(interaction) {
  if (interaction.commandName === 'geekbar') {
    return handleGeekbar(interaction);
  }
  if (interaction.commandName === 'cloud') {
    return handleCloud(interaction);
  }
  if (interaction.commandName === 'fun') {
    return handleFun(interaction);
  }
  if (interaction.commandName === 'ip') {
    return handleIpCommand(interaction);
  }
  if (interaction.commandName === 'iplookup') {
    return handleIpLookup(interaction);
  }
  if (interaction.commandName === 'ping') {
    return handlePing(interaction);
  }
  if (interaction.commandName === 'fakeip') {
    return handleFakeIp(interaction);
  }
  if (getMeme(interaction.commandName)) {
    return handleMeme(interaction);
  }
  return interaction.reply({ content: 'Unknown command.', ephemeral: true });
}

export async function routeAutocomplete(interaction) {
  if (interaction.commandName === 'geekbar') {
    return handleAutocomplete(interaction);
  }
  return interaction.respond([]);
}
