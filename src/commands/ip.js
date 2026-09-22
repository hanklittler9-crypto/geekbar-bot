import { EmbedBuilder } from 'discord.js';
import { Resolver, reverse } from 'node:dns/promises';
import { errorEmbed } from '../utils/embeds.js';
import { pick, randInt } from '../utils/game.js';
import {
  classifyTarget,
  field,
  haversineKm,
  lookupPublicIp,
  mapUrl,
  requirePublicTarget,
} from '../utils/ip.js';

const resolver = new Resolver();

const FAKE_CITIES = ['Vamp City', 'Opium Hills', 'Teen X Bluffs', 'Slatt Harbor', 'YVL Springs'];
const FAKE_ISPS = ['CloudNet Joke ISP', 'PerkPop Fiber', 'King Vamp Wireless', 'Test-Net Documentation'];

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

function reject(interaction, reason) {
  return interaction.reply({ embeds: [errorEmbed(reason)], ephemeral: true });
}

export async function handleIpLookup(interaction) {
  const query = (interaction.options.getString('ip') ?? interaction.options.getString('target') ?? '').trim();
  const parsed = requirePublicTarget(query);
  if (!parsed.ok) return reject(interaction, parsed.reason);

  await interaction.deferReply();
  try {
    const data = await lookupPublicIp(parsed.value);
    if (data.status !== 'success') {
      return interaction.editReply({ embeds: [errorEmbed(data.message || `Failed to lookup \`${parsed.value}\`.`)] });
    }
    return interaction.editReply({ embeds: [ipLookupEmbed(data)] });
  } catch (err) {
    return interaction.editReply({
      embeds: [errorEmbed(`Failed to lookup \`${parsed.value}\`: ${err.message || 'Lookup API is down.'}`)],
    });
  }
}

async function handleDns(interaction) {
  const raw = interaction.options.getString('host', true).trim();
  const parsed = requirePublicTarget(raw);
  if (!parsed.ok) return reject(interaction, parsed.reason);
  if (parsed.kind !== 'host') {
    return reject(interaction, 'DNS resolve wants a **domain**, like `discord.com`. Use `/ip reverse` for an IP.');
  }

  await interaction.deferReply();
  try {
    const [v4, v6] = await Promise.all([
      resolver.resolve4(parsed.value).catch(() => []),
      resolver.resolve6(parsed.value).catch(() => []),
    ]);
    const publicV4 = v4.filter((ip) => classifyTarget(ip).public);
    const publicV6 = v6.filter((ip) => classifyTarget(ip).public);
    if (!publicV4.length && !publicV6.length) {
      return interaction.editReply({
        embeds: [errorEmbed(`No public addresses published for \`${parsed.value}\`.`)],
      });
    }
    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle(`DNS: ${parsed.value}`)
      .setDescription('Public A / AAAA records only.')
      .addFields(
        { name: 'IPv4', value: publicV4.join('\n').slice(0, 1024) || 'N/A' },
        { name: 'IPv6', value: publicV6.join('\n').slice(0, 1024) || 'N/A' },
      )
      .setFooter({ text: 'heist' })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ embeds: [errorEmbed(`DNS failed: ${err.message}`)] });
  }
}

async function handleReverse(interaction) {
  const raw = interaction.options.getString('ip', true).trim();
  const parsed = requirePublicTarget(raw);
  if (!parsed.ok) return reject(interaction, parsed.reason);
  if (parsed.kind === 'host') {
    return reject(interaction, 'Reverse DNS wants a **public IP**, like `1.1.1.1`. Use `/ip dns` for a domain.');
  }

  await interaction.deferReply();
  try {
    const names = await reverse(parsed.value);
    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle(`Reverse DNS: ${parsed.value}`)
      .setDescription(names.length ? names.map((n) => `\`${n}\``).join('\n') : 'No PTR record.')
      .setFooter({ text: 'heist' })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ embeds: [errorEmbed(`No reverse DNS for \`${parsed.value}\`. ${err.message}`)] });
  }
}

