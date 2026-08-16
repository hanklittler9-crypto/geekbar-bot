import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { ensureFonts, font } from './fonts.js';
import { coverImage, hexToRgb, loadImageSafe, makeCanvas, mulberry32, rgb, roundRect, lerp } from './draw.js';
import { flavorOf, skinOf } from './embeds.js';
import { getCustomSkin } from '../database/db.js';
import { levelFromXp } from '../config.js';

const W = 360;
const H = 220;

function encodeFrames(frames, width, height, delay = 70) {
  const gif = GIFEncoder();
  let palette = null;
  for (let i = 0; i < frames.length; i++) {
    const data = frames[i];
    if (!palette) palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, {
      palette,
      delay,
      repeat: i === 0 ? 0 : undefined,
    });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

function fillBg(ctx, flavorColor, t, seed) {
  const rng = mulberry32(seed);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#07080C');
  g.addColorStop(0.55, '#0C1118');
  g.addColorStop(1, '#070A10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const radial = ctx.createRadialGradient(W * 0.72, H * 0.45, 10, W * 0.72, H * 0.45, 180);
  radial.addColorStop(0, rgb(flavorColor, 0.28 + 0.12 * Math.sin(t * Math.PI * 2)));
  radial.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 18; i++) {
    const x = rng() * W;
    const y = (rng() * H + t * 30) % H;
    ctx.beginPath();
    ctx.arc(x, y, rng() * 1.4 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDevice(ctx, user, flavor, skin, opts = {}) {
  const {
    x = 236,
    y = 28,
    scale = 1,
    glow = 0.6,
    tilt = 0,
    wrapImage = null,
    battery = user.battery,
    puffs = user.pod_puffs,
    ledOn = true,
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(scale, scale);

  const dw = 78;
  const dh = 164;
  ctx.shadowColor = rgb(flavor.color, 0.55 * glow);
  ctx.shadowBlur = 24 * glow;

  roundRect(ctx, 0, 0, dw, dh, 18);
  if (wrapImage) {
    ctx.save();
    ctx.clip();
    coverImage(ctx, wrapImage, 0, 0, dw, dh);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, dw, dh);
    ctx.restore();
  } else {
    const body = ctx.createLinearGradient(0, 0, dw, dh);
    if (skin.pattern === 'holo') {
      body.addColorStop(0, skin.color);
      body.addColorStop(0.5, skin.accent);
      body.addColorStop(1, '#1a1030');
    } else if (skin.pattern === 'chrome') {
      body.addColorStop(0, '#f5f5f5');
      body.addColorStop(0.4, skin.color);
      body.addColorStop(1, '#7a7a80');
    } else {
      body.addColorStop(0, skin.color);
      body.addColorStop(1, '#0A0A0A');
    }
    ctx.fillStyle = body;
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgb(skin.accent, 0.7);
  ctx.lineWidth = 2;
  roundRect(ctx, 0, 0, dw, dh, 18);
  ctx.stroke();

  // mouthpiece
  ctx.fillStyle = '#0E0E10';
  roundRect(ctx, 22, -10, 34, 18, 8);
  ctx.fill();
  ctx.fillStyle = rgb(flavor.color, 0.35);
  roundRect(ctx, 30, -6, 18, 6, 3);
  ctx.fill();

  // LED screen
  roundRect(ctx, 14, 22, 50, 38, 8);
  ctx.fillStyle = '#05070A';
  ctx.fill();
  if (ledOn) {
    ctx.fillStyle = rgb(flavor.color, 0.85);
    ctx.font = font(8, true);
    ctx.fillText('GEEK BAR', 18, 36);
    ctx.fillStyle = '#E8FFF6';
    ctx.font = font(10, true);
    ctx.fillText(String(Math.max(0, Math.floor(puffs))), 18, 50);
    ctx.fillStyle = rgb(flavor.color, 0.7);
    ctx.font = font(7);
    ctx.fillText(`${Math.round(battery)}%`, 18, 60);
  }

  // accent stripe
  ctx.fillStyle = rgb(flavor.color, 0.8);
  roundRect(ctx, 8, 72, 62, 6, 3);
  ctx.fill();

  // battery window
  roundRect(ctx, 18, 92, 42, 50, 8);
  ctx.fillStyle = '#0A0C10';
  ctx.fill();
  const fillH = Math.max(4, (42 * clamp01(battery / 100)));
  ctx.fillStyle = battery < 20 ? '#FF5C5C' : rgb(flavor.color, 0.9);
  roundRect(ctx, 22, 138 - fillH, 34, fillH, 5);
  ctx.fill();

  // USB-C
  ctx.fillStyle = '#222';
  roundRect(ctx, 28, 154, 22, 6, 2);
  ctx.fill();

  ctx.restore();
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function drawVapor(ctx, flavorColor, t, intensity = 1, originX = 274, originY = 22) {
  const { r, g, b } = hexToRgb(flavorColor);
  for (let i = 0; i < 10; i++) {
    const phase = (t + i * 0.09) % 1;
    const x = originX + Math.sin((t + i) * 6) * (8 + i * 1.4);
    const y = originY - phase * 70 * intensity;
    const radius = (6 + i * 2.2) * (0.4 + phase) * intensity;
    const gfill = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gfill.addColorStop(0, `rgba(${r},${g},${b},${0.28 * (1 - phase)})`);
    gfill.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gfill;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCaption(ctx, lines, flavorColor) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 16, 16, 200, lines.length * 22 + 22, 14);
  ctx.fill();
  ctx.fillStyle = '#F4FFFB';
  ctx.font = font(16, true);
  ctx.fillText(lines[0], 28, 42);
  if (lines[1]) {
    ctx.fillStyle = rgb(flavorColor, 0.95);
    ctx.font = font(12);
    ctx.fillText(lines[1], 28, 62);
  }
  if (lines[2]) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = font(11);
    ctx.fillText(lines[2], 28, 80);
  }
}

async function wrapFor(user) {
  if (!String(user.skin).startsWith('custom:')) return null;
  const skin = getCustomSkin(user.user_id, user.skin);
  if (!skin) return null;
  return loadImageSafe(skin.file_path);
}

function frameData(ctx, width, height) {
  return ctx.getImageData(0, 0, width, height).data;
}

export async function renderSceneGif(scene, user, extras = {}) {
  ensureFonts();
  const flavor = extras.flavor ?? flavorOf(user);
  const skin = extras.skin ?? skinOf(user);
  const wrapImage = extras.wrapImage ?? (await wrapFor(user));
  const frames = [];
  const count = extras.frames ?? 14;
  const seed = extras.seed ?? (user.total_hits + user.user_id.length * 17 + scene.length);

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const { ctx } = makeCanvas(W, H);
    fillBg(ctx, flavor.color, t, seed + i);

    if (scene === 'hit') {
      drawVapor(ctx, flavor.color, t, 0.7 + t * 1.1);
      drawDevice(ctx, user, flavor, skin, {
        wrapImage,
        glow: 0.5 + t * 0.8,
        tilt: Math.sin(t * Math.PI) * -0.08,
        ledOn: true,
      });
      drawCaption(ctx, ['HIT', `${flavor.emoji} ${flavor.name}`, `${user.device_name}`], flavor.color);
    } else if (scene === 'charge') {
      drawDevice(ctx, user, flavor, skin, {
        wrapImage,
        glow: 0.4 + t * 0.5,
        battery: lerp(Math.min(user.battery, 20), 100, t),
      });
      ctx.strokeStyle = rgb('#FFE566', 0.9);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(274, 198);
      ctx.lineTo(274, 188);
      ctx.stroke();
      ctx.fillStyle = rgb('#FFE566', 0.8);
      ctx.font = font(22, true);
      ctx.fillText('⚡', 40 + Math.sin(t * 12) * 6, 120);
      drawCaption(ctx, ['CHARGING', `${Math.round(lerp(user.battery, 100, t))}%`, 'USB-C locked in'], flavor.color);
    } else if (scene === 'flavor') {
      drawVapor(ctx, flavor.color, t, 0.9);
      drawDevice(ctx, user, flavor, skin, { wrapImage, glow: 0.9, scale: 0.95 + t * 0.08 });
      drawCaption(ctx, ['POD SWAP', flavor.name, extras.subtitle || 'fresh coil hiss'], flavor.color);
    } else if (scene === 'raid') {
      ctx.fillStyle = extras.success ? rgb('#00F5A0', 0.12) : rgb('#FF5C5C', 0.14);
      ctx.fillRect(0, 0, W, H);
      drawDevice(ctx, user, flavor, skin, {
        wrapImage,
        x: 40 + t * 80,
        y: 36,
        scale: 0.82,
        tilt: extras.success ? -0.15 : 0.2,
        glow: extras.success ? 1 : 0.3,
      });
      drawCaption(
        ctx,
        [extras.success ? 'RAID HIT' : 'BUSTED', extras.subtitle || '', extras.line || ''],
        extras.success ? '#00F5A0' : '#FF5C5C',
      );
    } else if (scene === 'jack') {
      drawDevice(ctx, user, flavor, skin, {
        wrapImage,
        x: 220,
        glow: extras.success ? 1 : 0.2,
        tilt: extras.success ? 0.2 : -0.12,
      });
      drawCaption(
        ctx,
        [extras.success ? 'JACKED' : 'CAUGHT', extras.subtitle || '', extras.line || ''],
        extras.success ? flavor.color : '#FF5C5C',
      );
    } else if (scene === 'smokeout') {
      drawVapor(ctx, flavor.color, t, 1.3, 180, 90);
      drawDevice(ctx, user, flavor, skin, { wrapImage, x: 40, scale: 0.7, glow: 1 });
      if (extras.rival) {
        drawDevice(ctx, extras.rival, extras.rivalFlavor ?? flavor, extras.rivalSkin ?? skin, {
          x: 250,
          scale: 0.7,
          glow: 1,
          tilt: 0.1,
        });
      }
      drawCaption(ctx, ['SMOKEOUT', extras.subtitle || 'cloud war', extras.line || ''], flavor.color);
    } else if (scene === 'chase') {
      drawVapor(ctx, flavor.color, t, extras.success ? 1.4 : 0.3, 180, 140);
      drawCaption(ctx, [extras.success ? 'CLOUD CAUGHT' : 'WHIFFED', extras.subtitle || '', extras.line || ''], flavor.color);
      drawDevice(ctx, user, flavor, skin, { wrapImage, glow: extras.success ? 1.2 : 0.25 });
    } else if (scene === 'roulette') {
      const spin = t * Math.PI * 4;
      ctx.save();
      ctx.translate(180, 110);
      ctx.rotate(spin);
      ctx.translate(-180, -110);
      drawDevice(ctx, user, flavor, skin, { wrapImage, x: 142, y: 20, scale: 0.9, glow: 1 });
      ctx.restore();
      drawCaption(ctx, ['FLAVOR ROULETTE', extras.subtitle || flavor.name, extras.line || ''], flavor.color);
    } else if (scene === 'prestige') {
      drawVapor(ctx, '#FFD700', t, 1.2);
      drawDevice(ctx, user, flavor, skin, { wrapImage, glow: 1.4, scale: 0.9 + t * 0.12 });
      drawCaption(ctx, ['PRESTIGE', `Tier ${user.prestige}`, extras.line || 'reset for glory'], '#FFD700');
    } else if (scene === 'repair') {
      drawDevice(ctx, user, flavor, skin, { wrapImage, glow: t, battery: lerp(10, 100, t) });
      drawCaption(ctx, ['COIL FIXED', extras.subtitle || 'back online', extras.line || ''], flavor.color);
    } else if (scene === 'flex') {
      drawVapor(ctx, flavor.color, t, 1);
      drawDevice(ctx, user, flavor, skin, { wrapImage, glow: 1.2, scale: 1.05, tilt: Math.sin(t * 6) * 0.05 });
      drawCaption(ctx, ['FLEX', user.device_name, flavor.name], flavor.color);
    } else if (scene === 'buzzmax') {
      ctx.fillStyle = rgb('#FF2D55', 0.16 + t * 0.18);
      ctx.fillRect(0, 0, W, H);
      drawVapor(ctx, '#FF2D55', t, 1.8, 180, 50);
      drawVapor(ctx, '#FFD700', (t + 0.4) % 1, 1.4, 220, 80);
      drawDevice(ctx, user, flavor, skin, {
        wrapImage,
        glow: 1.6,
        scale: 0.95 + t * 0.18,
        tilt: Math.sin(t * 16) * 0.18,
      });
      drawCaption(ctx, ['MAX BUZZ', extras.subtitle || 'BLACKOUT DUMP', extras.line || ''], '#FFD700');
    } else if (scene === 'slots') {
      const reels = extras.reels || ['💨', '💨', '💎'];
      drawCaption(ctx, [extras.success ? 'JACKPOT' : 'SLOTS', extras.subtitle || '', extras.line || ''], extras.success ? '#FFD700' : flavor.color);
      reels.forEach((icon, idx) => {
        const bx = 70 + idx * 90;
        const by = 90 + (t < 0.7 ? Math.sin((t + idx) * 18) * 18 : 0);
        roundRect(ctx, bx, 70, 78, 90, 16);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();
        ctx.strokeStyle = rgb(flavor.color, 0.8);
        ctx.stroke();
        ctx.font = font(36, true);
        ctx.fillStyle = '#fff';
        ctx.fillText(icon, bx + 18, by + 40);
      });
    } else if (scene === 'pack') {
      const open = t;
      roundRect(ctx, 120, 70 + open * -20, 120, 90, 16);
      ctx.fillStyle = rgb(flavor.color, 0.35);
      ctx.fill();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      roundRect(ctx, 120, 70 + open * -20, 120, 90, 16);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = font(22, true);
      ctx.fillText(extras.subtitle || 'PACK', 142, 125 + open * -20);
      drawVapor(ctx, flavor.color, t, open, 180, 70);
      drawCaption(ctx, ['MYSTERY PACK', extras.line || '', ''], flavor.color);
    } else if (scene === 'chain') {
      drawVapor(ctx, flavor.color, t, 1.6, 200, 40);
      drawVapor(ctx, flavor.color, (t + 0.33) % 1, 1.2, 160, 80);
      drawVapor(ctx, flavor.color, (t + 0.66) % 1, 1.0, 240, 90);
      drawDevice(ctx, user, flavor, skin, { wrapImage, glow: 1.3, tilt: Math.sin(t * 14) * 0.12 });
      drawCaption(ctx, ['CHAIN HIT', extras.subtitle || 'x3', extras.line || ''], flavor.color);
    } else if (scene === 'lucky') {
      ctx.fillStyle = rgb('#FFD700', 0.12 + t * 0.12);
      ctx.fillRect(0, 0, W, H);
      drawVapor(ctx, '#FFD700', t, extras.success ? 1.6 : 0.5);
      drawDevice(ctx, user, flavor, skin, { wrapImage, glow: extras.success ? 1.5 : 0.5, scale: 1 + t * 0.08 });
      drawCaption(ctx, [extras.success ? 'JACKPOT HIT' : 'LUCKY', extras.subtitle || '', extras.line || ''], '#FFD700');
    } else if (scene === 'drop') {
      drawDevice(ctx, user, flavor, skin, { wrapImage, x: 40, scale: 0.75, glow: extras.success ? 1 : 0.3 });
      roundRect(ctx, 210, 70, 110, 80, 14);
      ctx.fillStyle = extras.success ? rgb('#00F5A0', 0.4) : rgb('#FF5C5C', 0.3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = font(16, true);
      ctx.fillText(extras.success ? 'LOOT' : 'EMPTY', 228, 118);
      drawCaption(ctx, ['STREET DROP', extras.subtitle || '', extras.line || ''], flavor.color);
    } else if (scene === 'neon') {
      ctx.fillStyle = '#05060A';
      ctx.fillRect(0, 0, W, H);
      const flicker = 0.55 + Math.abs(Math.sin(t * 20)) * 0.45;
      ctx.shadowColor = extras.color || flavor.color;
      ctx.shadowBlur = 28 * flicker;
      ctx.fillStyle = rgb(extras.color || flavor.color, flicker);
      ctx.font = font(32, true);
      ctx.fillText((extras.title || 'NEON').slice(0, 14), 40, 110);
      ctx.font = font(16);
      ctx.fillText(extras.subtitle || user.device_name, 40, 148);
      ctx.shadowBlur = 0;
      drawDevice(ctx, user, { ...flavor, color: extras.color || flavor.color }, skin, {
        wrapImage,
        x: 250,
        scale: 0.7,
        glow: flicker,
      });
    } else if (scene === 'wire') {
      ctx.strokeStyle = extras.success ? rgb('#00F5A0', 0.9) : rgb('#FF5C5C', 0.9);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(30, 110);
      ctx.bezierCurveTo(80, 40 + t * 80, 200, 180 - t * 90, 330, 110);
      ctx.stroke();
      drawDevice(ctx, user, flavor, skin, { wrapImage, x: 240, scale: 0.7, glow: extras.success ? 1.2 : 0.2 });
      drawCaption(ctx, [extras.success ? 'WIRED' : 'SHORT', extras.subtitle || '', extras.line || ''], extras.success ? '#00F5A0' : '#FF5C5C');
    } else if (scene === 'vibe') {
      const intensity = extras.intensity ?? 1;
      drawVapor(ctx, extras.color || flavor.color, t, 0.6 + intensity, 200, 80);
      drawDevice(ctx, user, { ...flavor, color: extras.color || flavor.color }, skin, {
        wrapImage,
        glow: 0.8 + intensity * 0.4,
        tilt: Math.sin(t * 8) * 0.1 * intensity,
        x: 230,
      });
      drawCaption(ctx, [extras.title || 'VIBE', extras.subtitle || flavor.name, extras.line || ''], extras.color || flavor.color);
    } else if (scene === 'quest') {
      const progress = extras.progress ?? 0;
      const target = extras.target ?? 1;
      roundRect(ctx, 28, 150, 200, 16, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
      roundRect(ctx, 28, 150, Math.max(12, 200 * clamp01(progress / target)), 16, 8);
      ctx.fillStyle = rgb('#FFD700', 0.9);
      ctx.fill();
      drawVapor(ctx, '#FFD700', t, extras.success ? 1.3 : 0.5);
      drawDevice(ctx, user, flavor, skin, { wrapImage, glow: extras.success ? 1.4 : 0.7, scale: 0.85 });
      drawCaption(ctx, [extras.success ? 'QUEST DONE' : 'DAILY QUEST', extras.subtitle || '', extras.line || ''], '#FFD700');
    } else if (scene === 'event') {
      ctx.fillStyle = rgb(extras.color || flavor.color, 0.14 + t * 0.1);
      ctx.fillRect(0, 0, W, H);
      ctx.shadowColor = extras.color || flavor.color;
      ctx.shadowBlur = 22 + Math.sin(t * 10) * 10;
      ctx.fillStyle = extras.color || flavor.color;
      ctx.font = font(22, true);
      ctx.fillText((extras.title || 'EVENT').slice(0, 18), 24, 70);
      ctx.shadowBlur = 0;
      drawVapor(ctx, extras.color || flavor.color, t, 1.1, 200, 90);
      drawDevice(ctx, user, { ...flavor, color: extras.color || flavor.color }, skin, {
        wrapImage,
        x: 240,
        scale: 0.75,
        glow: 1.2,
      });
      drawCaption(ctx, [extras.title || 'WORLD EVENT', extras.subtitle || '', extras.line || ''], extras.color || flavor.color);
    } else if (scene === 'night') {
      ctx.fillStyle = 'rgba(8, 4, 20, 0.45)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = rgb('#FFE566', 0.85);
      ctx.beginPath();
      ctx.arc(48, 48, 14 + Math.sin(t * 6) * 2, 0, Math.PI * 2);
      ctx.fill();
      drawVapor(ctx, flavor.color, t, 1.4, 210, 30);
      drawDevice(ctx, user, flavor, skin, {
        wrapImage,
        glow: 1.3,
        tilt: Math.sin(t * 8) * -0.06,
      });
      drawCaption(ctx, ['NIGHT HIT', extras.subtitle || 'after hours', extras.line || ''], flavor.color);
    } else if (scene === 'lockpick') {
      for (let p = 0; p < 4; p++) {
        const bx = 40 + p * 50;
        const rise = extras.success && extras.pin === p ? 28 + t * 18 : 18 + Math.sin((t + p) * 8) * 6;
        roundRect(ctx, bx, 90, 28, 70, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();
        roundRect(ctx, bx + 6, 150 - rise, 16, rise, 4);
        ctx.fillStyle = extras.success && extras.pin === p ? rgb('#00F5A0', 0.9) : rgb(flavor.color, 0.7);
        ctx.fill();
      }
      drawDevice(ctx, user, flavor, skin, { wrapImage, x: 250, scale: 0.7, glow: extras.success ? 1.2 : 0.3 });
      drawCaption(ctx, [extras.success ? 'UNLOCKED' : 'LOCKPICK', extras.subtitle || '', extras.line || ''], extras.success ? '#00F5A0' : flavor.color);
    } else if (scene === 'dice') {
      const face = extras.face || 6;
      const spin = t < 0.75 ? Math.floor(1 + ((t * 20 + seed) % 6)) : face;
      roundRect(ctx, 130, 70, 90, 90, 18);
      ctx.fillStyle = '#F4FFFB';
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = font(42, true);
      ctx.fillText(String(spin), 158, 130);
      drawDevice(ctx, user, flavor, skin, { wrapImage, x: 250, scale: 0.65, glow: extras.success ? 1.2 : 0.4 });
      drawCaption(ctx, [extras.success ? 'HIT' : 'MISS', extras.subtitle || `rolled ${face}`, extras.line || ''], extras.success ? '#00F5A0' : '#FF5C5C');
    } else if (scene === 'wheel') {
      const spin = t * Math.PI * 6;
      ctx.save();
      ctx.translate(180, 118);
      ctx.rotate(spin);
      const slices = ['0x', '.5x', '1x', '1.5x', '2x', '3x'];
      slices.forEach((label, idx) => {
        ctx.fillStyle = idx % 2 === 0 ? rgb(flavor.color, 0.55) : rgb('#FFD700', 0.45);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 70, (idx / 6) * Math.PI * 2, ((idx + 1) / 6) * Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = font(10, true);
        ctx.fillText(label, 18, 4);
        ctx.rotate(Math.PI / 3);
      });
      ctx.restore();
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.moveTo(180, 36);
      ctx.lineTo(172, 52);
      ctx.lineTo(188, 52);
      ctx.fill();
      drawCaption(ctx, ['WHEEL', extras.subtitle || '', extras.line || ''], extras.success ? '#FFD700' : flavor.color);
    } else if (scene === 'scratch') {
      const tiles = extras.tiles || ['💨', '💎', '🔥'];
      tiles.forEach((icon, idx) => {
        const bx = 40 + idx * 100;
        roundRect(ctx, bx, 80, 86, 86, 14);
        ctx.fillStyle = t < 0.35 ? 'rgba(180,180,180,0.7)' : 'rgba(0,0,0,0.55)';
        ctx.fill();
        ctx.strokeStyle = rgb(flavor.color, 0.8);
        ctx.stroke();
        if (t >= 0.35) {
          ctx.font = font(32, true);
          ctx.fillStyle = '#fff';
          ctx.fillText(icon, bx + 22, 138);
        }
      });
      drawCaption(ctx, [extras.success ? 'MATCH' : 'SCRATCH', extras.subtitle || '', extras.line || ''], extras.success ? '#FFD700' : flavor.color);
    } else {
      drawDevice(ctx, user, flavor, skin, { wrapImage, glow: 0.8 });
      drawCaption(ctx, [extras.title || 'GEEK BAR', extras.subtitle || '', extras.line || ''], flavor.color);
    }

    if (extras.watermark) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = font(9);
      ctx.fillText(extras.watermark, 16, H - 12);
    }

    frames.push(frameData(ctx, W, H));
  }

  return encodeFrames(frames, W, H, extras.delay ?? 70);
}

export async function renderStatsCard(user, member) {
  ensureFonts();
  const width = 720;
  const height = 420;
  const { canvas, ctx } = makeCanvas(width, height);
  const flavor = flavorOf(user);
  const skin = skinOf(user);
  const wrapImage = await wrapFor(user);
  const level = levelFromXp(user.xp);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#07080C');
  bg.addColorStop(1, '#10151E');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(540, 210, 20, 540, 210, 260);
  glow.addColorStop(0, rgb(flavor.color, 0.35));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  roundRect(ctx, 24, 24, width - 48, height - 48, 28);
  ctx.fillStyle = 'rgba(10,12,18,0.72)';
  ctx.fill();
  ctx.strokeStyle = rgb(flavor.color, 0.45);
  ctx.lineWidth = 2;
  roundRect(ctx, 24, 24, width - 48, height - 48, 28);
  ctx.stroke();

  ctx.fillStyle = '#F4FFFB';
  ctx.font = font(28, true);
  ctx.fillText(user.device_name, 52, 84);
  ctx.fillStyle = rgb(flavor.color, 0.95);
  ctx.font = font(16);
  ctx.fillText(user.tagline || 'fat clouds only', 52, 112);

  const who = member?.displayName || member?.user?.username || 'Operator';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = font(13);
  ctx.fillText(`${who}  ·  Lv ${level}  ·  Prestige ${user.prestige}`, 52, 138);

  const rows = [
    ['Flavor', `${flavor.name}`],
    ['Wrap', skin.name],
    ['Battery', `${Math.round(user.battery)}%`],
    ['Puffs left', String(user.pod_puffs)],
    ['Hits', String(user.total_hits)],
    ['Clouds', String(user.clouds)],
    ['Stash', String(user.stash)],
    ['Buzz', String(Math.round(user.buzz))],
  ];

  rows.forEach((row, i) => {
    const col = i % 2;
    const r = Math.floor(i / 2);
    const x = 52 + col * 230;
    const y = 176 + r * 48;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = font(11);
    ctx.fillText(row[0].toUpperCase(), x, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = font(18, true);
    ctx.fillText(row[1], x, y + 22);
  });

  drawDevice(ctx, user, flavor, skin, {
    wrapImage,
    x: 520,
    y: 90,
    scale: 1.35,
    glow: 1.1,
  });

  return canvas.toBuffer('image/png');
}

export async function renderStill(user, extras = {}) {
  ensureFonts();
  const width = extras.width ?? 640;
  const height = extras.height ?? 400;
  const { canvas, ctx } = makeCanvas(width, height);
  const flavor = extras.flavor ?? flavorOf(user);
  const skin = extras.skin ?? skinOf(user);
  const wrapImage = extras.wrapImage ?? (await wrapFor(user));
  const color = extras.color || flavor.color;

  fillScaledBg(ctx, width, height, color);
  drawVapor(ctx, color, 0.65, extras.intensity ?? 1, width * 0.62, height * 0.28);
  drawDevice(ctx, user, { ...flavor, color }, skin, {
    wrapImage,
    x: width * 0.58,
    y: height * 0.12,
    scale: extras.scale ?? 1.25,
    glow: 1.15,
  });

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, 28, 28, Math.min(320, width * 0.48), 110, 18);
  ctx.fill();
  ctx.fillStyle = '#F4FFFB';
  ctx.font = font(22, true);
  ctx.fillText(extras.title || user.device_name, 44, 64);
  ctx.fillStyle = rgb(color, 0.95);
  ctx.font = font(14);
  ctx.fillText(extras.subtitle || flavor.name, 44, 88);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = font(13);
  wrapText(ctx, extras.line || user.tagline || '', 44, 112, 280);

  return canvas.toBuffer('image/png');
}

function fillScaledBg(ctx, width, height, color) {
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, '#07080C');
  g.addColorStop(1, '#121826');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  const radial = ctx.createRadialGradient(width * 0.7, height * 0.45, 8, width * 0.7, height * 0.45, width * 0.5);
  radial.addColorStop(0, rgb(color, 0.32));
  radial.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);
}

function wrapText(ctx, text, x, y, maxWidth) {
  const words = String(text).split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += 18;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

export async function renderImageGif(imageBuffer, effectId, caption, tint = '#00F5A0') {
  ensureFonts();
  const img = await loadImageSafe(imageBuffer);
  if (!img) throw new Error('Could not read that image.');

  const width = 360;
  const height = 220;
  const frames = [];
  const count = 12;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const { ctx } = makeCanvas(width, height);
    ctx.fillStyle = '#05070A';
    ctx.fillRect(0, 0, width, height);
    ctx.save();

    const cx = width / 2;
    const cy = height / 2;
    ctx.translate(cx, cy);
    if (effectId === 'shake') ctx.translate(Math.sin(t * 40) * 10, 0);
    if (effectId === 'bounce') ctx.translate(0, Math.abs(Math.sin(t * Math.PI * 2)) * -12);
    if (effectId === 'spin') ctx.rotate(Math.sin(t * Math.PI * 2) * 0.12);
    const zoom = effectId === 'zoom' ? 1 + t * 0.25 : effectId === 'pulse' ? 1 + Math.sin(t * Math.PI * 2) * 0.08 : 1;
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);

    if (effectId === 'fade') ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * Math.PI));
    coverImage(ctx, img, 0, 0, width, height);
    ctx.restore();

    if (effectId === 'vapor') drawVapor(ctx, tint, t, 1.1, 180, 160);
    if (effectId === 'drip') {
      ctx.fillStyle = rgb(tint, 0.35);
      for (let d = 0; d < 7; d++) {
        roundRect(ctx, 30 + d * 48, -20 + ((t + d * 0.1) % 1) * 260, 10, 40, 6);
        ctx.fill();
      }
    }
    if (effectId === 'rainbow') {
      ctx.strokeStyle = `hsl(${Math.floor(t * 360)}, 90%, 60%)`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, width - 10, height - 10);
    }
    if (effectId === 'flash' && i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(0, 0, width, height);
    }
    if (effectId === 'glitch') {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = rgb('#FF2D55', 0.18);
      ctx.fillRect(Math.sin(t * 20) * 8, 0, width, height);
      ctx.fillStyle = rgb('#00F0FF', 0.18);
      ctx.fillRect(Math.cos(t * 20) * -8, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (effectId === 'scan') {
      ctx.fillStyle = 'rgba(0,255,170,0.08)';
      ctx.fillRect(0, (t * height * 2) % height, width, 18);
    }

    if (caption) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(ctx, 16, height - 52, Math.min(width - 32, ctx.measureText(caption).width + 36), 36, 10);
      ctx.fill();
      ctx.fillStyle = '#F4FFFB';
      ctx.font = font(16, true);
      ctx.fillText(caption, 28, height - 28);
    }

    frames.push(frameData(ctx, width, height));
  }

  return encodeFrames(frames, width, height, 80);
}

export { W, H, encodeFrames };
