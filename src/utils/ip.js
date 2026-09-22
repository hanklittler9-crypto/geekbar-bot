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
  if (a === 198 && (b === 18 || b === 19)) return 'documentation';
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
    let klass = 'public';
    if (lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
      klass = 'private';
    } else if (lower === '2001:db8' || lower.startsWith('2001:db8:') || lower.startsWith('2001:db8::')) {
      klass = 'documentation';
    }
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

export function ipv4ToInt(ip) {
  const p = parseIpv4(ip);
  if (!p) return null;
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}

export function intToIpv4(n) {
  const x = n >>> 0;
  return `${(x >>> 24) & 255}.${(x >>> 16) & 255}.${(x >>> 8) & 255}.${x & 255}`;
}

export function convertIpv4(ip) {
  const n = ipv4ToInt(ip);
  if (n == null) return null;
  return {
    dotted: ip,
    decimal: String(n),
    hex: `0x${n.toString(16).padStart(8, '0')}`,
    binary: n.toString(2).padStart(32, '0').replace(/(.{8})/g, '$1 ').trim(),
  };
}

export function describeCidr(raw) {
  const value = String(raw || '').trim();
  const match = value.match(/^((?:\d{1,3}\.){3}\d{1,3})(?:\/(\d{1,2}))?$/);
  if (!match) return { ok: false, reason: 'Give an IPv4 or CIDR like `8.8.8.8` or `1.1.1.0/24`.' };
  const ip = match[1];
  const bits = match[2] == null ? 32 : Number(match[2]);
  if (!parseIpv4(ip) || bits < 0 || bits > 32) {
    return { ok: false, reason: 'Give an IPv4 or CIDR like `8.8.8.8` or `1.1.1.0/24`.' };
  }
  const addr = ipv4ToInt(ip);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  const network = (addr & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const size = 2 ** (32 - bits);
  const klass = classifyIpv4(intToIpv4(network === 0 && bits === 0 ? 0 : network)) || classifyIpv4(ip);
  return {
    ok: true,
    cidr: `${intToIpv4(network)}/${bits}`,
    ip,
    bits,
    network: intToIpv4(network),
    broadcast: intToIpv4(broadcast),
    mask: intToIpv4(mask),
    first: bits >= 31 ? intToIpv4(network) : intToIpv4(network + 1),
    last: bits >= 31 ? intToIpv4(broadcast) : intToIpv4(broadcast - 1),
    size,
    class: klass,
    public: klass === 'public',
  };
}

export async function lookupRdap(ip) {
  const res = await fetch(`https://rdap.org/ip/${encodeURIComponent(ip)}`, {
    headers: { 'User-Agent': 'geekbar-bot', Accept: 'application/rdap+json, application/json' },
  });
  if (!res.ok) throw new Error(`RDAP ${res.status}`);
  return res.json();
}

export function summarizeRdap(data) {
  const vcard = data.entities?.[0]?.vcardArray?.[1] || [];
  const fn = vcard.find((row) => row[0] === 'fn')?.[3];
  const country = data.country || vcard.find((row) => row[0] === 'adr')?.[1]?.cc;
  return {
    name: data.name || 'N/A',
    handle: data.handle || 'N/A',
    type: data.type || 'N/A',
    start: data.startAddress || 'N/A',
    end: data.endAddress || 'N/A',
    cidr: data.cidr0_cidrs?.[0]
      ? `${data.cidr0_cidrs[0].v4prefix}/${data.cidr0_cidrs[0].length}`
      : (data.cidr0_cidrs?.[0]?.v6prefix
        ? `${data.cidr0_cidrs[0].v6prefix}/${data.cidr0_cidrs[0].length}`
        : (Array.isArray(data.cidr0_cidrs) && data.cidr0_cidrs.length ? JSON.stringify(data.cidr0_cidrs[0]) : 'N/A')),
    country: country || 'N/A',
    org: fn || data.entities?.[0]?.handle || 'N/A',
    link: data.links?.find((l) => l.rel === 'self')?.href || '',
  };
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const FAKE_V4_POOLS = [
  { prefix: '192.0.2', label: 'TEST-NET-1 · RFC 5737', make: () => `192.0.2.${randInt(1, 254)}` },
  { prefix: '198.51.100', label: 'TEST-NET-2 · RFC 5737', make: () => `198.51.100.${randInt(1, 254)}` },
  { prefix: '203.0.113', label: 'TEST-NET-3 · RFC 5737', make: () => `203.0.113.${randInt(1, 254)}` },
  { prefix: '198.18/15', label: 'benchmark · RFC 2544', make: () => `198.${randInt(18, 19)}.${randInt(0, 255)}.${randInt(1, 254)}` },
];

const FAKE_FLAVOR = [
  { city: 'Northridge', region: 'CA', country: 'United States', tz: 'America/Los_Angeles', isp: 'ExampleNet LLC', as: 'AS64496 EXAMPLE-DOCS' },
  { city: 'Redwood Grove', region: 'OR', country: 'United States', tz: 'America/Los_Angeles', isp: 'Documentation Fiber', as: 'AS64497 EXAMPLE-DOCS' },
  { city: 'Harborview', region: 'WA', country: 'United States', tz: 'America/Los_Angeles', isp: 'RFC Example ISP', as: 'AS64498 EXAMPLE-DOCS' },
  { city: 'Millbrook', region: 'NY', country: 'United States', tz: 'America/New_York', isp: 'TEST-NET Communications', as: 'AS64499 EXAMPLE-DOCS' },
  { city: 'Cedar Falls', region: 'IA', country: 'United States', tz: 'America/Chicago', isp: 'Reserved Range Wireless', as: 'AS64500 EXAMPLE-DOCS' },
  { city: 'Stonehaven', region: 'SCT', country: 'United Kingdom', tz: 'Europe/London', isp: 'ExampleHost Ltd', as: 'AS64501 EXAMPLE-DOCS' },
];

export function generateFakeIp(kind = 'v4') {
  if (kind === 'v6') {
    const a = randInt(0, 0xffff).toString(16);
    const b = randInt(0, 0xffff).toString(16);
    const c = randInt(1, 0xffff).toString(16);
    return {
      ip: `2001:db8:${a}:${b}::${c}`,
      version: 'v6',
      range: '2001:db8::/32 · RFC 3849',
      flavor: pick(FAKE_FLAVOR),
    };
  }
  const pool = pick(FAKE_V4_POOLS);
  return {
    ip: pool.make(),
    version: 'v4',
    range: pool.label,
    flavor: pick(FAKE_FLAVOR),
  };
}

export function generateFakeIps(count = 1, kind = 'v4') {
  const n = Math.min(8, Math.max(1, count));
  const items = [];
  const seen = new Set();
  let guard = 0;
  while (items.length < n && guard < 40) {
    const row = generateFakeIp(kind === 'both' ? (items.length % 2 ? 'v6' : 'v4') : kind);
    if (!seen.has(row.ip)) {
      seen.add(row.ip);
      items.push(row);
    }
    guard += 1;
  }
  return items;
}
