import { ctx, canvas } from './renderer.js';
import { Grid, CELL } from '../grid/grid.js';
import { Enemy, ENEMY_TYPES, ENEMY_DEFS } from '../entities/enemy.js';
import { Tower, TOWER_DEFS, TOWER_TYPES } from '../entities/tower.js';
import { SPRITES } from '../assets.js';
import {
  ensureAudio, setMuted, sfxShoot, sfxNova, sfxDie, sfxWaveClear,
  sfxPlace, sfxLifeLost, sfxHeal, sfxUpgrade, sfxBossPhase,
  sfxRune, sfxSell, sfxSplash, sfxChainKill, sfxEmp, sfxWaveStart, sfxGameOver
} from './sounds.js';

const COLS = 36;
const ROWS = 22;
const CELL_SIZE = 14;

const RIGHT_PANEL_W  = 188;
const FRAME_THICK    = 32;   // must match thick inside drawFrames()
const GRID_LEFT      = FRAME_THICK;
const GRID_TOP       = 64;
const GRID_BOTTOM    = GRID_TOP + ROWS * CELL_SIZE;

const SPAWN = { col: 0,        row: 11 };
const GOAL  = { col: COLS - 1, row: 11 };

const WALL_COST = 8;

const BUILD_BTN = { x: GRID_LEFT, w: 110, h: 62, gap: 4 };

// Natural game dimensions at CELL_SIZE=14 — used to derive the scale factor
const BASE_W = FRAME_THICK + COLS * CELL_SIZE + RIGHT_PANEL_W;
const BASE_H = GRID_TOP  + ROWS * CELL_SIZE + BUILD_BTN.h + 56;

let gameScale     = 1;
let panX          = 0;
let panY          = 0;
let gridZoom      = 1.0;
let gridPanX      = 0;
let gridPanY      = 0;
let isPanning         = false;
let panStartX         = 0, panStartY     = 0;
let panStartOffX      = 0, panStartOffY  = 0;
let rightClickDragged = false;
let rightClickSaved   = null;

const BUILD_ITEMS = [
  { id: 'wall', label: 'Shield Wall', key: '1', color: '#b4d2f0', cost: WALL_COST, mode: CELL.WALL, category: 'walls' },
  ...Object.values(TOWER_TYPES).map(type => ({
    id:       type,
    label:    TOWER_DEFS[type].label,
    key:      TOWER_DEFS[type].key,
    color:    TOWER_DEFS[type].color,
    cost:     TOWER_DEFS[type].cost,
    mode:     CELL.TOWER,
    category: (['berserk', 'valkyrie', 'military'].includes(type)) ? 'warriors'
             : (['catapult', 'drakship', 'piltorn'].includes(type)) ? 'siege'
             : (['blondie', 'hydda', 'isjatten'].includes(type))    ? 'mystic'
             : 'warriors',
  }))
];

const STARTING_GOLD  = 80;
let   STARTING_LIVES = 8;

const grid = new Grid(COLS, ROWS, CELL_SIZE);
grid.setCell(SPAWN.col, SPAWN.row, CELL.SPAWN);
grid.setCell(GOAL.col,  GOAL.row,  CELL.GOAL);

let currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
let enemies  = [];
let towers   = [];
let bullets  = [];
let gold     = STARTING_GOLD;
let lives    = STARTING_LIVES;
let slain    = 0;
let buildMode         = CELL.TOWER;
let selectedTowerType = TOWER_TYPES.BERSERK;
let gameOver = false;

let selectedTower   = null;
let panelUpgradeBtn = null;
let panelSellBtn    = null;
let restartBtn      = null;
let toplistBtn      = null;
let nextWaveBtn     = null;
let runeForgeBtn    = null;
let gameSpeed  = 1;
let speedBtns  = [];   // [{x,y,w,h,speed}, ...]
let _frameTick = 0;

let dragItem    = null;  // { id, label, color, cost, mode } while dragging from build bar
let pendingSell = null;  // { col, row, timer } — tower awaiting sell confirmation
let dragX     = 0;
let dragY     = 0;
let hoverCol  = -1;
let hoverRow  = -1;

let goldCoins  = [];   // flying coin particles: { sx, sy, t, speed }
let hoardPulse = 0;    // frames of bounce animation when coin lands
// Gold hoard target = trelleborg center (GOAL cell, in screen space — updated by initGame)
let hoardX   = GRID_LEFT + GOAL.col * CELL_SIZE + CELL_SIZE / 2;
let hoardY   = GRID_TOP  + GOAL.row * CELL_SIZE + CELL_SIZE / 2;

let bossWarnAlpha    = 0;   // 0-1 fade for boss warning banner
let portalFlash      = 0;   // frames of portal flash on spawn
let portalFlashColor = 'red'; // 'red' for boss, 'blue' for regular Jötunn
let bossDefeatTimer  = 0;   // frames to show boss defeat announcement
let bossDefeatText   = '';  // e.g. "DRAUGEN-JARL DEFEATED"
let bossDefeatGold   = 0;   // gold earned from boss kill

let splashRings       = [];  // catapult impact rings: { x, y, r, maxR, life, maxLife }
let empRings          = [];  // Mara EMP rings: { x, y, r, life, maxLife }
let impactFlashes     = [];  // hit impact bursts: { x, y, maxR, life, color }
let novaRings         = [];  // Isjätte nova rings: { x, y, r, maxR, life, maxLife }
let fortressHeldTimer = 0;   // countdown for FORTRESS HELD display (frames)
let wallFrostCells    = [];  // cached cells adjacent to walls: [{ x, y, cs }]
let wallFrostDirty    = true;

// Playtest UX
let firstTowerPlaced  = false;  // hides build-bar arrow after first placement
let firstKillDone     = false;  // triggers enhanced coin arc on first kill
let mylingWarningTimer = 0;     // frames remaining for first-Myling warning banner
let maraEmpWarningTimer = 0;   // frames remaining for first-Mara EMP warning banner
let chainKillDone     = false;  // one-shot CHAIN KILL! text (catapult 3+)
let chainKillDisplay  = null;   // { x, y, life, maxLife, count }
let lifeLostTimer     = 0;      // frames for LIFE LOST text near hoard
let pathChevronsTimer = 0;      // countdown for wave-1 path direction chevrons
let bestWave          = { wave: 0, slain: 0, gold: 0 };  // best single-wave record
let waveSlainCount    = 0;      // enemies killed this wave (for best-wave tracking)
let waveGoldStart     = 0;      // goldEarned at wave start (delta = wave earnings)

// Stars & Rune system
let stars           = 0;        // earned in current run (flawless waves + boss kills)
let runeInventory   = { ironEdge: 0, swiftStrike: 0, frostRune: 0, battleHymn: 0, valhalla: 0 };
let showRuneMenu    = false;    // Rune Forge overlay (buy runes)
let runeMenuBtns    = [];       // hit areas for rune buy buttons
let showRunePicker  = false;    // per-tower rune equip overlay
let runePickerTower = null;     // tower currently being outfitted
let runePickerBtns  = [];       // hit areas in rune picker
let panelRuneBtn    = null;     // hit area for equip-rune button in tower panel

// Endless mode
let endlessMode     = false;    // true once wave 100 beaten — game continues past MAX_WAVES
let endlessBanner   = 0;        // countdown for "ENDLESS MODE" banner (frames)

// Player controls
let isPaused        = false;
let isMuted         = false;
let autoNextWave    = false;
let showGrid        = true;     // G key toggles grid cell lines

// Floating kill-gold numbers
let dmgFloaters     = [];       // { x, y, val, life, maxLife, color }

// Agent-pass improvements
let poorWaveStreak     = 0;       // consecutive waves player started with <15g
let chapterBannerTimer = 0;       // frames to show chapter milestone banner
let chapterBannerText  = '';      // text to display in chapter banner
let currentWaveEvent   = null;    // wave event applied this wave (from WAVE_EVENTS)
let affordFlashTimer   = 0;       // frames of build-bar flash when can't afford anything
let preBossPortalTimer = 0;       // accumulates during countdown/break before boss wave
let bossRings          = [];      // { x, y, r, maxR, life, maxLife, color } boss phase rings
let pathCanvas         = null;    // offscreen canvas caching the static stone road
let pathDirty          = true;    // true when path changed — triggers re-bake
let _pathPts           = [];      // cached world-space polyline (rebuilt when pathDirty)
let _pathSegs          = [];      // cached segment data (rebuilt when pathDirty)
let _pathCorners       = [];      // cached corner data for torches (rebuilt when pathDirty)
let _pathTotalLen      = 0;
let towerTargetLines   = [];      // { x0, y0, x1, y1, life, maxLife } targeting lines

// Wave timing
let waveStartTick   = 0;        // performance.now() when wave went active
let lastWaveTimeSec = 0;        // seconds the previous wave took to clear

// Flawless notification
let flawlessTimer   = 0;        // countdown for "+1 ★ FLAWLESS!" text (frames)

// Map selection
let gamePhase        = 'mapSelect';  // 'mapSelect' | 'playing'
let selectedMapIdx   = 0;
let mapSelectBtns    = [];       // hit areas for map cards
let mapAutoTimerStart = 0;       // performance.now() when auto-start countdown began
const MAP_AUTO_DELAY  = 10000;   // ms before auto-launching selected map

const ABILITY_LABELS = {
  wall:     'ADJ SLOW',
  berserk:  'MELEE',
  valkyrie: 'SNIPER',
  military: 'RAPID',
  catapult: 'SPLASH',
  blondie:  '60% SLOW',
  piltorn:  'PIERCE',
  hydda:    'HEAL LIFE',
  isjatten: 'NOVA',
  drakship: 'VOLLEY',
};

const PRESET_MAPS = [
  { name: 'MIDGARD',        desc: 'Classic fortress',   spawn: {col:0,  row:11}, goal: {col:35, row:11} },
  { name: 'BIFROST PASS',   desc: 'Off-center lanes',   spawn: {col:0,  row:5},  goal: {col:35, row:16} },
  { name: "NIDHOGG'S RUN",  desc: 'Corner crossing',    spawn: {col:0,  row:1},  goal: {col:35, row:20} },
];

const RUNE_DEFS = [
  { id: 'ironEdge',    label: 'IRON EDGE',    symbol: '⚔', desc: '+25% dmg on 1 tower',    cost: 3, maxOwned: 3, color: '#e85040' },
  { id: 'swiftStrike', label: 'SWIFT STRIKE', symbol: '⚡', desc: '−15% fire cooldown',     cost: 4, maxOwned: 2, color: '#88aaee' },
  { id: 'frostRune',   label: 'FROST RUNE',   symbol: '❄', desc: 'Adds/boosts slow on hit', cost: 2, maxOwned: 3, color: '#60c8f0' },
  { id: 'battleHymn',  label: 'BATTLE HYMN',  symbol: '◎', desc: '+30% range',              cost: 3, maxOwned: 1, color: '#c87840' },
  { id: 'valhalla',    label: 'VALHALLA',      symbol: '♥', desc: '+50% kill gold',          cost: 5, maxOwned: 2, color: '#f0c840' },
];

// Stars required to unlock tower (in current run)
const TOWER_STAR_GATES = {
  isjatten: 5,
  drakship: 3,
};

// Special wave modifiers shown in advance and applied on wave start
const WAVE_EVENTS = {
  15: { id: 'frostWind',    label: '❄ FROST WIND',    desc: 'All enemies 25% slower',     speedMult: 0.75 },
  18: { id: 'undeadMarch',  label: '☠ UNDEAD MARCH',  desc: '+12 Draugr to wave',         bonus: { type: 'draugr', count: 12 } },
  22: { id: 'nightRaid',    label: '🌑 NIGHT RAID',    desc: '+20% enemy HP',               hpMult: 1.20 },
  30: { id: 'berserkerRage',label: '⚔ BERSERKER RAGE',desc: '+30% enemy speed',           speedMult: 1.30 },
  35: { id: 'swarmWave',    label: '⚡ SWARM',          desc: '+10 Myling to wave',         bonus: { type: 'myling', count: 10 } },
  40: { id: 'ironHide',     label: '⚔ IRON HIDE',     desc: '+30% HP, −15% speed',        hpMult: 1.30, speedMult: 0.85 },
  48: { id: 'wraithHunt',   label: '👁 WRAITH HUNT',   desc: 'Extra Myling pack +8',       bonus: { type: 'myling', count: 8 } },
  60: { id: 'frostStorm',   label: '❄ FROST STORM',   desc: '+30% HP, 20% slower',        hpMult: 1.30, speedMult: 0.80 },
  65: { id: 'blitz',        label: '⚡ BLITZ',          desc: '+40% speed',                 speedMult: 1.40 },
  80: { id: 'darkHarvest',  label: '☠ DARK HARVEST',  desc: '+40% HP, +4 Jötunn',         hpMult: 1.40, bonus: { type: 'jotunn', count: 4 } },
  90: { id: 'ragnarok',     label: '⚔ FÖRSPELET',     desc: '+50% HP, +40% speed',        hpMult: 1.50, speedMult: 1.40 },
};

// ── achievements ──────────────────────────────────────────────────────────────

const ACH_KEY = 'northern-shield-ach';
const ACH_DEFS = {
  firstBoss:  { icon: '☠', title: 'CHIEFTAIN',    desc: 'First boss slain' },
  wave25:     { icon: '⚔', title: 'IRON WALL',    desc: 'Survived to wave 25' },
  wave50:     { icon: '🛡', title: 'BULWARK',      desc: 'Survived to wave 50' },
  wave100:    { icon: '⭐', title: 'SHIELD ETERNAL', desc: 'Cleared all 100 waves' },
  flawless5:  { icon: '★', title: 'GHOST WALKER', desc: '5 flawless waves in one run' },
};
let _earnedAch = new Set();
try { _earnedAch = new Set(JSON.parse(localStorage.getItem(ACH_KEY)) || []); } catch {}
let _achToasts  = [];  // { id, timer } — queue of toasts to display
let flawlessCount = 0; // flawless waves earned this run (reset on restart)

function unlockAchievement(id) {
  if (_earnedAch.has(id)) return;
  _earnedAch.add(id);
  try { localStorage.setItem(ACH_KEY, JSON.stringify([..._earnedAch])); } catch {}
  _achToasts.push({ id, timer: 200 });
}

function drawAchievementToasts() {
  if (_achToasts.length === 0) return;
  const toast = _achToasts[0];
  toast.timer--;
  if (toast.timer <= 0) { _achToasts.shift(); return; }
  const def   = ACH_DEFS[toast.id];
  if (!def) return;
  const alpha = toast.timer > 30 ? Math.min(1, (200 - toast.timer) / 20) : toast.timer / 30;
  const tw = 200, th = 44;
  const tx = BASE_W / 2 - tw / 2;
  const ty = GRID_TOP + 55;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = 'rgba(4,12,4,0.97)';
  ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(120,200,80,0.70)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.stroke();
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 10px monospace';
  ctx.fillStyle   = '#60ee80';
  ctx.shadowColor = 'rgba(80,220,80,0.8)'; ctx.shadowBlur = 8;
  ctx.fillText(`${def.icon} ACHIEVEMENT UNLOCKED`, tx + tw / 2, ty + 14);
  ctx.shadowBlur = 0;
  ctx.font        = 'bold 13px monospace';
  ctx.fillStyle   = '#f0e8c0';
  ctx.fillText(def.title, tx + tw / 2, ty + 30);
  ctx.font        = '9px monospace';
  ctx.fillStyle   = 'rgba(180,160,110,0.75)';
  ctx.fillText(def.desc, tx + tw / 2, ty + 42);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── high-score table ──────────────────────────────────────────────────────────

const HS_KEY    = 'northern-shield-hs';
const HS_MAX    = 8;

function loadHighScores() {
  try { return JSON.parse(localStorage.getItem(HS_KEY)) || []; } catch { return []; }
}

function saveHighScore(score) {
  const list = loadHighScores();
  list.push(score);
  list.sort((a, b) => b.waves - a.waves || b.slain - a.slain);
  const trimmed = list.slice(0, HS_MAX);
  try { localStorage.setItem(HS_KEY, JSON.stringify(trimmed)); } catch {}
  return trimmed;
}

let highScores    = loadHighScores();
let showTopList   = false;
let _pendingScore = null;  // score awaiting player name entry

// ── per-map best scores ────────────────────────────────────────────────────────
const MAP_BEST_KEY = 'northern-shield-map-best';
let _mapBests = {};
try { _mapBests = JSON.parse(localStorage.getItem(MAP_BEST_KEY)) || {}; } catch {}
let _currentMapName = '';

function saveMapBest(mapName, waves, slain) {
  const prev = _mapBests[mapName];
  if (!prev || waves > prev.waves || (waves === prev.waves && slain > prev.slain)) {
    _mapBests[mapName] = { waves, slain };
    try { localStorage.setItem(MAP_BEST_KEY, JSON.stringify(_mapBests)); } catch {}
  }
}

function promptNameAndSave(scoreData) {
  const overlay = document.getElementById('nameEntryOverlay');
  const input   = document.getElementById('nameEntryInput');
  if (!overlay || !input) {
    highScores = saveHighScore({ ...scoreData, name: 'Anonymous' });
    return;
  }
  _pendingScore = scoreData;
  input.value = '';
  overlay.style.display = 'block';
  setTimeout(() => input.focus(), 50);
  const onKey = (e) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      input.removeEventListener('keydown', onKey);
      overlay.style.display = 'none';
      const name = input.value.trim().slice(0, 16) || 'Anonymous';
      highScores = saveHighScore({ ..._pendingScore, name });
      if (_currentMapName && _pendingScore) saveMapBest(_currentMapName, _pendingScore.waves, _pendingScore.slain);
      _pendingScore = null;
    }
  };
  input.addEventListener('keydown', onKey);
}

// ── restart ───────────────────────────────────────────────────────────────────

function restartGame() {
  grid.cells = Array.from({ length: ROWS }, () => new Array(COLS).fill(CELL.EMPTY));
  grid.setCell(SPAWN.col, SPAWN.row, CELL.SPAWN);
  grid.setCell(GOAL.col,  GOAL.row,  CELL.GOAL);

  currentPath   = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
  enemies       = [];
  towers        = [];
  bullets       = [];
  particles     = [];
  gold          = STARTING_GOLD;
  lives         = STARTING_LIVES;
  slain         = 0;
  gameOver      = false;
  victory       = false;
  waveLeak      = false;
  selectedTower = null;
  screenShake   = 0;
  goldSpent     = 0;
  goldEarned    = 0;
  showTopList   = false;
  highScores    = loadHighScores();
  gameSpeed     = 1;
  _frameTick    = 0;
  goldCoins     = [];
  hoardPulse    = 0;
  bossWarnAlpha    = 0;
  portalFlash      = 0;
  portalFlashColor = 'red';
  bossDefeatTimer  = 0;
  bossDefeatText   = '';
  bossDefeatGold   = 0;

  splashRings       = [];
  empRings          = [];
  novaRings         = [];
  fortressHeldTimer = 0;
  wallFrostCells    = [];
  wallFrostDirty    = true;

  firstTowerPlaced  = false;
  firstKillDone     = false;
  mylingWarningTimer  = 0;
  maraEmpWarningTimer = 0;
  dragItem           = null;
  pendingSell       = null;
  gridZoom          = 1.0;
  gridPanX          = 0;
  gridPanY          = 0;
  isPanning         = false;
  rightClickDragged = false;
  rightClickSaved   = null;
  chainKillDone     = false;
  chainKillDisplay  = null;
  lifeLostTimer     = 0;
  pathChevronsTimer = 300;
  pathBlockFlash    = null;
  bestWave          = { wave: 0, slain: 0, gold: 0 };
  waveSlainCount    = 0;
  waveGoldStart     = goldEarned;

  stars             = 0;
  flawlessCount     = 0;
  runeInventory     = { ironEdge: 0, swiftStrike: 0, frostRune: 0, battleHymn: 0, valhalla: 0 };
  showRuneMenu      = false;
  showRunePicker    = false;
  runePickerTower   = null;
  showRuneMenu      = false;
  endlessMode       = false;
  endlessBanner     = 0;
  STARTING_LIVES    = 8;
  isPaused          = false;
  autoNextWave      = false;
  dmgFloaters       = [];
  waveStartTick     = 0;

  poorWaveStreak     = 0;
  chapterBannerTimer = 0;
  chapterBannerText  = '';
  currentWaveEvent   = null;
  affordFlashTimer   = 0;
  preBossPortalTimer = 0;
  bossRings          = [];
  pathDirty          = true;
  towerTargetLines   = [];
  lastWaveTimeSec   = 0;
  flawlessTimer     = 0;

  waveNumber       = 0;
  waveTotal        = 0;
  waveState        = 'countdown';
  waveTimer        = 0;
  spawnQueue       = [];
  spawnTimer       = 0;
  waveHpScale      = 1;
  waveSpeedScale   = 1;
  waveActiveFrames = 0;
}

// Start game with chosen preset map (called from map select screen)
function initGame(preset) {
  SPAWN.col = preset.spawn.col;
  SPAWN.row = preset.spawn.row;
  GOAL.col  = preset.goal.col;
  GOAL.row  = preset.goal.row;
  hoardX    = GRID_LEFT + GOAL.col * CELL_SIZE + CELL_SIZE / 2;
  hoardY    = GRID_TOP  + GOAL.row * CELL_SIZE + CELL_SIZE / 2;
  _currentMapName = preset.name ?? '';
  gamePhase = 'playing';
  restartGame();
}

// Count how many of a given rune type are currently equipped on towers
function runeEquippedCount(id)   { return towers.filter(t => t.rune === id).length; }
function runeUnequippedCount(id) { return Math.max(0, (runeInventory[id] ?? 0) - runeEquippedCount(id)); }

// Find tower that owns a given grid cell (handles multi-cell footprint)
function getTowerAtCell(col, row) {
  return towers.find(t => {
    const fp = t.footprint;
    return col >= t.col && col < t.col + fp.w && row >= t.row && row < t.row + fp.h;
  });
}

// Remove tower: clear all footprint cells, reroute, recalc path
function removeTower(tower) {
  if (tower.rune) runeInventory[tower.rune] = (runeInventory[tower.rune] ?? 0) + 1;
  const fp = tower.footprint;
  for (let dc = 0; dc < fp.w; dc++) {
    for (let dr = 0; dr < fp.h; dr++) {
      grid.setCell(tower.col + dc, tower.row + dr, CELL.EMPTY);
    }
  }
  towers      = towers.filter(t => t !== tower);
  currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row) ?? currentPath;
  pathDirty   = true;
  rerouteActiveEnemies();
  wallFrostDirty = true;
}

// ── wave system ───────────────────────────────────────────────────────────────

const COUNTDOWN_FRAMES  = 300;
const BREAK_FRAMES      = 150;
const SPAWN_FRAMES      = 24;
const EMP_RANGE         = 50;
const EMP_DISABLE_FRAMES = 150;
const MAX_WAVES          = 100;

const BOSS_WAVES = new Set([10, 25, 50, 75, 100]);

const BOSS_CONFIGS = {
  10:  { name: 'DRAUGEN-JARL',     type: ENEMY_TYPES.JOTUNN, hp: 1200,  radius: 18, speedMult: 0.85, reward: 80,  phase75: true,  phase50SlowImmune: true  },
  25:  { name: 'JÖTUNHELM WALKER', type: ENEMY_TYPES.JOTUNN, hp: 3600,  radius: 22, speedMult: 0.60, reward: 150, phase75: false, phase50SlowImmune: false },
  50:  { name: 'MARA-VOID',        type: ENEMY_TYPES.MARA,   hp: 9500,  radius: 16, speedMult: 1.10, reward: 250, phase75: false, phase50SlowImmune: false },
  75:  { name: 'FENRIR',           type: ENEMY_TYPES.JOTUNN, hp: 32000, radius: 26, speedMult: 1.35, reward: 500, phase75: true,  phase50SlowImmune: true  },
  100: { name: 'SURTR',            type: ENEMY_TYPES.JOTUNN, hp: 90000, radius: 32, speedMult: 0.75, reward: 1000,phase75: true,  phase50SlowImmune: true  },
};

let waveNumber      = 0;
let waveTotal       = 0;
let waveState       = 'countdown';  // 'countdown' | 'active' | 'break'
let waveTimer       = 0;
let spawnQueue      = [];
let spawnTimer      = 0;
let waveHpScale     = 1;
let waveSpeedScale  = 1;
let waveActiveFrames = 0;

function getWaveBands(waveNum) {
  const n = Math.min(Math.max(waveNum, 1), 100);
  let hp, speed;
  if (n <= 25) {
    const t = (n - 1) / 24;
    hp    = 1.0 + t * 1.2;   // 1.0 → 2.2  (ch1: gentle learning)
    speed = 1.0 + t * 0.15;  // 1.0 → 1.15
  } else if (n <= 50) {
    const t = (n - 25) / 25;
    hp    = 2.2 + t * 1.3;   // 2.2 → 3.5  (ch2: pressure, adaptation)
    speed = 1.15 + t * 0.20; // 1.15 → 1.35
  } else if (n <= 75) {
    const t = (n - 50) / 25;
    hp    = 3.5 + t * 1.5;   // 3.5 → 5.0  (ch3: mastery tax — steeper wall)
    speed = 1.35 + t * 0.20; // 1.35 → 1.55
  } else {
    const t = (n - 75) / 25;
    hp    = 4.5 + t * 1.5;   // 4.5 → 6.0  (ch4: endgame cliff)
    speed = 1.55 + t * 0.30; // 1.55 → 1.85
  }
  if (waveNum <= 100) return { hp, speed };
  const over = waveNum - 100;
  return { hp: 6.0 * (1 + over * 0.06), speed: Math.min(1.85 + over * 0.01, 2.60) };
}

let particles     = [];
let screenShake   = 0;
let goldSpent     = 0;
let goldEarned    = 0;

// Cached background gradients — rebuilt only when canvas size changes
let _bgGradCache = null, _bgG1Cache = null, _bgG2Cache = null;
let _bgCacheW    = 0,    _bgCacheH  = 0;
let _hoardGradCache = null, _hoardGradR = -1;
let _vigGradCache   = null, _vigCacheW  = 0, _vigCacheH = 0;

// Path-blocked feedback flash: { col, row, timer }
let pathBlockFlash = null;

function spawnParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const speed = 1.2 + Math.random() * 2.8;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      life: 1,
      decay: 0.042 + Math.random() * 0.022,
      radius: 1.5 + Math.random() * 2.5,
      color
    });
  }
}

function spawnGoldCoins(screenX, screenY, reward, overrideSpeed) {
  const n = reward >= 20 ? 3 : reward >= 8 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    goldCoins.push({
      sx:    screenX + (Math.random() - 0.5) * 10,
      sy:    screenY + (Math.random() - 0.5) * 10,
      t:     0,
      speed: overrideSpeed ?? (0.028 + Math.random() * 0.018),
    });
  }
  // Scale hoard pulse by gold reward amount
  const pulseMag = reward >= 20 ? 28 : reward >= 10 ? 18 : reward >= 5 ? 10 : 5;
  hoardPulse = Math.max(hoardPulse, pulseMag);
}

function updateParticles() {
  let i = particles.length;
  while (i--) {
    const p = particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.06;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life -= p.decay;
    if (p.life <= 0) {
      particles[i] = particles[particles.length - 1];
      particles.length--;
    }
  }
}

function drawParticles() {
  if (particles.length === 0) return;
  ctx.shadowBlur = 5;
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 1;
}

function drawImpactFlashes() {
  if (impactFlashes.length === 0) return;
  for (const f of impactFlashes) {
    const progress = 1 - f.life;
    const alpha    = f.life * f.life;
    ctx.shadowColor = f.color;
    ctx.shadowBlur  = 10;
    // Expanding ring
    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = f.color;
    ctx.lineWidth   = 2.5 * f.life;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.maxR * progress, 0, Math.PI * 2);
    ctx.stroke();
    // Bright core flash (first half of life only)
    if (f.life > 0.5) {
      ctx.globalAlpha = (f.life - 0.5) * 2 * 0.7;
      ctx.fillStyle   = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.maxR * 0.35 * f.life, 0, Math.PI * 2);
      ctx.fill();
    }
    f.life -= 0.15;
  }
  let _ifi = impactFlashes.length;
  while (_ifi--) {
    if (impactFlashes[_ifi].life <= 0) {
      impactFlashes[_ifi] = impactFlashes[impactFlashes.length - 1];
      impactFlashes.length--;
    }
  }
  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 1;
  ctx.lineWidth   = 1;
}

