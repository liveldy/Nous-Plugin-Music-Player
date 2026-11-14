#!/usr/bin/env node
// Build ui/pack.js — the default 曲库 metadata (names, artists, durations, LRC lines)
// from a DawnBreaker music content folder. Audio files are never bundled: the page CSP
// forbids media loading, and the package budget is 4 MiB.
//
//   node tools/pack.mjs                                  # reads ../DawnBreaker/server/content
//   node tools/pack.mjs --content <dir> --out ui/pack.js
//   node tools/pack.mjs --music <music.json> --built 2026-11-14
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : fallback;
};

const content = path.resolve(arg('content', 'D:/Desktop/DawnBreaker/server/content'));
const musicFile = path.resolve(arg('music', path.join(content, 'music.json')));
const outFile = path.resolve(arg('out', path.join(root, 'ui', 'pack.js')));
const packName = arg('name', '古风歌曲包');
const source = arg('source', '破晓 · 弦音余韵');

if (!fs.existsSync(musicFile)) {
  console.error(`pack: no ${musicFile}; pass --music <music.json> (the file DawnBreaker's scripts/import_music.py writes).`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(musicFile, 'utf8'));
if (!Array.isArray(raw) || !raw.length) {
  console.error('pack: music.json is not a non-empty array');
  process.exit(1);
}

const tracks = [];
const seen = new Set();
for (const t of raw) {
  const id = String(t.id ?? '').trim();
  const name = String(t.name ?? '').trim();
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) { console.error(`pack: bad id ${JSON.stringify(t.id)}`); process.exit(1); }
  if (!name) { console.error(`pack: ${id} has no name`); process.exit(1); }
  if (seen.has(id)) { console.error(`pack: duplicate id ${id}`); process.exit(1); }
  seen.add(id);
  const duration = Number(t.duration);
  const lyrics = (Array.isArray(t.lyrics) ? t.lyrics : [])
    .map(l => [Math.round(Number(l?.time) * 100) / 100, String(l?.text ?? '').trim()])
    .filter(([time, text]) => Number.isFinite(time) && time >= 0 && text)
    .sort((a, b) => a[0] - b[0]);
  const file = typeof t.file === 'string' && /\.(mp3|m4a|flac|wav|ogg)$/i.test(t.file) ? t.file : id + '.mp3';
  tracks.push({
    id,
    name: name.slice(0, 80),
    artist: String(t.artist ?? '').trim().slice(0, 80),
    duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration * 100) / 100 : 0,
    file,
    lyrics,
  });
}

let built = arg('built', '');
if (!built) {
  const audio = path.join(path.dirname(musicFile), 'audio');
  try {
    const times = fs.readdirSync(audio).map(f => fs.statSync(path.join(audio, f)).mtimeMs);
    built = new Date(Math.max(...times)).toISOString().slice(0, 10);
  } catch {
    built = new Date().toISOString().slice(0, 10);
  }
}

const body = JSON.stringify({name: packName, source, built, tracks});
const js = `// 曲目表由 tools/pack.mjs 生成，勿手改。音频不入包：插件页面 CSP 禁止 media，且包上限 4 MiB。\nwindow.MUSIC_PACK=${body};\n`;
fs.mkdirSync(path.dirname(outFile), {recursive: true});
fs.writeFileSync(outFile, js, 'utf8');

const lines = tracks.reduce((n, t) => n + t.lyrics.length, 0);
console.log(`pack: ${tracks.length} tracks, ${lines} lyric lines, ${(Buffer.byteLength(js) / 1024).toFixed(1)} KiB -> ${path.relative(root, outFile)}`);
