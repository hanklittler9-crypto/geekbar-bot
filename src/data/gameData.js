export const FLAVORS = [
  { id: 'mint', name: 'Miami Mint', emoji: '🌿', color: '#7FFFD4', price: 0, rarity: 'starter' },
  { id: 'bluerazz', name: 'Blue Razz Ice', emoji: '🫐', color: '#4B9CD3', price: 0, rarity: 'common' },
  { id: 'strawn', name: 'Strawberry Watermelon', emoji: '🍓', color: '#FF6B8A', price: 0, rarity: 'common' },
  { id: 'mango', name: 'Mexico Mango', emoji: '🥭', color: '#FFB347', price: 80, rarity: 'common' },
  { id: 'peach', name: 'Juicy Peach', emoji: '🍑', color: '#FFB07C', price: 80, rarity: 'common' },
  { id: 'grape', name: 'Grape Blow Pop', emoji: '🍇', color: '#9B59B6', price: 90, rarity: 'common' },
  { id: 'sourapple', name: 'Sour Apple Frost', emoji: '🍏', color: '#7DCE82', price: 90, rarity: 'common' },
  { id: 'meta', name: 'Meta Moon', emoji: '🌙', color: '#C9B6FF', price: 140, rarity: 'rare' },
  { id: 'gummy', name: 'White Gummy', emoji: '🍬', color: '#F5F0E6', price: 140, rarity: 'rare' },
  { id: 'blackberry', name: 'Frozen Blackberry', emoji: '🖤', color: '#5D3A6A', price: 150, rarity: 'rare' },
  { id: 'pineapple', name: 'Pineapple Whip', emoji: '🍍', color: '#FFE066', price: 150, rarity: 'rare' },
  { id: 'cola', name: 'Cherry Cola', emoji: '🥤', color: '#8B1E3F', price: 160, rarity: 'rare' },
  { id: 'fab', name: 'Fabulous Ice', emoji: '✨', color: '#7DF9FF', price: 220, rarity: 'epic' },
  { id: 'galaxy', name: 'Galaxy Burst', emoji: '🌌', color: '#6C5CE7', price: 260, rarity: 'epic' },
  { id: 'lava', name: 'Lava Lychee', emoji: '🔥', color: '#FF4500', price: 260, rarity: 'epic' },
  { id: 'prestige', name: 'Prestige Fog', emoji: '👑', color: '#FFD700', price: 0, rarity: 'legendary', exclusive: true },
];

export const SKINS = [
  { id: 'classic', name: 'Stealth Black', color: '#161616', accent: '#A8A8A8', price: 0, pattern: 'solid' },
  { id: 'pulse', name: 'Pulse RGB', color: '#101018', accent: '#00F5A0', price: 350, pattern: 'glow' },
  { id: 'gold', name: 'Gold Drip', color: '#1A1408', accent: '#FFD700', price: 400, pattern: 'solid' },
  { id: 'ice', name: 'Ice Shell', color: '#D9F3F7', accent: '#00CED1', price: 450, pattern: 'solid' },
  { id: 'neon', name: 'Neon Lime', color: '#0B0B0B', accent: '#39FF14', price: 500, pattern: 'glow' },
  { id: 'chrome', name: 'Chrome', color: '#B8B8C0', accent: '#F2F2F2', price: 650, pattern: 'chrome' },
  { id: 'galaxy', name: 'Galaxy Wrap', color: '#0B0618', accent: '#9B6DFF', price: 700, pattern: 'holo' },
  { id: 'lava', name: 'Lava Flow', color: '#1A0808', accent: '#FF4500', price: 700, pattern: 'gradient' },
  { id: 'carbon', name: 'Carbon Fiber', color: '#1C1C1C', accent: '#4A4A4A', price: 620, pattern: 'carbon' },
  { id: 'sunset', name: 'Sunset Fade', color: '#1A1020', accent: '#FF6B6B', price: 580, pattern: 'gradient' },
  { id: 'holo', name: 'Hologram', color: '#141428', accent: '#FF6EC7', price: 900, pattern: 'holo' },
  { id: 'prestige', name: 'Onyx Prestige', color: '#0A0A0A', accent: '#E8C872', price: 0, pattern: 'chrome', exclusive: true },
];

