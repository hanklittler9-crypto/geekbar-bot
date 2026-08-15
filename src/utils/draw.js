import { readFile } from 'fs/promises';
import { createCanvas, loadImage } from '@napi-rs/canvas';

export async function loadImageSafe(source) {
  if (!source) return null;
  try {
    if (Buffer.isBuffer(source)) return await loadImage(source);
    if (typeof source === 'string' && /^https?:\/\//i.test(source)) {
      const res = await fetch(source);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      return await loadImage(buf);
    }
    if (typeof source === 'string') {
      const buf = await readFile(source);
      return await loadImage(buf);
    }
  } catch {
    return null;
  }
  return null;
}

export function coverImage(ctx, img, x, y, w, h) {
  if (!img) return;
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function hexToRgb(hex) {
  const v = String(hex || '#00F5A0').replace('#', '');
  const n = v.length === 3 ? v.split('').map((c) => c + c).join('') : v.padEnd(6, '0').slice(0, 6);
  return {
    r: parseInt(n.slice(0, 2), 16) || 0,
    g: parseInt(n.slice(2, 4), 16) || 0,
    b: parseInt(n.slice(4, 6), 16) || 0,
  };
}

export function rgb(hex, a = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCanvas(width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  return { canvas, ctx, width, height };
}