async function handleMap(interaction) {
  const raw = interaction.options.getString('ip', true).trim();
  const parsed = requirePublicTarget(raw);
  if (!parsed.ok) return reject(interaction, parsed.reason);

  await interaction.deferReply();
  try {
    const data = await lookupPublicIp(parsed.value);
    if (data.status !== 'success' || data.lat == null || data.lon == null) {
      return interaction.editReply({ embeds: [errorEmbed('No public coordinates for that target.')] });
    }
    const url = mapUrl(data.lat, data.lon);
    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle(`Map: ${data.query}`)
      .setDescription(`${field(data.city)}, ${field(data.regionName)}, ${field(data.country)}\n[OpenStreetMap](${url})`)
      .addFields(
        { name: 'Coords', value: `${data.lat}, ${data.lon}`, inline: true },
        { name: 'ISP', value: field(data.isp), inline: true },
      )
      .setFooter({ text: 'heist · public geo only' })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ embeds: [errorEmbed(`Map failed: ${err.message}`)] });
  }
}

async function handleCompare(interaction) {
  const aRaw = interaction.options.getString('a', true).trim();
  const bRaw = interaction.options.getString('b', true).trim();
  const a = requirePublicTarget(aRaw);
  const b = requirePublicTarget(bRaw);
  if (!a.ok) return reject(interaction, a.reason);
  if (!b.ok) return reject(interaction, b.reason);

  await interaction.deferReply();
  try {
    const [left, right] = await Promise.all([lookupPublicIp(a.value), lookupPublicIp(b.value)]);
    if (left.status !== 'success' || right.status !== 'success') {
      return interaction.editReply({ embeds: [errorEmbed('One of those public lookups failed.')] });
    }
    let distance = 'N/A';
    if (left.lat != null && right.lat != null) {
      distance = `${Math.round(haversineKm(left.lat, left.lon, right.lat, right.lon))} km`;
    }
    const line = (d) =>
      `${field(d.city)}, ${field(d.country)}\n${field(d.isp)}\n${field(d.as)}`;
    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle('IP compare')
      .setDescription(`Public geo only. Distance **${distance}**.`)
      .addFields(
        { name: left.query, value: line(left), inline: true },
        { name: right.query, value: line(right), inline: true },
        { name: 'Same country', value: left.countryCode === right.countryCode ? 'Yes' : 'No', inline: true },
        { name: 'Same ISP', value: left.isp === right.isp ? 'Yes' : 'No', inline: true },
      )
      .setFooter({ text: 'heist' })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ embeds: [errorEmbed(`Compare failed: ${err.message}`)] });
  }
}

async function handleCheck(interaction) {
  const raw = interaction.options.getString('ip', true).trim();
  const parsed = classifyTarget(raw);
  if (!parsed.ok) return reject(interaction, parsed.reason);

  const labels = {
    public: 'Public — safe to look up with `/ip lookup`',
    private: 'Private LAN — not looked up',
    loopback: 'Loopback — this machine only',
    'link-local': 'Link-local — not routed on the public internet',
    cgnat: 'Carrier-grade NAT — not a unique public address',
    documentation: 'Documentation / TEST-NET — example range, not a real host',
    multicast: 'Multicast — not a unicast host',
    reserved: 'Reserved — not a public host',
    'this-network': 'This-network — not a public host',
    hostname: 'Hostname — resolve with `/ip dns` or look up with `/ip lookup`',
  };

  const embed = new EmbedBuilder()
    .setColor(parsed.public ? 0x2f3136 : 0x8B1E3F)
    .setTitle(`IP check: ${parsed.value}`)
    .setDescription(labels[parsed.class] || parsed.class)
    .addFields(
      { name: 'Kind', value: parsed.kind, inline: true },
      { name: 'Class', value: parsed.class, inline: true },
      { name: 'Public lookup', value: parsed.public ? 'Allowed' : 'Blocked', inline: true },
    )
    .setFooter({ text: 'heist · classifier only, no scan' });
  return interaction.reply({ embeds: [embed] });
}

