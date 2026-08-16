import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { GAME } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../../data/geekbar.db');

mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    device_name TEXT DEFAULT 'My Geek Bar',
    tagline TEXT DEFAULT 'fat clouds only',
    skin TEXT DEFAULT 'classic',
    flavor TEXT DEFAULT 'mint',
    battery REAL DEFAULT 100,
    buzz REAL DEFAULT 0,
    pod_puffs INTEGER DEFAULT 500,
    total_hits INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    clouds INTEGER DEFAULT 120,
    stash INTEGER DEFAULT 0,
    burnt INTEGER DEFAULT 0,
    prestige INTEGER DEFAULT 0,
    raid_shield_until INTEGER DEFAULT 0,
    xp_boost_until INTEGER DEFAULT 0,
    last_hit INTEGER DEFAULT 0,
    last_charge INTEGER DEFAULT 0,
    last_raid INTEGER DEFAULT 0,
    last_jack INTEGER DEFAULT 0,
    last_daily INTEGER DEFAULT 0,
    last_chase INTEGER DEFAULT 0,
    last_smokeout INTEGER DEFAULT 0,
    last_roulette INTEGER DEFAULT 0,
    bounty_on TEXT DEFAULT '',
    bounty_amount INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    PRIMARY KEY (user_id, guild_id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    qty INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, guild_id, item_id, kind)
  );

  CREATE TABLE IF NOT EXISTS raid_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    raider_id TEXT NOT NULL,
    victim_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    success INTEGER NOT NULL,
    kind TEXT DEFAULT 'raid',
    timestamp INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS custom_skins (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS custom_flavors (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    notes TEXT DEFAULT '',
    color TEXT DEFAULT '#7FFFD4',
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );
`);

const EXTRA_USER_COLUMNS = [
  ['last_slots', 'INTEGER DEFAULT 0'],
  ['last_pack', 'INTEGER DEFAULT 0'],
  ['last_chain', 'INTEGER DEFAULT 0'],
  ['last_lucky', 'INTEGER DEFAULT 0'],
  ['last_drop', 'INTEGER DEFAULT 0'],
  ['last_flip', 'INTEGER DEFAULT 0'],
  ['last_drip', 'INTEGER DEFAULT 0'],
  ['last_wire', 'INTEGER DEFAULT 0'],
  ['last_vanish', 'INTEGER DEFAULT 0'],
  ['last_crash', 'INTEGER DEFAULT 0'],
  ['streak', 'INTEGER DEFAULT 0'],
  ['quest_type', "TEXT DEFAULT ''"],
  ['quest_progress', 'INTEGER DEFAULT 0'],
  ['quest_done', 'INTEGER DEFAULT 0'],
  ['last_quest_day', "TEXT DEFAULT ''"],
  ['last_night', 'INTEGER DEFAULT 0'],
  ['last_dice', 'INTEGER DEFAULT 0'],
  ['last_wheel', 'INTEGER DEFAULT 0'],
  ['last_scratch', 'INTEGER DEFAULT 0'],
  ['last_lockpick', 'INTEGER DEFAULT 0'],
];

const existing = new Set(db.prepare('PRAGMA table_info(users)').all().map((c) => c.name));
for (const [name, def] of EXTRA_USER_COLUMNS) {
  if (!existing.has(name)) db.exec(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
}

const USER_COLUMNS = new Set([
  'device_name', 'tagline', 'skin', 'flavor', 'battery', 'buzz', 'pod_puffs',
  'total_hits', 'xp', 'clouds', 'stash', 'burnt', 'prestige', 'raid_shield_until',
  'xp_boost_until', 'last_hit', 'last_charge', 'last_raid', 'last_jack',
  'last_daily', 'last_chase', 'last_smokeout', 'last_roulette', 'bounty_on',
  'bounty_amount',
  'last_slots', 'last_pack', 'last_chain', 'last_lucky', 'last_drop', 'last_flip',
  'last_drip', 'last_wire', 'last_vanish', 'last_crash', 'streak',
  'quest_type', 'quest_progress', 'quest_done', 'last_quest_day',
  'last_night', 'last_dice', 'last_wheel', 'last_scratch', 'last_lockpick',
]);

export function scopeId(guildId) {
  return guildId ?? 'global';
}

export function getUser(userId, guildId) {
  const gid = scopeId(guildId);
  const row = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, gid);
  if (row) return row;

  db.prepare(
    `INSERT OR IGNORE INTO users (user_id, guild_id, clouds, pod_puffs) VALUES (?, ?, ?, ?)`,
  ).run(userId, gid, GAME.startingClouds, GAME.startingPuffs);
  return db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, gid);
}

export function updateUser(userId, guildId, fields) {
  const keys = Object.keys(fields).filter((k) => USER_COLUMNS.has(k));
  if (!keys.length) return getUser(userId, guildId);
  const sets = keys.map((k) => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE users SET ${sets} WHERE user_id = @user_id AND guild_id = @guild_id`).run({
    user_id: userId,
    guild_id: scopeId(guildId),
    ...fields,
  });
  return getUser(userId, guildId);
}