export const GIF_EFFECTS = [
  { id: 'vapor', name: 'Vapor', emoji: '💨', description: 'Flavor-colored cloud bloom' },
  { id: 'pulse', name: 'Pulse', emoji: '💓', description: 'Breathing zoom' },
  { id: 'shake', name: 'Shake', emoji: '🫨', description: 'Hard side-to-side shake' },
  { id: 'zoom', name: 'Zoom', emoji: '🔎', description: 'Slow cinematic zoom' },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈', description: 'Cycling glow border' },
  { id: 'flash', name: 'Flash', emoji: '⚡', description: 'Strobe flash' },
  { id: 'bounce', name: 'Bounce', emoji: '⬆️', description: 'Bounce and settle' },
  { id: 'spin', name: 'Spin', emoji: '🌀', description: 'Wobble rotation' },
  { id: 'glitch', name: 'Glitch', emoji: '📺', description: 'RGB split glitch' },
  { id: 'fade', name: 'Fade', emoji: '🌫️', description: 'Fade in and out' },
  { id: 'scan', name: 'Scanline', emoji: '📡', description: 'CRT scan overlay' },
  { id: 'drip', name: 'Drip', emoji: '💧', description: 'Flavor drips down the frame' },
];

export const SHOP_ITEMS = [
  { id: 'pod_refill', name: 'Pod Refill Pack', emoji: '🧪', price: 75, description: 'Refills your current Geek Bar to full puffs' },
  { id: 'battery_boost', name: 'Battery Boost', emoji: '🔋', price: 90, description: 'Instant full charge' },
  { id: 'buzz_reset', name: 'Cool Down', emoji: '🧊', price: 130, description: 'Resets buzz to 0' },
  { id: 'raid_shield', name: 'Raid Shield (24h)', emoji: '🛡️', price: 250, description: 'Blocks raids and jacks for 24 hours' },
  { id: 'xp_boost', name: 'XP Doubler (1h)', emoji: '✨', price: 200, description: '2x XP on hits for 1 hour' },
  { id: 'repair_kit', name: 'Coil Repair Kit', emoji: '🔧', price: 160, description: 'Fixes a burnt Geek Bar' },
];

export const RAID_SPOTS = [
  { id: 'corner', name: 'Corner Store', emoji: '🏪', risk: 0.35, payout: [40, 110], flavorChance: 0.12 },
  { id: 'smoke', name: 'Smoke Shop', emoji: '🧿', risk: 0.48, payout: [80, 180], flavorChance: 0.22 },
  { id: 'warehouse', name: 'Flavor Warehouse', emoji: '📦', risk: 0.62, payout: [140, 320], flavorChance: 0.38 },
];

export function getFlavor(id) {
  return FLAVORS.find((f) => f.id === id) ?? FLAVORS.find((f) => f.id === 'mint');
}

export function getSkin(id) {
  if (!id || String(id).startsWith('custom:')) {
    return {
      id: id ?? 'classic',
      name: 'Custom Wrap',
      color: '#161616',
      accent: '#A8A8A8',
      price: 0,
      pattern: 'custom',
      custom: true,
    };
  }
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function getGifEffect(id) {
  return GIF_EFFECTS.find((e) => e.id === id) ?? GIF_EFFECTS[0];
}

export function getShopItem(id) {
  return SHOP_ITEMS.find((i) => i.id === id);
}

export function rarityColor(rarity) {
  switch (rarity) {
    case 'legendary':
      return '#FFD700';
    case 'epic':
      return '#B388FF';
    case 'rare':
      return '#4FC3F7';
    case 'exclusive':
      return '#FF6EC7';
    default:
      return '#B0B8C4';
  }
}
