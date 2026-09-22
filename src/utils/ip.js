const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const HOST = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function field(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value == null || value === '') return 'N/A';
  return String(value).slice(0, 1024);
}

export function parseIpv4(ip) {
  if (!IPV4.test(ip)) return null;
  const parts = ip.split('.').map((n) => Number(n));
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return parts;
}

export function classifyIpv4(ip) {
  const p = parseIpv4(ip);
  if (!p) return null;
  const [a, b, c] = p;
  if (a === 0) return 'this-network';
  if (a === 10) return 'private';
  if (a === 127) return 'loopback';
  if (a === 169 && b === 254) return 'link-local';
  if (a === 172 && b >= 16 && b <= 31) return 'private';
  if (a === 192 && b === 168) return 'private';
  if (a === 100 && b >= 64 && b <= 127) return 'cgnat';
  if (a === 192 && b === 0 && c === 2) return 'documentation';
  if (a === 198 && b === 51 && c === 100) return 'documentation';
  if (a === 203 && b === 0 && c === 113) return 'documentation';
  if (a >= 224 && a <= 239) return 'multicast';
  if (a >= 240) return 'reserved';
  return 'public';
}

export function classifyTarget(raw) {
  const value = String(raw || '').trim();
  if (!value || value.length > 253 || /\s/.test(value)) {
    return { ok: false, reason: 'Give a public IP or domain like `8.8.8.8` or `discord.com`.' };
  }
  if (/^<@!?\d+>$/.test(value) || value.startsWith('@')) {
    return { ok: false, reason: 'Discord users are not supported. This only looks up public IPs and domains.' };
  }

  if (parseIpv4(value)) {
    const klass = classifyIpv4(value);
    return {
      ok: true,
      kind: 'ipv4',
      value,
      class: klass,
      public: klass === 'public',
    };
  }

  if (value.includes(':') && /^[a-f0-9:]+$/i.test(value)) {
    const lower = value.toLowerCase();
    const klass = lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')
      ? 'private'
      : 'public';
    return { ok: true, kind: 'ipv6', value, class: klass, public: klass === 'public' };
  }

  if (HOST.test(value) && !value.endsWith('.local')) {
    return { ok: true, kind: 'host', value: value.toLowerCase(), class: 'hostname', public: true };
  }

  return { ok: false, reason: 'Give a public IP or domain like `8.8.8.8` or `discord.com`. Private IPs and Discord users are not supported.' };
}

export function requirePublicTarget(raw) {
  const parsed = classifyTarget(raw);
  if (!parsed.ok) return parsed;
  if (!parsed.public) {
    return {
      ok: false,
      reason: `\`${parsed.value}\` is **${parsed.class}**, not a public address. Private / reserved IPs are not looked up.`,
    };
  }
  return parsed;
}

export async function lookupPublicIp(query) {
  const url = `http://ip-api.com/json/${encodeURIComponent(query)}?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,query`;
  const res = await fetch(url, { headers: { 'User-Agent': 'geekbar-bot' } });
  return res.json();
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

export function mapUrl(lat, lon) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=10/${lat}/${lon}`;
}
