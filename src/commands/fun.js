import { EmbedBuilder } from 'discord.js';
import { errorEmbed, okEmbed, ACCENT } from '../utils/embeds.js';
import { pick, randInt } from '../utils/game.js';

const FAKE_CITIES = ['Vamp City', 'Opium Hills', 'Teen X Bluffs', 'Slatt Harbor', 'YVL Springs'];
const FAKE_ISPS = ['CloudNet Joke ISP', 'PerkPop Fiber', 'King Vamp Wireless', 'Test-Net Documentation'];

function isIpOrHost(value) {
  const v = String(value || '').trim();
  if (!v || v.length > 253) return false;
  if (/\s/.test(v)) return false;
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|0\.0\.0\.0)/i.test(v)) return false;
  return /^(?:(?:[a-z0-9-]+\.)+[a-z]{2,}|(?:\d{1,3}\.){3}\d{1,3}|[a-f0-9:]+)$/i.test(v);
}

function field(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value == null || value === '') return 'N/A';
  return String(value).slice(0, 1024);
}

async function lookupPublicIp(query) {
  const url = `http://ip-api.com/json/${encodeURIComponent(query)}?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,query`;
  const res = await fetch(url, { headers: { 'User-Agent': 'geekbar-bot' } });
  return res.json();
}

function ipLookupEmbed(d) {
  const coords = d.lat == null || d.lon == null ? 'N/A' : `${d.lat}, ${d.lon}`;
  return new EmbedBuilder()
    .setColor(0x2f3136)
    .setTitle(`IP Lookup: ${d.query}`)
    .setDescription('Public geo/ISP data only. This does not show Discord user IPs.')
    .addFields(
      { name: 'Continent', value: `${field(d.continent)} (${field(d.continentCode)})`, inline: true },
      { name: 'Country', value: `${field(d.country)} (${field(d.countryCode)})`, inline: true },
      { name: 'Region', value: `${field(d.regionName)} (${field(d.region)})`, inline: true },
      { name: 'City', value: field(d.city), inline: true },
      { name: 'Zip', value: field(d.zip), inline: true },
      { name: 'Coords', value: coords, inline: true },
      { name: 'Timezone', value: field(d.timezone), inline: true },
      { name: 'ISP', value: field(d.isp), inline: true },
      { name: 'Org', value: field(d.org), inline: true },
      { name: 'AS', value: field(d.as), inline: true },
      { name: 'Proxy', value: field(d.proxy), inline: true },
      { name: 'Hosting', value: field(d.hosting), inline: true },
    )
    .setFooter({ text: 'heist' })
    .setTimestamp();
}

export async function handleIpLookup(interaction) {
  const query = (interaction.options.getString('ip') ?? interaction.options.getString('target') ?? '').trim();
  if (!isIpOrHost(query)) {
    return interaction.reply({
      embeds: [errorEmbed('Give a public IP or domain like `8.8.8.8` or `discord.com`. Private IPs and Discord users are not supported.')],
      ephemeral: true,
    });
  }

  await interaction.deferReply();
  try {
    const data = await lookupPublicIp(query);
    if (data.status !== 'success') {
      return interaction.editReply({ embeds: [errorEmbed(data.message || `Failed to lookup \`${query}\`.`)] });
    }
    return interaction.editReply({ embeds: [ipLookupEmbed(data)] });
  } catch (err) {
    return interaction.editReply({
      embeds: [errorEmbed(`Failed to lookup \`${query}\`: ${err.message || 'Lookup API is down.'}`)],
    });
  }
}

export async function handleIpCommand(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'lookup') return handleIpLookup(interaction);
  return interaction.reply({ content: 'Unknown ip command.', ephemeral: true });
}

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