function drawGoldCoins() {
  for (const c of goldCoins) {
    const t  = c.t;
    // quadratic bezier: start → control point (arc apex) → hoard
    const dx = hoardX - c.sx, dy = hoardY - c.sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const mx = (c.sx + hoardX) / 2;
    const my = Math.min(c.sy, hoardY) - Math.min(120, dist * 0.30);
    const bx = (1-t)*(1-t)*c.sx + 2*(1-t)*t*mx + t*t*hoardX;
    const by = (1-t)*(1-t)*c.sy + 2*(1-t)*t*my + t*t*hoardY;
    const r  = Math.max(5.5 - t * 2.5, 2.5);
    ctx.save();
    ctx.globalAlpha = t > 0.90 ? (1 - t) / 0.10 : 1;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fillStyle   = '#f5d030';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,100,0.6)';
    ctx.lineWidth   = 0.7;
    ctx.stroke();
    ctx.restore();
  }
}

function waveComposition(num) {
  const n = Math.min(num, MAX_WAVES);
  // Draugr cap declines after wave 50 as elites take over in ch3-4
  const draugrCap = n <= 50 ? 55 : Math.max(55 - Math.floor((n - 50) * 0.7), 20);
  // Jötunn and Mara caps rise to 20 in ch4 (wave 75+) for elite-heavy endgame
  const eliteCap  = n >= 75 ? 20 : 12;
  return {
    draugr:  n <= 5 ? Math.min(8 + Math.floor(n * 2.5), 22) : Math.min(12 + Math.floor(n * 2.8), draugrCap),
    mylings: n >= 9  ? Math.min(Math.floor((n - 8) * 2.0), 32) : 0,
    jotunn:  n >= 11 ? Math.min(Math.floor((n - 10) * 1.1), eliteCap) : 0,
    maras:   n >= 22 ? Math.min(Math.floor((n - 21) * 0.8), eliteCap) : 0,
  };
}

function buildWave(num) {
  if (BOSS_WAVES.has(num)) {
    // Boss wave: herald squad themed per boss, then the boss enters last
    let heralds;
    if (num === 10)  heralds = [...Array(6).fill(ENEMY_TYPES.DRAUGR), ...Array(2).fill(ENEMY_TYPES.MYLING)];
    else if (num === 25) heralds = [...Array(8).fill(ENEMY_TYPES.DRAUGR), ...Array(2).fill(ENEMY_TYPES.JOTUNN)];
    else if (num === 50) heralds = [...Array(4).fill(ENEMY_TYPES.MARA), ...Array(2).fill(ENEMY_TYPES.MYLING)];
    else if (num === 75) heralds = [...Array(4).fill(ENEMY_TYPES.MYLING), ...Array(2).fill(ENEMY_TYPES.JOTUNN)];
    else               heralds = [...Array(3).fill(ENEMY_TYPES.JOTUNN),  ...Array(3).fill(ENEMY_TYPES.MARA)];
    for (let i = heralds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [heralds[i], heralds[j]] = [heralds[j], heralds[i]];
    }
    heralds.push({ __boss: true, waveNum: num });
    return heralds;
  }

  // Solo introductions — new enemy type appears alone so player can learn it
  if (num === 8)  return [...Array(2).fill(ENEMY_TYPES.MYLING)];
  if (num === 12) return [...Array(2).fill(ENEMY_TYPES.JOTUNN)];
  if (num === 21) return [ENEMY_TYPES.MARA, ENEMY_TYPES.MARA];

  // Rest waves — 2 easier waves after each boss (1st = very light, 2nd = moderate)
  if (num === 11 || num === 26 || num === 51 || num === 76 || num === 101) {
    const { draugr: rd, mylings: rm, jotunn: rj, maras: ra } = waveComposition(Math.min(num - 5, MAX_WAVES));
    const rest = [...Array(rd).fill(ENEMY_TYPES.DRAUGR), ...Array(rm).fill(ENEMY_TYPES.MYLING), ...Array(rj).fill(ENEMY_TYPES.JOTUNN), ...Array(ra).fill(ENEMY_TYPES.MARA)];
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    return rest;
  }
  if (num === 27 || num === 52 || num === 77) {
    const { draugr: rd, mylings: rm, jotunn: rj, maras: ra } = waveComposition(Math.min(num - 3, MAX_WAVES));
    const rest = [...Array(rd).fill(ENEMY_TYPES.DRAUGR), ...Array(rm).fill(ENEMY_TYPES.MYLING), ...Array(rj).fill(ENEMY_TYPES.JOTUNN), ...Array(ra).fill(ENEMY_TYPES.MARA)];
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    return rest;
  }

  const { draugr, mylings, jotunn, maras } = waveComposition(num);
  const queue = [
    ...Array(draugr).fill(ENEMY_TYPES.DRAUGR),
    ...Array(mylings).fill(ENEMY_TYPES.MYLING),
    ...Array(jotunn).fill(ENEMY_TYPES.JOTUNN),
    ...Array(maras).fill(ENEMY_TYPES.MARA),
  ];
  // Inject wave-event bonus enemies
  const ev = WAVE_EVENTS[num];
  if (ev?.bonus) {
    const bonusType = ENEMY_TYPES[ev.bonus.type.toUpperCase()] ?? ev.bonus.type;
    for (let i = 0; i < ev.bonus.count; i++) queue.push(bonusType);
  }
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

let victory   = false;
let waveLeak  = false;

function startNextWave() {
  waveNumber++;
  const _bands   = getWaveBands(waveNumber);
  waveHpScale    = _bands.hp;
  waveSpeedScale = _bands.speed;
  currentWaveEvent = WAVE_EVENTS[waveNumber] ?? null;
  if (currentWaveEvent) {
    if (currentWaveEvent.hpMult)    waveHpScale    = Math.round(waveHpScale    * currentWaveEvent.hpMult    * 100) / 100;
    if (currentWaveEvent.speedMult) waveSpeedScale = Math.round(waveSpeedScale * currentWaveEvent.speedMult * 100) / 100;
  }
  spawnQueue  = buildWave(waveNumber);
  waveTotal   = spawnQueue.length;
  spawnTimer  = 0;
  waveActiveFrames = 0;
  waveState   = 'active';
  chainKillDone  = false;
  waveSlainCount = 0;
  waveGoldStart  = goldEarned;
  waveStartTick  = performance.now();
  if (waveNumber === 1) pathChevronsTimer = Math.max(pathChevronsTimer, 480);
  screenShake = Math.max(screenShake, Math.min(14, 2 + Math.floor(waveNumber * 0.12)));

  // Economy emergency valve — track poor waves (started with <25g = can't buy even a wall)
  if (gold < 25) poorWaveStreak++; else poorWaveStreak = 0;

  // Chapter milestone banners
  if (waveNumber === 26) { chapterBannerTimer = 210; chapterBannerText = 'CHAPTER 2: THE CORRUPTED MARCH'; }
  if (waveNumber === 51) { chapterBannerTimer = 210; chapterBannerText = 'CHAPTER 3: THE IRON WINTER'; }
  if (waveNumber === 76) { chapterBannerTimer = 210; chapterBannerText = 'CHAPTER 4: RAGNARÖK'; }

  sfxWaveStart();
  spawnParticles(SPAWN.col * CELL_SIZE + CELL_SIZE / 2, SPAWN.row * CELL_SIZE + CELL_SIZE / 2, '#c89040', 12);
}

function updateWave() {
  if (gameOver) return;

  if (portalFlash > 0) portalFlash--;

  if (waveState === 'countdown' || waveState === 'break') {
    const nextIsBoss = BOSS_WAVES.has(waveNumber + 1);
    bossWarnAlpha = nextIsBoss
      ? Math.min(1, bossWarnAlpha + 0.025)
      : Math.max(0, bossWarnAlpha - 0.04);
    if (nextIsBoss) preBossPortalTimer++; else preBossPortalTimer = 0;
  } else {
    bossWarnAlpha = Math.max(0, bossWarnAlpha - 0.04);
    preBossPortalTimer = 0;
  }

  if (waveState === 'countdown') {
    waveTimer++;
    return;
  }

  if (waveState === 'break') {
    waveTimer++;
    return;
  }

  // active — spawn from queue (governor: speed up if wave drags past 180s)
  if (spawnQueue.length > 0) {
    waveActiveFrames++;
    spawnTimer++;
    const baseSpawnGap  = waveNumber <= 10 ? 16 : SPAWN_FRAMES;
    const spawnInterval = waveActiveFrames > 5400 * gameSpeed ? Math.ceil(baseSpawnGap * 0.5) : baseSpawnGap;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      const next = spawnQueue.shift();
      if (next && next.__boss) {
        spawnBoss(next.waveNum);
      } else {
        spawnEnemy(next, waveHpScale);
      }
    }
  } else if (enemies.length === 0) {
    // Wave-clear bonus — capped at 110g for wave 30+ to prevent economy inflation
    const rawBonus     = Math.min(20 + waveNumber * 3, 110);
    const flawlessBonus = waveLeak ? 0 : Math.min(4 + Math.floor(waveNumber * 0.8), 30);
    const clearBonus   = rawBonus + flawlessBonus;
    gold       += clearBonus;
    goldEarned += clearBonus;

    // Economy emergency valve: 2+ consecutive poor-start waves → +40% capped at 50g
    if (poorWaveStreak >= 2) {
      const emergency = Math.min(50, Math.ceil(clearBonus * 0.40));
      gold       += emergency;
      goldEarned += emergency;
      poorWaveStreak = 0;
      dmgFloaters.push({ x: hoardX - GRID_LEFT, y: hoardY - GRID_TOP - 48, val: `+${emergency}`, life: 100, maxLife: 100, color: '#80d8ff', large: false, suffix: 'g⚡' });
    }
    lastWaveTimeSec = waveStartTick > 0 ? Math.round((performance.now() - waveStartTick) / 1000) : 0;
    if (!waveLeak) {
      fortressHeldTimer = 200;
      flawlessTimer     = 180;
      hoardPulse = 60;
      stars++;   // 1 star for flawless wave
      flawlessCount++;
      if (flawlessCount >= 5) unlockAchievement('flawless5');
      screenShake = Math.max(screenShake, 6);  // exhale — gentle shake on wave-clear
      spawnParticles(hoardX - GRID_LEFT, hoardY - GRID_TOP, '#f5d030', 24);
      spawnParticles(SPAWN.col * CELL_SIZE + CELL_SIZE / 2, SPAWN.row * CELL_SIZE + CELL_SIZE / 2, '#a07830', 10);
      sfxWaveClear();
      dmgFloaters.push({ x: hoardX - GRID_LEFT, y: hoardY - GRID_TOP - 30, val: '1 ★', life: 100, maxLife: 100, color: '#f0d040', large: true, suffix: '' });
    } else {
      hoardPulse = 18;
    }
    // Hoard interest — flat 10g (avoids rich-get-richer feedback from percentage scaling)
    const interest = gold > 0 ? 10 : 0;
    if (interest > 0) {
      gold       += interest;
      goldEarned += interest;
    }
    // Track best wave
    const waveGoldDelta = goldEarned - waveGoldStart;
    if (waveSlainCount > bestWave.slain || (waveSlainCount === bestWave.slain && waveGoldDelta > bestWave.gold)) {
      bestWave = { wave: waveNumber, slain: waveSlainCount, gold: waveGoldDelta };
    }
    const waveGoldTotal = goldEarned - waveGoldStart;
    if (waveGoldTotal > 0) {
      const fx = hoardX - GRID_LEFT;
      const fy = GOAL.row * CELL_SIZE + CELL_SIZE / 2 - 54;
      dmgFloaters.push({ x: fx, y: fy, val: waveGoldTotal, life: 120, maxLife: 120, color: '#f5d030', large: true, suffix: 'g' });
    }
    waveLeak  = false;
    waveTimer = 0;

    // Wave milestone achievements
    if (waveNumber === 25)  unlockAchievement('wave25');
    if (waveNumber === 50)  unlockAchievement('wave50');
    if (waveNumber >= MAX_WAVES && !endlessMode) {
      unlockAchievement('wave100');
      // First time clearing wave 100: enter endless mode, save score, show banner
      endlessMode   = true;
      endlessBanner = 360;
      victory       = true;  // shows banner but game continues
      highScores    = saveHighScore({ waves: waveNumber, slain, goldEarned, cleared: true, date: new Date().toLocaleDateString('en-GB') });
      victory       = false; // don't stop the game
    }
    waveState = 'break';
  }
}

// ── starfield ─────────────────────────────────────────────────────────────────

const STARS = Array.from({ length: 120 }, () => ({
  x:     Math.random(),
  y:     Math.random(),
  r:     0.5 + Math.random() * 1.2,
  phase: Math.random() * Math.PI * 2
}));

// ── terrain canvas — static grass, generated once at startup ─────────────────

let terrainCanvas    = null;
let terrainUsesSprite = false;  // true once ground sprite has been baked in

function initTerrain() {
  terrainCanvas = document.createElement('canvas');
  terrainCanvas.width  = COLS * CELL_SIZE;
  terrainCanvas.height = ROWS * CELL_SIZE;
  const tc = terrainCanvas.getContext('2d');
  const cs = CELL_SIZE;
  const W  = COLS * cs;
  const H  = ROWS * cs;

  // Deterministic sequential RNG — consistent look every restart
  let _s = 0x9e3779b9;
  const rng = () => {
    _s ^= _s << 13; _s ^= _s >>> 7; _s ^= _s << 17;
    return (_s >>> 0) / 0xffffffff;
  };

  // ── Base layer — always procedural (AI ground sprites keep generating characters) ──
  {
    terrainUsesSprite = false;

    // Dark tundra base — slightly lighter for contrast headroom
    tc.fillStyle = '#182a10';
    tc.fillRect(0, 0, W, H);

    // Per-cell micro-variation — breaks up the flat base
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const v = rng();
        if (v < 0.18) {
          tc.fillStyle = `rgba(6,${Math.floor(30 + rng() * 18)},4,${0.25 + rng() * 0.2})`;
          tc.fillRect(col * cs, row * cs, cs, cs);
        } else if (v < 0.30) {
          tc.fillStyle = `rgba(${Math.floor(22 + rng() * 14)},${Math.floor(12 + rng() * 8)},4,${0.18 + rng() * 0.16})`;
          tc.fillRect(col * cs, row * cs, cs, cs);
        }
      }
    }

    // Large moss / earth patches — stronger colour, more visible
    for (let i = 0; i < 40; i++) {
      const px = rng() * W, py = rng() * H;
      const rx = cs * 1.5 + rng() * cs * 5.5;
      const ry = rx * (0.35 + rng() * 0.55);
      const isMoss = rng() < 0.62;
      const g = isMoss ? Math.floor(50 + rng() * 35) : Math.floor(28 + rng() * 20);
      const r = isMoss ? Math.floor(g * 0.28) : Math.floor(g * 0.58);
      const b = isMoss ? Math.floor(g * 0.22) : Math.floor(g * 0.20);
      tc.fillStyle = `rgba(${r},${g},${b},${0.42 + rng() * 0.38})`;
      tc.beginPath();
      tc.ellipse(px, py, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
      tc.fill();
    }

    // Soil patches — warm dark earth
    for (let i = 0; i < 20; i++) {
      const px = rng() * W, py = rng() * H;
      const rx = cs * 0.8 + rng() * cs * 2.8;
      const br = Math.floor(30 + rng() * 22);
      tc.fillStyle = `rgba(${br + 12},${Math.floor(br * 0.62)},${Math.floor(br * 0.28)},${0.48 + rng() * 0.36})`;
      tc.beginPath();
      tc.ellipse(px, py, rx, rx * (0.38 + rng() * 0.55), rng() * Math.PI, 0, Math.PI * 2);
      tc.fill();
    }

    // Dark water / mud puddles — adds contrast and Nordic mood
    for (let i = 0, n = 5 + Math.floor(rng() * 6); i < n; i++) {
      const px = rng() * W, py = rng() * H;
      const rx = cs * 0.8 + rng() * cs * 2.4;
      const ry = rx * (0.28 + rng() * 0.48);
      tc.fillStyle = `rgba(8,14,22,${0.62 + rng() * 0.28})`;
      tc.beginPath();
      tc.ellipse(px, py, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
      tc.fill();
      // Water surface shimmer
      tc.fillStyle = `rgba(70,130,195,${0.07 + rng() * 0.07})`;
      tc.beginPath();
      tc.ellipse(px - rx * 0.12, py - ry * 0.22, rx * 0.52, ry * 0.38, rng() * Math.PI, 0, Math.PI * 2);
      tc.fill();
    }

    // Grass clusters — thicker blades, taller, more contrast
    tc.lineCap = 'round';
    for (let ci = 0; ci < 58; ci++) {
      const gcx = rng() * W, gcy = rng() * H;
      const count = 4 + Math.floor(rng() * 9);
      const gr = Math.floor(55 + rng() * 42);
      for (let b = 0; b < count; b++) {
        const bx = gcx + (rng() - 0.5) * cs * 2.2;
        const by = gcy + (rng() - 0.5) * cs * 1.4;
        const h  = 3.5 + rng() * 4.5;
        const lean = (rng() - 0.5) * 5.5;
        tc.strokeStyle = `rgba(${Math.floor(gr * 0.32)},${gr},${Math.floor(gr * 0.14)},${0.72 + rng() * 0.28})`;
        tc.lineWidth   = 0.9 + rng() * 0.75;
        tc.beginPath();
        tc.moveTo(bx, by);
        tc.lineTo(bx + lean, by - h);
        tc.stroke();
        // Bright tip on some blades
        if (rng() < 0.42) {
          tc.strokeStyle = `rgba(${Math.min(255, gr + 85)},${Math.min(255, gr + 105)},${Math.floor(gr * 0.28)},0.5)`;
          tc.lineWidth  *= 0.45;
          tc.beginPath();
          tc.moveTo(bx + lean * 0.58, by - h * 0.58);
          tc.lineTo(bx + lean, by - h);
          tc.stroke();
          tc.lineWidth /= 0.45;
        }
      }
    }
    tc.lineCap = 'butt';
  }

  // ── Frost patches ─────────────────────────────────────────────────────────
  for (let i = 0, n = 10 + Math.floor(rng() * 8); i < n; i++) {
    const px = rng() * W, py = rng() * H;
    const rx = cs * 1.2 + rng() * cs * 4.5;
    const ry = rx * (0.28 + rng() * 0.45);
    const a  = rng() * Math.PI;
    const fg = tc.createRadialGradient(px, py, 0, px, py, rx);
    fg.addColorStop(0,   `rgba(200,225,255,${0.30 + rng() * 0.20})`);
    fg.addColorStop(0.55,`rgba(185,215,255,${0.12 + rng() * 0.10})`);
    fg.addColorStop(1,   'rgba(170,205,250,0)');
    tc.fillStyle = fg;
    tc.beginPath(); tc.ellipse(px, py, rx, ry, a, 0, Math.PI * 2); tc.fill();
    // Crystal arms at the edge
    tc.strokeStyle = `rgba(210,230,255,${0.55 + rng() * 0.30})`;
    tc.lineWidth   = 0.6;
    const nc = 5 + Math.floor(rng() * 6);
    for (let c = 0; c < nc; c++) {
      const ca  = rng() * Math.PI * 2;
      const cr  = rx * (0.45 + rng() * 0.4);
      const ccx = px + Math.cos(ca) * cr;
      const ccy = py + Math.sin(ca) * cr * (ry / rx);
      const cl  = 1.5 + rng() * 3.5;
      for (let arm = 0; arm < 3; arm++) {
        const aa = ca + arm * Math.PI / 3;
        tc.beginPath();
        tc.moveTo(ccx, ccy);
        tc.lineTo(ccx + Math.cos(aa) * cl, ccy + Math.sin(aa) * cl);
        tc.stroke();
      }
    }
  }

  // ── Stones ────────────────────────────────────────────────────────────────
  for (let i = 0, n = 42 + Math.floor(rng() * 28); i < n; i++) {
    const sx = rng() * W, sy = rng() * H;
    const sr = 1.0 + rng() * 3.2;
    const fl = 0.45 + rng() * 0.5;
    const sa = rng() * Math.PI;
    tc.fillStyle = 'rgba(0,0,0,0.42)';
    tc.beginPath(); tc.ellipse(sx + sr * 0.28, sy + sr * 0.18, sr, sr * fl * 0.75, sa, 0, Math.PI * 2); tc.fill();
    const sg = Math.floor(48 + rng() * 52);
    tc.fillStyle = `rgb(${sg},${sg - 3},${sg + 6})`;
    tc.beginPath(); tc.ellipse(sx, sy, sr, sr * fl, sa, 0, Math.PI * 2); tc.fill();
    tc.fillStyle = `rgba(${sg + 62},${sg + 58},${sg + 50},0.60)`;
    tc.beginPath(); tc.ellipse(sx - sr * 0.2, sy - sr * fl * 0.25, sr * 0.38, sr * fl * 0.26, sa, 0, Math.PI * 2); tc.fill();
  }

  // ── Mushroom clusters ─────────────────────────────────────────────────────
  for (let i = 0, n = 8 + Math.floor(rng() * 9); i < n; i++) {
    const mx = rng() * W, my = rng() * H;
    const count = 2 + Math.floor(rng() * 4);
    for (let m = 0; m < count; m++) {
      const bx  = mx + (rng() - 0.5) * cs * 1.8;
      const by  = my + (rng() - 0.5) * cs * 1.2;
      const cap = 1.4 + rng() * 2.2;
      // Stem
      tc.fillStyle = `rgba(185,165,130,${0.55 + rng() * 0.30})`;
      tc.fillRect(bx - 0.6, by - cap * 0.75, 1.2, cap * 0.75);
      // Cap — red or brown
      const isRed = rng() < 0.58;
      const cr = isRed ? 150 + Math.floor(rng() * 80) : 90 + Math.floor(rng() * 50);
      const cg = isRed ? Math.floor(rng() * 35)       : 55 + Math.floor(rng() * 30);
      const cb = isRed ? Math.floor(rng() * 22)       : 18 + Math.floor(rng() * 20);
      tc.fillStyle = `rgba(${cr},${cg},${cb},${0.70 + rng() * 0.28})`;
      tc.beginPath();
      tc.ellipse(bx, by - cap * 0.78, cap, cap * 0.52, 0, Math.PI, 0);
      tc.fill();
      // Spot on red caps
      if (isRed && rng() < 0.6) {
        tc.fillStyle = `rgba(255,245,240,${0.45 + rng() * 0.30})`;
        tc.beginPath(); tc.arc(bx - cap * 0.25, by - cap, cap * 0.18, 0, Math.PI * 2); tc.fill();
      }
    }
  }

  // ── Dead roots ────────────────────────────────────────────────────────────
  tc.lineCap = 'round';
  for (let i = 0, n = 7 + Math.floor(rng() * 6); i < n; i++) {
    const rx = rng() * W, ry = rng() * H;
    const br = Math.floor(28 + rng() * 14);
    const baseAlpha = 0.50 + rng() * 0.32;
    const branches  = 2 + Math.floor(rng() * 4);
    for (let b = 0; b < branches; b++) {
      const ba  = rng() * Math.PI * 2;
      const len = cs * 0.9 + rng() * cs * 2.8;
      const cpx = rx + Math.cos(ba + (rng() - 0.5) * 0.9) * len * 0.42;
      const cpy = ry + Math.sin(ba + (rng() - 0.5) * 0.9) * len * 0.42;
      const ex  = rx + Math.cos(ba) * len;
      const ey  = ry + Math.sin(ba) * len;
      tc.strokeStyle = `rgba(${br},${Math.floor(br * 0.55)},${Math.floor(br * 0.22)},${baseAlpha})`;
      tc.lineWidth   = 0.55 + rng() * 0.6;
      tc.beginPath(); tc.moveTo(rx, ry); tc.quadraticCurveTo(cpx, cpy, ex, ey); tc.stroke();
      if (rng() < 0.55) {
        const mx = (rx + ex) / 2, my = (ry + ey) / 2;
        const sl = len * (0.28 + rng() * 0.28);
        const sa = ba + (rng() - 0.5) * 1.3;
        tc.lineWidth *= 0.6;
        tc.beginPath(); tc.moveTo(mx, my); tc.lineTo(mx + Math.cos(sa) * sl, my + Math.sin(sa) * sl); tc.stroke();
        tc.lineWidth /= 0.6;
      }
    }
  }
  tc.lineCap = 'butt';

  // ── Small runestones ──────────────────────────────────────────────────────
  for (let i = 0, n = 3 + Math.floor(rng() * 4); i < n; i++) {
    const rstx = cs * 0.6 + rng() * (W - cs * 1.2);
    const rsty = cs * 0.6 + rng() * (H - cs * 1.2);
    const rw   = Math.max(2, Math.round(cs * 0.26));
    const rh   = Math.max(3, Math.round(cs * 0.46));
    const lean = (rng() - 0.5) * 0.1;
    const sg   = Math.floor(58 + rng() * 30);
    tc.save();
    tc.translate(rstx, rsty);
    tc.rotate(lean);
    tc.fillStyle = 'rgba(0,0,0,0.42)';
    tc.fillRect(-rw / 2 + 1, -rh / 2 + 1, rw, rh);
    tc.fillStyle = `rgb(${sg},${sg - 2},${sg + 6})`;
    tc.fillRect(-rw / 2, -rh / 2, rw, rh);
    tc.fillStyle = `rgba(${sg + 48},${sg + 46},${sg + 55},0.52)`;
    tc.fillRect(-rw / 2, -rh / 2, rw, 1);
    // Carved rune
    tc.strokeStyle = 'rgba(18,12,6,0.62)';
    tc.lineWidth   = 0.45;
    tc.beginPath();
    tc.moveTo(0, -rh * 0.3); tc.lineTo(0, rh * 0.3);          // vertical
    tc.moveTo(-rw * 0.3, -rh * 0.05); tc.lineTo(rw * 0.3, -rh * 0.05); // crossarm
    tc.moveTo(-rw * 0.28, -rh * 0.22); tc.lineTo(rw * 0.28, rh * 0.12); // diagonal
    tc.stroke();
    tc.restore();
  }

  // ── Vignette — darken edges, slight warm centre ───────────────────────────
  const vig = tc.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.22, W / 2, H / 2, Math.max(W, H) * 0.82);
  vig.addColorStop(0,   'rgba(0,0,0,0)');
  vig.addColorStop(0.65,'rgba(0,0,0,0.22)');
  vig.addColorStop(1,   'rgba(0,0,0,0.72)');
  tc.fillStyle = vig;
  tc.fillRect(0, 0, W, H);

  const glow = tc.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * 0.48);
  glow.addColorStop(0, 'rgba(255,200,120,0.03)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  tc.fillStyle = glow;
  tc.fillRect(0, 0, W, H);
}

// ── helpers ───────────────────────────────────────────────────────────────────

function getViewSize() {
  return {
    width:  (canvas.clientWidth  || window.innerWidth)  / gameScale,
    height: (canvas.clientHeight || window.innerHeight) / gameScale,
  };
}

function computeScale() {
  gameScale = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
  clampPan();
}

function clampPan() {
  const scaledW = BASE_W * gameScale;
  const scaledH = BASE_H * gameScale;
  const vw      = window.innerWidth;
  const vh      = window.innerHeight;
  panX = scaledW <= vw ? (vw - scaledW) / 2 : Math.max(vw - scaledW, Math.min(0, panX));
  panY = scaledH <= vh ? (vh - scaledH) / 2 : Math.max(vh - scaledH, Math.min(0, panY));
}

function clampGridPan() {
  gridPanX = Math.max(-(gridZoom - 1) * COLS * CELL_SIZE, Math.min(0, gridPanX));
  gridPanY = Math.max(-(gridZoom - 1) * ROWS * CELL_SIZE, Math.min(0, gridPanY));
}

// Convert outer-game coords (post-gameScale) into grid-local coords (0-based; 0,0 = top-left of grid).
function outerToGridLocal(ox, oy) {
  return {
    x: (ox - GRID_LEFT - gridPanX) / gridZoom,
    y: (oy - GRID_TOP  - gridPanY) / gridZoom,
  };
}

