window.Sfx = (function () {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(o) {
    if (muted || !ensure()) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t0 + o.dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(o.vol || 0.25, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.02);
  }

  function noise(o) {
    if (muted || !ensure()) return;
    const dur = o.dur || 0.2;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = o.type || 'lowpass';
    filter.frequency.setValueAtTime(o.freq || 1400, ctx.currentTime);
    if (o.slide) filter.frequency.exponentialRampToValueAtTime(Math.max(60, o.slide), ctx.currentTime + dur);
    const gain = ctx.createGain();
    gain.gain.value = o.vol || 0.25;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  function swing() { noise({ dur: 0.16, freq: 3200, slide: 500, vol: 0.16, type: 'bandpass' }); tone({ freq: 320, slide: 120, dur: 0.12, type: 'sawtooth', vol: 0.06 }); }
  function hit() { noise({ dur: 0.1, freq: 1800, slide: 300, vol: 0.2 }); tone({ freq: 180, slide: 70, dur: 0.1, type: 'square', vol: 0.14 }); }
  function crit() { tone({ freq: 900, slide: 220, dur: 0.22, type: 'square', vol: 0.22 }); noise({ dur: 0.16, freq: 4200, slide: 700, vol: 0.18 }); }
  function hurt() { tone({ freq: 220, slide: 70, dur: 0.3, type: 'sawtooth', vol: 0.24 }); noise({ dur: 0.22, freq: 700, vol: 0.16 }); }
  function die() { tone({ freq: 260, slide: 50, dur: 0.55, type: 'sawtooth', vol: 0.22 }); noise({ dur: 0.4, freq: 900, slide: 120, vol: 0.16 }); }
  function pickup() { tone({ freq: 880, slide: 1320, dur: 0.1, type: 'triangle', vol: 0.14 }); }
  function coin() { tone({ freq: 1500, slide: 2100, dur: 0.08, type: 'triangle', vol: 0.1 }); }
  function potion() { tone({ freq: 420, slide: 900, dur: 0.28, type: 'sine', vol: 0.2 }); }
  function levelUp() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone({ freq: f, dur: 0.28, type: 'triangle', vol: 0.2 }), i * 110));
  }
  function portal() { tone({ freq: 120, slide: 700, dur: 0.9, type: 'sine', vol: 0.18 }); }
  function boss() {
    [70, 62, 55].forEach((f, i) => setTimeout(() => tone({ freq: f, slide: f * 0.7, dur: 0.8, type: 'sawtooth', vol: 0.24 }), i * 180));
  }
  function chest() { noise({ dur: 0.25, freq: 1200, slide: 300, vol: 0.2 }); tone({ freq: 160, slide: 320, dur: 0.2, type: 'square', vol: 0.12 }); }
  function whirl() {
    noise({ dur: 0.45, freq: 500, slide: 3600, vol: 0.2, type: 'bandpass' });
    tone({ freq: 180, slide: 520, dur: 0.35, type: 'sine', vol: 0.16 });
  }

  window.addEventListener('pointerdown', ensure, { once: true });
  window.addEventListener('keydown', ensure, { once: true });

  return { swing, hit, crit, hurt, die, pickup, coin, potion, levelUp, portal, boss, chest, whirl, mute: (v) => { muted = v; } };
})();