async function handleTime(interaction) {
  const raw = interaction.options.getString('ip', true).trim();
  const parsed = requirePublicTarget(raw);
  if (!parsed.ok) return reject(interaction, parsed.reason);

  await interaction.deferReply();
  try {
    const data = await lookupPublicIp(parsed.value);
    if (data.status !== 'success') {
      return interaction.editReply({ embeds: [errorEmbed(data.message || 'Lookup failed.')] });
    }
    let local = 'N/A';
    if (data.timezone) {
      local = new Date().toLocaleString('en-US', { timeZone: data.timezone, hour12: false });
    }
    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle(`Time: ${data.query}`)
      .addFields(
        { name: 'Timezone', value: field(data.timezone), inline: true },
        { name: 'Local time', value: local, inline: true },
        { name: 'City', value: `${field(data.city)}, ${field(data.country)}`, inline: true },
      )
      .setFooter({ text: 'heist' })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ embeds: [errorEmbed(`Time failed: ${err.message}`)] });
  }
}

async function handleWeather(interaction) {
  const raw = interaction.options.getString('ip', true).trim();
  const parsed = requirePublicTarget(raw);
  if (!parsed.ok) return reject(interaction, parsed.reason);

  await interaction.deferReply();
  try {
    const data = await lookupPublicIp(parsed.value);
    if (data.status !== 'success' || data.lat == null || data.lon == null) {
      return interaction.editReply({ embeds: [errorEmbed('No public coordinates for weather.')] });
    }
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${data.lat}&longitude=${data.lon}&current_weather=true`;
    const weather = await fetch(weatherUrl, { headers: { 'User-Agent': 'geekbar-bot' } }).then((r) => r.json());
    const cur = weather.current_weather;
    if (!cur) {
      return interaction.editReply({ embeds: [errorEmbed('Weather API returned nothing.')] });
    }
    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle(`Weather: ${data.query}`)
      .setDescription(`${field(data.city)}, ${field(data.country)}`)
      .addFields(
        { name: 'Temp', value: `${cur.temperature}°C`, inline: true },
        { name: 'Wind', value: `${cur.windspeed} km/h`, inline: true },
        { name: 'Timezone', value: field(data.timezone), inline: true },
      )
      .setFooter({ text: 'heist · Open-Meteo + public geo' })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ embeds: [errorEmbed(`Weather failed: ${err.message}`)] });
  }
}

async function handleJoke(interaction) {
  const target = interaction.options.getUser('user') ?? interaction.user;
  const ip = `203.0.113.${randInt(1, 254)}`;
  const embed = new EmbedBuilder()
    .setColor('#FF5C5C')
    .setTitle('FAKE IP  ·  joke')
    .setDescription(`Traced **${target}**\n\`${ip}\`\n${pick(FAKE_CITIES)} · ${pick(FAKE_ISPS)}\n\nThis is **fake**. Documentation-range IP. Not a real trace.`)
    .setFooter({ text: 'joke command — nobody got doxed' });
  return interaction.reply({ embeds: [embed] });
}

export async function handleIpCommand(interaction) {
  const sub = interaction.options.getSubcommand();
  switch (sub) {
    case 'lookup':
      return handleIpLookup(interaction);
    case 'dns':
      return handleDns(interaction);
    case 'reverse':
      return handleReverse(interaction);
    case 'map':
      return handleMap(interaction);
    case 'compare':
      return handleCompare(interaction);
    case 'check':
      return handleCheck(interaction);
    case 'time':
      return handleTime(interaction);
    case 'weather':
      return handleWeather(interaction);
    case 'joke':
      return handleJoke(interaction);
    default:
      return interaction.reply({ content: 'Unknown ip command.', ephemeral: true });
  }
}
