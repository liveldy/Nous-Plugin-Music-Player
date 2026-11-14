/* 音乐播放器 — 空壳播放器：曲库从空开始，添加本机音频后用 Web Audio 解码播放。
   宿主协议没有后台播放、通知栏与托盘接口（见 README「页面能力」），播放只发生在这一页。 */
(function () {
  'use strict';

  const SDK = window.NousPlugin || null;
  const $ = s => document.querySelector(s);

  const el = {
    app: $('.app'),
    viz: $('#viz'),
    title: $('#title'),
    artist: $('#artist'),
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
    add: $('#add'),
  };

  const tracks = [];
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
  let lastPos = 0, lastTick = 0, statusTimer = 0, saveTimer = 0, seq = 0;

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
    track.duration = decoded.duration;
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
    if (!track) { addFiles(); return; }
    try {
      await start(state.base || 0);
    } catch (error) {
      status(error && error.message === 'NOSUPPORT' ? '这个环境不提供音频输出。' : '这个文件解不开，换一个试试。');
    }
  }

  function toggle() {
    if (state.playing) pause(); else play();
  }

  function seek(seconds) {
    if (!current()) return;
    const total = duration();
    const target = Math.max(0, Math.min(total || seconds, seconds));
    const wasPlaying = state.playing;
    if (wasPlaying) stopNode();
    state.playing = false;
    state.base = target;
    lastPos = target;
    if (wasPlaying) start(target);
    else paint();
  }

  function select(index, autoplay) {
    if (index < 0 || index >= tracks.length) return;
    stopNode();
    state.playing = false;
    state.base = 0;
    state.index = index;
    lastPos = 0;
    paint();
    if (autoplay) play();
    scheduleSave();
  }

  function step(delta) {
    const n = tracks.length;
    if (!n) return;
    const next = (state.index + delta + n) % n;
    select(next, state.playing);
  }

  function onEnded() {
    if (state.mode === 'single') { state.base = 0; start(0); return; }
    const n = tracks.length;
    if (!n) { paint(); return; }
    if (state.mode === 'sequence' && state.index === n - 1) { state.base = 0; paint(); scheduleSave(); return; }
    const next = state.mode === 'random' ? Math.floor(Math.random() * n) : (state.index + 1) % n;
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
  const AUDIO = /\.(mp3|m4a|aac|flac|wav|ogg|oga|opus|webm)$/i;

  function addFiles() {
    el.picker.value = '';
    el.picker.click();
  }

  function nameOf(file) {
    return file.name.replace(/\.[^.]+$/, '') || file.name || '音频';
  }

  function add(file, playAfter) {
    const track = {
      id: 'f' + (++seq),
      name: nameOf(file),
      duration: 0,
    };
    tracks.push(track);
    state.files.set(track.id, file);
    if (playAfter) {
      const wasPlaying = state.playing;
      state.index = tracks.indexOf(track);
      state.base = 0;
      paint();
      play();
      if (!wasPlaying) { /* nothing else */ }
    }
    return track;
  }

  function absorb(list) {
    const files = Array.from(list || []).filter(file => file && (AUDIO.test(file.name) || /^audio\//.test(file.type || '')));
    if (!files.length) { status('这些文件不是音频，换 mp3、m4a、flac 或 wav 试试。'); return; }
    const firstEmpty = !tracks.length;
    files.forEach(file => add(file, false));
    if (firstEmpty) state.index = Math.max(0, tracks.length - files.length);
    renderQueue();
    paint();
    status('加进来 ' + files.length + ' 首。');
    scheduleSave();
  }

  el.picker.addEventListener('change', () => {
    const chosen = Array.from(el.picker.files || []);
    el.picker.value = '';
    if (chosen.length) absorb(chosen);
  });

  function walk(entry, out) {
    return new Promise(resolve => {
      if (!entry) return resolve();
      if (entry.isFile) {
        entry.file(file => { out.push(file); resolve(); }, () => resolve());
        return;
      }
      const reader = entry.createReader();
      const all = [];
      const read = () => reader.readEntries(batch => {
        if (!batch.length) {
          Promise.all(all.map(item => walk(item, out))).then(resolve, resolve);
          return;
        }
        all.push(...batch);
        read();
      }, () => resolve());
      read();
    });
  }

  function absorbDrop(data) {
    const items = Array.from((data && data.items) || []);
    const entries = items.map(item => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null)).filter(Boolean);
    if (entries.length) {
      const out = [];
      Promise.all(entries.map(entry => walk(entry, out))).then(() => absorb(out));
      return;
    }
    absorb(data && data.files);
  }

  let dragDepth = 0;
  document.addEventListener('dragenter', event => {
    if (!event.dataTransfer) return;
    event.preventDefault();
    dragDepth += 1;
    el.app.classList.add('is-drop');
  });
  document.addEventListener('dragover', event => {
    if (!event.dataTransfer) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });
  document.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) el.app.classList.remove('is-drop');
  });
  document.addEventListener('drop', event => {
    if (!event.dataTransfer) return;
    event.preventDefault();
    dragDepth = 0;
    el.app.classList.remove('is-drop');
    absorbDrop(event.dataTransfer);
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
        + '<span class="meta"><strong></strong></span>'
        + '<span class="dur"></span>';
      row.querySelector('.n').textContent = String(index + 1).padStart(2, '0');
      row.querySelector('.meta strong').textContent = track.name;
      row.querySelector('.dur').textContent = track.duration ? clock(track.duration) : '';
      row.addEventListener('click', () => {
        if (index === state.index) { toggle(); return; }
        select(index, true);
      });
      fragment.append(row);
    });
    el.tracks.textContent = '';
    if (!tracks.length) {
      const empty = document.createElement('button');
      empty.type = 'button';
      empty.className = 'empty';
      empty.id = 'empty';
      empty.textContent = '添加文件，或拖进来';
      empty.addEventListener('click', addFiles);
      el.tracks.append(empty);
    } else {
      el.tracks.append(fragment);
    }
    el.count.textContent = tracks.length ? tracks.length + ' 首' : '';
    updateQueue();
  }

  function updateQueue() {
    Array.from(el.tracks.children).forEach((row, index) => {
      const track = tracks[index];
      if (!track || !row.classList.contains('row')) return;
      const now = index === state.index;
      row.classList.toggle('is-now', now);
      row.setAttribute('aria-current', now ? 'true' : 'false');
      row.dataset.playing = String(now && state.playing);
      row.querySelector('.dur').textContent = track.duration ? clock(track.duration) : '';
    });
  }

  function paintTransport() {
    const total = duration() ? duration() : 0;
    el.total.textContent = total ? clock(total) : '0:00';
    const at = position();
    if (!state.scrubbing) {
      el.seek.max = String(Math.max(total || 1, 1));
      el.seek.value = String(Math.min(at, total || 0));
      el.seek.style.setProperty('--fill', (total ? (at / total) * 100 : 0).toFixed(2) + '%');
    }
    el.elapsed.textContent = clock(at);
    el.play.dataset.playing = String(state.playing);
    el.play.setAttribute('aria-label', state.playing ? '暂停' : '播放');
    const has = tracks.length > 0;
    for (const button of [el.play, el.prev, el.next, el.seek]) button.disabled = !has;
    el.prev.disabled = el.next.disabled = tracks.length < 2;
    updateListen();
  }

  function paint() {
    const track = current();
    el.title.textContent = track ? track.name : '还没有音乐';
    el.artist.textContent = track ? '' : '';
    paintTransport();
    updateQueue();
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
  /* visualiser: three strings that answer the sound                      */
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

    const live = analyser && vizData && state.playing;
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
          v: 2,
          mode: state.mode,
          volume: Math.round(state.volume * 100) / 100,
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
        }
      } catch (_) { /* fresh account */ }
    }
    state.ready = true;
    paint();
    requestAnimationFrame(() => el.app.classList.add('is-in'));
    draw();
  }

  /* ------------------------------------------------------------------ */
  /* wiring                                                              */
  el.add.addEventListener('click', addFiles);
  el.play.addEventListener('click', toggle);
  el.prev.addEventListener('click', () => step(-1));
  el.next.addEventListener('click', () => step(1));
  el.modes.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));

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

  /* clock: position, spectrum, listening time */
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
    }
    draw();
  }

  /* boot */
  viz.ctx = el.viz.getContext('2d');
  measure();
  setMode('sequence', false);
  setVolume(0.8, false);
  renderQueue();
  paint();
  draw();
  el.listen.hidden = true;
  restore();
  requestAnimationFrame(frame);
  setTimeout(() => el.app.classList.add('is-in'), 2500);
})();
