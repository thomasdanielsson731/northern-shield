let _ac = null;
let _muted = false;

export function setMuted(v) { _muted = v; }

function ac() {
  if (!_ac) { try { _ac = new AudioContext(); } catch {} }
  return _ac;
}

function tone(freq, dur = 0.08, vol = 0.12, type = 'sine', delay = 0) {
  if (_muted) return;
  const a = ac();
  if (!a) return;
  try {
    const o = a.createOscillator();
    const g = a.createGain();
    o.connect(g);
    g.connect(a.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime + delay);
    g.gain.setValueAtTime(0, a.currentTime + delay);
    g.gain.linearRampToValueAtTime(vol, a.currentTime + delay + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + delay + Math.max(dur, 0.01));
    o.start(a.currentTime + delay);
    o.stop(a.currentTime + delay + Math.max(dur, 0.01) + 0.02);
  } catch {}
}

// Resume suspended context on first user gesture
export function ensureAudio() {
  const a = ac();
  if (a && a.state === 'suspended') a.resume().catch(() => {});
}

export function sfxShoot(shape) {
  if (shape === 'spear')  { tone(880, 0.04, 0.07, 'sawtooth'); return; }
  if (shape === 'rock')   { tone(100, 0.07, 0.13, 'square');   return; }
  if (shape === 'stun')   { tone(660, 0.05, 0.08, 'sine'); tone(880, 0.05, 0.05, 'sine', 0.025); return; }
  if (shape === 'arrow')  { tone(440, 0.03, 0.06, 'sawtooth'); return; }
  tone(600, 0.04, 0.07, 'sine');
}

export function sfxNova() {
  tone(300, 0.12, 0.10, 'sine');
  tone(480, 0.08, 0.06, 'sine', 0.04);
}

export function sfxDie(isBoss = false) {
  if (isBoss) {
    tone(440, 0.10, 0.22, 'sawtooth');
    tone(330, 0.14, 0.18, 'sawtooth', 0.06);
    tone(220, 0.20, 0.16, 'square', 0.13);
    tone(880, 0.07, 0.20, 'sine', 0);
  } else {
    tone(160, 0.06, 0.09, 'square');
  }
}

export function sfxWaveClear() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 0.09, 'sine', i * 0.10));
}

export function sfxPlace(isWall) {
  if (isWall) { tone(160, 0.07, 0.13, 'square'); }
  else        { tone(220, 0.06, 0.10, 'square'); tone(330, 0.04, 0.07, 'square', 0.04); }
}

export function sfxLifeLost() {
  tone(220, 0.10, 0.20, 'sawtooth');
  tone(165, 0.14, 0.16, 'sawtooth', 0.08);
}

export function sfxHeal() {
  tone(660, 0.06, 0.07, 'sine');
  tone(880, 0.06, 0.05, 'sine', 0.05);
}

export function sfxUpgrade() {
  [440, 550, 660].forEach((f, i) => tone(f, 0.07, 0.09, 'sine', i * 0.06));
}

export function sfxBossPhase() {
  tone(110, 0.22, 0.22, 'sawtooth');
  tone(165, 0.18, 0.18, 'square', 0.05);
}

export function sfxRune() {
  [880, 1100, 1320].forEach((f, i) => tone(f, 0.10, 0.09, 'sine', i * 0.06));
}

export function sfxSell() {
  tone(330, 0.04, 0.09, 'sine');
  tone(220, 0.06, 0.07, 'sine', 0.03);
}
