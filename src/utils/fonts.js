import { GlobalFonts } from '@napi-rs/canvas';
import { existsSync } from 'fs';

const CANDIDATES = [
  ['C:/Windows/Fonts/segoeui.ttf', 'UI'],
  ['C:/Windows/Fonts/segoeuib.ttf', 'UI Bold'],
  ['C:/Windows/Fonts/arial.ttf', 'UI'],
  ['C:/Windows/Fonts/arialbd.ttf', 'UI Bold'],
  ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'UI'],
  ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'UI Bold'],
  ['/System/Library/Fonts/SFNS.ttf', 'UI'],
  ['/System/Library/Fonts/Supplemental/Arial.ttf', 'UI'],
];

let registered = false;

export function ensureFonts() {
  if (registered) return;
  registered = true;
  for (const [path, name] of CANDIDATES) {
    if (existsSync(path)) {
      try {
        GlobalFonts.registerFromPath(path, name);
      } catch {
        // ignore missing/unreadable fonts
      }
    }
  }
}

export function font(size, bold = false) {
  const families = (() => {
    try {
      return GlobalFonts.families?.map((f) => f.family || f) ?? [];
    } catch {
      return [];
    }
  })();
  const boldOk = families.includes('UI Bold');
  const regularOk = families.includes('UI');
  const family = bold && boldOk ? 'UI Bold' : regularOk ? 'UI' : 'sans-serif';
  return `${bold ? '700' : '500'} ${size}px ${family}`;
}
