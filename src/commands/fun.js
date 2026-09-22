import { EmbedBuilder } from 'discord.js';
import { okEmbed } from '../utils/embeds.js';
import { pick, randInt } from '../utils/game.js';

const FAKE_CITIES = ['Vamp City', 'Opium Hills', 'Teen X Bluffs', 'Slatt Harbor', 'YVL Springs'];
const FAKE_ISPS = ['CloudNet Joke ISP', 'PerkPop Fiber', 'King Vamp Wireless', 'Test-Net Documentation'];

export async function handleFakeIp(interaction) {
  const target = interaction.options.getUser('user') ?? interaction.user;
  const ip = `203.0.113.${randInt(1, 254)}`;
  const embed = new EmbedBuilder()
    .setColor('#FF5C5C')
    .setTitle('FAKE IP  ·  joke')
    .setDescription(`Traced **${target}**\n\`${ip}\`\n${pick(FAKE_CITIES)} · ${pick(FAKE_ISPS)}\n\nThis is **fake**. Documentation-range IP. Not a real trace.`)
    .setFooter({ text: 'joke command — nobody got doxed' });
  return interaction.reply({ embeds: [embed] });
}

export async function handlePing(interaction) {
  const ws = interaction.client.ws.ping;
  const sent = await interaction.reply({ embeds: [okEmbed('Pong', 'Measuring…')], fetchReply: true });
  const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
  return interaction.editReply({
    embeds: [okEmbed('Pong', `Websocket **${ws}ms**\nRound trip **${roundtrip}ms**`)],
  });
}

export async function handleFun(interaction) {
  const sub = interaction.options.getSubcommand();
  switch (sub) {
    case '8ball':
      return handle8ball(interaction);
    case 'aura':
      return handleMeter(interaction, 'Aura', ['washed', 'npc', 'decent', 'glowing', 'UNTOUCHABLE']);
    case 'rizz':
      return handleMeter(interaction, 'Rizz', ['0 rizz', 'unspoken', 'W rizz', 'unspeakable', 'rizzler']);
    case 'rate':
      return handleRate(interaction);
    case 'ship':
      return handleShip(interaction);
    default:
      return interaction.reply({ content: 'Unknown fun command.', ephemeral: true });
  }
}

function handle8ball(interaction) {
  const q = interaction.options.getString('question', true);
  const answers = [
    'slatt yes',
    'on my soul no',
    'ask ken',
    'jumpout later',
    'signs point to a fat cloud',
    'coil says no',
    'teen x timing — wait',
    'it is certain',
    'don\'t count on it',
    'yvl says go',
  ];
  return interaction.reply({
    embeds: [okEmbed('8-ball', `**${q}**\n\n${pick(answers)}`)],
  });
}

function handleMeter(interaction, label, ranks) {
  const user = interaction.options.getUser('user') ?? interaction.user;
  const score = randInt(0, 100);
  const rank = ranks[Math.min(ranks.length - 1, Math.floor(score / (100 / ranks.length)))];
  const bar = '█'.repeat(Math.round(score / 10)) + '░'.repeat(10 - Math.round(score / 10));
  return interaction.reply({
    embeds: [okEmbed(`${label}`, `${user}\n\`${bar}\` **${score}** — ${rank}`)],
  });
}

function handleRate(interaction) {
  const thing = interaction.options.getString('thing', true);
  const score = randInt(0, 100);
  return interaction.reply({ embeds: [okEmbed('Rate', `**${thing}** is **${score}/100**`)] });
}

function handleShip(interaction) {
  const a = interaction.options.getUser('user1', true);
  const b = interaction.options.getUser('user2', true);
  const score = randInt(0, 100);
  const names = [`${a.username.slice(0, 3)}${b.username.slice(-3)}`, `${a.username}${b.username}`.slice(0, 12)];
  return interaction.reply({
    embeds: [okEmbed('Ship', `${a} + ${b}\n**${score}%** · ship name **${pick(names)}**`)],
  });
}
