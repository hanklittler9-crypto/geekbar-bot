import { EmbedBuilder } from 'discord.js';
import { Resolver, reverse } from 'node:dns/promises';
import { errorEmbed } from '../utils/embeds.js';
import { pick, randInt } from '../utils/game.js';
import {
  classifyTarget,
  convertIpv4,
  describeCidr,
  field,
  haversineKm,
  lookupPublicIp,
  lookupRdap,
  mapUrl,
  parseIpv4,
  requirePublicTarget,
  summarizeRdap,
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

async function handleWhois(interaction) {
  const raw = interaction.options.getString('ip', true).trim();
  const parsed = requirePublicTarget(raw);
  if (!parsed.ok) return reject(interaction, parsed.reason);

  await interaction.deferReply();
  try {
    let ip = parsed.value;
    if (parsed.kind === 'host') {
      const geo = await lookupPublicIp(parsed.value);
      if (geo.status !== 'success' || !geo.query) {
        return interaction.editReply({ embeds: [errorEmbed('Could not resolve that domain to a public IP.')] });
      }
      ip = geo.query;
    }
    if (parseIpv4(ip) && !requirePublicTarget(ip).ok) {
      return interaction.editReply({ embeds: [errorEmbed('Resolved address is not public.')] });
    }
    const rdap = await lookupRdap(ip);
    const info = summarizeRdap(rdap);
    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle(`WHOIS / RDAP: ${ip}`)
      .setDescription('Public registration data only. Not a Discord user lookup.')
      .addFields(
        { name: 'Network', value: field(info.name), inline: true },
        { name: 'Handle', value: field(info.handle), inline: true },
        { name: 'Type', value: field(info.type), inline: true },
        { name: 'Range', value: `${field(info.start)} – ${field(info.end)}`, inline: false },
        { name: 'CIDR', value: field(info.cidr), inline: true },
        { name: 'Country', value: field(info.country), inline: true },
        { name: 'Org', value: field(info.org), inline: true },
      )
      .setFooter({ text: 'heist · RDAP' })
      .setTimestamp();
    if (info.link) embed.setURL(info.link);
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ embeds: [errorEmbed(`WHOIS failed: ${err.message}`)] });
  }
}

async function handleConvert(interaction) {
  const raw = interaction.options.getString('ip', true).trim();
  const parsed = classifyTarget(raw);
  if (!parsed.ok) return reject(interaction, parsed.reason);
  if (parsed.kind !== 'ipv4') {
    return reject(interaction, 'Convert wants an IPv4 like `8.8.8.8`.');
  }
  const conv = convertIpv4(parsed.value);
  const embed = new EmbedBuilder()
    .setColor(0x2f3136)
    .setTitle(`Convert: ${parsed.value}`)
    .setDescription(`Class **${parsed.class}**. Math only — no scan.`)
    .addFields(
      { name: 'Decimal', value: field(conv.decimal), inline: true },
      { name: 'Hex', value: field(conv.hex), inline: true },
      { name: 'Binary', value: `\`${conv.binary}\``, inline: false },
    )
    .setFooter({ text: 'heist' });
  return interaction.reply({ embeds: [embed] });
}

async function handleCidr(interaction) {
  const raw = interaction.options.getString('range', true).trim();
  const info = describeCidr(raw);
  if (!info.ok) return reject(interaction, info.reason);
  const embed = new EmbedBuilder()
    .setColor(info.public ? 0x2f3136 : 0x8B1E3F)
    .setTitle(`CIDR: ${info.cidr}`)
    .setDescription('Network math only. This does not scan hosts.')
    .addFields(
      { name: 'Network', value: info.network, inline: true },
      { name: 'Broadcast', value: info.broadcast, inline: true },
      { name: 'Mask', value: info.mask, inline: true },
      { name: 'First', value: info.first, inline: true },
      { name: 'Last', value: info.last, inline: true },
      { name: 'Addresses', value: String(info.size), inline: true },
      { name: 'Class', value: info.class, inline: true },
      { name: 'Public', value: info.public ? 'Yes' : 'No', inline: true },
    )
    .setFooter({ text: 'heist · no host scan' });
  return interaction.reply({ embeds: [embed] });
}

