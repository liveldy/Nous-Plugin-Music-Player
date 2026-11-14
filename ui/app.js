/* 音乐播放器 — 页面内播放器：Web Audio 解码本地文件，逐句歌词、三种播放模式。
   宿主协议没有后台播放、通知栏与托盘接口（见 README「界面能力」），所以播放只发生在这一页。 */
(function () {
  'use strict';

  const PACK = window.MUSIC_PACK || {name: '古风歌曲包', tracks: []};
  const SDK = window.NousPlugin || null;
  const $ = s => document.querySelector(s);

  const el = {
    app: $('.app'),
    viz: $('#viz'),
    title: $('#title'),
    artist: $('#artist'),
    lyrics: $('#lyrics'),
    seek: $('#seek'),
    elapsed: $('#elapsed'),
    total: $('#total'),
    play: $('#play'),
    prev: $('#prev'),
    next: $('#next'),
    volume: $('#volume'),
    modes: Array.from(document.querySelectorAll('.modes button')),
    tracks: $('#tracks'),
    count: $('#count'),
    hint: $('#hint'),
    status: $('#status'),
    listen: $('#listen'),
    picker: $('#picker'),
    pickAll: $('#pickAll'),
  };

  const tracks = (PACK.tracks || []).map(t => ({
    id: String(t.id),
    name: t.name,
    artist: t.artist || '',
    duration: Number(t.duration) || 0,
    file: t.file || '',
    lyrics: Array.isArray(t.lyrics) ? t.lyrics : [],
    local: false,
  }));

  const state = {
    index: 0,
    mode: 'sequence',
    volume: 0.8,
    playing: false,
    base: 0,
    startedAt: 0,
    files: new Map(),
    buffers: new Map(),
    listen: {date: day(), seconds: 0},
    scrubbing: false,
    ready: false,
  };

  let ctx = null, master = null, analyser = null, node = null, token = 0;
  let localSeq = 0, lastPos = 0, lastTick = 0, statusTimer = 0, saveTimer = 0;

  /* ------------------------------------------------------------------ */
  /* helpers                                                             */
  function day() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function clock(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    return m + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  }
  function status(message) {
    el.status.textContent = message || '';
    clearTimeout(statusTimer);
    if (message) statusTimer = setTimeout(() => { el.status.textContent = ''; }, 7000);
  }
  function current() { return tracks[state.index] || null; }
  function duration() {
    const t = current();
    if (!t) return 0;
    const buffer = state.buffers.get(t.id);
    return buffer ? buffer.duration : t.duration || 0;
  }
  function position() {
    if (!ctx || !state.playing) return state.base;
    return Math.min(duration() || Infinity, Math.max(0, ctx.currentTime - state.startedAt));
  }

  /* ------------------------------------------------------------------ */
  /* audio                                                               */
  function audio() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('NOSUPPORT');
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = state.volume;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;
    master.connect(analyser);
    analyser.connect(ctx.destination);
    vizData = new Uint8Array(analyser.fftSize);
    return ctx;
  }

  async function buffer(track) {
    if (state.buffers.has(track.id)) return state.buffers.get(track.id);
    const file = state.files.get(track.id);
    if (!file) throw new Error('NO_FILE');
    audio();
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    const bytes = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(bytes);
    state.buffers.set(track.id, decoded);
    if (!track.duration) track.duration = decoded.duration;
    for (const key of Array.from(state.buffers.keys())) {
      if (state.buffers.size <= 2) break;
      if (key !== track.id) state.buffers.delete(key);
    }
    return decoded;
  }

  function stopNode() {
    token += 1;
    if (node) {
      const old = node;
      node = null;
      try { old.stop(); } catch (_) { /* already stopped */ }
    }
  }

  async function start(offset) {
    const track = current();
    if (!track) return;
    const decoded = await buffer(track);
    audio();
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    stopNode();
    const src = ctx.createBufferSource();
    src.buffer = decoded;
    src.connect(master);
    const mine = ++token;
    src.onended = () => {
      if (mine !== token) return;
      node = null;
      state.playing = false;
      onEnded();
    };
    const at = Math.min(Math.max(0, offset), Math.max(0, decoded.duration - 0.06));
    state.playing = true;
    state.base = at;
    state.startedAt = ctx.currentTime - at;
    node = src;
    src.start(0, at);
    lastPos = at;
    paint();
    scheduleSave();
  }

  function pause() {
    if (state.playing) {
      state.base = position();
      state.playing = false;
      stopNode();
      paint();
      scheduleSave();
    }
  }

  async function play() {
    const track = current();
    if (!track) return;
    if (!state.files.has(track.id)) {
      status(track.name + ' 还没有本地文件，点这一行选取它。');
      askFile(track.id, true);
      return;
    }
    try {
      await start(state.base || 0);
    } catch (error) {
      status(error && error.message === 'NOSUPPORT' ? '这个环境不提供音频输出。' : '这个文件解不开，换一个 mp3 试试。');
    }
  }

  function toggle() {
    if (state.playing) pause(); else play();
  }

  function seek(seconds) {
    const total = duration();
    const target = Math.max(0, Math.min(total || seconds, seconds));
    const wasPlaying = state.playing;
    if (wasPlaying) stopNode();
    state.playing = false;
    state.base = target;
    lastPos = target;
    if (wasPlaying) start(target);
    else { paint(); updateLyric(); }
  }

  function select(index, autoplay) {
    if (index < 0 || index >= tracks.length) return;
    stopNode();
    state.playing = false;
    state.base = 0;
    state.index = index;
    lastPos = 0;
    lyricIndex = -1;
    renderNow();
    paint();
    if (autoplay) play();
    scheduleSave();
  }

  function step(delta) {
    const n = tracks.length;
    if (!n) return;
    let next = state.index;
    for (let i = 0; i < n; i++) {
      next = (next + delta + n) % n;
      if (state.files.has(tracks[next].id)) break;
    }
    if (next === state.index) { seek(0); return; }
    select(next, true);
  }

  function onEnded() {
    if (state.mode === 'single') { state.base = 0; start(0); return; }
    const n = tracks.length;
    if (state.mode === 'sequence' && state.index === n - 1) { state.base = 0; paint(); scheduleSave(); return; }
    if (!n) return;
    let next = state.index;
    for (let i = 0; i < n; i++) {
      next = state.mode === 'random' ? Math.floor(Math.random() * n) : (next + 1) % n;
      if (next !== state.index && state.files.has(tracks[next].id)) break;
    }
    if (next === state.index || !state.files.has(tracks[next].id)) { state.base = 0; paint(); scheduleSave(); return; }
    select(next, true);
  }

  function setMode(mode, persist) {
    if (!['sequence', 'single', 'random'].includes(mode)) return;
    state.mode = mode;
    el.modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    if (persist !== false) scheduleSave();
  }

  function setVolume(value, persist) {
    state.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (master) master.gain.value = state.volume;
    el.volume.value = String(state.volume);
    el.volume.style.setProperty('--fill', (state.volume * 100).toFixed(1) + '%');
    if (persist !== false) scheduleSave();
  }

  /* ------------------------------------------------------------------ */
  /* files                                                               */
  function askFile(id, autoplay) {
    el.picker.dataset.for = id || '';
    el.picker.dataset.play = autoplay ? '1' : '';
    el.picker.value = '';
    el.picker.click();
  }

  function localTrack(name) {
    localSeq += 1;
    const track = {
      id: 'local-' + localSeq + '-' + (name.replace(/[^\w\u4e00-\u9fa5-]+/g, '').slice(0, 16) || 'audio'),
      name: name,
      artist: '本地文件',
      duration: 0,
      lyrics: [],
      local: true,
    };
    tracks.push(track);
    return track;
  }

  function matchFile(file) {
    const base = file.name.replace(/\.[^.]+$/, '').toLowerCase();
    const full = file.name.toLowerCase();
    return tracks.find(t => t.id.toLowerCase() === base
      || (t.file && t.file.toLowerCase() === full)
      || t.name.toLowerCase() === base);
  }

  el.picker.addEventListener('change', async () => {
    const chosen = Array.from(el.picker.files || []);
    const target = el.picker.dataset.for;
    const playAfter = el.picker.dataset.play === '1';
    el.picker.value = '';
    el.picker.dataset.for = '';
    el.picker.dataset.play = '';
    if (!chosen.length) return;

    let first = null;
    for (const file of chosen) {
      const hit = (target && chosen.length === 1 && tracks.find(t => t.id === target)) || matchFile(file) || localTrack(file.name);
      state.files.set(hit.id, file);
      state.buffers.delete(hit.id);
      if (!first) first = hit;
    }
    renderQueue();
    paint();
    status('');
    if (playAfter && first) {
      state.index = tracks.indexOf(first);
      state.base = 0;
      renderNow();
      paint();
      play();
    }
  });

  /* ------------------------------------------------------------------ */
  /* rendering                                                           */
  function renderQueue() {
    const fragment = document.createDocumentFragment();
    tracks.forEach((track, index) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'row';
      row.dataset.i = String(index);
      row.innerHTML = '<span class="idx"><span class="bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="n"></span></span>'
        + '<span class="meta"><strong></strong><small></small></span>'
        + '<span class="dur"></span>';
      const n = row.querySelector('.n');
      n.textContent = String(index + 1).padStart(2, '0');
      row.querySelector('.meta strong').textContent = track.name;
      row.querySelector('.meta small').textContent = track.artist;
      row.querySelector('.dur').textContent = track.duration ? clock(track.duration) : '';
      row.addEventListener('click', () => {
        if (!state.files.has(track.id)) { status('选一个本地文件，对上这一首。'); askFile(track.id, true); return; }
        if (index === state.index) { toggle(); return; }
        select(index, true);
      });
      fragment.append(row);
    });
    el.tracks.textContent = '';
    el.tracks.append(fragment);
    el.count.textContent = tracks.length + ' 首';
    updateQueue();
  }

  function updateQueue() {
    Array.from(el.tracks.children).forEach((row, index) => {
      const track = tracks[index];
      const has = state.files.has(track.id);
      const now = index === state.index;
      row.classList.toggle('is-now', now);
      row.classList.toggle('is-missing', !has);
      row.setAttribute('aria-current', now ? 'true' : 'false');
      row.dataset.playing = String(now && state.playing);
      row.querySelector('.dur').textContent = track.duration ? clock(track.duration) : '';
    });
  }

  function renderNow() {
    const track = current();
    if (!track) return;
    el.title.textContent = track.name;
    el.artist.textContent = track.artist || (track.local ? '本地文件' : '');
    el.total.textContent = duration() ? clock(duration()) : '—';
    renderLyrics();
    updateQueue();
  }

  function renderLyrics() {
    const track = current();
    el.lyrics.textContent = '';
    const lines = track && track.lyrics ? track.lyrics : [];
    const host = el.lyrics.parentElement;
    host.classList.toggle('no-lyrics', !lines.length);
    if (!lines.length) { el.lyrics.hidden = true; lyricIndex = -1; return; }
    el.lyrics.hidden = false;
    const fragment = document.createDocumentFragment();
    lines.forEach((line, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'line';
      button.dataset.i = String(index);
      button.textContent = line[1];
      button.addEventListener('click', () => seek(Number(line[0]) || 0));
      fragment.append(button);
    });
    el.lyrics.append(fragment);
    el.lyrics.scrollTop = 0;
    updateLyric(true);
  }

  let lyricIndex = -1;
  function updateLyric(force) {
    const track = current();
    const lines = track && track.lyrics ? track.lyrics : null;
    if (!lines || !lines.length) { lyricIndex = -1; return; }
    const at = position();
    let active = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i][0] <= at + 0.12) active = i; else break;
    }
    if (active === lyricIndex && !force) return;
    lyricIndex = active;
    const nodes = el.lyrics.children;
    for (let i = 0; i < nodes.length; i++) nodes[i].classList.toggle('is-now', i === active);
    const target = nodes[Math.max(0, active)];
    if (target) {
      const box = el.lyrics;
      box.scrollTop = Math.max(0, target.offsetTop - (box.clientHeight - target.offsetHeight) / 2);
    }
  }

  function paintTransport() {
    const total = duration();
    el.total.textContent = total ? clock(total) : '—';
    const at = position();
    if (!state.scrubbing) {
      el.seek.max = String(Math.max(total || 1, 1));
      el.seek.value = String(Math.min(at, total || at || 0));
      el.seek.style.setProperty('--fill', (total ? (at / total) * 100 : 0).toFixed(2) + '%');
    }
    el.elapsed.textContent = clock(at);
    el.play.dataset.playing = String(state.playing);
    el.play.setAttribute('aria-label', state.playing ? '暂停' : '播放');
    updateListen();
  }

  function paint() {
    const track = current();
    if (track) {
      el.title.textContent = track.name;
      el.artist.textContent = track.artist || '';
    }
    paintTransport();
    updateQueue();
    updateLyric();
  }

  function updateListen() {
    const minutes = Math.floor(state.listen.seconds / 60);
    if (minutes >= 1) {
      el.listen.hidden = false;
      el.listen.textContent = '今日 ' + minutes + ' 分钟';
    } else {
      el.listen.hidden = true;
    }
  }

  /* ------------------------------------------------------------------ */
  /* visualiser: a string that answers the sound                          */
  const viz = {ctx: null, w: 0, h: 0, colours: null};
  let vizData = null;

  function measure() {
    const rect = el.viz.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    viz.w = Math.max(1, Math.round(rect.width));
    viz.h = Math.max(1, Math.round(rect.height));
    el.viz.width = Math.round(viz.w * dpr);
    el.viz.height = Math.round(viz.h * dpr);
    viz.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    viz.colours = null;
  }

  function colours() {
    if (viz.colours) return viz.colours;
    const style = getComputedStyle(document.documentElement);
    viz.colours = {
      accent: style.getPropertyValue('--accent').trim() || '#5ab9fc',
      hair: style.getPropertyValue('--hair').trim() || 'rgba(233,237,243,.22)',
    };
    return viz.colours;
  }

  function draw() {
    if (!viz.ctx) return;
    const g = viz.ctx;
    const w = viz.w, h = viz.h;
    const c = colours();
    g.clearRect(0, 0, w, h);

    const mid = h * 0.52;
    const spread = Math.min(h * 0.16, 46);
    const strings = [
      {dy: -spread, scale: 0.42, alpha: 0.32},
      {dy: 0, scale: 1, alpha: 1},
      {dy: spread, scale: 0.58, alpha: 0.38},
    ];

    const live = analyser && vizData;
    if (live) analyser.getByteTimeDomainData(vizData);

    const points = Math.min(420, Math.max(120, Math.round(w / 2)));
    const step = live ? Math.max(1, Math.floor(vizData.length / points)) : 0;
    const wave = [];
    if (live) {
      for (let i = 0; i < points; i++) wave.push((vizData[i * step] - 128) / 128);
    }

    // the frets of the instrument: short ticks at the two bridges, only while the strings rest
    if (!live) {
      g.strokeStyle = c.hair;
      g.lineWidth = 1;
      for (let i = 1; i < 9; i++) {
        const x = Math.round((w / 9) * i) + 0.5;
        g.beginPath();
        g.moveTo(x, mid - spread - 7);
        g.lineTo(x, mid - spread + 7);
        g.moveTo(x, mid + spread - 7);
        g.lineTo(x, mid + spread + 7);
        g.stroke();
      }
    }

    strings.forEach(string => {
      const y = mid + string.dy;
      g.strokeStyle = live ? hexA(c.accent, string.alpha) : c.hair;
      g.lineWidth = live && string.scale === 1 ? 1.6 : 1;
      g.beginPath();
      if (!live) {
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
        return;
      }
      for (let i = 0; i < points; i++) {
        const value = Math.max(-1, Math.min(1, wave[i] * 1.9)) * amplitude(h) * string.scale;
        const px = (i / (points - 1)) * w;
        if (i === 0) g.moveTo(px, y + value);
        else g.lineTo(px, y + value);
      }
      g.stroke();
    });

    if (!live) return;

    // the middle string carries a body: the lit ribbon under the strongest line
    g.beginPath();
    g.moveTo(0, mid);
    for (let i = 0; i < points; i++) {
      g.lineTo((i / (points - 1)) * w, mid + Math.max(-1, Math.min(1, wave[i] * 1.9)) * amplitude(h));
    }
    for (let i = points - 1; i >= 0; i--) {
      g.lineTo((i / (points - 1)) * w, mid - Math.max(-1, Math.min(1, wave[i] * 1.9)) * amplitude(h));
    }
    g.closePath();
    g.fillStyle = hexA(c.accent, 0.12);
    g.fill();
  }

  function amplitude(h) {
    return Math.min(h * 0.24, 86);
  }

  function hexA(colour, alpha) {
    const value = colour.trim();
    if (value.startsWith('#')) {
      const hex = value.length === 4
        ? '#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3]
        : value;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }
    return value;
  }

  /* ------------------------------------------------------------------ */
  /* storage                                                             */
  const hostReady = (function () {
    if (!SDK) return Promise.resolve(null);
    return Promise.race([
      SDK.ready.then(() => SDK).catch(() => null),
      new Promise(resolve => setTimeout(() => resolve(null), 1200)),
    ]);
  })();

  function scheduleSave() {
    if (!state.ready) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 900);
  }

  async function save() {
    const host = await hostReady;
    if (!host) return;
    try {
      await host.request('storage.set', {
        key: 'player',
        value: {
          v: 1,
          mode: state.mode,
          volume: Math.round(state.volume * 100) / 100,
          track: current() ? current().id : '',
          position: Math.round(position() * 10) / 10,
          listen: {d: state.listen.date, s: Math.round(state.listen.seconds)},
        },
      });
    } catch (_) { /* storage is optional */ }
  }

  async function restore() {
    const host = await hostReady;
    if (host) {
      try {
        const saved = await host.request('storage.get', {key: 'player'});
        if (saved && typeof saved === 'object') {
          if (saved.mode) setMode(saved.mode, false);
          if (typeof saved.volume === 'number') setVolume(saved.volume, false);
          if (saved.listen && saved.listen.d === day()) state.listen.seconds = Number(saved.listen.s) || 0;
          const at = tracks.findIndex(t => t.id === saved.track);
          if (at >= 0) {
            state.index = at;
            const parked = Number(saved.position) || 0;
            state.base = parked > 0 ? parked : 0;
          }
        }
      } catch (_) { /* fresh account */ }
    }
    state.ready = true;
    renderNow();
    paint();
    requestAnimationFrame(() => el.app.classList.add('is-in'));
    draw();
  }

  /* ------------------------------------------------------------------ */
  /* wiring                                                              */
  el.play.addEventListener('click', toggle);
  el.prev.addEventListener('click', () => step(-1));
  el.next.addEventListener('click', () => step(1));
  el.modes.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  el.pickAll.addEventListener('click', () => askFile('', false));

  el.seek.addEventListener('pointerdown', () => { state.scrubbing = true; });
  el.seek.addEventListener('input', () => {
    const value = Number(el.seek.value) || 0;
    const total = duration();
    el.elapsed.textContent = clock(value);
    el.seek.style.setProperty('--fill', ((total ? value / total * 100 : 0)).toFixed(2) + '%');
  });
  el.seek.addEventListener('change', () => {
    state.scrubbing = false;
    seek(Number(el.seek.value) || 0);
  });
  el.volume.addEventListener('input', () => setVolume(el.volume.value));

  document.addEventListener('keydown', event => {
    const tag = (event.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'button' || tag === 'select') return;
    if (event.code === 'Space') { event.preventDefault(); toggle(); }
    else if (event.code === 'ArrowRight') { event.preventDefault(); seek(position() + 5); }
    else if (event.code === 'ArrowLeft') { event.preventDefault(); seek(position() - 5); }
  });

  new ResizeObserver(() => { measure(); draw(); }).observe(el.viz);
  new MutationObserver(() => { viz.colours = null; draw(); })
    .observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);

  /* clock: position, lyrics, spectrum, listening time */
  let lastFrame = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - lastFrame < 33) return;
    lastFrame = now;
    if (state.playing) {
      const at = position();
      if (at > lastPos && at - lastPos < 2.5) {
        if (state.listen.date !== day()) state.listen = {date: day(), seconds: 0};
        state.listen.seconds += at - lastPos;
        lastTick += at - lastPos;
        if (lastTick > 20) { lastTick = 0; scheduleSave(); }
      }
      lastPos = at;
      paintTransport();
      updateLyric();
    }
    draw();
  }

  /* boot */
  viz.ctx = el.viz.getContext('2d');
  measure();
  setMode('sequence', false);
  setVolume(0.8, false);
  renderQueue();
  renderNow();
  draw();
  el.listen.hidden = true;
  restore();
  requestAnimationFrame(frame);
  setTimeout(() => el.app.classList.add('is-in'), 2500);
})();