// Draws a fantasy panel: dark fill + gold border + inner line + corner gem diamonds.
// fillStyle / borderAlpha let callers control selected vs idle appearance.
function drawFantasyPanel(x, y, w, h, fillStyle, borderAlpha = 0.7, radius = 8) {
  // drop shadow
  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur    = 18;
  ctx.shadowOffsetY = 4;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();

  // warm brown outer border (CoC style)
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
  ctx.strokeStyle = `rgba(180,110,30,${borderAlpha})`;
  ctx.lineWidth   = 2;
  ctx.stroke();

  // highlight line (top edge — lit from above)
  ctx.beginPath(); ctx.roundRect(x + 2, y + 2, w - 4, h - 4, Math.max(radius - 2, 2));
  ctx.strokeStyle = `rgba(255,200,80,${borderAlpha * 0.28})`;
  ctx.lineWidth   = 0.5;
  ctx.stroke();

  // corner rivets
  const gs = 3.5;
  for (const [cx, cy] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]]) {
    ctx.fillStyle = `rgba(220,160,40,${borderAlpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(cx, cy, gs / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── build buttons ─────────────────────────────────────────────────────────────

function getBuildButtons() {
  const nBtn   = BUILD_ITEMS.length;
  const panelX = GRID_LEFT + 2;
  const panelW = COLS * CELL_SIZE - 4;
  const padX   = 4;
  const gap    = 3;
  const cardW  = nBtn > 0 ? Math.floor((panelW - 2 * padX - (nBtn - 1) * gap) / nBtn) : 0;
  const btnY   = GRID_BOTTOM + 7;
  return BUILD_ITEMS.map((item, i) => ({
    ...item,
    x:      panelX + padX + i * (cardW + gap),
    y:      btnY,
    width:  cardW,
    height: BUILD_BTN.h
  }));
}

function getBuildButtonAt(mx, my) {
  for (const btn of getBuildButtons()) {
    if (mx >= btn.x && mx <= btn.x + btn.width &&
        my >= btn.y && my <= btn.y + btn.height) return btn;
  }
  return null;
}

// ── spawning ──────────────────────────────────────────────────────────────────

function spawnEnemy(type = ENEMY_TYPES.DRAUGR, hpScale = 1) {
  if (!currentPath || gameOver) return;

  let path;
  if (ENEMY_DEFS[type].flying) {
    path = [grid.cellCenter(SPAWN.col, SPAWN.row), grid.cellCenter(GOAL.col, GOAL.row)];
  } else {
    path = currentPath.map(({ col, row }) => grid.cellCenter(col, row));
  }

  if (type === ENEMY_TYPES.JOTUNN) {
    screenShake     = Math.max(screenShake, 10);
    portalFlash      = 14;
    portalFlashColor = 'blue';  // regular Jötunn — cold blue, not the boss red
  }
  const newEnemy = new Enemy(path, type, hpScale);
  newEnemy.baseSpeed *= waveSpeedScale;
  newEnemy.speed     *= waveSpeedScale;
  if (newEnemy.flying && mylingWarningTimer === 0) mylingWarningTimer = 210;
  enemies.push(newEnemy);
}

function estimateWaveHp(waveNum) {
  const comp  = waveComposition(Math.max(1, waveNum));
  const scale = getWaveBands(waveNum).hp;
  return Math.round((comp.draugr * 130 + comp.mylings * 110 + comp.jotunn * 700 + comp.maras * 130) * scale);
}

function spawnBoss(waveNum) {
  if (!currentPath || gameOver) return;
  const cfg  = BOSS_CONFIGS[waveNum];
  const path = currentPath.map(({ col, row }) => grid.cellCenter(col, row));

  screenShake      = Math.max(screenShake, 16);
  portalFlash      = 32;
  portalFlashColor = 'red';

  const dynamicHp   = Math.round(estimateWaveHp(waveNum - 1) * 1.5);
  const boss        = new Enemy(path, cfg.type, 1);
  boss.hp           = Math.max(cfg.hp, dynamicHp);
  boss.maxHp        = boss.hp;
  boss.radius       = cfg.radius;
  boss.speed        = ENEMY_DEFS[cfg.type].speed * cfg.speedMult;
  boss.baseSpeed    = boss.speed;
  boss.reward       = cfg.reward;
  boss.isBoss       = true;
  boss.bossName     = cfg.name;
  boss.waveNum      = waveNum;
  enemies.push(boss);
}

// ── rerouting ─────────────────────────────────────────────────────────────────

function rerouteActiveEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.reached || enemy.flying) continue;

    const { col, row } = grid.pixelToCell(enemy.x, enemy.y);
    const enemyPath = grid.findPath(col, row, GOAL.col, GOAL.row);
    if (enemyPath && enemyPath.length >= 2) {
      enemy.setPath(enemyPath.map(({ col: c, row: r }) => grid.cellCenter(c, r)));
    } else if (currentPath) {
      // Local BFS failed (enemy at boundary) — fall back to global path
      enemy.setPath(currentPath.map(({ col: c, row: r }) => grid.cellCenter(c, r)));
    }
  }
}

function hasEnemyInCell(col, row) {
  const half = CELL_SIZE / 2;
  const { x, y } = grid.cellCenter(col, row);
  return enemies.some(e => {
    if (!e.alive || e.reached) return false;
    return Math.abs(e.x - x) < half && Math.abs(e.y - y) < half;
  });
}

function tryPlaceAt(col, row, mode, towerType) {
  // Check star gate for locked towers
  const gate = TOWER_STAR_GATES[towerType];
  if (mode === CELL.TOWER && gate && stars < gate) return false;

  const fp = (mode === CELL.TOWER) ? (TOWER_DEFS[towerType]?.footprint ?? {w:1,h:1}) : {w:1,h:1};

  // Check all footprint cells
  for (let dc = 0; dc < fp.w; dc++) {
    for (let dr = 0; dr < fp.h; dr++) {
      const c = col + dc, r = row + dr;
      const fc = grid.getCell(c, r);
      if (fc === null || fc !== CELL.EMPTY) return false;
      if (fc === CELL.SPAWN || fc === CELL.GOAL) return false;
      if (hasEnemyInCell(c, r)) return false;
    }
  }

  const cost = mode === CELL.WALL ? WALL_COST : TOWER_DEFS[towerType].cost;
  if (gold < cost) return false;

  // Mark all footprint cells
  for (let dc = 0; dc < fp.w; dc++) {
    for (let dr = 0; dr < fp.h; dr++) {
      grid.setCell(col + dc, row + dr, mode);
    }
  }
  const newPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
  if (!newPath) {
    for (let dc = 0; dc < fp.w; dc++) {
      for (let dr = 0; dr < fp.h; dr++) {
        grid.setCell(col + dc, row + dr, CELL.EMPTY);
      }
    }
    pathBlockFlash = { col, row, timer: 70 };
    return false;
  }

  currentPath = newPath;
  pathDirty   = true;
  rerouteActiveEnemies();
  goldSpent += cost;
  gold      -= cost;
  wallFrostDirty = true;

  if (mode === CELL.WALL) {
    sfxPlace(true);
    const adjTW = [[col-1,row],[col+1,row],[col,row-1],[col,row+1]];
    for (const [ac, ar] of adjTW) {
      const bt = towers.find(t => t.col === ac && t.row === ar && t.type === TOWER_TYPES.BERSERK);
      if (bt) bt.synergyRingTimer = 30;
    }
  }

  if (mode === CELL.TOWER) {
    sfxPlace(false);
    // Center of footprint in world coords
    const cx = (col + fp.w / 2) * CELL_SIZE;
    const cy = (row + fp.h / 2) * CELL_SIZE;
    const t = new Tower(cx, cy, col, row, towerType);
    towers.push(t);
    // Synergy ring: Berserker placed next to a wall
    if (towerType === TOWER_TYPES.BERSERK) {
      const adjBW = [[col-1,row],[col+1,row],[col,row-1],[col,row+1]];
      if (adjBW.some(([ac,ar]) => grid.getCell(ac,ar) === CELL.WALL)) {
        t.synergyRingTimer = 30;
      }
    }
  }
  if (mode === CELL.TOWER) { firstTowerPlaced = true; pathChevronsTimer = 0; }
  return true;
}

// ── input ─────────────────────────────────────────────────────────────────────

function handleRightClickAt(mouseX, mouseY) {
  const { x: gx, y: gy } = outerToGridLocal(mouseX, mouseY);
  const { col, row } = grid.pixelToCell(gx, gy);
  const cell = grid.getCell(col, row);
  if (cell === null || cell === CELL.SPAWN || cell === CELL.GOAL) {
    selectedTower = null;
    return;
  }
  if (cell === CELL.WALL) {
    const wallKey = `w_${col}_${row}`;
    if (pendingSell && pendingSell.key === wallKey) {
      wallFrostDirty = true;
      gold += Math.floor(WALL_COST * 0.5);
      grid.setCell(col, row, CELL.EMPTY);
      currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row) ?? currentPath;
      rerouteActiveEnemies();
      sfxSell();
      pendingSell = null;
    } else {
      pendingSell = { key: wallKey, col, row, timer: 90 };
    }
  } else if (cell === CELL.TOWER) {
    const t = getTowerAtCell(col, row);
    if (!t) return;
    const anchorKey = `${t.col}_${t.row}`;
    if (pendingSell && pendingSell.key === anchorKey) {
      if (selectedTower === t) selectedTower = null;
      gold += t.sellValue;
      sfxSell();
      removeTower(t);
      pendingSell = null;
    } else {
      pendingSell = { key: anchorKey, col: t.col, row: t.row, timer: 90 };
    }
  }
}

canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();

  // Pause works even in game over state, mute always
  if (key === 'p' && !gameOver && gamePhase === 'playing') {
    isPaused = !isPaused;
    return;
  }
  if (key === 'm') {
    isMuted = !isMuted;
    setMuted(isMuted);
    return;
  }
  if (e.key === 'Escape') {
    if (showRunePicker) { showRunePicker = false; runePickerTower = null; return; }
    if (showRuneMenu)   { showRuneMenu  = false; return; }
    if (selectedTower)  { selectedTower = null;  return; }
    if (pendingSell)       { pendingSell   = null;  return; }
    return;
  }

  if (gameOver) return;

  if ((e.key === ' ' || e.key === 'Enter') && (waveState === 'countdown' || waveState === 'break')) {
    e.preventDefault();
    startNextWave();
    return;
  }

  if (key === 'f') {
    gameSpeed = gameSpeed >= 4 ? 1 : gameSpeed >= 2 ? 4 : 2;
    return;
  }

  if (key === 'r' && waveState !== 'active' && stars > 0) {
    showRuneMenu   = !showRuneMenu;
    showRunePicker = false; runePickerTower = null;
    return;
  }

  if (key === 'a' && (waveState === 'countdown' || waveState === 'break')) {
    autoNextWave = !autoNextWave;
    return;
  }

  if (key === 'g') {
    showGrid = !showGrid;
    return;
  }

  if (key === 'z') {
    gridZoom = 1.0;
    gridPanX = 0;
    gridPanY = 0;
    return;
  }

  // Arrow keys: pan the grid view
  const PAN_STEP = CELL_SIZE * 2;
  if (key === 'arrowleft')  { e.preventDefault(); gridPanX += PAN_STEP; clampGridPan(); return; }
  if (key === 'arrowright') { e.preventDefault(); gridPanX -= PAN_STEP; clampGridPan(); return; }
  if (key === 'arrowup')    { e.preventDefault(); gridPanY += PAN_STEP; clampGridPan(); return; }
  if (key === 'arrowdown')  { e.preventDefault(); gridPanY -= PAN_STEP; clampGridPan(); return; }

  for (const item of BUILD_ITEMS) {
    if (key === item.key.toLowerCase()) {
      buildMode = item.mode;
      if (item.mode === CELL.TOWER) selectedTowerType = item.id;
      break;
    }
  }
});

canvas.addEventListener('mousedown', e => {
  ensureAudio();

  if (e.button === 1) {
    e.preventDefault();
    isPanning    = true;
    panStartX    = e.clientX;
    panStartY    = e.clientY;
    panStartOffX = gridPanX;
    panStartOffY = gridPanY;
    return;
  }

  const rect   = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left - panX) / gameScale;
  const mouseY = (e.clientY - rect.top  - panY) / gameScale;

  // Map select phase — first click selects, second click on same starts game
  if (gamePhase === 'mapSelect') {
    if (e.button === 0) {
      for (const btn of mapSelectBtns) {
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          if (selectedMapIdx === btn.idx) {
            initGame(PRESET_MAPS[btn.idx]);
          } else {
            selectedMapIdx = btn.idx;
            mapAutoTimerStart = performance.now(); // reset on card switch
          }
          return;
        }
      }
    }
    return;
  }

  // Game over: only overlay buttons are interactive
  if (gameOver) {
    if (_pendingScore) return;  // name entry overlay is open — ignore canvas clicks
    if (e.button === 0) {
      if (restartBtn &&
          mouseX >= restartBtn.x && mouseX <= restartBtn.x + restartBtn.w &&
          mouseY >= restartBtn.y && mouseY <= restartBtn.y + restartBtn.h) {
        if (restartBtn.action === 'back') { showTopList = false; }
        else                             { gamePhase = 'mapSelect'; mapAutoTimerStart = performance.now(); selectedMapIdx = 0; }
      }
      if (!showTopList && toplistBtn &&
          mouseX >= toplistBtn.x && mouseX <= toplistBtn.x + toplistBtn.w &&
          mouseY >= toplistBtn.y && mouseY <= toplistBtn.y + toplistBtn.h) {
        showTopList = true;
      }
    }
    return;
  }

  // Rune menu buy buttons (shown during break/countdown)
  if (e.button === 0 && showRuneMenu) {
    for (const rb of runeMenuBtns) {
      if (mouseX >= rb.x && mouseX <= rb.x + rb.w &&
          mouseY >= rb.y && mouseY <= rb.y + rb.h) {
        const def  = RUNE_DEFS[rb.idx];
        const owned = runeInventory[def.id] ?? 0;
        if (owned < def.maxOwned && stars >= def.cost) {
          stars -= def.cost;
          runeInventory[def.id] = owned + 1;
          sfxRune();
        }
        return;
      }
    }
    // Click outside rune menu closes it
    showRuneMenu = false;
    return;
  }

  // Build-mode button row — left-click starts a drag
  if (e.button === 0) {
    const btn = getBuildButtonAt(mouseX, mouseY);
    if (btn) {
      buildMode = btn.mode;
      if (btn.mode === CELL.TOWER) selectedTowerType = btn.id;
      selectedTower = null;
      dragItem = btn;
      dragX    = mouseX;
      dragY    = mouseY;
      return;
    }
  }

  // Rune picker overlay clicks
  if (e.button === 0 && showRunePicker && runePickerTower) {
    for (const rb of runePickerBtns) {
      if (mouseX >= rb.x && mouseX <= rb.x + rb.w && mouseY >= rb.y && mouseY <= rb.y + rb.h) {
        const tower = runePickerTower;
        if (rb.remove) {
          runeInventory[tower.rune] = (runeInventory[tower.rune] ?? 1) + 1;
          tower.clearRune();
        } else if (rb.equip) {
          if (tower.rune) runeInventory[tower.rune] = (runeInventory[tower.rune] ?? 1) + 1;
          runeInventory[rb.def.id] = Math.max(0, (runeInventory[rb.def.id] ?? 0) - 1);
          tower.setRune(rb.def.id);
        }
        showRunePicker = false; runePickerTower = null;
        return;
      }
    }
    showRunePicker = false; runePickerTower = null;
    return;
  }

  // Tower panel buttons (when a tower is selected)
  if (e.button === 0 && selectedTower) {
    if (panelRuneBtn &&
        mouseX >= panelRuneBtn.x && mouseX <= panelRuneBtn.x + panelRuneBtn.w &&
        mouseY >= panelRuneBtn.y && mouseY <= panelRuneBtn.y + panelRuneBtn.h) {
      if (showRunePicker && runePickerTower === selectedTower) {
        showRunePicker = false; runePickerTower = null;
      } else {
        showRunePicker = true; runePickerTower = selectedTower;
        showRuneMenu   = false;
      }
      return;
    }
    if (panelUpgradeBtn &&
        mouseX >= panelUpgradeBtn.x && mouseX <= panelUpgradeBtn.x + panelUpgradeBtn.w &&
        mouseY >= panelUpgradeBtn.y && mouseY <= panelUpgradeBtn.y + panelUpgradeBtn.h) {
      if (!selectedTower.maxed && gold >= selectedTower.upgradeCost) {
        goldSpent += selectedTower.upgradeCost;
        gold      -= selectedTower.upgradeCost;
        selectedTower.upgrade();
        sfxUpgrade(selectedTower.type);
        if (selectedTower.maxed) {
          spawnParticles(selectedTower.x, selectedTower.y, selectedTower.color, 28);
          const fx = selectedTower.x, fy = selectedTower.y - 14;
          dmgFloaters.push({ x: fx, y: fy, val: 'MAX', life: 100, maxLife: 100, color: '#ff9040', large: true, suffix: '!' });
        }
      }
      return;
    }
    if (panelSellBtn &&
        mouseX >= panelSellBtn.x && mouseX <= panelSellBtn.x + panelSellBtn.w &&
        mouseY >= panelSellBtn.y && mouseY <= panelSellBtn.y + panelSellBtn.h) {
      const anchorKey = `${selectedTower.col}_${selectedTower.row}`;
      if (pendingSell && pendingSell.key === anchorKey) {
        gold += selectedTower.sellValue;
        sfxSell();
        removeTower(selectedTower);
        selectedTower = null;
        pendingSell   = null;
      } else {
        pendingSell = { key: anchorKey, col: selectedTower.col, row: selectedTower.row, timer: 90 };
      }
      return;
    }
  }

  // Speed toggle buttons (three discrete: ×1, ×2, ×4)
  for (const sb of speedBtns) {
    if (e.button === 0 && mouseX >= sb.x && mouseX <= sb.x + sb.w &&
        mouseY >= sb.y && mouseY <= sb.y + sb.h) {
      gameSpeed = sb.speed;
      return;
    }
  }

  // Next-wave button (right panel)
  if (e.button === 0 && nextWaveBtn && !gameOver) {
    if (mouseX >= nextWaveBtn.x && mouseX <= nextWaveBtn.x + nextWaveBtn.w &&
        mouseY >= nextWaveBtn.y && mouseY <= nextWaveBtn.y + nextWaveBtn.h) {
      if (waveState === 'countdown' || waveState === 'break') startNextWave();
      return;
    }
  }

  // Rune Forge button (right panel, break/countdown)
  if (e.button === 0 && runeForgeBtn) {
    if (mouseX >= runeForgeBtn.x && mouseX <= runeForgeBtn.x + runeForgeBtn.w &&
        mouseY >= runeForgeBtn.y && mouseY <= runeForgeBtn.y + runeForgeBtn.h) {
      showRuneMenu = !showRuneMenu;
      return;
    }
  }

  // Right-click: start potential pan, defer sell action to mouseup
  if (e.button === 2) {
    panStartX         = e.clientX;
    panStartY         = e.clientY;
    panStartOffX      = gridPanX;
    panStartOffY      = gridPanY;
    rightClickDragged = false;
    rightClickSaved   = { mouseX, mouseY };
    return;
  }

  const { x: gx, y: gy } = outerToGridLocal(mouseX, mouseY);
  const { col, row } = grid.pixelToCell(gx, gy);
  const cell = grid.getCell(col, row);

  if (cell === null || cell === CELL.SPAWN || cell === CELL.GOAL) {
    selectedTower = null;
    return;
  }

  if (e.button !== 0) return;

  // Left-click on placed tower: select it
  if (cell === CELL.TOWER) {
    selectedTower = getTowerAtCell(col, row) ?? null;
    return;
  }

  // Left-click elsewhere: deselect then try to place
  selectedTower = null;
  tryPlaceAt(col, row, buildMode, selectedTowerType);
});

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  // Right-click drag: enter pan mode after 4px threshold
  if ((e.buttons & 2) && rightClickSaved && !isPanning) {
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;
    if (dx * dx + dy * dy > 16) {
      isPanning = true;
      rightClickDragged = true;
    }
  }
  if (isPanning) {
    gridPanX = panStartOffX + (e.clientX - panStartX) / gameScale;
    gridPanY = panStartOffY + (e.clientY - panStartY) / gameScale;
    clampGridPan();
  }
  dragX = (e.clientX - rect.left - panX) / gameScale;
  dragY = (e.clientY - rect.top  - panY) / gameScale;
  const { x: _hx, y: _hy } = outerToGridLocal(dragX, dragY);
  const _hcell = grid.pixelToCell(_hx, _hy);
  hoverCol = _hcell.col;
  hoverRow = _hcell.row;
});

canvas.addEventListener('mouseup', e => {
  if (e.button === 1) { isPanning = false; return; }
  if (e.button === 2) {
    isPanning = false;
    const dragged = rightClickDragged;
    rightClickDragged = false;
    const saved = rightClickSaved;
    rightClickSaved = null;
    if (!dragged && saved && !gameOver) handleRightClickAt(saved.mouseX, saved.mouseY);
    return;
  }
  if (!dragItem || gameOver) { dragItem = null; return; }
  const rect   = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left - panX) / gameScale;
  const mouseY = (e.clientY - rect.top  - panY) / gameScale;
  const { x: gridX, y: gridY } = outerToGridLocal(mouseX, mouseY);
  const { col, row } = grid.pixelToCell(gridX, gridY);
  tryPlaceAt(col, row, dragItem.mode, dragItem.id);
  dragItem = null;
});

canvas.addEventListener('mouseleave', () => {
  isPanning         = false;
  rightClickDragged = false;
  rightClickSaved   = null;
  hoverCol          = -1;
  hoverRow          = -1;
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const rect    = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  const outerX  = (screenX - panX) / gameScale;
  const outerY  = (screenY - panY) / gameScale;

  // Only zoom when cursor is over the grid
  const inGrid = outerX >= GRID_LEFT && outerX <= GRID_LEFT + COLS * CELL_SIZE &&
                 outerY >= GRID_TOP  && outerY <= GRID_TOP  + ROWS * CELL_SIZE;
  if (!inGrid) return;

  const delta   = e.deltaY > 0 ? -0.15 : 0.15;
  const newZoom = Math.max(1.0, Math.min(4.0, gridZoom + delta));
  if (newZoom === gridZoom) return;

  // Zoom centered on cursor position within grid
  const localX = (outerX - GRID_LEFT - gridPanX) / gridZoom;
  const localY = (outerY - GRID_TOP  - gridPanY) / gridZoom;
  gridZoom = newZoom;
  gridPanX = (outerX - GRID_LEFT) - localX * gridZoom;
  gridPanY = (outerY - GRID_TOP)  - localY * gridZoom;
  clampGridPan();
}, { passive: false });

// ── update ────────────────────────────────────────────────────────────────────

function update() {
  if (gameOver || gamePhase !== 'playing' || isPaused) return;

  // Auto-next-wave: skip break after a short pause so wave-clear animations breathe
  if (autoNextWave && waveTimer > 60 && (waveState === 'break' || waveState === 'countdown')) {
    startNextWave();
  }

  if (flawlessTimer > 0) flawlessTimer--;

  if (pendingSell) {
    pendingSell.timer--;
    if (pendingSell.timer <= 0) pendingSell = null;
  }
  if (mylingWarningTimer  > 0) mylingWarningTimer--;
  if (maraEmpWarningTimer > 0) maraEmpWarningTimer--;

  updateWave();

  // ── Synergy detection ─────────────────────────────────────────────────────────
  for (const t of towers) t._synergy = null;
  function _towersAdjacent(a, b) {
    const afp = a.footprint ?? { w: 1, h: 1 }, bfp = b.footprint ?? { w: 1, h: 1 };
    for (let ac = a.col; ac < a.col + afp.w; ac++)
      for (let ar = a.row; ar < a.row + afp.h; ar++)
        for (let bc = b.col; bc < b.col + bfp.w; bc++)
          for (let br = b.row; br < b.row + bfp.h; br++)
            if (Math.abs(ac - bc) <= 1 && Math.abs(ar - br) <= 1) return true;
    return false;
  }
  for (let _si = 0; _si < towers.length; _si++) {
    for (let _sj = _si + 1; _sj < towers.length; _sj++) {
      const a = towers[_si], b = towers[_sj];
      if (!_towersAdjacent(a, b)) continue;
      const types = [a.type, b.type].sort().join('+');
      if (types === 'military+valkyrie') { a._synergy = b._synergy = 'eagleEye'; }
      else if (types === 'berserk+catapult') { a._synergy = b._synergy = 'siegeFury'; }
      else if (types === 'blondie+isjatten') { a._synergy = b._synergy = 'winterGrip'; }
    }
  }

  // ── Tower updates ─────────────────────────────────────────────────────────────
  for (const tower of towers) {
    // Apply synergy stat boosts temporarily around update()
    const _origRange  = tower.range;
    const _origSplash = tower.splashDamage;
    if (tower._synergy === 'eagleEye') tower.range = Math.round(tower.range * 1.15);
    if (tower._synergy === 'siegeFury' && tower.splashDamage)
      tower.splashDamage = Math.round(tower.splashDamage * 1.20);
    tower._synergyDmgBoost = (tower._synergy === 'winterGrip') ? 1.15 : 1;

    // Tag new bullets with this tower as source (for kill tracking)
    const _prevBulletLen = bullets.length;
    const tr = tower.update(enemies, bullets);
    for (let _bi = _prevBulletLen; _bi < bullets.length; _bi++) {
      bullets[_bi].source = tower;
    }
    if (bullets.length > _prevBulletLen) sfxShoot(tower.bulletShape);

    // Restore temporarily modified stats
    tower.range        = _origRange;
    tower.splashDamage = _origSplash;

    if (!tr) continue;
    if (tr.type === 'heal') {
      const healCount = tr.count ?? 1;
      for (let h = 0; h < healCount && lives < STARTING_LIVES; h++) {
        lives++;
        sfxHeal();
      }
      if (healCount > 0) spawnParticles(tower.x, tower.y, '#60d8a0', 10 * healCount);
    } else if (tr.type === 'nova') {
      sfxNova();
      novaRings.push({ x: tr.x, y: tr.y, r: 0, maxR: tr.r, life: 26, maxLife: 26 });
      if (tr.killed > 0) {
        tower.killCount    += tr.killed;
        slain              += tr.killed;
        waveSlainCount     += tr.killed;
        spawnParticles(tr.x, tr.y, '#80d8ff', tr.killed * 6);
        for (const e of enemies) {
          if (!e._killed) continue;
          e._killed  = false;
          gold       += e.reward;
          goldEarned += e.reward;
          if (e.isBoss) {
            onBossKilled(e);
          } else {
            spawnParticles(e.x, e.y, e.highlightColor, 8);
            spawnGoldCoins(GRID_LEFT + gridPanX + gridZoom * e.x,
                           GRID_TOP  + gridPanY + gridZoom * e.y, e.reward);
          }
        }
      }
    }
  }



  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    const reward = b.update(enemies);
    if (reward > 0) {
      slain++;
      waveSlainCount++;
      const valBonus = (b.source?.rune === 'valhalla') ? Math.ceil(reward * 0.5) : 0;
      gold        += reward + valBonus;
      goldEarned  += reward + valBonus;
      if (b.source) b.source.killCount++;
      // For pierce bullets that stay alive, use stored kill position instead of current target
      const killX    = (b.canPierce && b.alive) ? b.lastKillX : (b.target?.x ?? b.x);
      const killY    = (b.canPierce && b.alive) ? b.lastKillY : (b.target?.y ?? b.y);
      const killBoss = (b.canPierce && b.alive) ? b.lastKillIsBoss : (b.target?.isBoss ?? false);
      sfxDie(killBoss);
      dmgFloaters.push({ x: killX, y: killY - 8, val: reward + valBonus, life: 52, maxLife: 52, color: valBonus > 0 ? '#f0c840' : '#f0e040' });
      if (killBoss) {
        if (b.target && b.canPierce && b.alive) { /* boss killed mid-pierce — handled at deathTimer */ }
        else if (b.target?.isBoss) onBossKilled(b.target);
      } else {
        const _killType = (b.canPierce && b.alive) ? null : b.target?.type;
        const _killColor = (b.canPierce && b.alive) ? '#c0a060' : (b.target?.highlightColor ?? b.target?.color ?? '#c0a060');
        const _pc = _killType === ENEMY_TYPES.JOTUNN ? 20 : _killType === ENEMY_TYPES.MARA ? 18 : _killType === ENEMY_TYPES.MYLING ? 12 : 10;
        spawnParticles(killX, killY, _killColor, _pc);
        screenShake = Math.max(screenShake, _killType === ENEMY_TYPES.JOTUNN ? 4 : _killType === ENEMY_TYPES.MARA ? 2 : 1);
        const coinSpeed = (!firstKillDone) ? 0.006 : undefined;
        firstKillDone = true;
        spawnGoldCoins(GRID_LEFT + gridPanX + gridZoom * killX, GRID_TOP + gridPanY + gridZoom * killY, reward, coinSpeed);
      }
    }
    if (!b.alive) {
      // Splash damage for missile bullets
      if (b.splashRadius > 0) {
        const ix = b.x, iy = b.y;
        spawnParticles(ix, iy, '#ff6622', 14);
        sfxSplash();
        splashRings.push({ x: ix, y: iy, r: 0, maxR: b.splashRadius, life: 22, maxLife: 22 });
        screenShake = Math.max(screenShake, b.splashRadius > 50 ? 8 : 5);
        let splashKills = 0;
        for (const enemy of enemies) {
          if (!enemy.alive || enemy.reached) continue;
          if (enemy === b.target) continue;  // primary target already took direct damage
          const dx = enemy.x - ix;
          const dy = enemy.y - iy;
          if (dx * dx + dy * dy <= b.splashRadius * b.splashRadius) {
            enemy.hp -= b.splashDamage;
            enemy.hitFlash    = b.splashDamage > 40 ? 7 : 4;
            enemy.hitFlashMax = enemy.hitFlash;
            if (enemy.hp <= 0) {
              enemy.hp    = 0;
              enemy.kill();
              slain++;
              waveSlainCount++;
              splashKills++;
              const _splashVal = (b.source?.rune === 'valhalla') ? Math.ceil(enemy.reward * 1.5) : enemy.reward;
              gold       += _splashVal;
              goldEarned += _splashVal;
              if (b.source) b.source.killCount++;
              if (splashKills === 1) sfxDie(enemy.isBoss);  // only play once per splash cluster
              if (b.source) b.source.damageDealt += b.splashDamage;
              dmgFloaters.push({ x: enemy.x, y: enemy.y - 8, val: _splashVal, life: 52, maxLife: 52, color: '#ff9040' });
              if (enemy.isBoss) {
                onBossKilled(enemy);
              } else {
                spawnParticles(enemy.x, enemy.y, enemy.highlightColor, 10);
                spawnGoldCoins(GRID_LEFT + gridPanX + gridZoom * enemy.x, GRID_TOP + gridPanY + gridZoom * enemy.y, enemy.reward);
              }
            }
          }
        }
        if (splashKills >= 3 && !chainKillDone) {
          chainKillDone    = true;
          chainKillDisplay = { x: ix, y: iy - 20, life: 100, maxLife: 100, count: splashKills };
          sfxChainKill();
        }
      }
      // IMMUNE floater when a slowing/stunning bullet hits a slow-immune boss
      if (b.slowDuration > 0 && b.target?.slowImmune) {
        dmgFloaters.push({ x: b.target.x, y: b.target.y - 16, val: 'IMMUNE', life: 44, maxLife: 44, color: '#ffcc00', suffix: '' });
      }
      // Enemy stagger pushback on heavy hits (Catapult, Berserker, Drakship)
      if (b.damage > 40 && b.target?.alive) {
        const tgt = b.target;
        const nxt = tgt.path?.[tgt.pathIndex + 1];
        if (nxt) {
          const ddx = nxt.x - tgt.x, ddy = nxt.y - tgt.y;
          const dlen = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dlen > 0) {
            tgt.staggerVX    = -(ddx / dlen) * 2;
            tgt.staggerVY    = -(ddy / dlen) * 2;
            tgt.staggerTimer = 4;
          }
        }
      }
      // Impact flash for direct-hit bullets (splash already has splashRings)
      if (b.splashRadius === 0) {
        const flashColor = b.shape === 'spear' ? '#aaddff'
                         : b.shape === 'arrow' ? '#e8c870'
                         : b.shape === 'stun'  ? '#ffe840'
                         : '#ffd86b';
        impactFlashes.push({ x: b.x, y: b.y, maxR: Math.max(7, b.damage * 0.2), life: 1, color: flashColor });
      }
      bullets.splice(i, 1);
    }
  }

  // Tower targeting lines — record shot path from each tower that just fired
  for (const t of towers) {
    if (t.targetLineTimer > 0) {
      t.targetLineTimer--;
      // push once when timer first set (handled in tower.js fire code)
    }
  }

  // Ice crystal trail for slowed enemies
  for (const e of enemies) {
    if (!e.alive || e.reached || e.slowTimer <= 0 || e.slowFactor <= 0.05) continue;
    if (Math.random() < 0.15) {
      particles.push({
        x: e.x + (Math.random() - 0.5) * e.radius,
        y: e.y + (Math.random() - 0.5) * e.radius,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(0.3 + Math.random() * 0.4),
        life: 1,
        decay: 0.09 + Math.random() * 0.05,
        radius: 0.7 + Math.random() * 1.1,
        color: '#80d8ff'
      });
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    if (!enemies[i].alive) {
      // Keep in array while death fade is playing, remove when timer expires
      if (enemies[i].deathTimer <= 0) {
        enemies.splice(i, 1);
      }
      continue;
    }
    if (enemies[i].reached) {
      lives--;
      sfxLifeLost();
      waveLeak   = true;
      screenShake  = 16;
      lifeLostTimer = 90;
      hoardPulse   = Math.max(hoardPulse, 24);
      enemies.splice(i, 1);
      if (lives <= 0) {
        gameOver   = true;
        sfxGameOver();
        promptNameAndSave({ waves: waveNumber, slain, goldEarned, date: new Date().toLocaleDateString('en-GB') });
      }
    }
  }

  // Mara: supernatural fear disables nearby towers + EMP shockwave rings
  for (const enemy of enemies) {
    if (enemy.type !== ENEMY_TYPES.MARA || !enemy.alive || enemy.reached) continue;
    let anyInRange = false;
    for (const tower of towers) {
      const dx = tower.x - enemy.x;
      const dy = tower.y - enemy.y;
      if (dx * dx + dy * dy <= EMP_RANGE * EMP_RANGE) {
        tower.disabledTimer = Math.max(tower.disabledTimer, EMP_DISABLE_FRAMES * gameSpeed);
        anyInRange = true;
      }
    }
    if (enemy.empPulseTimer > 0) {
      enemy.empPulseTimer--;
    } else if (anyInRange) {
      empRings.push({ x: enemy.x, y: enemy.y, r: 0, life: 28, maxLife: 28 });
      sfxEmp();
      enemy.empPulseTimer = Math.round(50 * gameSpeed);
      if (maraEmpWarningTimer === 0) maraEmpWarningTimer = 210;
    }
  }

  // Sköldborg: adjacent wall slows enemies to 65% speed (RUNE: 35% slow, 8-frame linger)
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.reached || enemy.slowImmune) continue;
    const { col, row } = grid.pixelToCell(enemy.x, enemy.y);
    const adj = [[col - 1, row], [col + 1, row], [col, row - 1], [col, row + 1]];
    for (const [ac, ar] of adj) {
      if (grid.getCell(ac, ar) === CELL.WALL) {
        enemy.slowTimer  = Math.max(enemy.slowTimer, 20);
        if (0.65 < enemy.slowFactor) enemy.slowFactor = 0.65;  // don't override a stronger slow
        break;
      }
    }
  }

  // Boss phase transitions
  for (const enemy of enemies) {
    if (!enemy.isBoss || !enemy.alive || enemy.reached) continue;
    const ratio = enemy.hp / enemy.maxHp;

    if (!enemy.phase75Done && ratio <= 0.75) {
      enemy.phase75Done = true;
      onBossPhase75(enemy);
    }
    if (!enemy.phase50Done && ratio <= 0.50) {
      enemy.phase50Done = true;
      onBossPhase50(enemy);
    }
  }

  if (bossDefeatTimer   > 0) bossDefeatTimer--;
  if (fortressHeldTimer > 0) fortressHeldTimer--;
  if (lifeLostTimer     > 0) lifeLostTimer--;
  if (pathChevronsTimer > 0) pathChevronsTimer--;
  if (chainKillDisplay) { chainKillDisplay.life--; if (chainKillDisplay.life <= 0) chainKillDisplay = null; }

  // Advance floating gold numbers
  for (let i = dmgFloaters.length - 1; i >= 0; i--) {
    dmgFloaters[i].life--;
    if (dmgFloaters[i].life <= 0) dmgFloaters.splice(i, 1);
  }

  // Update splash rings
  for (let i = splashRings.length - 1; i >= 0; i--) {
    const sr = splashRings[i];
    sr.r    = sr.maxR * (1 - sr.life / sr.maxLife);
    sr.life--;
    if (sr.life <= 0) splashRings.splice(i, 1);
  }

  // Update EMP rings
  for (let i = empRings.length - 1; i >= 0; i--) {
    const er = empRings[i];
    er.r    = EMP_RANGE * (1 - er.life / er.maxLife);
    er.life--;
    if (er.life <= 0) empRings.splice(i, 1);
  }

  // Update nova rings (quadratic ease-in for punchy expansion)
  for (let i = novaRings.length - 1; i >= 0; i--) {
    const nr = novaRings[i];
    const frac = 1 - nr.life / nr.maxLife;
    nr.r    = nr.maxR * frac * frac;
    nr.life--;
    if (nr.life <= 0) novaRings.splice(i, 1);
  }

  updateParticles();

  for (let i = goldCoins.length - 1; i >= 0; i--) {
    goldCoins[i].t += goldCoins[i].speed;
    if (goldCoins[i].t >= 1) {
      goldCoins.splice(i, 1);
      hoardPulse = 10;
    }
  }
  if (hoardPulse > 0) hoardPulse--;

}

// ── draw ──────────────────────────────────────────────────────────────────────

function drawBackground() {
  const { width, height } = getViewSize();
  const time = performance.now() * 0.0004;

  // Rebuild static gradients only when canvas dimensions change
  if (!_bgGradCache || width !== _bgCacheW || height !== _bgCacheH) {
    _bgGradCache = ctx.createLinearGradient(0, 0, 0, height);
    _bgGradCache.addColorStop(0,   '#1a1008');
    _bgGradCache.addColorStop(0.5, '#130c05');
    _bgGradCache.addColorStop(1,   '#0d0803');
    _bgG1Cache = ctx.createRadialGradient(width * 0.88, height * 0.08, 8, width * 0.88, height * 0.08, 320);
    _bgG1Cache.addColorStop(0, 'rgba(255,140,30,0.14)');
    _bgG1Cache.addColorStop(1, 'rgba(255,100,10,0)');
    _bgG2Cache = ctx.createRadialGradient(width * 0.04, height * 0.5, 0, width * 0.04, height * 0.5, 260);
    _bgG2Cache.addColorStop(0, 'rgba(40,60,120,0.09)');
    _bgG2Cache.addColorStop(1, 'rgba(20,30,80,0)');
    _bgCacheW = width; _bgCacheH = height;
  }

  // Dark stone/earth — Nordic dungeon feel
  ctx.fillStyle = _bgGradCache;
  ctx.fillRect(0, 0, width, height);

  // Subtle stone texture (irregular dark blotches)
  const starTime = performance.now() * 0.0002;
  for (const s of STARS) {
    const alpha = 0.045 + Math.sin(starTime + s.phase) * 0.02;
    ctx.fillStyle = `rgba(60,38,14,${Math.max(0, alpha)})`;
    ctx.beginPath();
    ctx.ellipse(s.x * width, s.y * height, s.r * 7, s.r * 3, s.phase, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warm torch-light glow top-right — drive brightness with globalAlpha to avoid per-frame gradient
  const p1 = 0.12 + Math.sin(time * 3.2) * 0.04;
  ctx.globalAlpha = p1 / 0.14;
  ctx.fillStyle   = _bgG1Cache;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  // Faint left-side ambient (cool blue — moonlight)
  ctx.fillStyle = _bgG2Cache;
  ctx.fillRect(0, 0, width, height);
}

// Bake the static stone road to an offscreen canvas (called when path changes)
function _bakePathCanvas(pts, segs) {
  const cs = CELL_SIZE;
  if (!pathCanvas) {
    pathCanvas = document.createElement('canvas');
    pathCanvas.width  = COLS * cs;
    pathCanvas.height = ROWS * cs;
  }
  const pc = pathCanvas.getContext('2d');
  pc.clearRect(0, 0, pathCanvas.width, pathCanvas.height);

  const mkPath = () => {
    pc.beginPath();
    pc.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) pc.lineTo(pts[i].x, pts[i].y);
  };
  pc.lineJoin = 'round';
  pc.lineCap  = 'round';
  mkPath(); pc.strokeStyle = 'rgba(0,0,0,0.72)';    pc.lineWidth = cs * 1.04; pc.stroke();
  mkPath(); pc.strokeStyle = 'rgba(26,18,8,0.97)';  pc.lineWidth = cs * 0.86; pc.stroke();
  mkPath(); pc.strokeStyle = 'rgba(50,38,22,0.93)'; pc.lineWidth = cs * 0.68; pc.stroke();
  mkPath(); pc.strokeStyle = 'rgba(68,54,34,0.70)'; pc.lineWidth = cs * 0.44; pc.stroke();

  for (const seg of segs) {
    const segDx = (seg.x1 - seg.x0) / seg.len;
    const segDy = (seg.y1 - seg.y0) / seg.len;
    const nx = -segDy, ny = segDx;
    const count = Math.max(1, Math.floor(seg.len / (cs * 0.65)));
    for (let i = 0; i < count; i++) {
      const f    = (i + 0.5) / count;
      const bx   = seg.x0 + (seg.x1 - seg.x0) * f;
      const by   = seg.y0 + (seg.y1 - seg.y0) * f;
      const seed = bx * 0.31 + by * 0.47;
      const perp  = (Math.sin(seed * 6.28) * 0.5 + Math.sin(seed * 11.7) * 0.35) * cs * 0.24;
      const along = Math.sin(seed * 8.41) * cs * 0.10;
      const angle = Math.sin(seed * 4.52) * 0.28;
      const sw    = cs * (0.18 + Math.abs(Math.sin(seed * 3.7)) * 0.18);
      const sh    = cs * (0.10 + Math.abs(Math.sin(seed * 5.3)) * 0.10);
      const bright = 0.44 + Math.sin(seed * 7.1) * 0.08;
      const r = Math.round(bright * 108), g = Math.round(bright * 90), b = Math.round(bright * 62);
      const sx = bx + nx * perp + segDx * along;
      const sy = by + ny * perp + segDy * along;
      pc.save();
      pc.translate(sx, sy);
      pc.rotate(Math.atan2(segDy, segDx) + angle);
      pc.fillStyle = `rgba(${r},${g},${b},0.55)`;
      pc.beginPath(); pc.ellipse(0, 0, sw * 0.5, sh * 0.5, 0, 0, Math.PI * 2); pc.fill();
      pc.strokeStyle = `rgba(0,0,0,${bright * 0.30})`;
      pc.lineWidth = 0.7;
      pc.beginPath(); pc.ellipse(0, 0, sw * 0.5, sh * 0.5, 0, 0, Math.PI * 2); pc.stroke();
      pc.fillStyle = `rgba(220,190,140,${bright * 0.28})`;
      pc.beginPath(); pc.ellipse(-sw * 0.14, -sh * 0.20, sw * 0.24, sh * 0.20, 0, 0, Math.PI * 2); pc.fill();
      pc.restore();
    }
  }
}

function drawPath() {
  if (!currentPath || currentPath.length < 2) return;

  const t  = performance.now() * 0.001;
  const cs = CELL_SIZE;

  // Build world-space polyline with cumulative distances — cached, rebuild only on path change
  if (pathDirty || _pathPts.length === 0) {
    _pathPts  = currentPath.map(({ col, row }) => grid.cellCenter(col, row));
    _pathSegs = [];
    _pathTotalLen = 0;
    for (let i = 0; i < _pathPts.length - 1; i++) {
      const dx = _pathPts[i + 1].x - _pathPts[i].x;
      const dy = _pathPts[i + 1].y - _pathPts[i].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      _pathSegs.push({ x0: _pathPts[i].x, y0: _pathPts[i].y, x1: _pathPts[i + 1].x, y1: _pathPts[i + 1].y, len, cum: _pathTotalLen });
      _pathTotalLen += len;
    }
    _pathCorners = [];
    for (let i = 1; i < _pathPts.length - 1; i++) {
      const ax = _pathPts[i].x - _pathPts[i - 1].x, ay = _pathPts[i].y - _pathPts[i - 1].y;
      const bx = _pathPts[i + 1].x - _pathPts[i].x, by = _pathPts[i + 1].y - _pathPts[i].y;
      const la = Math.sqrt(ax * ax + ay * ay), lb = Math.sqrt(bx * bx + by * by);
      if (la < 0.01 || lb < 0.01) continue;
      if ((ax * bx + ay * by) / (la * lb) > 0.97) continue;
      _pathCorners.push({ x: _pathPts[i].x, y: _pathPts[i].y, nx: -ay / la, ny: ax / la, idx: i });
    }
  }
  const pts = _pathPts;
  const segs = _pathSegs;
  const totalLen = _pathTotalLen;

  ctx.save();

  // ── Stone road (cached to offscreen canvas, re-baked only on path change) ──
  if (pathDirty || !pathCanvas) {
    _bakePathCanvas(pts, segs);
    pathDirty = false;
  }
  ctx.drawImage(pathCanvas, 0, 0);

  // ── Small torches at path corners ────────────────────────────────────────
  const corners = _pathCorners;  // cached — rebuilt only when pathDirty

  for (const c of corners) {
    for (const side of [-1, 1]) {
      const ox = c.x + c.nx * side * cs * 0.58;
      const oy = c.y + c.ny * side * cs * 0.58;
      const flicker = 0.65 + Math.sin(t * 13.7 + c.idx * 3.7 + side * 2.1) * 0.35;
      const fh = cs * 0.22 * flicker;
      const fw = cs * 0.13 * flicker;

      // torch post
      ctx.fillStyle = 'rgba(45,30,12,0.90)';
      ctx.fillRect(ox - 0.8, oy, 1.6, cs * 0.26);

      // flame — solid tinted ellipse; avoids per-torch createRadialGradient each frame
      ctx.save();
      ctx.shadowColor = `rgba(255,120,20,${0.45 * flicker})`;
      ctx.shadowBlur  = 3 + flicker * 2;
      ctx.fillStyle   = `rgba(255,150,40,${0.75 * flicker})`;
      ctx.beginPath();
      ctx.ellipse(ox + Math.sin(t * 7 + c.idx) * 0.4, oy - fh * 0.4, fw, fh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,230,100,${0.45 * flicker})`;
      ctx.beginPath();
      ctx.ellipse(ox, oy - fh * 0.15, fw * 0.45, fh * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // single drifting ember
      const ePhase = (t * 0.55 + c.idx * 1.37 + side * 0.7) % 1;
      if (ePhase < 0.6) {
        const eAlpha = ePhase < 0.12 ? ePhase / 0.12 : (0.6 - ePhase) / 0.48;
        const ex = ox + Math.sin(t * 3.1 + c.idx + side) * cs * 0.07;
        const ey = oy - fh - ePhase * cs * 0.65;
        ctx.fillStyle = `rgba(255,150,35,${eAlpha * 0.65})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── Will-o'-wisps: 5 ghostly orbs drifting along the path ────────────────
  if (totalLen > 0) {
    for (let wi = 0; wi < 5; wi++) {
      const phase    = ((t * 0.09 + wi * 0.21) % 1);
      const dist0    = phase * totalLen;
      let   rem      = dist0;
      let   wsx = pts[0].x, wsy = pts[0].y;
      for (const seg of segs) {
        if (rem <= seg.len) {
          const f  = rem / seg.len;
          wsx = seg.x0 + (seg.x1 - seg.x0) * f;
          wsy = seg.y0 + (seg.y1 - seg.y0) * f;
          break;
        }
        rem -= seg.len;
      }
      const wobX   = Math.sin(t * 2.3 + wi * 1.9) * cs * 0.38;
      const wobY   = Math.cos(t * 1.7 + wi * 2.5) * cs * 0.28;
      const alpha  = 0.30 + Math.sin(t * 2.1 + wi * 1.4) * 0.18;
      const radius = 2.2 + Math.sin(t * 1.5 + wi * 0.8) * 0.6;
      ctx.save();
      ctx.fillStyle   = `rgba(130,220,255,${alpha})`;
      ctx.shadowColor = 'rgba(100,200,255,0.55)';
      ctx.shadowBlur  = 5;
      ctx.beginPath();
      ctx.arc(wsx + wobX, wsy + wobY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawFrames() {
  const W = BASE_W, H = BASE_H;

  const thick = FRAME_THICK;

  ctx.save();

  // ── Single connected border region (evenodd) ─────────────────────────────
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.rect(thick, thick, W - thick * 2, H - thick * 2);
  ctx.fillStyle = '#1a0e05';
  ctx.fill('evenodd');

  // ── Outer hard edge ───────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(4,2,0,0.95)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // ── Outer thin gold accent ────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(160,100,18,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  // ── Inner gold trim — the primary ornamental line ─────────────────────────
  ctx.shadowColor = 'rgba(220,148,28,0.80)';
  ctx.shadowBlur  = 10;
  ctx.strokeStyle = '#c8901a';
  ctx.lineWidth   = 2;
  ctx.strokeRect(thick - 1, thick - 1, W - 2 * thick + 2, H - 2 * thick + 2);
  ctx.shadowBlur  = 0;

  // Fine bright highlight just inside the gold trim
  ctx.strokeStyle = 'rgba(255,220,100,0.22)';
  ctx.lineWidth   = 0.8;
  ctx.strokeRect(thick + 1, thick + 1, W - 2 * thick - 2, H - 2 * thick - 2);

  // ── Norse diamond knotwork along all four frame strips ────────────────────
  { ctx.save();
    const drawDiamond = (kx, ky, ks) => {
      ctx.beginPath();
      ctx.moveTo(kx, ky - ks); ctx.lineTo(kx + ks, ky);
      ctx.lineTo(kx, ky + ks); ctx.lineTo(kx - ks, ky); ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.arc(kx, ky, ks * 0.32, 0, Math.PI * 2); ctx.fill();
    };
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = '#c8901a'; ctx.fillStyle = '#c8901a'; ctx.lineWidth = 0.9;
    const kStep = 42, kSize = 5.5;
    for (let kx = thick + kStep; kx < W - thick; kx += kStep) {
      drawDiamond(kx, thick / 2, kSize);
      drawDiamond(kx, H - thick / 2, kSize);
    }
    for (let ky = thick + kStep; ky < H - thick; ky += kStep) {
      drawDiamond(thick / 2, ky, kSize);
      drawDiamond(W - thick / 2, ky, kSize);
    }
    ctx.restore(); }

  // ── Corner ornament sprites ───────────────────────────────────────────────
  const spCorner = SPRITES['frameCorner'];
  if (spCorner && spCorner.img.complete && spCorner.img.naturalWidth > 0) {
    const cH = thick;
    const cW = Math.round(cH * spCorner.frameW / spCorner.frameH);
    const drawCorner = (flipH, flipV) => {
      ctx.save();
      ctx.translate(flipH ? W : 0, flipV ? H : 0);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(spCorner.img, 0, 0, spCorner.frameW, spCorner.frameH, 0, 0, cW, cH);
      ctx.restore();
    };
    drawCorner(false, false);  // top-left
    drawCorner(true,  false);  // top-right
    drawCorner(false, true);   // bottom-left
    drawCorner(true,  true);   // bottom-right
  } else {
    // Procedural diamond corner gems
    for (const [cx, cy] of [
      [thick / 2, thick / 2], [W - thick / 2, thick / 2],
      [thick / 2, H - thick / 2], [W - thick / 2, H - thick / 2]
    ]) {
      ctx.shadowColor = 'rgba(220,150,30,0.8)';
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = '#c8901a';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 6, cy);
      ctx.lineTo(cx, cy + 9); ctx.lineTo(cx - 6, cy);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  ctx.restore();
}

function drawRightPanel() {
  const px = GRID_LEFT + COLS * CELL_SIZE + 4;
  const pw = BASE_W - px - 36;  // 32px frame + 4px inner gap
  speedBtns = [];
  runeForgeBtn = null;
  if (pw < 60) return;

  const fullH = BASE_H - GRID_TOP - 36;  // 32px frame + 4px inner gap
  drawFantasyPanel(px, GRID_TOP, pw, fullH, 'rgba(42,22,6,0.97)');

  const lx    = px + 10;
  const dotX  = px + 7;
  let   ly    = GRID_TOP + 14;
  const rEdge = px + pw - 8;
  const barW  = pw - 20;

  ctx.save();

  function divider() {
    ctx.strokeStyle = 'rgba(200,150,30,0.18)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(px + 6, ly); ctx.lineTo(px + pw - 6, ly);
    ctx.stroke();
    ly += 9;
  }

  // ── WAVE PROGRESS ──────────────────────────────────────────────────────────
  ctx.font      = 'bold 11px monospace';
  ctx.fillStyle = '#c0a060';
  ctx.textAlign = 'left';
  ctx.fillText('WAVE', lx, ly);
  ctx.fillStyle = '#f0c840';
  ctx.textAlign = 'right';
  const displayWaveR = waveState === 'countdown' ? waveNumber + 1 : waveNumber;
  ctx.fillText(`${displayWaveR} / ${MAX_WAVES}`, rEdge, ly);
  ctx.textAlign = 'left';
  ly += 7;

  const progress  = displayWaveR / MAX_WAVES;
  const barColor  = progress < 0.5 ? '#60c840' : progress < 0.8 ? '#e8c040' : '#e84040';
  ctx.fillStyle   = 'rgba(60,30,8,0.8)';
  ctx.beginPath(); ctx.roundRect(lx, ly, barW, 6, 3); ctx.fill();
  if (progress > 0) {
    ctx.fillStyle = barColor;
    ctx.beginPath(); ctx.roundRect(lx, ly, barW * progress, 6, 3); ctx.fill();
  }
  ly += 14;
  divider();

  if (waveState === 'active') {
    // ── COMBAT MODE: lives + on-field count ──────────────────────────────────
    const livesColor = lives <= 3 ? '#ff5050' : lives <= 7 ? '#ffaa50' : '#60ee80';
    const livesRatio = lives / STARTING_LIVES;

    ctx.font      = 'bold 11px monospace';
    ctx.fillStyle = '#c0a060';
    ctx.textAlign = 'left';
    ctx.fillText('DEFEND', lx, ly);
    // Active wave event badge (right-aligned, same line)
    if (currentWaveEvent) {
      ctx.font      = 'bold 8px monospace';
      ctx.fillStyle = 'rgba(255,200,60,0.85)';
      ctx.textAlign = 'right';
      ctx.fillText(currentWaveEvent.label, rEdge, ly);
      ctx.textAlign = 'left';
    }
    ly += 14;

    // Big lives bar
    ctx.fillStyle = 'rgba(60,30,8,0.8)';
    ctx.beginPath(); ctx.roundRect(lx, ly, barW, 9, 4); ctx.fill();
    ctx.fillStyle = livesColor;
    ctx.shadowColor = livesColor; ctx.shadowBlur = lives <= 5 ? 6 : 0;
    ctx.beginPath(); ctx.roundRect(lx, ly, barW * livesRatio, 9, 4); ctx.fill();
    ctx.shadowBlur = 0;
    ly += 13;

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = livesColor;
    ctx.textAlign = 'center';
    ctx.fillText(`${lives}`, px + pw / 2, ly); ly += 4;
    ctx.font = '11px monospace'; ctx.fillStyle = 'rgba(180,140,80,0.6)';
    ctx.fillText('lives remaining', px + pw / 2, ly); ly += 14;
    ctx.textAlign = 'left';

    divider();

    // On-field count + slain
    ctx.font = '11px monospace';
    const waveGoldNow = goldEarned - waveGoldStart;
    const onFieldRows = [
      { label: '◈ On field', value: `${enemies.filter(e => e.alive).length} / ${waveTotal}`, color: '#e8a060' },
      { label: '★ Slain',    value: `${waveSlainCount} / ${slain}`,      color: '#f0e060' },
      { label: '⚡ Leaked',   value: `${STARTING_LIVES - lives}`,        color: (STARTING_LIVES - lives) > 0 ? '#ff8080' : '#60e880' },
      { label: '◆ Wave',     value: `+${waveGoldNow}`,                  color: '#e8c040' },
    ];
    for (const r of onFieldRows) {
      ctx.fillStyle = '#e8d0a0'; ctx.textAlign = 'left';  ctx.fillText(r.label, lx, ly);
      ctx.fillStyle = r.color;   ctx.textAlign = 'right'; ctx.fillText(r.value, rEdge, ly);
      ctx.textAlign = 'left'; ly += 13;
    }

    // Top damage dealer
    if (towers.length > 0) {
      const top = towers.reduce((a, b) => b.damageDealt > a.damageDealt ? b : a, towers[0]);
      if (top.damageDealt > 0) {
        const def = TOWER_DEFS[top.type];
        ctx.fillStyle = '#e8d0a0'; ctx.textAlign = 'left';
        ctx.fillText('⚔ Top', lx, ly);
        ctx.fillStyle = def.color; ctx.textAlign = 'right';
        ctx.fillText(`${def.label} ${top.damageDealt}`, rEdge, ly);
        ctx.textAlign = 'left'; ly += 13;
      }
    }
  } else {
    // ── BREAK / COUNTDOWN MODE: incoming + economy ───────────────────────────
    const restWave = waveState === 'break' && BOSS_WAVES.has(waveNumber);
    ctx.font        = 'bold 11px monospace';
    if (restWave) {
      const rp = 0.7 + Math.sin(performance.now() * 0.003) * 0.3;
      ctx.fillStyle   = `rgba(80,200,120,${rp})`;
      ctx.shadowColor = `rgba(60,180,100,${rp * 0.6})`;
    } else {
      ctx.fillStyle   = '#f0c840';
      ctx.shadowColor = 'rgba(220,170,30,0.7)';
    }
    ctx.shadowBlur  = 6;
    ctx.fillText(waveState === 'countdown' ? 'PREPARE ▶SPC' : restWave ? 'REST WAVE' : 'INCOMING ▶SPC', lx, ly); ly += 14;
    ctx.shadowBlur  = 0;

    const nextIsBossWave = BOSS_WAVES.has(waveNumber + 1);
    const nextBossCfg    = nextIsBossWave ? BOSS_CONFIGS[waveNumber + 1] : null;

    if (nextIsBossWave && nextBossCfg) {
      const pulse = 0.6 + Math.sin(performance.now() * 0.004) * 0.4;
      ctx.font        = `bold 11px monospace`;
      ctx.fillStyle   = `rgba(255,${Math.round(80 + pulse * 60)},30,${0.7 + pulse * 0.3})`;
      ctx.shadowColor = 'rgba(255,80,20,0.8)';
      ctx.shadowBlur  = 6 + pulse * 6;
      ctx.textAlign   = 'left';
      ctx.fillText(nextBossCfg.name, lx, ly); ly += 14;
      ctx.font      = '11px monospace';
      ctx.fillStyle = 'rgba(200,140,80,0.75)';
      ctx.shadowBlur = 0;
      ctx.fillText('Herald squad + BOSS', lx, ly); ly += 14;
    } else {
      const next    = waveComposition(waveNumber + 1);
      const entries = [
        { label: 'Draugr', count: next.draugr,  color: '#7090a8', skip: next.draugr  === 0, boss: false, flying: false },
        { label: 'Myling', count: next.mylings,  color: '#60a840', skip: next.mylings === 0, boss: false, flying: true  },
        { label: 'Jötunn', count: next.jotunn,   color: '#40b0ff', skip: next.jotunn  === 0, boss: true,  flying: false },
        { label: 'Mara',   count: next.maras,    color: '#7040c0', skip: next.maras   === 0, boss: false, flying: false },
      ];
      let bossHeaderDrawn = false;
      ctx.font = '11px monospace';
      for (const e of entries) {
        if (e.skip) continue;
        if (e.boss && !bossHeaderDrawn) {
          ctx.font = 'bold 11px monospace'; ctx.fillStyle = 'rgba(220,130,30,0.7)'; ctx.textAlign = 'left';
          ctx.fillText('— BOSS —', lx + 4, ly); ly += 13;
          bossHeaderDrawn = true; ctx.font = '11px monospace';
        }
        ctx.beginPath(); ctx.arc(dotX, ly - 3, 4, 0, Math.PI * 2);
        ctx.fillStyle = e.color; ctx.fill();
        ctx.fillStyle = e.color; ctx.textAlign = 'left';
        ctx.fillText(e.label + (e.flying ? ' ▲' : ''), lx + 2, ly);
        ctx.fillStyle = '#e8c040'; ctx.textAlign = 'right';
        ctx.fillText(`×${e.count}`, rEdge, ly);
        ctx.textAlign = 'left'; ly += 15;
      }
    }

    // Wave event indicator for next wave
    const nextEv = WAVE_EVENTS[waveNumber + 1];
    if (nextEv) {
      ly += 2;
      const evPulse = 0.70 + Math.sin(performance.now() * 0.004) * 0.30;
      ctx.font        = 'bold 9px monospace';
      ctx.fillStyle   = `rgba(255,200,60,${evPulse})`;
      ctx.shadowColor = `rgba(240,160,20,${evPulse * 0.6})`;
      ctx.shadowBlur  = 5;
      ctx.textAlign   = 'left';
      ctx.fillText(nextEv.label, lx, ly); ly += 12;
      ctx.shadowBlur  = 0;
      ctx.font        = '9px monospace';
      ctx.fillStyle   = 'rgba(210,170,90,0.75)';
      ctx.fillText(nextEv.desc, lx, ly); ly += 10;
    }

    ly += 2;
    divider();

    // Last wave time
    if (lastWaveTimeSec > 0 && waveNumber > 0) {
      ctx.font = '9px monospace'; ctx.fillStyle = '#a0b8a0'; ctx.textAlign = 'left';
      ctx.fillText(`Last wave: ${lastWaveTimeSec}s`, lx, ly);
      ctx.textAlign = 'left'; ly += 12;
    }

    // Economy section (break only)
    ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#c0a060'; ctx.textAlign = 'left';
    ctx.fillText('ECONOMY', lx, ly); ly += 14;
    ctx.font = '11px monospace';
    const net = goldEarned - goldSpent;
    const lastWaveGold = goldEarned - waveGoldStart;
    const econRows = [
      { label: '◆ Earned',    value: `+${goldEarned}`,                   color: '#e8c040' },
      { label: '◆ Spent',     value: `-${goldSpent}`,                    color: 'rgba(200,140,60,0.75)' },
      { label: '◆ Net',       value: `${net >= 0 ? '+' : ''}${net}`,     color: net >= 0 ? '#a0e880' : '#ff9090' },
      { label: '◆ Last wave', value: `+${lastWaveGold}g`,                color: 'rgba(220,190,80,0.65)' },
    ];
    for (const r of econRows) {
      ctx.fillStyle = '#e8d0a0'; ctx.textAlign = 'left';  ctx.fillText(r.label, lx, ly);
      ctx.fillStyle = r.color;   ctx.textAlign = 'right'; ctx.fillText(r.value, rEdge, ly);
      ctx.textAlign = 'left'; ly += 13;
    }
  }

  // ── SPEED CONTROL — three triangle buttons (×1 / ×2 / ×4), always fixed ──────
  {
    const spBtnH  = 26;
    const spBtnY  = GRID_TOP + fullH - 168;   // fixed: always above rune forge
    const spBtnX  = px + 6;
    const spBtnW  = pw - 12;
    const bw      = Math.floor(spBtnW / 3);
    const speeds  = [1, 2, 4];
    speedBtns = [];

    // Helper: draw N right-pointing triangles centered at (cx, cy)
    function drawSpeedTriangles(cx, cy, n, color, size = 5) {
      const gap   = 3.5;
      const total = n * size + (n - 1) * gap;
      let tx = cx - total / 2;
      ctx.fillStyle = color;
      for (let i = 0; i < n; i++) {
        // For x4: arrange as 2×2 grid
        let ox = tx, oy = cy;
        if (n === 4) {
          const col = i % 2, row = Math.floor(i / 2);
          const g2 = 3;
          const total2 = 2 * size + g2;
          ox = cx - total2 / 2 + col * (size + g2);
          oy = cy + (row === 0 ? -3.5 : 3.5);
        }
        ctx.beginPath();
        ctx.moveTo(ox,          oy - size * 0.6);
        ctx.lineTo(ox + size,   oy);
        ctx.lineTo(ox,          oy + size * 0.6);
        ctx.closePath();
        ctx.fill();
        if (n !== 4) tx += size + gap;
      }
    }

    for (let i = 0; i < 3; i++) {
      const sp  = speeds[i];
      const bx  = spBtnX + i * bw;
      const active = gameSpeed === sp;
      const fill   = active
        ? (sp >= 4 ? 'rgba(200,55,18,0.97)' : sp >= 2 ? 'rgba(190,120,18,0.97)' : 'rgba(30,60,22,0.97)')
        : 'rgba(22,14,6,0.85)';
      const border = active
        ? (sp >= 4 ? 0.95 : sp >= 2 ? 0.85 : 0.70)
        : 0.22;
      const bStroke = active
        ? (sp >= 4 ? 'rgba(255,110,50,0.95)' : sp >= 2 ? 'rgba(255,180,50,0.88)' : 'rgba(80,200,80,0.8)')
        : 'rgba(160,110,40,0.25)';

      // Panel
      const rad = i === 0 ? [5,0,0,5] : i === 2 ? [0,5,5,0] : [0,0,0,0];
      ctx.save();
      ctx.beginPath(); ctx.roundRect(bx, spBtnY, bw, spBtnH, rad);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = bStroke; ctx.lineWidth = active ? 1.5 : 0.8; ctx.stroke();
      if (active) {
        ctx.shadowColor = bStroke; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.roundRect(bx, spBtnY, bw, spBtnH, rad);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();

      // Triangles
      const triColor = active
        ? (sp >= 4 ? '#ffb080' : sp >= 2 ? '#ffe090' : '#a0f080')
        : 'rgba(160,120,60,0.45)';
      const cy = spBtnY + spBtnH * 0.42;
      drawSpeedTriangles(bx + bw / 2, cy, sp === 1 ? 1 : sp === 2 ? 2 : 4, triColor, 4.5);

      // Speed label below triangles
      ctx.font      = `${active ? 'bold ' : ''}8px monospace`;
      ctx.fillStyle = active ? triColor : 'rgba(140,100,50,0.45)';
      ctx.textAlign = 'center';
      ctx.fillText(`×${sp}`, bx + bw / 2, spBtnY + spBtnH - 4);
      ctx.textAlign = 'left';

      speedBtns.push({ x: bx, y: spBtnY, w: bw, h: spBtnH, speed: sp });
    }

    // [F] hint below the row
    ctx.font      = '8px monospace';
    ctx.fillStyle = 'rgba(120,90,40,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('[F] cycle speed', spBtnX + spBtnW / 2, spBtnY + spBtnH + 9);
    ctx.textAlign = 'left';
  }

  // ── Rune inventory summary ───────────────────────────────────────────────────
  const totalOwned = Object.values(runeInventory).reduce((s, v) => s + v, 0);
  if (totalOwned > 0) {
    ctx.font = '9px monospace';
    for (const def of RUNE_DEFS) {
      const owned    = runeInventory[def.id] ?? 0;
      if (owned === 0) continue;
      const equipped = runeEquippedCount(def.id);
      ctx.fillStyle  = def.color; ctx.textAlign = 'left';
      ctx.fillText(`${def.symbol} ${def.label}`, lx, ly);
      ctx.fillStyle = 'rgba(180,160,100,0.7)'; ctx.textAlign = 'right';
      ctx.fillText(`${equipped}/${owned}`, rEdge, ly);
      ctx.textAlign = 'left';
      ly += 11;
    }
    ly += 2;
    divider();
  }

  // ── RUNE FORGE button (break/countdown only) ─────────────────────────────────
  if (!gameOver && waveState !== 'active') {
    const rfH = 40, rfY = GRID_TOP + fullH - 112, rfX = px + 6, rfW = pw - 12;
    const rfActive  = showRuneMenu;
    const hasStars  = stars > 0;
    const rfPulse   = hasStars ? 0.65 + Math.sin(performance.now() * 0.004) * 0.35 : 0;
    ctx.globalAlpha = hasStars ? 1 : 0.38;

    // Panel with warm amber-purple forge palette
    const rfFill   = rfActive ? 'rgba(28,14,52,0.98)' : 'rgba(16,8,36,0.96)';
    const rfBorder = rfActive ? 0.88 : (hasStars ? 0.55 : 0.2);
    ctx.save();
    if (hasStars && !rfActive) {
      ctx.shadowColor = `rgba(180,120,255,${rfPulse * 0.6})`;
      ctx.shadowBlur  = 12;
    }
    drawFantasyPanel(rfX, rfY, rfW, rfH, rfFill, rfBorder, 6);
    ctx.shadowBlur = 0;

    // Left anvil icon — two stacked rects evoking forge/anvil shape
    const iconX = rfX + 14, iconY = rfY + rfH / 2;
    ctx.fillStyle = rfActive ? '#c0a0ff' : (hasStars ? `rgba(160,120,220,${0.5 + rfPulse * 0.5})` : '#403050');
    ctx.fillRect(iconX - 6, iconY - 4, 12, 4);
    ctx.fillRect(iconX - 4, iconY,      8, 4);
    // Hammer
    ctx.save();
    ctx.translate(iconX + 1, iconY - 8);
    ctx.rotate(-0.5);
    ctx.fillStyle = rfActive ? '#e0d0ff' : (hasStars ? `rgba(200,180,255,${0.4 + rfPulse * 0.5})` : '#503860');
    ctx.fillRect(-1, 0, 2, 7);
    ctx.fillRect(-3, -3, 6, 3);
    ctx.restore();

    // RUNE FORGE label
    ctx.textAlign   = 'left';
    ctx.font        = `bold 10px monospace`;
    ctx.fillStyle   = rfActive ? '#d0b0ff' : (hasStars ? `rgba(180,140,255,${0.6 + rfPulse * 0.4})` : '#504060');
    ctx.shadowColor = rfActive ? 'rgba(180,120,255,0.7)' : 'rgba(140,80,220,0.4)';
    ctx.shadowBlur  = rfActive ? 10 : (hasStars ? rfPulse * 8 : 0);
    ctx.fillText('RUNE FORGE', rfX + 28, rfY + 17);
    ctx.shadowBlur  = 0;

    // Star count and keybind
    ctx.font      = '9px monospace';
    ctx.fillStyle = hasStars ? '#f0d040' : 'rgba(160,130,60,0.4)';
    ctx.fillText(hasStars ? `✦ ${stars} stars  [R]` : 'flawless waves earn ✦', rfX + 28, rfY + 30);

    ctx.restore();
    ctx.globalAlpha = 1;
    runeForgeBtn = hasStars ? { x: rfX, y: rfY, w: rfW, h: rfH } : null;
  } else {
    runeForgeBtn = null;
  }

  // ── NEXT WAVE ──────────────────────────────────────────────────────────────
  if (!gameOver && waveState !== 'active') {
    const btnH = 44;
    const btnY = GRID_TOP + fullH - btnH - 10;
    const btnX = px + 6;
    const btnW = pw - 12;

    ctx.shadowColor = 'rgba(200,30,20,0.8)'; ctx.shadowBlur = 12;
    drawFantasyPanel(btnX, btnY, btnW, btnH, 'rgba(140,18,18,0.97)', 0.92, 6);
    ctx.shadowBlur  = 0;
    ctx.textAlign   = 'center'; ctx.font = 'bold 11px monospace';
    ctx.fillStyle   = '#f0e8d0'; ctx.shadowColor = 'rgba(255,100,80,0.7)'; ctx.shadowBlur = 8;
    ctx.fillText('NEXT WAVE', btnX + btnW / 2, btnY + 17);
    ctx.font = '11px monospace'; ctx.shadowBlur = 0;
    if (autoNextWave) {
      ctx.fillStyle = '#60ee80';
      ctx.fillText('AUTO', btnX + btnW / 2, btnY + 32);
    } else {
      ctx.fillStyle = 'rgba(255,200,180,0.8)';
      ctx.fillText('[Space]', btnX + btnW / 2, btnY + 32);
    }
    nextWaveBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
  } else {
    nextWaveBtn = null;
  }

  ctx.restore();
}

function drawTopBar() {
  // Draw panel only in the visible strip between the frame and the grid top
  const FT  = FRAME_THICK;
  const pw  = BASE_W - FT * 2;
  const ph  = GRID_TOP - FT - 2;
  if (ph < 4) return; // not enough space
  drawFantasyPanel(FT, FT, pw, ph, 'rgba(42,22,6,0.97)');

  const barMid = FT + Math.round(ph / 2);
  const cy     = barMid + 4;
  ctx.save();

  // ── LEFT: avatar circle + title ─────────────────────────────────────────────
  const avX = FT + 16, avY = barMid, avR = 12;
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(80,42,10,0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,148,35,0.8)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.font      = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0c840';
  ctx.fillText('⚔', avX, avY + 4);

  ctx.font        = 'bold 11px monospace';
  ctx.fillStyle   = '#f0c840';
  ctx.shadowColor = 'rgba(220,170,40,0.7)';
  ctx.shadowBlur  = 8;
  ctx.textAlign   = 'left';
  ctx.fillText('NORTHERN SHIELD', avX + avR + 5, cy);
  ctx.shadowBlur  = 0;

  // ── CENTER: wave label + timer ───────────────────────────────────────────────
  const midX = Math.round(BASE_W / 2);
  const displayWave = waveState === 'countdown' ? waveNumber + 1 : waveNumber;
  const wLabel = `WAVE ${displayWave} / ${MAX_WAVES}`;

  ctx.font        = 'bold 13px monospace';
  ctx.fillStyle   = '#a8ecd0';
  ctx.shadowColor = 'rgba(100,220,160,0.45)';
  ctx.shadowBlur  = 6;
  ctx.textAlign   = 'center';
  ctx.fillText(wLabel, midX - 30, cy);
  ctx.shadowBlur  = 0;

  if (waveState !== 'active') {
    const readyPulse = 0.7 + Math.sin(performance.now() * 0.005) * 0.3;
    ctx.font        = 'bold 11px monospace';
    ctx.fillStyle   = autoNextWave ? `rgba(80,220,140,${readyPulse})` : `rgba(245,215,105,${readyPulse})`;
    ctx.shadowColor = autoNextWave ? 'rgba(50,200,100,0.6)' : 'rgba(220,180,40,0.5)';
    ctx.shadowBlur  = 4;
    ctx.fillText(autoNextWave ? 'AUTO' : 'READY', midX + 40, cy);
    ctx.shadowBlur  = 0;
  } else {
    const rem = spawnQueue.length + enemies.filter(e => e.alive).length;
    const remPulse = rem > 0 && rem <= 4 ? 0.75 + Math.sin(performance.now() * 0.008) * 0.25 : 1;
    ctx.font      = rem <= 4 && rem > 0 ? 'bold 12px monospace' : '11px monospace';
    ctx.fillStyle = rem === 0 ? '#60e880' : rem <= 4 ? `rgba(120,240,120,${remPulse})` : '#e8a060';
    ctx.fillText(`◈ ${rem}/${waveTotal}`, midX + 36, cy);
  }

  // ── RIGHT: resources ─────────────────────────────────────────────────────────
  let rx = BASE_W - FT - 8;
  ctx.font      = 'bold 11px monospace';
  ctx.textAlign = 'right';

  const livesDangerPulse = lives <= 3 ? 0.65 + Math.sin(performance.now() * 0.007) * 0.35 : 1;
  const livesLostFlash   = lifeLostTimer > 0 ? Math.min(1, lifeLostTimer / 20) * (lifeLostTimer > 60 ? 1 : lifeLostTimer / 60) : 0;
  const livesTopColor = livesLostFlash > 0 ? '#ff2020' : lives <= 3 ? '#ff4040' : lives <= 7 ? '#ffaa50' : '#60ee80';
  ctx.fillStyle   = livesTopColor;
  ctx.shadowColor = livesLostFlash > 0 ? `rgba(255,0,0,${livesLostFlash * 0.95})` : lives <= 3 ? `rgba(255,30,30,${livesDangerPulse * 0.85})` : 'rgba(255,80,80,0.3)';
  ctx.shadowBlur  = livesLostFlash > 0 ? 16 : lives <= 3 ? 6 + livesDangerPulse * 10 : 4;
  ctx.globalAlpha = livesLostFlash > 0 ? 0.7 + livesLostFlash * 0.3 : lives <= 3 ? 0.85 + livesDangerPulse * 0.15 : 1;
  ctx.fillText(`♥ ${lives}`, rx, cy);
  ctx.globalAlpha = 1;
  rx -= ctx.measureText(`♥ ${lives}`).width + 18;
  ctx.shadowBlur  = 0;

  // ── Gold ────────────────────────────────────────────────────────────────────
  const goldStr = `◆ ${gold}`;
  ctx.font        = 'bold 11px monospace';
  ctx.fillStyle   = hoardPulse > 0 ? '#fff8a0' : '#e8c040';
  ctx.shadowColor = 'rgba(220,180,30,0.5)';
  ctx.shadowBlur  = hoardPulse > 0 ? 8 : 3;
  ctx.fillText(goldStr, rx, cy);
  ctx.shadowBlur  = 0;
  rx -= ctx.measureText(goldStr).width + 18;

  ctx.fillStyle = '#b0d0f0';
  ctx.fillText(`★ ${slain}`, rx, cy);
  rx -= ctx.measureText(`★ ${slain}`).width + 18;

  // Stars (rune currency)
  if (stars > 0 || waveState !== 'active') {
    ctx.fillStyle   = '#f0d040';
    ctx.shadowColor = 'rgba(240,200,30,0.6)';
    ctx.shadowBlur  = 6;
    ctx.fillText(`✦ ${stars}`, rx, cy);
    ctx.shadowBlur  = 0;
    rx -= ctx.measureText(`✦ ${stars}`).width + 14;
  }

  // Mute + auto-next indicators (far left after title)
  ctx.font      = '10px monospace';
  ctx.textAlign = 'left';
  let lx2 = avX + avR * 2 + ctx.measureText('NORTHERN SHIELD').width + 20;
  if (autoNextWave) {
    ctx.fillStyle = '#60ee80';
    ctx.fillText('AUTO', lx2, cy);
    lx2 += ctx.measureText('AUTO').width + 10;
  }
  if (gameSpeed >= 2) {
    ctx.fillStyle = gameSpeed >= 4 ? '#ff8040' : '#f0c840';
    ctx.shadowColor = gameSpeed >= 4 ? 'rgba(255,100,20,0.6)' : 'rgba(240,180,20,0.4)';
    ctx.shadowBlur  = 4;
    ctx.fillText(`×${gameSpeed}`, lx2, cy);
    ctx.shadowBlur = 0;
    lx2 += ctx.measureText(`×${gameSpeed}`).width + 10;
  }
  ctx.fillStyle = isMuted ? '#ff6060' : '#506050';
  ctx.fillText(isMuted ? '◈MUTE' : '◈SFX', lx2, cy);

  ctx.restore();
}

function drawBottomBuildBar() {
  const INFO_H     = 22;
  const PORTRAIT_H = BUILD_BTN.h - INFO_H;

  const spriteKeys = {
    [TOWER_TYPES.BERSERK]:  'berserker',
    [TOWER_TYPES.VALKYRIE]: 'valkyrie',
    [TOWER_TYPES.MILITARY]: 'archer',
    [TOWER_TYPES.CATAPULT]: 'catapult',
    [TOWER_TYPES.BLONDIE]:  'blondie',
    [TOWER_TYPES.PILTORN]:  'piltorn',
    [TOWER_TYPES.HYDDA]:    'hydda',
    [TOWER_TYPES.ISJATTEN]: 'isjatten',
    [TOWER_TYPES.DRAKSHIP]: 'drakship',
  };

  const buttons     = getBuildButtons();
  const buildPanelX = GRID_LEFT + 2;
  const buildPanelW = COLS * CELL_SIZE - 4;
  const buildPanelY = GRID_BOTTOM + 4;
  const buildPanelH = BUILD_BTN.h + 22;
  drawFantasyPanel(buildPanelX, buildPanelY, buildPanelW, buildPanelH, 'rgba(42,22,6,0.97)');

  for (const btn of buttons) {
    const isSelected = btn.mode === CELL.WALL
      ? buildMode === CELL.WALL
      : buildMode === CELL.TOWER && selectedTowerType === btn.id;
    const affordable = gold >= btn.cost;

    const fillStyle   = isSelected ? 'rgba(70,40,10,0.97)' : 'rgba(18,9,28,0.92)';
    const borderAlpha = isSelected ? 0.90 : 0.35;
    drawFantasyPanel(btn.x, btn.y, btn.width, btn.height, fillStyle, borderAlpha, 6);

    // ── Portrait area ───────────────────────────────────────────────────────────
    const ppx = btn.x + 4;
    const ppy = btn.y + 4;
    const ppw = btn.width - 8;
    const pph = PORTRAIT_H - 4;

    const sprKey = spriteKeys[btn.id];
    const sp     = sprKey ? SPRITES[sprKey] : null;
    if (btn.mode === CELL.WALL) {
      // ── Shield Wall portrait: two round shields ─────────────────────────────
      const scx = ppx + ppw / 2;
      const scy = ppy + pph / 2;
      const shR = Math.min(pph * 0.40, ppw * 0.21);
      ctx.save();
      if (!affordable) ctx.globalAlpha = 0.55;
      for (const ox of [-ppw * 0.21, ppw * 0.21]) {
        const sx = scx + ox, sy = scy;
        ctx.fillStyle = '#3a2410';
        ctx.beginPath(); ctx.arc(sx, sy, shR, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.beginPath(); ctx.arc(sx, sy, shR - 1, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#b01808';
        ctx.fillRect(sx - shR, sy - shR, shR, shR);
        ctx.fillRect(sx, sy, shR, shR);
        ctx.fillStyle = '#d8c888';
        ctx.fillRect(sx, sy - shR, shR, shR);
        ctx.fillRect(sx - shR, sy, shR, shR);
        ctx.strokeStyle = 'rgba(20,10,4,0.55)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - shR, sy); ctx.lineTo(sx + shR, sy);
        ctx.moveTo(sx, sy - shR); ctx.lineTo(sx, sy + shR);
        ctx.stroke();
        ctx.restore();
        const bossR = shR * 0.18;
        ctx.fillStyle = '#706860';
        ctx.beginPath(); ctx.arc(sx, sy, bossR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(230,220,200,0.75)';
        ctx.beginPath(); ctx.arc(sx - bossR * 0.3, sy - bossR * 0.35, bossR * 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (sp && sp.img && sp.img.complete && sp.img.naturalWidth > 0) {
      ctx.save();
      if (!affordable) ctx.globalAlpha = 0.50;
      ctx.drawImage(sp.img, 0, 0, sp.frameW, sp.frameH, ppx, ppy, ppw, pph);
      ctx.restore();
    } else {
      // fallback: gem circle with tower color
      ctx.save();
      ctx.globalAlpha = affordable ? 1 : 0.4;
      ctx.beginPath();
      ctx.arc(btn.x + btn.width / 2, btn.y + PORTRAIT_H / 2 + 2, 13, 0, Math.PI * 2);
      ctx.fillStyle = affordable ? btn.color : 'rgba(60,45,30,0.5)';
      ctx.fill();
      ctx.restore();
    }

    // ── Hotkey badge top-left ───────────────────────────────────────────────────
    ctx.font      = 'bold 9px monospace';
    ctx.fillStyle = isSelected ? '#e8c040' : 'rgba(200,160,80,0.55)';
    ctx.textAlign = 'left';
    ctx.fillText(`[${btn.key}]`, btn.x + 4, btn.y + 11);

    // ── Info strip (bottom 26px) ────────────────────────────────────────────────
    const infoY = btn.y + btn.height - INFO_H;

    ctx.strokeStyle = isSelected ? 'rgba(220,170,50,0.4)' : 'rgba(160,120,40,0.2)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(btn.x + 4, infoY); ctx.lineTo(btn.x + btn.width - 4, infoY);
    ctx.stroke();

    const labelSz = btn.width < 60 ? 7 : 9;
    ctx.font      = `bold ${labelSz}px monospace`;
    ctx.fillStyle = !affordable ? '#3a3020' : isSelected ? '#f0e8d0' : '#c0b090';
    ctx.textAlign = 'left';
    ctx.fillText(btn.label, btn.x + 4, infoY + 11);

    ctx.font      = `${labelSz}px monospace`;
    ctx.textAlign = 'right';
    if (!affordable) {
      ctx.fillStyle = '#e84040';
      ctx.fillText(`◆${btn.cost}`, btn.x + btn.width - 3, infoY + 7);
      ctx.font      = `${labelSz - 1}px monospace`;
      ctx.fillStyle = '#ff6060';
      ctx.fillText(`-${btn.cost - gold}g`, btn.x + btn.width - 3, infoY + 16);
    } else {
      ctx.fillStyle = isSelected ? '#e8c040' : '#907840';
      ctx.fillText(`◆${btn.cost}`, btn.x + btn.width - 3, infoY + 11);
    }

    const abilityLabel = ABILITY_LABELS[btn.id];
    const towerDef = btn.mode === CELL.TOWER ? TOWER_DEFS[btn.id] : null;
    const rangeVal = towerDef?.range > 0 ? towerDef.range : null;
    if (abilityLabel) {
      ctx.font      = `${labelSz}px monospace`;
      ctx.fillStyle = !affordable ? '#2a2010' : isSelected ? 'rgba(160,200,255,0.9)' : 'rgba(100,140,190,0.6)';
      ctx.textAlign = rangeVal ? 'left' : 'center';
      ctx.fillText(abilityLabel, rangeVal ? btn.x + 4 : btn.x + btn.width / 2, infoY + 22);
    }
    if (rangeVal) {
      ctx.font      = `${labelSz}px monospace`;
      ctx.fillStyle = !affordable ? '#1a1008' : isSelected ? 'rgba(180,200,140,0.75)' : 'rgba(110,140,80,0.50)';
      ctx.textAlign = 'right';
      ctx.fillText(`r${rangeVal}`, btn.x + btn.width - 3, infoY + 22);
    }

    // Star-gate lock overlay
    const gate = TOWER_STAR_GATES[btn.id];
    if (gate && stars < gate) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.width, btn.height, 6); ctx.fill();
      const cy = btn.y + btn.height / 2;
      ctx.textAlign = 'center';
      const cx2 = btn.x + btn.width / 2;
      // Lock icon
      ctx.font = `${labelSz + 4}px monospace`; ctx.fillStyle = '#f0d040';
      ctx.shadowColor = 'rgba(240,190,20,0.7)'; ctx.shadowBlur = 8;
      ctx.fillText('🔒', cx2, cy - 2);
      ctx.shadowBlur = 0;
      // Stars needed
      ctx.font = `bold ${labelSz}px monospace`;
      ctx.fillStyle = '#f0d040';
      ctx.fillText(`✦ ${gate} ★`, cx2, cy + 13);
      // How many more
      const need = gate - stars;
      ctx.font = `${labelSz - 1}px monospace`;
      ctx.fillStyle = 'rgba(220,180,80,0.65)';
      ctx.fillText(`need ${need} more`, cx2, cy + 24);
      ctx.restore();
    }

    ctx.textAlign = 'left';
  }

  // Red pulse overlay when player can't afford any tower
  if (!gameOver && waveState !== 'countdown') {
    const cheapest = Math.min(...buttons.map(b => b.cost));
    if (gold < cheapest) {
      const ap = 0.12 + Math.sin(performance.now() * 0.005) * 0.08;
      ctx.save();
      ctx.fillStyle = `rgba(200,30,10,${ap})`;
      ctx.beginPath(); ctx.roundRect(buildPanelX, buildPanelY, buildPanelW, buildPanelH, 6); ctx.fill();
      ctx.restore();
    }
  }

  // Pulsing arrow hint above build bar on wave 1 before any tower placed
  if (!firstTowerPlaced && waveNumber <= 1 && !gameOver) {
    const firstBtn = getBuildButtons().find(b => b.mode !== CELL.WALL);
    if (firstBtn) {
      const pulse  = 0.55 + Math.sin(performance.now() * 0.006) * 0.45;
      const arrowX = firstBtn.x + firstBtn.width / 2;
      const arrowY = firstBtn.y - 10;
      ctx.save();
      ctx.fillStyle   = `rgba(255,230,80,${pulse * 0.90})`;
      ctx.shadowColor = `rgba(220,180,20,${pulse})`;
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY + 6);
      ctx.lineTo(arrowX - 6, arrowY - 4);
      ctx.lineTo(arrowX + 6, arrowY - 4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
}

function drawHud() {
  drawTopBar();
  drawBottomBuildBar();

  if (!gameOver) return;

  const { width, height } = getViewSize();
  const cx = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const cy = height / 2;

  ctx.fillStyle = 'rgba(3,1,8,0.82)';
  ctx.fillRect(0, 0, width, height);

  if (showTopList) {
    const pw = 380, ph = Math.min(60 + highScores.length * 30 + 60, 380);
    const px = cx - pw / 2, py = cy - ph / 2;
    drawFantasyPanel(px, py, pw, ph, 'rgba(6,2,14,0.97)', 0.85, 12);

    ctx.save();
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(220,170,30,0.8)';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = '#f0c840';
    ctx.font        = 'bold 22px monospace';
    ctx.fillText('HIGH SCORES', cx, py + 36);
    ctx.shadowBlur  = 0;

    ctx.textAlign = 'left';
    const colX = [px + 16, px + 42, px + 160, cx + 30, px + pw - 16];
    let   row   = py + 60;
    ctx.font      = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(200,160,40,0.6)';
    ctx.fillText('#', colX[0], row);
    ctx.fillText('Name', colX[1], row);
    ctx.fillText('Wave', colX[2], row);
    ctx.fillText('Slain', colX[3], row);
    ctx.textAlign = 'right';
    ctx.fillText('Gold', colX[4], row);
    row += 18;
    ctx.strokeStyle = 'rgba(200,160,40,0.2)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(px + 14, row - 6); ctx.lineTo(px + pw - 14, row - 6);
    ctx.stroke();

    highScores.forEach((s, i) => {
      const medal = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#a0b0c0';
      ctx.font      = i < 3 ? 'bold 11px monospace' : '11px monospace';
      ctx.fillStyle = medal;
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}`, colX[0], row);
      ctx.fillStyle = i < 3 ? medal : 'rgba(200,170,110,0.8)';
      ctx.fillText((s.name ?? 'Anonymous').slice(0, 12), colX[1], row);
      const waveLabel = s.cleared ? `${s.waves} ⭐` : `${s.waves}`;
      ctx.fillStyle = medal;
      ctx.fillText(waveLabel, colX[2], row);
      ctx.fillText(`${s.slain}`, colX[3], row);
      ctx.textAlign = 'right';
      ctx.fillText(`+${s.goldEarned}`, colX[4], row);
      if (s.date) {
        ctx.font      = '8px monospace';
        ctx.fillStyle = 'rgba(160,130,80,0.45)';
        ctx.fillText(s.date, colX[4], row + 11);
      }
      row += 30;
    });
    if (highScores.length === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(160,140,100,0.6)';
      ctx.font      = '12px monospace';
      ctx.fillText('No results yet', cx, row);
    }
    ctx.restore();

    const bbW = 160, bbH = 36;
    const bbX = cx - bbW / 2, bbY = py + ph - 50;
    drawFantasyPanel(bbX, bbY, bbW, bbH, 'rgba(8,6,22,0.97)', 0.7, 6);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font      = 'bold 13px monospace';
    ctx.fillStyle = '#a0c0e8';
    ctx.fillText('← BACK', cx, bbY + 23);
    ctx.restore();
    restartBtn = { x: bbX, y: bbY, w: bbW, h: bbH, action: 'back' };

  } else {
    const panelColor = victory ? 'rgba(2,12,6,0.97)' : 'rgba(6,2,14,0.97)';
    drawFantasyPanel(cx - 220, cy - 120, 440, 250, panelColor, 0.82, 12);
    ctx.save();
    ctx.textAlign = 'center';

    if (victory) {
      ctx.shadowColor = 'rgba(50,220,100,0.8)';
      ctx.shadowBlur  = 26;
      ctx.fillStyle   = '#40e880';
      ctx.font        = 'bold 38px monospace';
      ctx.fillText('VICTORY!', cx, cy - 32);
      ctx.shadowBlur  = 0;
      ctx.fillStyle   = '#f0c840';
      ctx.font        = '13px monospace';
      ctx.fillText('Northern Shield held for 100 waves', cx, cy - 4);
    } else {
      ctx.shadowColor = 'rgba(200,50,50,0.7)';
      ctx.shadowBlur  = 22;
      ctx.fillStyle   = '#e84040';
      ctx.font        = 'bold 44px monospace';
      ctx.fillText('DEFEATED', cx, cy - 30);
      ctx.shadowBlur  = 0;
    }
    ctx.fillStyle   = '#e8c040';
    ctx.font        = '14px monospace';
    ctx.fillText(`Enemies slain: ${slain}`, cx, cy + 2);
    ctx.fillText(`Waves: ${waveNumber}   Gold earned: ${goldEarned}`, cx, cy + 22);
    const livesLost = STARTING_LIVES - lives;
    if (livesLost > 0) {
      ctx.font      = '12px monospace';
      ctx.fillStyle = livesLost >= STARTING_LIVES ? '#ff6060' : '#ff9080';
      ctx.fillText(`Lives lost: ${livesLost} / ${STARTING_LIVES}`, cx, cy + 38);
    }
    if (stars > 0) {
      ctx.font      = '12px monospace';
      ctx.fillStyle = '#f0d040';
      ctx.shadowColor = 'rgba(240,190,20,0.6)'; ctx.shadowBlur = 6;
      ctx.fillText(`✦ ${stars} stars earned this run`, cx, cy + 54);
      ctx.shadowBlur = 0;
    }
    if (bestWave.wave > 0) {
      ctx.font      = '11px monospace';
      ctx.fillStyle = 'rgba(160,200,255,0.80)';
      ctx.fillText(`Best wave: W${bestWave.wave} — ${bestWave.slain} slain, +${bestWave.gold}g`, cx, stars > 0 ? cy + 70 : cy + 54);
    }
    // Next run motivation — show locked tower goals
    {
      const goalY = (stars > 0 || bestWave.wave > 0) ? cy + 86 : cy + 54;
      const nextGoal = stars < TOWER_STAR_GATES.isjatten
        ? `→ Earn ${TOWER_STAR_GATES.isjatten} ★ to unlock Isjatten`
        : stars < TOWER_STAR_GATES.drakship
          ? `→ Earn ${TOWER_STAR_GATES.drakship} ★ to unlock Drakship`
          : null;
      if (nextGoal) {
        ctx.font      = '10px monospace';
        ctx.fillStyle = 'rgba(200,200,255,0.55)';
        ctx.fillText(nextGoal, cx, goalY);
      }
    }
    ctx.restore();

    const rbW = 160, rbH = 38, tlW = 160, tlH = 38, gap = 12;
    const totalW = rbW + gap + tlW;
    const rbX = cx - totalW / 2,              rbY = cy + 88;
    const tlX = cx - totalW / 2 + rbW + gap,  tlY = cy + 88;

    drawFantasyPanel(rbX, rbY, rbW, rbH, 'rgba(8,26,8,0.97)', 0.75, 6);
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 13px monospace';
    ctx.fillStyle   = '#88ee66';
    ctx.shadowColor = 'rgba(100,220,80,0.55)';
    ctx.shadowBlur  = 10;
    ctx.fillText('PLAY AGAIN', rbX + rbW / 2, rbY + 25);
    ctx.restore();

    drawFantasyPanel(tlX, tlY, tlW, tlH, 'rgba(12,8,28,0.97)', 0.7, 6);
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 13px monospace';
    ctx.fillStyle   = '#e8c040';
    ctx.shadowColor = 'rgba(220,170,30,0.55)';
    ctx.shadowBlur  = 8;
    ctx.fillText('HIGH SCORES ★', tlX + tlW / 2, tlY + 25);
    ctx.restore();

    restartBtn = { x: rbX, y: rbY, w: rbW, h: rbH, action: 'restart' };
    toplistBtn = { x: tlX, y: tlY, w: tlW, h: tlH };
  }
}