export function addClouds(userId, guildId, amount) {
  const user = getUser(userId, guildId);
  return updateUser(userId, guildId, { clouds: Math.max(0, user.clouds + amount) });
}

export function getLeaderboard(guildId, field = 'total_hits', limit = 10) {
  const allowed = ['total_hits', 'xp', 'clouds', 'stash'];
  const col = allowed.includes(field) ? field : 'total_hits';
  return db
    .prepare(`SELECT * FROM users WHERE guild_id = ? ORDER BY ${col} DESC LIMIT ?`)
    .all(scopeId(guildId), limit);
}

export function logRaid(guildId, raiderId, victimId, amount, success, kind = 'raid') {
  db.prepare(
    'INSERT INTO raid_log (guild_id, raider_id, victim_id, amount, success, kind) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(scopeId(guildId), raiderId, victimId, amount, success ? 1 : 0, kind);
}

export function getInventory(userId, guildId) {
  return db
    .prepare('SELECT * FROM inventory WHERE user_id = ? AND guild_id = ? ORDER BY kind, item_id')
    .all(userId, scopeId(guildId));
}

export function addItem(userId, guildId, itemId, kind, qty = 1) {
  db.prepare(
    `INSERT INTO inventory (user_id, guild_id, item_id, kind, qty)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, guild_id, item_id, kind)
     DO UPDATE SET qty = qty + excluded.qty`,
  ).run(userId, scopeId(guildId), itemId, kind, qty);
}

export function hasItem(userId, guildId, itemId, kind) {
  const row = db
    .prepare('SELECT qty FROM inventory WHERE user_id = ? AND guild_id = ? AND item_id = ? AND kind = ?')
    .get(userId, scopeId(guildId), itemId, kind);
  return (row?.qty ?? 0) > 0;
}

export function getCustomSkin(userId, skinId) {
  return db.prepare('SELECT * FROM custom_skins WHERE id = ? AND user_id = ?').get(skinId, userId);
}

export function getCustomSkins(userId) {
  return db.prepare('SELECT * FROM custom_skins WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

export function countCustomSkins(userId) {
  return db.prepare('SELECT COUNT(*) AS count FROM custom_skins WHERE user_id = ?').get(userId).count;
}

export function addCustomSkin(userId, id, name, filePath) {
  db.prepare(
    'INSERT INTO custom_skins (id, user_id, name, file_path) VALUES (?, ?, ?, ?)',
  ).run(id, userId, name, filePath);
  return getCustomSkin(userId, id);
}

export function deleteCustomSkin(userId, skinId) {
  const row = getCustomSkin(userId, skinId);
  if (!row) return null;
  db.prepare('DELETE FROM custom_skins WHERE id = ? AND user_id = ?').run(skinId, userId);
  return row;
}

export function getCustomFlavors(userId, guildId) {
  return db
    .prepare('SELECT * FROM custom_flavors WHERE user_id = ? AND guild_id = ? ORDER BY created_at DESC')
    .all(userId, scopeId(guildId));
}

export function getCustomFlavor(id) {
  return db.prepare('SELECT * FROM custom_flavors WHERE id = ?').get(id);
}

export function countCustomFlavors(userId, guildId) {
  return db
    .prepare('SELECT COUNT(*) AS count FROM custom_flavors WHERE user_id = ? AND guild_id = ?')
    .get(userId, scopeId(guildId)).count;
}

export function addCustomFlavor(userId, guildId, id, name, notes, color) {
  db.prepare(
    'INSERT INTO custom_flavors (id, user_id, guild_id, name, notes, color) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, userId, scopeId(guildId), name, notes, color);
  return getCustomFlavor(id);
}

export function getBounties(guildId, limit = 8) {
  return db
    .prepare(
      `SELECT * FROM users WHERE guild_id = ? AND bounty_amount > 0 ORDER BY bounty_amount DESC LIMIT ?`,
    )
    .all(scopeId(guildId), limit);
}

export { db };