async function handleIsp(interaction) {
  const raw = interaction.options.getString('ip', true).trim();
  const parsed = requirePublicTarget(raw);
  if (!parsed.ok) return reject(interaction, parsed.reason);

  await interaction.deferReply();
  try {
    const data = await lookupPublicIp(parsed.value);
    if (data.status !== 'success') {
      return interaction.editReply({ embeds: [errorEmbed(data.message || 'Lookup failed.')] });
    }
    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle(`ISP: ${data.query}`)
      .setDescription(`${field(data.city)}, ${field(data.country)}`)
      .addFields(
        { name: 'ISP', value: field(data.isp), inline: true },
        { name: 'Org', value: field(data.org), inline: true },
        { name: 'AS', value: field(data.as), inline: true },
        { name: 'Proxy', value: field(data.proxy), inline: true },
        { name: 'Hosting', value: field(data.hosting), inline: true },
        { name: 'Timezone', value: field(data.timezone), inline: true },
      )
      .setFooter({ text: 'heist · public geo only' })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ embeds: [errorEmbed(`ISP failed: ${err.message}`)] });
  }
}

async function handleSun(interaction) {
  const raw = interaction.options.getString('ip', true).trim();
  const parsed = requirePublicTarget(raw);
  if (!parsed.ok) return reject(interaction, parsed.reason);

  await interaction.deferReply();
  try {
    const data = await lookupPublicIp(parsed.value);
    if (data.status !== 'success' || data.lat == null || data.lon == null) {
      return interaction.editReply({ embeds: [errorEmbed('No public coordinates for sunrise/sunset.')] });
    }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${data.lat}&longitude=${data.lon}&daily=sunrise,sunset&timezone=${encodeURIComponent(data.timezone || 'auto')}`;
    const sun = await fetch(url, { headers: { 'User-Agent': 'geekbar-bot' } }).then((r) => r.json());
    const rise = sun.daily?.sunrise?.[0];
    const set = sun.daily?.sunset?.[0];
    if (!rise || !set) {
      return interaction.editReply({ embeds: [errorEmbed('Sun API returned nothing.')] });
    }
    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle(`Sun: ${data.query}`)
      .setDescription(`${field(data.city)}, ${field(data.country)}`)
      .addFields(
        { name: 'Sunrise', value: rise.replace('T', ' '), inline: true },
        { name: 'Sunset', value: set.replace('T', ' '), inline: true },
        { name: 'Timezone', value: field(data.timezone), inline: true },
      )
      .setFooter({ text: 'heist · Open-Meteo + public geo' })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ embeds: [errorEmbed(`Sun failed: ${err.message}`)] });
  }
}

async function handleAir(interaction) {
  const raw = interaction.options.getString('ip', true).trim();
  const parsed = requirePublicTarget(raw);
  if (!parsed.ok) return reject(interaction, parsed.reason);

  await interaction.deferReply();
  try {
    const data = await lookupPublicIp(parsed.value);
    if (data.status !== 'success' || data.lat == null || data.lon == null) {
      return interaction.editReply({ embeds: [errorEmbed('No public coordinates for air quality.')] });
    }
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${data.lat}&longitude=${data.lon}&current=us_aqi,pm2_5,pm10`;
    const air = await fetch(url, { headers: { 'User-Agent': 'geekbar-bot' } }).then((r) => r.json());
    const cur = air.current;
    if (!cur) {
      return interaction.editReply({ embeds: [errorEmbed('Air quality API returned nothing.')] });
    }
    const embed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle(`Air: ${data.query}`)
      .setDescription(`${field(data.city)}, ${field(data.country)}`)
      .addFields(
        { name: 'US AQI', value: field(cur.us_aqi), inline: true },
        { name: 'PM2.5', value: field(cur.pm2_5), inline: true },
        { name: 'PM10', value: field(cur.pm10), inline: true },
      )
      .setFooter({ text: 'heist · Open-Meteo + public geo' })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    return interaction.editReply({ embeds: [errorEmbed(`Air failed: ${err.message}`)] });
  }
}

function handleMine(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x8B1E3F)
    .setTitle('Your Discord IP')
    .setDescription(
      [
        'This bot **cannot** see your Discord IP.',
        'Discord does not give bots user IPs. Mentions, usernames, and DMs do not reveal one.',
        'Anyone offering a Discord IP grab is lying or using a malicious link.',
        'Use `/ip lookup` on a **public IP or domain**, like `8.8.8.8` or `discord.com`.',
      ].join('\n'),
    )
    .setFooter({ text: 'heist · no user IPs' });
  return interaction.reply({ embeds: [embed] });
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
    case 'whois':
      return handleWhois(interaction);
    case 'convert':
      return handleConvert(interaction);
    case 'cidr':
      return handleCidr(interaction);
    case 'isp':
      return handleIsp(interaction);
    case 'sun':
      return handleSun(interaction);
    case 'air':
      return handleAir(interaction);
    case 'mine':
      return handleMine(interaction);
    default:
      return interaction.reply({ content: 'Unknown ip command.', ephemeral: true });
  }
}