function drawTowerPanel(tower) {
  const panelW = 162;
  const panelH = tower.maxed ? 134 : 148;
  panelRuneBtn = null;
  const { width, height } = getViewSize();

  let px = GRID_LEFT + gridPanX + tower.x * gridZoom - panelW / 2;
  let py = GRID_TOP  + gridPanY + tower.y * gridZoom - panelH - CELL_SIZE * gridZoom - 4;
  px = Math.max(GRID_LEFT + 4, Math.min(px, width - RIGHT_PANEL_W - panelW - 4));
  py = Math.max(GRID_TOP + 4, py);
  py = Math.max(8, Math.min(py, height - panelH - 8));

  drawFantasyPanel(px, py, panelW, panelH, 'rgba(4,2,12,0.97)', 0.88, 7);

  const def = TOWER_DEFS[tower.type];

  ctx.save();

  // Title + level
  ctx.font      = 'bold 11px monospace';
  ctx.fillStyle = def.color;
  ctx.textAlign = 'left';
  ctx.fillText(def.label.toUpperCase(), px + 10, py + 17);

  ctx.textAlign = 'right';
  ctx.fillStyle = tower.maxed ? '#ff9040' : '#e8c040';
  ctx.fillText(tower.maxed ? 'MAX' : `Lv ${tower.level}`, px + panelW - 10, py + 17);

  // Stats
  ctx.textAlign = 'left';
  ctx.font      = '11px monospace';
  ctx.fillStyle = '#8aaccc';
  if (tower.type === 'hydda') {
    ctx.fillText(`HEALS ${tower.level >= 5 ? 2 : 1} life every ${Math.round(tower.fireRate / 30)}s`, px + 10, py + 32);
  } else if (tower.type === 'blondie') {
    const slowPct = Math.round((1 - (def.slowFactor ?? 0.4)) * 100);
    const durSec  = Math.round((def.slowDuration ?? 60) / 30);
    ctx.fillText(`${slowPct}% SLOW · ${durSec}s · RNG ${tower.range}`, px + 10, py + 32);
  } else if (tower.type === 'isjatten') {
    ctx.fillText(`DMG ${tower.damage}  RNG ${tower.range}  AoE`, px + 10, py + 32);
  } else {
    const dps = tower.fireRate > 0 ? Math.round(tower.damage * 30 / tower.fireRate) : 0;
    ctx.fillText(`DMG ${tower.damage}  RNG ${tower.range}  DPS ~${dps}`, px + 10, py + 32);
  }

  if (!tower.maxed) {
    const n       = tower.level;
    const nextDmg = Math.round(tower.baseDamage * (1 + n * 0.25));
    const nextRng = Math.round(tower.baseRange  * (1 + n * 0.08));
    const nextFR  = Math.max(4, Math.round(tower.baseFireRate * (1 - n * 0.05)));
    ctx.font      = '9px monospace';
    ctx.fillStyle = 'rgba(120,200,120,0.65)';
    ctx.fillText(`▸ Lv${n + 1}: DMG ${nextDmg}  RNG ${nextRng}  SPD ${nextFR}`, px + 10, py + 43);
  }

  // Kill stats + damage dealt / synergy (right side)
  const killRow = tower.maxed ? py + 45 : py + 58;
  ctx.font      = '10px monospace';
  ctx.fillStyle = '#80aa70';
  ctx.fillText(`☠ ${tower.killCount ?? 0} kills`, px + 10, killRow);
  ctx.textAlign = 'right';
  if (tower._synergy) {
    const synLabels = { eagleEye: 'Eagle Eye +15%rng', siegeFury: 'Siege Fury +20%spl', winterGrip: "Winter's Grip +15%dmg" };
    const synColors = { eagleEye: '#88aaee', siegeFury: '#e87030', winterGrip: '#60c8f0' };
    ctx.fillStyle = synColors[tower._synergy];
    ctx.fillText(`⬡ ${synLabels[tower._synergy]}`, px + panelW - 10, killRow);
  } else if ((tower.damageDealt ?? 0) > 0) {
    ctx.fillStyle = '#c07050';
    ctx.fillText(`⚔ ${tower.damageDealt}`, px + panelW - 10, killRow);
  }
  ctx.textAlign = 'left';

  // Divider
  const divY = tower.maxed ? py + 53 : py + 66;
  ctx.strokeStyle = 'rgba(210,160,40,0.2)';
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  ctx.moveTo(px + 8, divY); ctx.lineTo(px + panelW - 8, divY);
  ctx.stroke();

  // Upgrade button
  const btnY  = tower.maxed ? py + 60 : py + 74;
  const btnH  = 28;
  const upgW  = 94;
  const sellW = 52;
  const upgX  = px + 8;
  const sellX = px + panelW - 8 - sellW;

  const canUpgrade = !tower.maxed && gold >= tower.upgradeCost;
  drawFantasyPanel(upgX, btnY, upgW, btnH,
    canUpgrade ? 'rgba(8,24,8,0.97)' : 'rgba(10,8,20,0.97)',
    canUpgrade ? 0.65 : 0.18, 4);

  ctx.textAlign = 'center';
  if (tower.maxed) {
    ctx.fillStyle = 'rgba(130,110,60,0.75)';
    ctx.font      = '10px monospace';
    ctx.fillText('MAXED', upgX + upgW / 2, btnY + 18);
  } else {
    ctx.font      = 'bold 10px monospace';
    ctx.fillStyle = canUpgrade ? '#88ee66' : '#3a4030';
    ctx.fillText(`Lv ${tower.level}→${tower.level + 1}`, upgX + upgW / 2, btnY + 12);
    ctx.font      = '10px monospace';
    ctx.fillStyle = canUpgrade ? '#e8c040' : '#e84040';
    ctx.fillText(`◆${tower.upgradeCost}`, upgX + upgW / 2, btnY + 23);
  }

  // Sell button — first click shows CONFIRM?, second click sells
  const isSellPending = pendingSell && pendingSell.key === `${tower.col}_${tower.row}`;
  drawFantasyPanel(sellX, btnY, sellW, btnH, isSellPending ? 'rgba(40,6,6,0.97)' : 'rgba(22,6,6,0.97)', isSellPending ? 0.85 : 0.55, 4);
  ctx.font      = 'bold 10px monospace';
  ctx.fillStyle = isSellPending ? '#ff4040' : '#ee6666';
  ctx.fillText(isSellPending ? 'CONFIRM?' : 'Sell', sellX + sellW / 2, btnY + 12);
  ctx.font      = '10px monospace';
  ctx.fillStyle = 'rgba(200,160,80,0.70)';  // muted vs upgrade cost's bright gold
  ctx.fillText(`◆${tower.sellValue}`, sellX + sellW / 2, btnY + 23);

  // ── Rune slot ───────────────────────────────────────────────────────────────
  const runeSecY = btnY + btnH + 4;
  ctx.strokeStyle = 'rgba(180,140,60,0.18)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(px + 8, runeSecY); ctx.lineTo(px + panelW - 8, runeSecY); ctx.stroke();

  const runeDef = tower.rune ? RUNE_DEFS.find(d => d.id === tower.rune) : null;
  ctx.font      = '9px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(130,110,70,0.7)';
  ctx.fillText('RUNE', px + 10, runeSecY + 13);

  if (runeDef) {
    ctx.fillStyle = runeDef.color;
    ctx.beginPath(); ctx.arc(px + 36, runeSecY + 9, 4, 0, Math.PI * 2); ctx.fill();
    ctx.font      = 'bold 9px monospace'; ctx.fillStyle = runeDef.color; ctx.textAlign = 'left';
    ctx.fillText(runeDef.label, px + 44, runeSecY + 13);
    ctx.font      = '8px monospace'; ctx.fillStyle = 'rgba(180,160,100,0.65)';
    ctx.fillText(runeDef.desc, px + 44, runeSecY + 24);
  } else {
    ctx.fillStyle = 'rgba(100,80,50,0.6)'; ctx.textAlign = 'left';
    ctx.fillText('— empty —', px + 36, runeSecY + 13);
  }

  if (waveState !== 'active') {
    const hasFreeRune = RUNE_DEFS.some(d => runeUnequippedCount(d.id) > 0);
    const rbtnW = 46, rbtnH = 20, rbtnX = px + panelW - 8 - rbtnW, rbtnY = runeSecY + 2;
    const rbtnActive = showRunePicker && runePickerTower === tower;
    drawFantasyPanel(rbtnX, rbtnY, rbtnW, rbtnH,
      rbtnActive ? 'rgba(30,20,60,0.97)' : (hasFreeRune || runeDef) ? 'rgba(10,20,10,0.97)' : 'rgba(14,10,6,0.97)',
      rbtnActive ? 0.9 : (hasFreeRune || runeDef) ? 0.55 : 0.18, 3);
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = rbtnActive ? '#c0a0ff' : (hasFreeRune || runeDef) ? '#88ee60' : '#504030';
    ctx.fillText(runeDef ? 'CHANGE' : 'EQUIP', rbtnX + rbtnW / 2, rbtnY + rbtnH / 2 + 3);
    panelRuneBtn = { x: rbtnX, y: rbtnY, w: rbtnW, h: rbtnH, tower };
  }

  ctx.restore();

  panelUpgradeBtn = { x: upgX,  y: btnY, w: upgW,  h: btnH };
  panelSellBtn    = { x: sellX, y: btnY, w: sellW, h: btnH };
}

