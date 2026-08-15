import { Client, GatewayIntentBits, Events, MessageFlags } from 'discord.js';
import { config, validateConfig } from './config.js';
import { commands } from './commands/definitions.js';
import { routeAutocomplete, routeCommand } from './commands/router.js';
import { handleButton, handleModal } from './commands/interactions.js';

validateConfig();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Geek Bar bot online as ${c.user.tag}`);
  try {
    if (config.guildId) {
      await c.application.commands.set(commands, config.guildId);
      console.log(`Slash commands registered to guild ${config.guildId}`);
    } else {
      await c.application.commands.set(commands);
      console.log('Slash commands registered globally (can take up to an hour)');
    }
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await routeCommand(interaction);
    } else if (interaction.isAutocomplete()) {
      await routeAutocomplete(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    }
  } catch (err) {
    console.error('Interaction error:', err);
    if (interaction.isAutocomplete()) {
      await interaction.respond([]).catch(() => {});
      return;
    }
    const payload = { content: 'Something went wrong. Try again.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(config.token);
