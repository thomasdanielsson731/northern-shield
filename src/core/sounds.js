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
  const j = () => 0.88 + Math.random() * 0.24;  // wider pitch spread (±12%)
  if (shape === 'spear')  {
    tone(880 * j(), 0.04, 0.07, 'sawtooth');
    if (Math.random() < 0.3) tone(660 * j(), 0.03, 0.04, 'sine', 0.01); // occasional harmonic
    return;
  }
  if (shape === 'rock')   { tone(100 * j(), 0.07, 0.13, 'square'); return; }
  if (shape === 'stun')   { tone(660 * j(), 0.05, 0.08, 'sine'); tone(880 * j(), 0.05, 0.05, 'sine', 0.025); return; }
  if (shape === 'arrow')  {
    // Pitch from 380-520 Hz to sound like different arrows
    const base = 380 + Math.random() * 140;
    tone(base, 0.03, 0.055, 'sawtooth');
    return;
  }
  tone(600 * j(), 0.04, 0.07, 'sine');
}

export function sfxNova() {
  tone(300, 0.12, 0.10, 'sine');
  tone(480, 0.08, 0.06, 'sine', 0.04);
}

export function sfxDie(isBoss = false) {
  if (isBoss) {
    tone(220, 0.12, 0.22, 'sawtooth');
    tone(165, 0.16, 0.18, 'sawtooth', 0.06);
    tone(110, 0.24, 0.16, 'square', 0.14);
    tone(440, 0.08, 0.16, 'sine', 0);
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

export function sfxUpgrade(towerType = '') {
  if (towerType === 'berserk') {
    [330, 440, 550].forEach((f, i) => tone(f, 0.07, 0.11, 'sawtooth', i * 0.06));
  } else if (towerType === 'valkyrie') {
    [523, 659, 784].forEach((f, i) => tone(f, 0.09, 0.09, 'sine', i * 0.07));
  } else if (towerType === 'isjatten') {
    [440, 523, 660].forEach((f, i) => tone(f, 0.08, 0.09, 'sine', i * 0.06));
    tone(220, 0.12, 0.06, 'sine', 0.20);
  } else {
    [440, 550, 660].forEach((f, i) => tone(f, 0.07, 0.09, 'sine', i * 0.06));
  }
}

export function sfxBossPhase() {
  tone(110, 0.22, 0.22, 'sawtooth');
  tone(165, 0.18, 0.18, 'square', 0.05);
}

export function sfxRune() {
  [880, 1100, 1320].forEach((f, i) => tone(f, 0.10, 0.09, 'sine', i * 0.06));
}

export function sfxSell() {
  tone(220, 0.04, 0.07, 'sine');
  tone(330, 0.06, 0.09, 'sine', 0.03);
}

export function sfxSplash() {
  tone(120, 0.09, 0.15, 'square');
  tone(80,  0.14, 0.12, 'sine', 0.03);
  tone(200, 0.06, 0.08, 'sawtooth', 0.06);
}

export function sfxGameOver() {
  [440, 330, 220, 165, 110].forEach((f, i) => tone(f, 0.22, 0.14, 'sawtooth', i * 0.18));
  tone(80, 0.4, 0.10, 'square', 0.6);
}

export function sfxWaveStart() {
  tone(220, 0.12, 0.10, 'sine');
  tone(330, 0.10, 0.08, 'sine', 0.08);
  tone(440, 0.08, 0.07, 'sawtooth', 0.15);
}

export function sfxChainKill() {
  tone(660, 0.06, 0.14, 'sine');
  tone(880, 0.06, 0.12, 'sine', 0.05);
  tone(1100, 0.08, 0.11, 'sine', 0.10);
  tone(1320, 0.10, 0.10, 'sawtooth', 0.16);
}

export function sfxEmp() {
  tone(80,  0.25, 0.14, 'square');
  tone(160, 0.18, 0.10, 'sawtooth', 0.05);
  tone(55,  0.35, 0.08, 'sine',     0.12);
}