function onBossPhase75(boss) {
  sfxBossPhase();
  screenShake = Math.max(screenShake, 8);
  spawnParticles(boss.x, boss.y, boss.highlightColor, 22);
  // Expanding flash ring — telegraphs the summon event
  bossRings.push({ x: boss.x, y: boss.y, r: boss.radius, maxR: boss.radius * 5.5, life: 34, maxLife: 34, color: boss.highlightColor });
  // Portal-side ring: shows WHERE the minions will spawn
  const spawnPx = GRID_LEFT + SPAWN.col * CELL_SIZE + CELL_SIZE / 2;
  const spawnPy = GRID_TOP  + SPAWN.row * CELL_SIZE + CELL_SIZE / 2;
  bossRings.push({ x: spawnPx, y: spawnPy, r: 6, maxR: 38, life: 44, maxLife: 44, color: '#ff4020' });
  portalFlash = 28;
  portalFlashColor = 'red';

  if (boss.waveNum === 10) {
    boss.stunTimer = 38;
    for (let i = 0; i < 4; i++) spawnEnemy(ENEMY_TYPES.DRAUGR, waveHpScale * 0.85);
  } else if (boss.waveNum === 75) {
    // Fenrir: howl stun + summon Mylings
    boss.stunTimer = 50;
    for (let i = 0; i < 6; i++) spawnEnemy(ENEMY_TYPES.MYLING, waveHpScale * 0.9);
  } else if (boss.waveNum === 100) {
    // Surtr: fire surge — summon 4 Jötunns + dramatic freeze
    boss.stunTimer = 60;
    for (let i = 0; i < 4; i++) spawnEnemy(ENEMY_TYPES.JOTUNN, waveHpScale * 0.7);
  }
}

function onBossPhase50(boss) {
  sfxBossPhase();
  // All bosses: speed surge + particles + screen event
  boss.baseSpeed   *= 1.28;
  boss.slowTimer    = 0;
  boss.slowFactor   = 1;
  screenShake       = Math.max(screenShake, 12);
  spawnParticles(boss.x, boss.y, boss.highlightColor, 35);
  spawnParticles(boss.x, boss.y, '#f5d030', 15);

  const cfg = BOSS_CONFIGS[boss.waveNum];
  if (cfg?.phase50SlowImmune) boss.slowImmune = true;

  if (boss.waveNum === 25) {
    // Jötunhelm Walker: EMP disables 2 random towers briefly
    const eligible = towers.filter(t => t.disabledTimer <= 0);
    const chosen   = eligible.sort(() => Math.random() - 0.5).slice(0, 2);
    for (const t of chosen) {
      t.disabledTimer = 90;
      empRings.push({ x: GRID_LEFT + t.x, y: GRID_TOP + t.y, r: 0, life: 28, maxLife: 28 });
    }
    boss.stunTimer = 30;
  } else if (boss.waveNum === 50) {
    // Mara-Void: summons 6 Mylings + stun pause
    boss.slowImmune = true;
    boss.stunTimer  = 45;
    for (let i = 0; i < 6; i++) spawnEnemy(ENEMY_TYPES.MYLING, waveHpScale * 0.80);
    bossRings.push({ x: boss.x, y: boss.y, r: boss.radius, maxR: boss.radius * 7, life: 40, maxLife: 40, color: '#9040e0' });
  }

  bossDefeatTimer = 150;
  bossDefeatText  = `${boss.bossName} — ENRAGED!`;
  bossDefeatGold  = 0;
}

function onBossKilled(boss) {
  stars         += 3;
  unlockAchievement('firstBoss');
  sfxDie(true);
  screenShake    = Math.max(screenShake, 28);
  hoardPulse     = 80;   // mega pulse on boss kill
  bossDefeatTimer = 210;
  bossDefeatText  = boss.bossName + ' DEFEATED';
  bossDefeatGold  = boss.reward;

  // Particle explosion
  spawnParticles(boss.x, boss.y, boss.highlightColor, 50);
  spawnParticles(boss.x, boss.y, '#f5d030', 25);
  spawnParticles(boss.x, boss.y, boss.color, 20);

  // Gold flood — coins respect pan/zoom so they arc from the correct screen position
  for (let i = 0; i < 10; i++) {
    spawnGoldCoins(
      GRID_LEFT + gridPanX + gridZoom * (boss.x + (Math.random() - 0.5) * boss.radius * 2),
      GRID_TOP  + gridPanY + gridZoom * (boss.y + (Math.random() - 0.5) * boss.radius * 2),
      20
    );
  }
}

function drawBossDefeat() {
  if (bossDefeatTimer <= 0) return;
  const alpha    = bossDefeatTimer > 30 ? 1 : bossDefeatTimer / 30;
  const cy       = GRID_TOP + ROWS * CELL_SIZE * 0.38;
  const cx       = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const isKill   = bossDefeatGold > 0;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign   = 'center';

  ctx.font        = 'bold 22px monospace';
  ctx.shadowColor = isKill ? 'rgba(40,220,80,0.95)' : 'rgba(255,160,20,0.95)';
  ctx.shadowBlur  = 20;
  ctx.fillStyle   = isKill ? '#60ee80' : '#ffe080';
  ctx.fillText(bossDefeatText, cx, cy);

  if (isKill) {
    ctx.font        = 'bold 13px monospace';
    ctx.shadowColor = 'rgba(255,210,30,0.9)';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#f5d030';
    ctx.fillText(`+${bossDefeatGold}g`, cx, cy + 20);
  }

  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawBossWarning() {
  if (bossWarnAlpha <= 0.01 || gameOver) return;
  const { width } = getViewSize();
  const cx      = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const bannerY = GRID_TOP + 36;
  const bannerW = 250, bannerH = 34;

  ctx.save();
  ctx.globalAlpha = bossWarnAlpha;
  ctx.fillStyle   = 'rgba(130,16,16,0.94)';
  ctx.beginPath();
  ctx.roundRect(cx - bannerW / 2, bannerY, bannerW, bannerH, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,70,30,0.75)';
  ctx.lineWidth   = 1.2;
  ctx.stroke();

  const bossCfg  = BOSS_CONFIGS[waveNumber + 1];
  const bossLabel = bossCfg ? bossCfg.name : 'BOSS';

  ctx.textAlign   = 'center';
  ctx.font        = 'bold 11px monospace';
  ctx.fillStyle   = '#f0e8d0';
  ctx.shadowColor = 'rgba(255,50,20,0.95)';
  ctx.shadowBlur  = 14;
  ctx.fillText(`⚠  ${bossLabel}  ⚠`, cx, bannerY + 14);
  ctx.font        = '11px monospace';
  ctx.fillStyle   = 'rgba(255,180,140,0.85)';
  ctx.shadowBlur  = 6;
  ctx.fillText('BOSS APPROACHING', cx, bannerY + 27);
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawWaveAnnouncement() {
  if (gameOver) return;
  if (waveState === 'active') return;

  // Render inside the right panel — never overlaps the grid
  const bannerX = GRID_LEFT + COLS * CELL_SIZE + 4;
  const bannerW = BASE_W - bannerX - 36;
  const bannerY = GRID_TOP + 2;
  const bannerH = 40;
  const accentW = 4;

  const nextW       = waveState === 'countdown' ? waveNumber : waveNumber + 1;
  const isBoss      = BOSS_WAVES.has(nextW);
  const nextEvent   = WAVE_EVENTS[nextW];
  const threatRatio = nextW / MAX_WAVES;
  const threatColor = isBoss ? '#ff4020' : threatRatio > 0.8 ? '#ff7020' : threatRatio > 0.5 ? '#e8c040' : '#60ee80';
  const threatIcon  = isBoss ? ' ☠' : nextEvent ? ` ${nextEvent.label.split(' ')[0]}` : threatRatio > 0.8 ? ' ⚡' : threatRatio > 0.5 ? ' ⚔' : '';

  let line1, line2, glowColor, statusColor, isComplete;
  if (waveState === 'countdown') {
    line1       = nextEvent ? nextEvent.desc : 'PREPARE';
    line2       = `WAVE ${nextW}${threatIcon}`;
    glowColor   = 'rgba(220,170,40,0.85)';
    statusColor = threatColor;
    isComplete  = false;
  } else {
    const flawless = flawlessTimer > 0;
    line1       = `WAVE ${waveNumber} DONE`;
    line2       = flawless ? '★ FLAWLESS' : (lastWaveTimeSec > 0 ? `${lastWaveTimeSec}s` : '');
    glowColor   = flawless ? 'rgba(240,210,40,0.9)' : 'rgba(80,220,140,0.8)';
    statusColor = flawless ? '#f0e060' : '#60ee80';
    isComplete  = true;
  }

  ctx.save();

  // Panel background
  ctx.beginPath(); ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 4);
  ctx.fillStyle = isComplete ? 'rgba(6,20,10,0.95)' : 'rgba(8,4,16,0.93)'; ctx.fill();
  ctx.strokeStyle = 'rgba(180,130,40,0.55)'; ctx.lineWidth = 1; ctx.stroke();
  // Left accent bar
  ctx.beginPath(); ctx.roundRect(bannerX, bannerY, accentW, bannerH, [4, 0, 0, 4]);
  ctx.fillStyle = statusColor; ctx.fill();

  const tx = bannerX + accentW + 8;

  // Line 1 — label (smaller, muted)
  ctx.font      = '9px monospace';
  ctx.fillStyle = 'rgba(180,150,90,0.75)';
  ctx.textAlign = 'left';
  ctx.fillText(line1, tx, bannerY + 14);

  // Line 2 — main text with glow
  if (line2) {
    const flawless = isComplete && flawlessTimer > 0;
    ctx.shadowColor = glowColor; ctx.shadowBlur = 10;
    ctx.fillStyle   = flawless ? '#f0e060' : (isComplete ? '#60ee80' : threatColor);
    ctx.font        = 'bold 11px monospace';
    ctx.fillText(line2, tx, bannerY + 30);
    ctx.shadowBlur  = 0;
  }

  // AUTO badge (top-right corner)
  if (autoNextWave) {
    const pulse = 0.75 + Math.sin(performance.now() * 0.005) * 0.25;
    ctx.font      = 'bold 8px monospace';
    ctx.fillStyle = `rgba(80,220,140,${pulse})`;
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(60,200,100,0.6)'; ctx.shadowBlur = 5;
    ctx.fillText('AUTO', bannerX + bannerW - 6, bannerY + 13);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawDmgFloaters() {
  if (dmgFloaters.length === 0) return;
  ctx.save();
  ctx.textAlign = 'center';
  // Two passes: large floaters first (bottom z), then small; each pass sets state once
  for (const large of [false, true]) {
    ctx.shadowBlur = large ? 10 : 6;
    for (const f of dmgFloaters) {
      if (!!f.large !== large) continue;
      const t   = 1 - f.life / f.maxLife;
      const alpha = f.life < 20 ? f.life / 20 : 1;
      const fy  = GRID_TOP + gridPanY + (f.y - t * 18) * gridZoom;
      const fx  = GRID_LEFT + gridPanX + f.x * gridZoom;
      ctx.globalAlpha = alpha;
      ctx.font        = `bold ${large ? Math.round(13 + t * 4) : Math.round(9 + t * 3)}px monospace`;
      ctx.fillStyle   = f.color;
      ctx.shadowColor = f.color;
      ctx.fillText(`+${f.val}${f.suffix ?? ''}`, fx, fy);
    }
  }
  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBossHpBar() {
  const boss = enemies.find(e => e.isBoss && e.alive && !e.reached);
  if (!boss) return;
  const cfg = BOSS_CONFIGS[boss.waveNum];
  const ratio   = Math.max(0, boss.hp / boss.maxHp);
  const barX    = GRID_LEFT + 10;
  const barY    = GRID_TOP  + 6;
  const barW    = COLS * CELL_SIZE - 20;
  const barH    = 10;
  const pulse   = 0.55 + Math.sin(performance.now() * 0.005) * 0.45;
  const hpColor = ratio > 0.5 ? '#40ee60' : ratio > 0.25 ? '#f0c040' : '#ff4040';

  ctx.save();
  const enrageAlpha = ratio <= 0.5 ? 0.55 + pulse * 0.35 : 0;
  ctx.fillStyle = enrageAlpha > 0 ? `rgba(180,30,10,${enrageAlpha * 0.4})` : 'rgba(0,0,0,0.65)';
  ctx.beginPath(); ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 4); ctx.fill();

  ctx.fillStyle = 'rgba(40,20,8,0.9)';
  ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 3); ctx.fill();

  if (ratio > 0) {
    ctx.fillStyle   = hpColor;
    ctx.shadowColor = hpColor; ctx.shadowBlur = ratio < 0.25 ? 8 * pulse : 0;
    ctx.beginPath(); ctx.roundRect(barX, barY, barW * ratio, barH, 3); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Phase threshold markers
  ctx.strokeStyle = 'rgba(240,190,30,0.70)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.moveTo(barX + barW * 0.5, barY - 2); ctx.lineTo(barX + barW * 0.5, barY + barH + 2); ctx.stroke();
  if (cfg?.phase75) {
    ctx.strokeStyle = 'rgba(200,140,20,0.50)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(barX + barW * 0.75, barY); ctx.lineTo(barX + barW * 0.75, barY + barH); ctx.stroke();
  }

  // Boss name — blinks rapidly when ENRAGED (≤50% HP)
  const enraged   = ratio <= 0.5;
  const blinkOn   = !enraged || (Math.floor(performance.now() / 180) % 2 === 0);
  ctx.font        = `bold 9px monospace`;
  ctx.fillStyle   = enraged ? hpColor : '#f0e0c0';
  ctx.globalAlpha = blinkOn ? 1 : 0.18;
  if (enraged) { ctx.shadowColor = hpColor; ctx.shadowBlur = 4; }
  ctx.textAlign   = 'left';
  ctx.fillText((cfg?.name ?? boss.bossName) + (enraged ? ' ⚡' : '') + '  ' + Math.ceil(boss.hp).toLocaleString() + ' HP', barX + 2, barY - 3);
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawFlawlessNotif() {
  if (flawlessTimer <= 0) return;
  const alpha = Math.min(1, flawlessTimer / 30) * (flawlessTimer < 60 ? flawlessTimer / 60 : 1);
  const t     = 1 - flawlessTimer / 180;
  const cy    = GRID_TOP + 28 + t * 8;
  ctx.save();
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 13px monospace';
  ctx.fillStyle   = `rgba(240,210,30,${alpha})`;
  ctx.shadowColor = `rgba(240,180,20,${alpha * 0.8})`;
  ctx.shadowBlur  = 12;
  ctx.fillText('+1 ✦  FLAWLESS!', BASE_W / 2, cy);
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawPauseOverlay() {
  const { width, height } = getViewSize();
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 28px monospace';
  ctx.fillStyle   = '#f0e8d0';
  ctx.shadowColor = 'rgba(200,150,30,0.7)';
  ctx.shadowBlur  = 20;
  ctx.fillText('PAUSED', width / 2, height / 2 - 10);
  ctx.shadowBlur  = 0;
  ctx.font        = '13px monospace';
  ctx.fillStyle   = '#806050';
  ctx.fillText('Press P to continue', width / 2, height / 2 + 18);
  ctx.restore();
}

function drawRunePicker() {
  runePickerBtns = [];
  if (!showRunePicker || !runePickerTower) return;
  const tower = runePickerTower;

  // Position picker near the tower panel — anchored to left-center of screen
  const pw = 190, ph = 24 + RUNE_DEFS.length * 34 + 28;
  let ppx = GRID_LEFT + gridPanX + tower.x * gridZoom - pw / 2;
  let ppy = GRID_TOP  + gridPanY + tower.y * gridZoom - ph - CELL_SIZE * gridZoom - 8;
  ppx = Math.max(GRID_LEFT + 4, Math.min(ppx, BASE_W - RIGHT_PANEL_W - pw - 4));
  ppy = Math.max(GRID_TOP + 4, Math.min(ppy, BASE_H - ph - 8));

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  drawFantasyPanel(ppx, ppy, pw, ph, 'rgba(8,4,18,0.98)', 0.9, 8);

  ctx.textAlign = 'center'; ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#c8a0ff'; ctx.shadowColor = 'rgba(180,100,255,0.5)'; ctx.shadowBlur = 8;
  ctx.fillText('EQUIP RUNE', ppx + pw / 2, ppy + 17);
  ctx.shadowBlur = 0;

  let ry = ppy + 26;
  const rowH = 34, bw = 48, bh = 22;

  for (const def of RUNE_DEFS) {
    const owned    = runeInventory[def.id] ?? 0;
    const equipped = runeEquippedCount(def.id);
    const isOnThis = tower.rune === def.id;
    const free     = owned - equipped + (isOnThis ? 1 : 0); // available if we unequip this tower
    const canEquip = free > 0;

    if (owned === 0) { ry += rowH; continue; }

    // Row bg for equipped-on-this-tower
    if (isOnThis) {
      ctx.fillStyle = 'rgba(160,120,255,0.08)';
      ctx.fillRect(ppx + 4, ry, pw - 8, rowH - 2);
    }

    // Swatch
    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(ppx + 16, ry + rowH / 2 - 1, 6, 0, Math.PI * 2); ctx.fill();

    // Name
    ctx.textAlign = 'left'; ctx.font = 'bold 9px monospace';
    ctx.fillStyle = isOnThis ? def.color : canEquip ? '#e0d0a0' : '#504030';
    ctx.fillText(def.label, ppx + 28, ry + 13);
    ctx.font = '8px monospace'; ctx.fillStyle = '#705040';
    ctx.fillText(def.desc, ppx + 28, ry + 24);

    const bx = ppx + pw - bw - 6, by = ry + (rowH - bh) / 2;
    drawFantasyPanel(bx, by, bw, bh,
      isOnThis ? 'rgba(50,20,80,0.97)' : canEquip ? 'rgba(10,30,10,0.97)' : 'rgba(14,10,6,0.97)',
      isOnThis ? 0.85 : canEquip ? 0.65 : 0.15, 3);
    ctx.textAlign = 'center'; ctx.font = 'bold 8px monospace';
    ctx.fillStyle = isOnThis ? '#c090ff' : canEquip ? '#88ee60' : '#403020';
    ctx.fillText(isOnThis ? 'ON' : 'EQUIP', bx + bw / 2, by + bh / 2 + 3);
    if (canEquip && !isOnThis) runePickerBtns.push({ x: bx, y: by, w: bw, h: bh, def, equip: true });

    ry += rowH;
  }

  // REMOVE button if tower has a rune
  if (tower.rune) {
    const rbx = ppx + pw / 2 - 36, rby = ppy + ph - 26, rbw = 72, rbh = 20;
    drawFantasyPanel(rbx, rby, rbw, rbh, 'rgba(30,6,6,0.97)', 0.65, 3);
    ctx.textAlign = 'center'; ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#ee6666';
    ctx.fillText('REMOVE RUNE', rbx + rbw / 2, rby + rbh / 2 + 3);
    runePickerBtns.push({ x: rbx, y: rby, w: rbw, h: rbh, remove: true });
  }
}

function drawRuneMenu() {
  runeMenuBtns = [];
  const W = BASE_W, H = BASE_H;
  const menuW = 400, menuH = 340;
  const mx = Math.round((W - menuW) / 2);
  const my = Math.round((H - menuH) / 2);

  // Dim backdrop with subtle vignette
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, W, H);

  // Main panel
  drawFantasyPanel(mx, my, menuW, menuH, 'rgba(8,4,20,0.99)', 0.88, 10);

  // Decorative header band
  ctx.save();
  ctx.beginPath(); ctx.roundRect(mx, my, menuW, 48, [10, 10, 0, 0]);
  ctx.fillStyle = 'rgba(28,14,52,0.98)'; ctx.fill();
  ctx.strokeStyle = 'rgba(160,100,240,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  // Horizontal rule below header
  ctx.strokeStyle = 'rgba(180,120,255,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(mx + 8, my + 48); ctx.lineTo(mx + menuW - 8, my + 48); ctx.stroke();
  ctx.restore();

  // Forge icon — anvil + hammer (drawn, center-left of header)
  const hicX = mx + 26, hicY = my + 24;
  const forgePulse = 0.6 + Math.sin(performance.now() * 0.005) * 0.4;
  ctx.save();
  ctx.shadowColor = `rgba(180,120,255,${forgePulse * 0.7})`; ctx.shadowBlur = 10;
  ctx.fillStyle   = `rgba(180,140,255,${0.5 + forgePulse * 0.4})`;
  // Anvil body
  ctx.fillRect(hicX - 9, hicY - 2, 18, 6);
  ctx.fillRect(hicX - 6, hicY + 4,  12, 4);
  // Hammer
  ctx.save();
  ctx.translate(hicX + 4, hicY - 8); ctx.rotate(-0.45);
  ctx.fillRect(-1.5, 0, 3, 10);
  ctx.fillRect(-4, -4, 8, 4);
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Header title
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 15px monospace';
  ctx.fillStyle   = '#e0c8ff';
  ctx.shadowColor = 'rgba(200,140,255,0.7)'; ctx.shadowBlur = 14;
  ctx.fillText('RUNE FORGE', mx + menuW / 2, my + 30);
  ctx.shadowBlur  = 0;
  ctx.font        = '9px monospace';
  ctx.fillStyle   = '#705070';
  ctx.fillText(`Spend ✦ stars to forge permanent power runes`, mx + menuW / 2, my + 42);

  // Star count badge (top-right of header)
  const sbW = 52, sbH = 20, sbX = mx + menuW - sbW - 10, sbY = my + 14;
  ctx.save();
  ctx.fillStyle = 'rgba(240,200,30,0.12)';
  ctx.beginPath(); ctx.roundRect(sbX, sbY, sbW, sbH, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(240,190,30,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#f0d040'; ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(240,200,30,0.6)'; ctx.shadowBlur = 6;
  ctx.fillText(`✦ ${stars}`, sbX + sbW / 2, sbY + sbH / 2 + 4);
  ctx.shadowBlur = 0; ctx.restore();

  // Close button [×]
  const clW = 20, clH = 20, clX = mx + menuW - clW - 6, clY = my + 6;
  ctx.save();
  ctx.fillStyle = 'rgba(80,40,40,0.6)';
  ctx.beginPath(); ctx.roundRect(clX, clY, clW, clH, 4); ctx.fill();
  ctx.font = 'bold 12px monospace'; ctx.fillStyle = 'rgba(200,120,100,0.7)'; ctx.textAlign = 'center';
  ctx.fillText('×', clX + clW / 2, clY + clH / 2 + 4);
  ctx.restore();

  // ── Rune rows ──────────────────────────────────────────────────────────────
  const rowH = 52, rowStart = my + 56;

  RUNE_DEFS.forEach((def, i) => {
    const ry       = rowStart + i * rowH;
    const owned    = runeInventory[def.id] ?? 0;
    const equipped = runeEquippedCount(def.id);
    const maxed    = owned >= def.maxOwned;
    const canBuy   = !maxed && stars >= def.cost;

    // Row background (alternating)
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.beginPath(); ctx.roundRect(mx + 8, ry + 2, menuW - 16, rowH - 4, 4); ctx.fill();
    }

    // Rune icon sprite (if loaded) or colored circle fallback
    const ICON_KEYS = { ironEdge: 'runeIronEdge', swiftStrike: 'runeSwiftStrike', frostRune: 'runeFrost', battleHymn: 'runeBattleHymn', valhalla: 'runeValhalla' };
    const iconKey = ICON_KEYS[def.id];
    const sp      = SPRITES[iconKey];
    const iconX   = mx + 22, iconY = ry + rowH / 2 - 1;
    if (sp) {
      ctx.save();
      ctx.shadowColor = def.color; ctx.shadowBlur = owned > 0 ? 8 : 2;
      ctx.globalAlpha = owned > 0 ? 1 : 0.35;
      ctx.drawImage(sp.img, iconX - 12, iconY - 12, 24, 24);
      ctx.restore();
    } else {
      ctx.save();
      ctx.shadowColor = def.color; ctx.shadowBlur = 6;
      ctx.fillStyle   = owned > 0 ? def.color : 'rgba(80,60,30,0.4)';
      ctx.beginPath(); ctx.arc(iconX, iconY, 9, 0, Math.PI * 2); ctx.fill();
      ctx.font = '11px monospace'; ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.textAlign = 'center';
      ctx.fillText(def.symbol, iconX, iconY + 4);
      ctx.shadowBlur = 0; ctx.restore();
    }

    // Rune name
    ctx.textAlign = 'left';
    ctx.font      = `bold 10px monospace`;
    ctx.fillStyle = owned > 0 ? '#e8d0a0' : 'rgba(180,140,80,0.5)';
    ctx.fillText(def.label, mx + 40, ry + 16);

    // Description
    ctx.font      = '9px monospace';
    ctx.fillStyle = owned > 0 ? '#807868' : 'rgba(100,80,50,0.5)';
    ctx.fillText(def.desc, mx + 40, ry + 27);

    // Owned pip track
    const pipStartX = mx + 40;
    for (let p = 0; p < def.maxOwned; p++) {
      const px2 = pipStartX + p * 14;
      const owned_pip = p < owned;
      const equipped_pip = p < equipped;
      ctx.beginPath(); ctx.arc(px2, ry + 40, 5, 0, Math.PI * 2);
      ctx.fillStyle = owned_pip ? def.color : 'rgba(60,40,20,0.6)';
      ctx.fill();
      if (equipped_pip) {
        ctx.beginPath(); ctx.arc(px2, ry + 40, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
      }
      if (owned_pip && !equipped_pip) {
        // unequipped owned — subtle ring to signal it's free
        ctx.beginPath(); ctx.arc(px2, ry + 40, 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.8; ctx.stroke();
      }
    }
    if (owned > 0) {
      ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(160,130,70,0.65)'; ctx.textAlign = 'left';
      ctx.fillText(`${equipped} equipped / ${owned} owned`, pipStartX + def.maxOwned * 14 + 6, ry + 43);
    }

    // Buy button
    const bw = 60, bh = 26;
    const bx = mx + menuW - bw - 12;
    const by = ry + (rowH - bh) / 2;
    const btnFill = maxed ? 'rgba(30,20,10,0.9)'
                  : canBuy ? 'rgba(14,36,8,0.97)' : 'rgba(18,10,30,0.9)';
    const btnBorder = maxed ? 0.15 : canBuy ? 0.75 : 0.22;
    ctx.save();
    if (canBuy) {
      ctx.shadowColor = 'rgba(80,220,60,0.4)'; ctx.shadowBlur = 8;
    }
    drawFantasyPanel(bx, by, bw, bh, btnFill, btnBorder, 5);
    ctx.shadowBlur = 0;
    ctx.textAlign  = 'center';
    ctx.font       = 'bold 10px monospace';
    ctx.fillStyle  = maxed ? '#403828' : canBuy ? '#88ee60' : 'rgba(160,110,200,0.45)';
    if (!maxed) {
      ctx.shadowColor = canBuy ? 'rgba(80,220,60,0.5)' : 'none'; ctx.shadowBlur = canBuy ? 6 : 0;
    }
    ctx.fillText(maxed ? 'FULL' : `✦ ${def.cost}`, bx + bw / 2, by + bh / 2 + 4);
    ctx.shadowBlur = 0;
    ctx.restore();

    if (!maxed) runeMenuBtns.push({ x: bx, y: by, w: bw, h: bh, idx: i });
  });

  // Footer hint
  ctx.textAlign = 'center'; ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(90,65,40,0.6)';
  ctx.fillText('Equip runes on towers by selecting a tower  •  Esc / R to close', mx + menuW / 2, my + menuH - 10);
}

function drawMapSelect() {
  mapSelectBtns = [];
  const W = BASE_W, H = BASE_H;
  const autoRemaining = mapAutoTimerStart > 0
    ? Math.max(0, MAP_AUTO_DELAY - (performance.now() - mapAutoTimerStart))
    : MAP_AUTO_DELAY;
  const autoFrac = autoRemaining / MAP_AUTO_DELAY; // 1 → 0
  const cardW = 178, cardH = 240;
  const gap   = 20;
  const totalW = cardW * 3 + gap * 2;
  const startX = Math.round((W - totalW) / 2);
  const startY = 108;

  // Title
  ctx.textAlign  = 'center';
  ctx.font       = 'bold 24px monospace';
  ctx.fillStyle  = '#f0e8d0';
  ctx.shadowColor = 'rgba(220,150,30,0.75)';
  ctx.shadowBlur  = 16;
  ctx.fillText('NORTHERN SHIELD', W / 2, 66);
  ctx.shadowBlur = 0;
  ctx.font       = '12px monospace';
  ctx.fillStyle  = '#907050';
  ctx.fillText('— SELECT YOUR MAP —', W / 2, 88);

  PRESET_MAPS.forEach((map, idx) => {
    const cx = startX + idx * (cardW + gap);
    const cy = startY;
    const selected = idx === selectedMapIdx;

    drawFantasyPanel(cx, cy, cardW, cardH,
      selected ? 'rgba(44,30,12,0.98)' : 'rgba(18,10,4,0.97)',
      selected ? 1.0 : 0.5, 10);

    if (selected) {
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 10);
      ctx.strokeStyle = 'rgba(230,165,30,0.95)';
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    }

    // Map name
    ctx.textAlign  = 'center';
    ctx.font       = 'bold 13px monospace';
    ctx.fillStyle  = selected ? '#f5e8c0' : '#b09060';
    ctx.shadowColor = selected ? 'rgba(230,160,30,0.6)' : 'none';
    ctx.shadowBlur  = selected ? 8 : 0;
    ctx.fillText(map.name, cx + cardW / 2, cy + 24);
    ctx.shadowBlur = 0;

    ctx.font      = '9px monospace';
    ctx.fillStyle = '#806040';
    ctx.fillText(map.desc, cx + cardW / 2, cy + 40);

    // Mini grid preview
    const pvX = cx + 12, pvY = cy + 54, pvW = cardW - 24, pvH = 108;
    const cw  = pvW / COLS, ch = pvH / ROWS;

    ctx.fillStyle   = 'rgba(8,18,8,0.85)';
    ctx.fillRect(pvX, pvY, pvW, pvH);
    ctx.strokeStyle = 'rgba(50,70,40,0.6)';
    ctx.lineWidth   = 0.5;
    ctx.strokeRect(pvX, pvY, pvW, pvH);

    // Faint grid lines
    ctx.strokeStyle = 'rgba(40,55,30,0.4)';
    ctx.lineWidth   = 0.3;
    for (let c = 1; c < COLS; c += 4) {
      const lx = pvX + c * cw;
      ctx.beginPath(); ctx.moveTo(lx, pvY); ctx.lineTo(lx, pvY + pvH); ctx.stroke();
    }
    for (let r = 1; r < ROWS; r += 4) {
      const ly = pvY + r * ch;
      ctx.beginPath(); ctx.moveTo(pvX, ly); ctx.lineTo(pvX + pvW, ly); ctx.stroke();
    }

    // Path curve from spawn to goal
    const spx = pvX + (map.spawn.col + 0.5) * cw;
    const spy = pvY + (map.spawn.row + 0.5) * ch;
    const gpx = pvX + (map.goal.col  + 0.5) * cw;
    const gpy = pvY + (map.goal.row  + 0.5) * ch;
    const cpx = (spx + gpx) / 2;
    const cpy = (spy + gpy) / 2 + (spy < gpy ? -18 : 18);

    ctx.beginPath();
    ctx.moveTo(spx, spy);
    ctx.quadraticCurveTo(cpx, cpy, gpx, gpy);
    ctx.strokeStyle = 'rgba(100,180,70,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    // Spawn dot
    ctx.beginPath(); ctx.arc(spx, spy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#50c830'; ctx.fill();
    ctx.font = '7px monospace'; ctx.fillStyle = '#50c830'; ctx.textAlign = 'center';
    ctx.fillText('S', spx, spy + 11);

    // Goal dot
    ctx.beginPath(); ctx.arc(gpx, gpy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f0c030'; ctx.fill();
    ctx.fillStyle = '#f0c030';
    ctx.fillText('G', gpx, gpy + 11);

    // Per-map best score
    const mapBest = _mapBests[map.name];
    if (mapBest) {
      ctx.font      = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = selected ? 'rgba(240,200,100,0.80)' : 'rgba(160,130,70,0.55)';
      ctx.fillText(`Best: W${mapBest.waves} · ${mapBest.slain} slain`, cx + cardW / 2, cy + cardH - 56);
    } else {
      ctx.font      = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(100,90,70,0.4)';
      ctx.fillText('No record yet', cx + cardW / 2, cy + cardH - 56);
    }

    // PLAY button
    const btnX = cx + 24, btnY = cy + cardH - 46, btnW = cardW - 48, btnH = 28;
    drawFantasyPanel(btnX, btnY, btnW, btnH,
      selected ? 'rgba(160,100,10,0.95)' : 'rgba(40,26,6,0.95)',
      selected ? 0.95 : 0.45, 5);
    ctx.font      = `bold 11px monospace`;
    ctx.fillStyle = selected ? '#fff5d0' : '#706040';
    ctx.textAlign = 'center';
    ctx.fillText(selected ? '▶  PLAY' : 'SELECT', btnX + btnW / 2, btnY + btnH / 2 + 4);

    // Auto-start countdown arc on the selected card's PLAY button
    if (selected && mapAutoTimerStart > 0) {
      const acx = btnX + btnW / 2, acy = btnY + btnH / 2;
      const ar  = btnW / 2 + 6;
      const startA = -Math.PI / 2;
      ctx.save();
      ctx.strokeStyle = `rgba(240,200,60,0.22)`;
      ctx.lineWidth   = 3;
      ctx.beginPath(); ctx.arc(acx, acy, ar, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(240,200,60,0.80)`;
      ctx.lineWidth   = 3;
      ctx.beginPath(); ctx.arc(acx, acy, ar, startA, startA + autoFrac * Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    mapSelectBtns.push({ x: cx, y: cy, w: cardW, h: cardH, idx });
  });

  ctx.font      = '9px monospace';
  ctx.fillStyle = '#403828';
  ctx.textAlign = 'center';
  ctx.fillText('Click to select  ·  click again to play', W / 2, startY + cardH + 20);

  // Auto-start countdown text
  if (mapAutoTimerStart > 0 && autoRemaining > 0) {
    const autoSecs = Math.ceil(autoRemaining / 1000);
    ctx.font      = '10px monospace';
    ctx.fillStyle = `rgba(200,160,60,${0.45 + (1 - autoFrac) * 0.45})`;
    ctx.fillText(`Auto-starting in ${autoSecs}s`, W / 2, startY + cardH + 38);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(gameScale, gameScale);
  drawBackground();

  if (gamePhase === 'mapSelect') {
    drawMapSelect();
    drawFrames();
    ctx.restore();
    return;
  }

  // Game world — clipped to grid area, zoom applied here (not to frame/UI)
  ctx.save();
  ctx.beginPath();
  ctx.rect(GRID_LEFT, GRID_TOP, COLS * CELL_SIZE, ROWS * CELL_SIZE);
  ctx.clip();
  if (screenShake > 0) screenShake *= 0.86;
  const _shakeMag = Math.min(screenShake, 4);
  const shakeX = _shakeMag > 0.3 ? (Math.random() - 0.5) * _shakeMag * 2 : 0;
  const shakeY = _shakeMag > 0.3 ? (Math.random() - 0.5) * _shakeMag * 2 : 0;
  ctx.translate(GRID_LEFT + gridPanX + shakeX, GRID_TOP + gridPanY + shakeY);
  ctx.scale(gridZoom, gridZoom);

  const time = performance.now() * 0.001;
  grid.healthRatio = Math.max(0, lives / STARTING_LIVES);
  grid.gold        = gold;
  grid.hoardPulse  = hoardPulse;

  // Grass terrain (blit pre-rendered offscreen canvas — free per frame)
  if (terrainCanvas) ctx.drawImage(terrainCanvas, 0, 0);

  // ── Hoard ambient glow — warm amber light radiating from Trelleborg ────────
  {
    const hgx   = GOAL.col * CELL_SIZE + CELL_SIZE / 2;
    const hgy   = GOAL.row * CELL_SIZE + CELL_SIZE / 2;
    const pulse  = hoardPulse > 0 ? 1 + (hoardPulse / 60) * 0.25 : 1;
    const targetR = Math.round(65 * pulse);
    if (_hoardGradR !== targetR) {
      _hoardGradCache = ctx.createRadialGradient(hgx, hgy, 0, hgx, hgy, targetR);
      _hoardGradCache.addColorStop(0,    'rgba(220,140,30,0.22)');
      _hoardGradCache.addColorStop(0.35, 'rgba(200,110,20,0.12)');
      _hoardGradCache.addColorStop(1,    'rgba(140,70,10,0)');
      _hoardGradR = targetR;
    }
    ctx.fillStyle = _hoardGradCache;
    ctx.beginPath();
    ctx.arc(hgx, hgy, targetR, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Wall slow-field frost haze (cached, invalidated on wall layout change) ─
  if (wallFrostDirty) {
    wallFrostCells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid.getCell(c, r) !== CELL.EMPTY) continue;
        const adj = [[c-1,r],[c+1,r],[c,r-1],[c,r+1]];
        if (adj.some(([nc,nr]) => grid.getCell(nc, nr) === CELL.WALL)) {
          wallFrostCells.push({ x: c * CELL_SIZE, y: r * CELL_SIZE, cs: CELL_SIZE });
        }
      }
    }
    wallFrostDirty = false;
  }
  if (wallFrostCells.length > 0) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle   = 'rgba(160,210,255,1)';
    for (const fc of wallFrostCells) ctx.fillRect(fc.x, fc.y, fc.cs, fc.cs);
    ctx.restore();
  }

  grid.draw(ctx, time, showGrid);
  drawPath();

  // Grid cell hover highlight
  if (!dragItem && hoverCol >= 0 && hoverRow >= 0 && !gameOver) {
    const hCell = grid.getCell(hoverCol, hoverRow);
    if (hCell !== null && hCell !== CELL.SPAWN && hCell !== CELL.GOAL) {
      const hx = hoverCol * CELL_SIZE, hy = hoverRow * CELL_SIZE;
      ctx.save();
      ctx.fillStyle = hCell === CELL.EMPTY ? 'rgba(255,255,200,0.08)' : 'rgba(255,200,100,0.06)';
      ctx.fillRect(hx, hy, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = 'rgba(255,240,160,0.18)';
      ctx.lineWidth   = 0.5;
      ctx.strokeRect(hx + 0.25, hy + 0.25, CELL_SIZE - 0.5, CELL_SIZE - 0.5);
      ctx.restore();
    }
  }

  towers.forEach(t => { t.selected = (t === selectedTower); t.draw(ctx); });

  // Rune badges — glowing indicator above each tower with an equipped rune
  {
    const now = performance.now();
    ctx.save();
    for (const t of towers) {
      if (!t.rune) continue;
      const def = RUNE_DEFS.find(d => d.id === t.rune);
      if (!def) continue;
      const pulse = 0.75 + Math.sin(now * 0.003 + t.col * 1.3) * 0.25;
      const bx = t.x + CELL_SIZE * 0.52;
      const by = t.y - CELL_SIZE * 1.15;
      const br = 4.5;
      ctx.shadowColor  = def.color;
      ctx.shadowBlur   = 9 * pulse;
      ctx.fillStyle    = 'rgba(4,2,12,0.90)';
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle  = def.color;
      ctx.lineWidth    = 1.3;
      ctx.globalAlpha  = 0.6 + pulse * 0.4;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha  = 1;
      ctx.fillStyle    = def.color;
      ctx.font         = '6px sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.symbol, bx, by);
    }
    ctx.shadowBlur   = 0;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign    = 'left';
    ctx.restore();
  }

  // Active synergy glow rings
  {
    const synColors = { eagleEye: 'rgba(120,160,240,0.32)', siegeFury: 'rgba(230,110,40,0.32)', winterGrip: 'rgba(80,200,240,0.32)' };
    const synPulse  = 0.5 + Math.sin(performance.now() * 0.004) * 0.5;
    ctx.save();
    for (const t of towers) {
      if (!t._synergy) continue;
      const col = synColors[t._synergy];
      if (!col) continue;
      ctx.strokeStyle = col.replace(/[\d.]+\)$/, `${0.28 + synPulse * 0.24})`);
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.lineDashOffset = -(performance.now() * 0.008) % 7;
      ctx.beginPath();
      ctx.arc(t.x, t.y, CELL_SIZE * 0.82, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Disabled-tower X overlay (EMP)
  if (waveState === 'active') {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,60,40,0.70)';
    ctx.lineWidth   = 1.5;
    for (const t of towers) {
      if (t.disabledTimer <= 0) continue;
      const r = CELL_SIZE * 0.38;
      ctx.globalAlpha = Math.min(1, t.disabledTimer / 20) * 0.75;
      ctx.beginPath();
      ctx.moveTo(t.x - r, t.y - r); ctx.lineTo(t.x + r, t.y + r);
      ctx.moveTo(t.x + r, t.y - r); ctx.lineTo(t.x - r, t.y + r);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Cooldown arcs — small reload indicator arc at tower base
  if (!gameOver && waveState === 'active') {
    ctx.save();
    for (const t of towers) {
      if (t.fireRate <= 0) continue;
      if (t.disabledTimer > 0) continue;
      const ratio = 1 - (t.fireCooldown / t.fireRate);
      if (ratio >= 0.99) continue;
      const r = CELL_SIZE * 0.45;
      const startA = -Math.PI / 2;
      ctx.strokeStyle = ratio > 0.66 ? '#60ee80' : ratio > 0.33 ? '#e8c040' : '#e84040';
      ctx.lineWidth   = 1.5;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, startA, startA + ratio * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Selection ring on active tower
  if (selectedTower && !gameOver) {
    const st = performance.now() * 0.001;
    ctx.save();
    ctx.strokeStyle    = 'rgba(255,255,180,0.75)';
    ctx.lineWidth      = 1.5;
    ctx.shadowColor    = 'rgba(255,240,100,0.8)';
    ctx.shadowBlur     = 8;
    ctx.setLineDash([4, 5]);
    ctx.lineDashOffset = -(st * 18) % 9;
    ctx.beginPath();
    ctx.arc(selectedTower.x, selectedTower.y, CELL_SIZE * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Pre-boss portal warning glow — red pulse during countdown/break before boss wave
  if (preBossPortalTimer > 0 && portalFlash <= 0 && !gameOver) {
    const { x: spx, y: spy } = grid.cellCenter(SPAWN.col, SPAWN.row);
    const pulse = 0.5 + Math.sin(preBossPortalTimer * 0.18) * 0.5;
    const fa    = 0.14 + pulse * 0.20;
    ctx.save();
    ctx.shadowColor = `rgba(220,20,20,${fa})`;
    ctx.shadowBlur  = 14 + pulse * 14;
    ctx.fillStyle   = `rgba(160,10,10,${fa * 0.45})`;
    ctx.beginPath();
    ctx.arc(spx, spy, CELL_SIZE * (0.85 + pulse * 0.18), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Portal flash on enemy spawn (drawn before enemies so they appear on top)
  if (portalFlash > 0) {
    const { x: spx, y: spy } = grid.cellCenter(SPAWN.col, SPAWN.row);
    const maxFrames = portalFlashColor === 'red' ? 32 : 14;
    const fa = (portalFlash / maxFrames) * 0.75;
    const [fr, fg, fb] = portalFlashColor === 'red' ? [255, 40, 20] : [60, 140, 255];
    ctx.save();
    ctx.shadowColor = `rgba(${fr},${fg},${fb},${fa})`;
    ctx.shadowBlur  = portalFlashColor === 'red' ? 36 : 20;
    ctx.fillStyle   = `rgba(${fr},${fg},${fb},${fa * 0.55})`;
    ctx.beginPath();
    ctx.arc(spx, spy, CELL_SIZE * (portalFlashColor === 'red' ? 1.2 : 0.85), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Catapult splash rings drawn BEFORE enemies so dying enemies render on top ─
  for (const sr of splashRings) {
    const alpha = (sr.life / sr.maxLife) * 0.75;
    ctx.save();
    ctx.strokeStyle = `rgba(220,130,40,${alpha})`;
    ctx.lineWidth   = 1.8;
    ctx.beginPath(); ctx.arc(sr.x, sr.y, sr.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  enemies.forEach(e => e.draw(ctx));

  bullets.forEach(b => b.draw(ctx));
  drawParticles();
  drawImpactFlashes();

  // ── Mara EMP shockwave rings ────────────────────────────────────────────────
  for (const er of empRings) {
    const alpha = (er.life / er.maxLife) * 0.7;
    ctx.save();
    ctx.strokeStyle = `rgba(130,60,220,${alpha})`;
    ctx.lineWidth   = 1.2;
    ctx.beginPath(); ctx.arc(er.x, er.y, er.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(180,100,255,${alpha * 0.55})`;
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.arc(er.x, er.y, er.r * 0.7, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // ── Boss phase rings (expanded amber/highlight burst on phase 75) ────────────
  for (let i = bossRings.length - 1; i >= 0; i--) {
    const br = bossRings[i];
    br.r    += (br.maxR - br.r) * 0.16;
    br.life--;
    if (br.life <= 0) { bossRings.splice(i, 1); continue; }
    const brAlpha = (br.life / br.maxLife) * 0.90;
    ctx.save();
    ctx.globalAlpha = brAlpha;
    ctx.strokeStyle = br.color || '#ffaa30';
    ctx.lineWidth   = 3;
    ctx.shadowColor = br.color || '#ffaa30';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(br.x, br.y, br.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.restore();
  }

  // ── Tower targeting lines — brief aimline from tower to last fired target ───
  if (!gameOver && waveState === 'active') {
    ctx.save();
    for (const t of towers) {
      if (!t.targetLineTimer || t.targetLineTimer <= 0) continue;
      const tlAlpha = (t.targetLineTimer / 12) * 0.35;
      ctx.strokeStyle = `rgba(255,230,100,${tlAlpha})`;
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.lastTargetX, t.lastTargetY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Isjätte nova rings ───────────────────────────────────────────────────────
  for (const nr of novaRings) {
    const alpha = (nr.life / nr.maxLife) * 0.80;
    ctx.save();
    ctx.shadowColor = `rgba(140,220,255,${alpha})`;
    ctx.shadowBlur  = 6;
    ctx.strokeStyle = `rgba(160,230,255,${alpha})`;
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.arc(nr.x, nr.y, nr.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(200,240,255,${alpha * 0.35})`;
    ctx.lineWidth   = 5;
    ctx.beginPath(); ctx.arc(nr.x, nr.y, nr.r * 0.6, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.restore();
  }

  // ── FORTRESS HELD celebration (flawless wave) ───────────────────────────────
  if (fortressHeldTimer > 0) {
    const ft    = fortressHeldTimer / 200;
    const alpha = ft > 0.8 ? (ft - 0.8) / 0.2 : (ft < 0.15 ? ft / 0.15 : 1);
    const hgx   = GOAL.col * CELL_SIZE + CELL_SIZE / 2;
    const hgy   = GOAL.row * CELL_SIZE + CELL_SIZE / 2 - 28;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font      = 'bold 13px monospace';
    ctx.fillStyle = `rgba(255,230,80,${alpha})`;
    ctx.shadowColor = `rgba(200,160,20,${alpha * 0.9})`;
    ctx.shadowBlur  = 10;
    ctx.fillText('FORTRESS HELD', hgx, hgy);
    ctx.font      = '11px monospace';
    ctx.fillStyle = `rgba(200,210,255,${alpha * 0.75})`;
    ctx.shadowBlur = 4;
    ctx.fillText('FLAWLESS WAVE', hgx, hgy + 13);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Path direction chevrons (wave 1 tutorial, first 4s) ──────────────────────
  if (pathChevronsTimer > 0 && _pathPts.length >= 2) {
    const pts2  = _pathPts;
    const pulse = 0.55 + Math.sin(performance.now() * 0.006) * 0.45;
    const alpha = Math.min(1, pathChevronsTimer / 30) * pulse;
    const chevSize = 4;
    ctx.save();
    ctx.fillStyle   = `rgba(255,230,80,${alpha * 0.85})`;
    ctx.shadowColor = `rgba(220,180,20,${alpha})`;
    ctx.shadowBlur  = 6;
    for (let i = 0; i < pts2.length - 1; i++) {
      const mx  = (pts2[i].x + pts2[i + 1].x) / 2;
      const my  = (pts2[i].y + pts2[i + 1].y) / 2;
      const ang = Math.atan2(pts2[i + 1].y - pts2[i].y, pts2[i + 1].x - pts2[i].x);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo( chevSize,          0);
      ctx.lineTo(-chevSize * 0.7, -chevSize * 0.6);
      ctx.lineTo(-chevSize * 0.7,  chevSize * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── LIFE LOST flash near hoard ────────────────────────────────────────────────
  if (lifeLostTimer > 0) {
    const alpha = Math.min(1, lifeLostTimer / 20) * (lifeLostTimer > 60 ? 1 : lifeLostTimer / 60);
    const hx    = GRID_LEFT + gridPanX + (GOAL.col + 0.5) * CELL_SIZE * gridZoom;
    const hy    = GRID_TOP  + gridPanY + (GOAL.row + 0.5) * CELL_SIZE * gridZoom - 42;
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 11px monospace';
    ctx.fillStyle   = `rgba(255,80,60,${alpha})`;
    ctx.shadowColor = `rgba(220,40,20,${alpha})`;
    ctx.shadowBlur  = 8;
    ctx.fillText(`LIFE LOST  (${lives} left)`, hx, hy);
    ctx.shadowBlur  = 0;
    ctx.restore();
  }

  // ── CHAIN KILL! burst text ────────────────────────────────────────────────────
  if (chainKillDisplay) {
    const prog  = chainKillDisplay.life / chainKillDisplay.maxLife;
    const alpha = prog < 0.2 ? prog / 0.2 : 1;
    const rise  = (1 - prog) * 14;
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 13px monospace';
    ctx.fillStyle   = `rgba(255,210,50,${alpha})`;
    ctx.shadowColor = `rgba(220,160,20,${alpha * 0.9})`;
    ctx.shadowBlur  = 10;
    ctx.fillText(`×${chainKillDisplay.count} CHAIN KILL!`, chainKillDisplay.x, chainKillDisplay.y - rise);
    ctx.shadowBlur  = 0;
    ctx.restore();
  }

  // Priority marker — pulsing chevron above the most advanced living enemy
  {
    const leader = enemies.reduce((best, e) => {
      if (!e.alive || e.reached) return best;
      if (!best || e.pathIndex > best.pathIndex) return e;
      return best;
    }, null);
    if (leader) {
      const pulse = 0.65 + Math.sin(performance.now() * 0.009) * 0.35;
      const lx = GRID_LEFT + gridPanX + leader.x * gridZoom;
      const ly = GRID_TOP  + gridPanY + (leader.y - leader.radius - 7) * gridZoom;
      const sz = (leader.isBoss ? 7 : 5) * gridZoom;
      const col = leader.isBoss ? `rgba(255,120,30,${0.75 * pulse})` : `rgba(255,55,35,${0.75 * pulse})`;
      ctx.save();
      ctx.fillStyle   = col;
      ctx.shadowColor = col;
      ctx.shadowBlur  = leader.isBoss ? 10 : 6;
      ctx.beginPath();
      ctx.moveTo(lx,       ly - sz);
      ctx.lineTo(lx - sz,  ly + sz * 0.4);
      ctx.lineTo(lx + sz,  ly + sz * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  ctx.restore();

  // Critical health vignette (screen-space) — gradient cached; alpha via globalAlpha
  if (!gameOver && lives <= 5) {
    const { width, height } = getViewSize();
    if (!_vigGradCache || width !== _vigCacheW || height !== _vigCacheH) {
      _vigGradCache = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.85);
      _vigGradCache.addColorStop(0, 'rgba(180,20,20,0)');
      _vigGradCache.addColorStop(1, 'rgba(180,20,20,1)');
      _vigCacheW = width; _vigCacheH = height;
    }
    ctx.globalAlpha = Math.max(0, (5 - lives) / 5) * 0.38;
    ctx.fillStyle   = _vigGradCache;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  drawRightPanel();
  drawHud();
  drawGoldCoins();
  drawBossWarning();
  drawBossDefeat();
  drawWaveAnnouncement();
  drawChapterBanner();
  drawMylingWarning();
  drawMaraEmpWarning();
  if (selectedTower && !gameOver) drawTowerPanel(selectedTower);
  drawPathBlockFlash();
  drawDragGhost();
  drawPendingSell();
  drawDmgFloaters();
  drawBossHpBar();
  drawFlawlessNotif();
  drawAchievementToasts();
  if (isPaused) drawPauseOverlay();

  // Endless mode banner
  if (endlessBanner > 0) {
    endlessBanner--;
    const alpha = endlessBanner > 60 ? 1 : endlessBanner / 60;
    const cy    = BASE_H / 2 - 20;
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 20px monospace';
    ctx.fillStyle   = `rgba(240,200,60,${alpha})`;
    ctx.shadowColor = `rgba(200,140,20,${alpha * 0.8})`;
    ctx.shadowBlur  = 18;
    ctx.fillText('∞ ENDLESS MODE UNLOCKED', BASE_W / 2, cy);
    ctx.font      = '13px monospace';
    ctx.fillStyle = `rgba(200,160,100,${alpha * 0.85})`;
    ctx.shadowBlur = 6;
    ctx.fillText('The realm stands. The siege does not end.', BASE_W / 2, cy + 24);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Rune menu overlay (break/countdown only)
  if (showRuneMenu && waveState !== 'active') drawRuneMenu();
  if (showRunePicker && runePickerTower) drawRunePicker();

  drawFrames();
  ctx.restore();
}

function drawChapterBanner() {
  if (chapterBannerTimer <= 0) return;
  chapterBannerTimer--;
  const alpha = chapterBannerTimer > 40 ? Math.min(1, (210 - chapterBannerTimer) / 20) : chapterBannerTimer / 40;
  const cx = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const cy = GRID_TOP + (ROWS * CELL_SIZE) / 2 - 20;
  ctx.save();
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 16px monospace';
  ctx.fillStyle   = `rgba(240,200,60,${alpha})`;
  ctx.shadowColor = `rgba(200,130,20,${alpha * 0.9})`;
  ctx.shadowBlur  = 20;
  ctx.fillText(chapterBannerText, cx, cy);
  ctx.font        = '10px monospace';
  ctx.fillStyle   = `rgba(200,160,80,${alpha * 0.75})`;
  ctx.shadowBlur  = 8;
  ctx.fillText('— THE SIEGE INTENSIFIES —', cx, cy + 18);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawMylingWarning() {
  if (mylingWarningTimer <= 0) return;
  const fadeAlpha = mylingWarningTimer < 60 ? mylingWarningTimer / 60 : 1;
  const cx = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const by = GRID_TOP + 22;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font      = 'bold 11px monospace';
  ctx.fillStyle   = `rgba(136,200,80,${fadeAlpha * 0.92})`;
  ctx.shadowColor = `rgba(100,160,40,${fadeAlpha * 0.8})`;
  ctx.shadowBlur  = 10;
  ctx.fillText('◆ MYLING — AIRBORNE, BYPASSES ALL WALLS', cx, by);
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawMaraEmpWarning() {
  if (maraEmpWarningTimer <= 0) return;
  const fadeAlpha = maraEmpWarningTimer < 60 ? maraEmpWarningTimer / 60 : 1;
  const cx = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const by = GRID_TOP + 36;
  ctx.save();
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 11px monospace';
  ctx.fillStyle   = `rgba(180,100,255,${fadeAlpha * 0.92})`;
  ctx.shadowColor = `rgba(140,60,220,${fadeAlpha * 0.8})`;
  ctx.shadowBlur  = 10;
  ctx.fillText('◆ MARA — EMP DISABLES NEARBY TOWERS', cx, by);
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawPathBlockFlash() {
  if (!pathBlockFlash) return;
  pathBlockFlash.timer--;
  if (pathBlockFlash.timer <= 0) { pathBlockFlash = null; return; }
  const { col, row, timer } = pathBlockFlash;
  const alpha = Math.min(1, timer / 20) * (timer % 8 < 4 ? 1 : 0.4); // strobe flash
  const vx = GRID_LEFT + gridPanX + col * CELL_SIZE * gridZoom;
  const vy = GRID_TOP  + gridPanY + row * CELL_SIZE * gridZoom;
  const vs = CELL_SIZE * gridZoom;
  ctx.save();
  ctx.globalAlpha  = alpha * 0.55;
  ctx.fillStyle    = '#e84040';
  ctx.fillRect(vx, vy, vs, vs);
  ctx.globalAlpha  = alpha * 0.9;
  ctx.strokeStyle  = '#ff4040';
  ctx.lineWidth    = 2;
  ctx.strokeRect(vx + 1, vy + 1, vs - 2, vs - 2);
  ctx.globalAlpha  = Math.min(1, timer / 20) * 0.92;
  ctx.font         = 'bold 9px monospace';
  ctx.fillStyle    = '#ff8080';
  ctx.textAlign    = 'center';
  ctx.shadowColor  = 'rgba(220,0,0,0.8)';
  ctx.shadowBlur   = 8;
  ctx.fillText('PATH BLOCKED', vx + vs / 2, vy - 4);
  ctx.shadowBlur   = 0;
  ctx.restore();
}

function drawPendingSell() {
  if (!pendingSell) return;
  const { col, row } = pendingSell;
  const tower = getTowerAtCell(col, row);
  const fp  = tower?.footprint ?? { w: 1, h: 1 };
  const vx  = GRID_LEFT + gridPanX + col * CELL_SIZE * gridZoom;
  const vy  = GRID_TOP  + gridPanY + row * CELL_SIZE * gridZoom;
  const vsW = fp.w * CELL_SIZE * gridZoom;
  const vsH = fp.h * CELL_SIZE * gridZoom;
  const pulse = 0.55 + Math.sin(performance.now() * 0.012) * 0.35;
  ctx.save();
  ctx.beginPath();
  ctx.rect(GRID_LEFT, GRID_TOP, COLS * CELL_SIZE, ROWS * CELL_SIZE);
  ctx.clip();
  ctx.fillStyle   = `rgba(220,140,20,${pulse * 0.28})`;
  ctx.fillRect(vx, vy, vsW, vsH);
  ctx.strokeStyle = `rgba(255,180,40,${pulse})`;
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(vx + 1, vy + 1, vsW - 2, vsH - 2);
  ctx.setLineDash([]);
  ctx.font      = 'bold 9px monospace';
  ctx.fillStyle = `rgba(255,200,180,${pulse})`;
  ctx.textAlign = 'center';
  const sellCountdown = Math.max(1, Math.ceil(pendingSell.timer / 30));
  ctx.fillText(`SELL? (${sellCountdown}s)`, vx + vsW / 2, vy + vsH / 2 - 3);
  if (tower) {
    ctx.font      = '8px monospace';
    ctx.fillStyle = `rgba(240,200,60,${pulse * 0.8})`;
    ctx.fillText(`Refund: ◆${tower.sellValue}`, vx + vsW / 2, vy + vsH / 2 + 9);
  } else {
    ctx.font      = '8px monospace';
    ctx.fillStyle = `rgba(240,200,60,${pulse * 0.8})`;
    ctx.fillText(`Refund: ◆${Math.floor(WALL_COST * 0.5)}`, vx + vsW / 2, vy + vsH / 2 + 9);
  }
  ctx.restore();
}

function drawDragGhost() {
  if (!dragItem) return;

  // Convert outer-game cursor to grid-local coords for cell detection
  const { x: glx, y: gly } = outerToGridLocal(dragX, dragY);
  const col    = Math.floor(glx / CELL_SIZE);
  const row    = Math.floor(gly / CELL_SIZE);
  const onGrid = col >= 0 && col < COLS && row >= 0 && row < ROWS;

  if (onGrid) {
    // Get footprint for multi-cell towers
    const fp = (dragItem.mode === CELL.TOWER)
      ? (TOWER_DEFS[dragItem.id]?.footprint ?? { w: 1, h: 1 })
      : { w: 1, h: 1 };

    // Check all footprint cells
    let canPlace = gold >= dragItem.cost;
    if (canPlace) {
      for (let dc = 0; dc < fp.w && canPlace; dc++) {
        for (let dr = 0; dr < fp.h && canPlace; dr++) {
          const tc = col + dc, tr2 = row + dr;
          if (tc >= COLS || tr2 >= ROWS || grid.getCell(tc, tr2) !== CELL.EMPTY || hasEnemyInCell(tc, tr2))
            canPlace = false;
        }
      }
    }
    if (canPlace) {
      for (let dc = 0; dc < fp.w; dc++)
        for (let dr = 0; dr < fp.h; dr++)
          grid.setCell(col + dc, row + dr, dragItem.mode);
      if (!grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row)) canPlace = false;
      for (let dc = 0; dc < fp.w; dc++)
        for (let dr = 0; dr < fp.h; dr++)
          grid.setCell(col + dc, row + dr, CELL.EMPTY);
    }

    const fpVX = GRID_LEFT + gridPanX + col * CELL_SIZE * gridZoom;
    const fpVY = GRID_TOP  + gridPanY + row * CELL_SIZE * gridZoom;
    const fpVW = fp.w * CELL_SIZE * gridZoom;
    const fpVH = fp.h * CELL_SIZE * gridZoom;
    ctx.save();
    ctx.beginPath();
    ctx.rect(GRID_LEFT, GRID_TOP, COLS * CELL_SIZE, ROWS * CELL_SIZE);
    ctx.clip();
    ctx.fillStyle   = canPlace ? 'rgba(80,220,80,0.28)' : 'rgba(220,60,60,0.42)';
    ctx.fillRect(fpVX, fpVY, fpVW, fpVH);
    ctx.strokeStyle = canPlace ? 'rgba(120,255,120,0.75)' : 'rgba(255,80,80,0.75)';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(fpVX + 0.75, fpVY + 0.75, fpVW - 1.5, fpVH - 1.5);

    // Range ring preview for towers
    if (dragItem.mode === CELL.TOWER) {
      const tRange = TOWER_DEFS[dragItem.id]?.range ?? 0;
      if (tRange > 0) {
        const cx2 = fpVX + fpVW / 2;
        const cy2 = fpVY + fpVH / 2;
        ctx.strokeStyle = TOWER_DEFS[dragItem.id]?.rangeColor ?? 'rgba(200,200,200,0.3)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(cx2, cy2, tRange * gridZoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  // Ghost card floating above cursor
  const gw = 64, gh = 46;
  const gx = dragX - gw / 2;
  const gy = dragY - gh - 12;
  const cx = gx + gw / 2;

  ctx.save();
  ctx.globalAlpha = 0.88;
  drawFantasyPanel(gx, gy, gw, gh, 'rgba(18,9,28,0.96)', 0.9, 6);

  const _ghostSpriteKeys = {
    [TOWER_TYPES.BERSERK]:  'berserker',
    [TOWER_TYPES.VALKYRIE]: 'valkyrie',
    [TOWER_TYPES.MILITARY]: 'archer',
    [TOWER_TYPES.CATAPULT]: 'catapult',
    [TOWER_TYPES.BLONDIE]:  'blondie',
  };
  const _gsp = SPRITES[_ghostSpriteKeys[dragItem.id]];
  const ppx = gx + 4, ppy = gy + 3, ppw = gw - 8, pph = gh - 20;
  if (_gsp && _gsp.img.complete && _gsp.img.naturalWidth > 0) {
    ctx.drawImage(_gsp.img, 0, 0, _gsp.frameW, _gsp.frameH, ppx, ppy, ppw, pph);
  } else {
    ctx.beginPath();
    ctx.arc(cx, gy + 14, 10, 0, Math.PI * 2);
    ctx.fillStyle = dragItem.color;
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.font      = 'bold 10px monospace';
  ctx.fillStyle = '#f0e8d0';
  ctx.fillText(dragItem.label, cx, gy + 31);

  ctx.font      = '10px monospace';
  ctx.fillStyle = gold >= dragItem.cost ? '#e8c040' : '#ff6060';
  ctx.fillText(`◆${dragItem.cost}`, cx, gy + gh - 3);
  ctx.restore();
}

function gameLoop() {
  // Terrain is always procedural — no sprite rebake needed
  // Auto-launch countdown on map select screen
  if (gamePhase === 'mapSelect') {
    if (mapAutoTimerStart === 0) mapAutoTimerStart = performance.now();
    if (performance.now() - mapAutoTimerStart >= MAP_AUTO_DELAY) {
      initGame(PRESET_MAPS[selectedMapIdx]);
    }
  }
  _frameTick++;
  // 1x=30 ticks/s (alt frames), 2x=60 ticks/s (every frame), 4x=120 ticks/s (2 per frame)
  const _ticks = gameSpeed >= 4 ? 2 : (gameSpeed >= 2 || _frameTick % 2 === 1) ? 1 : 0;
  for (let _i = 0; _i < _ticks; _i++) update();
  draw();
  requestAnimationFrame(gameLoop);
}

computeScale();
window.addEventListener('resize', computeScale);
initTerrain();
gameLoop();
