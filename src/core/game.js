import { ctx, canvas } from './renderer.js';
import { Grid, CELL } from '../grid/grid.js';
import { Enemy, ENEMY_TYPES, ENEMY_DEFS } from '../entities/enemy.js';
import { Tower, TOWER_DEFS, TOWER_TYPES } from '../entities/tower.js';
import { SPRITES } from '../assets.js';
import { getSpriteScale, setSpriteScale, changeSpriteScale } from '../config.js';
import { migrateLegacySaves, saveCampaign } from '../campaign/save.js';
import { Roster } from '../roster/roster.js';
import { ROMAN, Defender, CAREER_XP, XP_PER_KILL, XP_PER_WAVE } from '../roster/defender.js';
import { getDefenderName } from '../roster/names.js';
import { ITEM_DEFS, BOSS_DROP_TABLE, RARITY_COLOR, getItemBonuses } from '../roster/items.js';
import { TALENT_DEFS, CLASS_TALENTS, getTalentBonuses } from '../roster/talents.js';
import { FORTRESS_DEFS, getFortressBonuses } from '../fortress/fortress.js';
import {
  ensureAudio, setMuted, sfxShoot, sfxNova, sfxDie,
  sfxPlace, sfxLifeLost, sfxHeal, sfxUpgrade, sfxBossPhase,
  sfxRune, sfxSell, sfxSplash, sfxChainKill, sfxEmp, sfxWaveStart, sfxGameOver,
  sfxFlawless, sfxWaveDone, sfxEndlessStart, sfxEndlessMilestone,
  sfxTalentUnlock, sfxLootDrop, sfxFortressUpgrade, sfxRecruit, sfxDismiss, sfxRename,
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

const WALL_COST = 12;

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
  { id: 'wall', label: 'Shield Wall', key: '1', color: '#6e5038', cost: WALL_COST, mode: CELL.WALL, category: 'walls' },
  ...Object.values(TOWER_TYPES).map(type => ({
    id:       type,
    label:    TOWER_DEFS[type].label,
    key:      TOWER_DEFS[type].key,
    color:    TOWER_DEFS[type].color,
    glowRgb:  TOWER_DEFS[type].glowRgb,
    cost:     TOWER_DEFS[type].cost,
    mode:     CELL.TOWER,
    category: (['berserk', 'valkyrie', 'military'].includes(type)) ? 'warriors'
             : (['catapult', 'drakship', 'piltorn'].includes(type)) ? 'siege'
             : (['blondie', 'hydda', 'isjatten'].includes(type))    ? 'mystic'
             : 'warriors',
  }))
];

const STARTING_GOLD  = 120;
const RECRUIT_COST   = 30;    // goldReserve cost to recruit a new defender between battles
let   STARTING_LIVES = 8;

const grid = new Grid(COLS, ROWS, CELL_SIZE);
grid.setCell(SPAWN.col, SPAWN.row, CELL.SPAWN);
grid.setCell(GOAL.col,  GOAL.row,  CELL.GOAL);

let currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
let enemies  = [];
let towers   = [];
let bullets  = [];
let gold          = STARTING_GOLD;
let _displayGold  = STARTING_GOLD;  // animated display value, lerps toward gold
let lives         = STARTING_LIVES;
let slain         = 0;
let bossesDefeated = 0;
let buildMode         = CELL.TOWER;
let selectedTowerType = TOWER_TYPES.BERSERK;
let gameOver = false;

let selectedTower   = null;
let panelUpgradeBtn = null;
let panelSellBtn    = null;
let restartBtn      = null;
let toplistBtn      = null;
let nextWaveBtn     = null;
let autoNextBtn     = null;
let runeForgeBtn    = null;
let gameSpeed  = 1;
let speedBtns  = [];   // [{x,y,w,h,speed}, ...]
let _frameTick = 0;
let rightPanelScale = 1.0;

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
let _runeForgeHintTimer = 0; // one-time post-first-boss rune forge hint (frames)

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
let mylingWarningTimer  = 0;    // frames remaining for first-Myling warning banner
let maraEmpWarningTimer = 0;   // frames remaining for first-Mara EMP warning banner
let jotunnWarningTimer  = 0;   // frames remaining for first-Jötunn warning banner
let chainKillDone     = new Set();  // per-tower chain kill (catapult 3+), cleared each wave
let _synergyDirty    = true;        // recompute synergy pairs on next tick
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
let showHelp        = false;    // ? / H key toggles shortcut cheatsheet

// Floating kill-gold numbers
let dmgFloaters     = [];       // { x, y, val, life, maxLife, color }

// Agent-pass improvements
let poorWaveStreak     = 0;       // consecutive waves player started with <15g
let chapterBannerTimer = 0;       // frames to show chapter milestone banner
let chapterBannerText  = '';      // text to display in chapter banner
let currentWaveEvent   = null;    // wave event applied this wave (from WAVE_EVENTS)
let affordFlashTimer   = 0;       // frames of build-bar flash when can't afford anything
let preBossPortalTimer = 0;       // accumulates during countdown/break before boss wave
let ancestralAidActive = false;   // wave 20 event: next tower click gets a free upgrade
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

// Campaign state — persists across battles, loaded from ns-campaign-v2
let _campaignState       = null;   // ns-campaign-v2 object
let battlesCompleted     = 0;
let goldReserve          = 0;      // between-battle treasury (persists across battles)
let _equipmentInventory  = [];     // array of item IDs available to equip
let _currentBattlePreset = null;   // preset used for the current battle (for Fight Again)
let _roster              = new Roster();
let _battleResult        = null;   // 'victory' | 'defeat' — set when battle ends
let _newBattleTalentUnlocks = [];  // [{defName, talentId}] — talents unlocked at end of last battle
let _fortressBonuses     = getFortressBonuses({});  // recomputed in initBattle
let _effectiveWallCost   = 12;     // WALL_COST adjusted by Wallworks
let _wallSlowFactor      = 0.65;   // adjusted by Wallworks; applied in enemy proximity-slow loop
let _effectiveRecruitCost = 30;    // RECRUIT_COST adjusted by Barracks

// Between-battles UI state
let _recruitType        = null;          // currently selected class in recruit picker
let _betweenSubtab      = 'recruit';     // 'recruit' | 'fortress' — bottom section tab
let _pendingDismiss     = null;          // defenderId awaiting dismiss confirm
let _rosterScrollOffset = 0;            // how many defender rows scrolled past top
let _renameState        = null;          // { defenderId, draft } while canvas rename is active
let _enemyIntroSeen     = new Set();     // enemy types shown intro banner this campaign
let _enemyIntroBanner   = null;          // { type, timer, label, hint } for first-encounter tooltip
let _betweenFadeIn      = 0;             // countdown for betweenBattles screen fade-in (30 frames)
let _battleXpData       = [];           // [{name, xpGained, oldLevel, newLevel}] per defender
let _reserveContrib     = 0;            // gold added to reserve this battle (25% of goldEarned)
let _bossLootBanner     = null;         // { itemId, timer } for loot callout display

// Map selection
let gamePhase        = 'mapSelect';  // 'mapSelect' | 'playing' | 'betweenBattles'
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
  piltorn:  'PIERCE ×4',
  warden:   'PIERCE ×4',
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
  { id: 'frostRune',   label: 'FROST RUNE',   symbol: '❄', desc: 'Adds/boosts slow on hit', cost: 3, maxOwned: 3, color: '#60c8f0' },
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
  15: { id: 'frostWind',       label: '❄ FROST WIND',       desc: 'All enemies 25% slower',         speedMult: 0.75 },
  18: { id: 'undeadMarch',     label: '☠ UNDEAD MARCH',     desc: '+12 Draugr to wave',             bonus: { type: 'draugr', count: 12 } },
  20: { id: 'ancestralAid',    label: '✦ ANCESTRAL AID',    desc: 'Choose a tower — free upgrade',  special: 'upgrade' },
  22: { id: 'nightRaid',       label: '🌑 NIGHT RAID',       desc: '+20% enemy HP',                  hpMult: 1.20 },
  23: { id: 'northernRelief',  label: '♥ NORTHERN RELIEF',  desc: '+1 life (up to max)',             special: 'life' },
  26: { id: 'mistSettles',     label: '🌫 MIST SETTLES',     desc: 'Enemies 10% slower',             speedMult: 0.90 },
  27: { id: 'mistSettles',     label: '🌫 MIST SETTLES',     desc: 'Enemies 10% slower',             speedMult: 0.90 },
  29: { id: 'wargPack',         label: '🐺 WOLF PACK',         desc: '+8 Warg to wave',                bonus: { type: 'warg', count: 8 } },
  30: { id: 'berserkerRage',   label: '⚔ BERSERKER RAGE',   desc: '+30% enemy speed',               speedMult: 1.30 },
  35: { id: 'swarmWave',       label: '☠ SWARM',             desc: '+10 Myling to wave',             bonus: { type: 'myling', count: 10 } },
  40: { id: 'ironHide',        label: '⚔ IRON HIDE',        desc: '+30% HP, −15% speed',            hpMult: 1.30, speedMult: 0.85 },
  48: { id: 'wraithHunt',      label: '👁 WRAITH HUNT',      desc: 'Extra Myling pack +8',           bonus: { type: 'myling', count: 8 } },
  54: { id: 'mistThickens',    label: '🌫 MIST THICKENS',    desc: 'Towers −10% range this wave',    rangeMult: 0.90 },
  60: { id: 'frostStorm',      label: '❄ FROST STORM',      desc: '+30% HP, 20% slower',            hpMult: 1.30, speedMult: 0.80 },
  65: { id: 'blitz',           label: '⚡ BLITZ',             desc: '+40% speed',                     speedMult: 1.40 },
  72: { id: 'shieldwall',      label: '🛡 SHIELD WALL',       desc: '+4 Einherjar to wave',           bonus: { type: 'einherjar', count: 4 } },
  80: { id: 'darkHarvest',     label: '☠ DARK HARVEST',     desc: '+40% HP, +4 Jötunn',             hpMult: 1.40, bonus: { type: 'jotunn', count: 4 } },
  90: { id: 'ragnarok',        label: '⚔ THE PRELUDE',       desc: '+50% HP, +40% speed',            hpMult: 1.50, speedMult: 1.40 },
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
let flawlessCount  = 0;  // total flawless waves this run (for achievement)
let flawlessStreak = 0;  // consecutive flawless waves (resets on any leak)

function unlockAchievement(id) {
  // Re-read from storage to stay idempotent across sessions
  try { JSON.parse(localStorage.getItem(ACH_KEY) || '[]').forEach(i => _earnedAch.add(i)); } catch {}
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
  const ty = BASE_H - 80;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = 'rgba(10,6,2,0.97)';
  ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(180,110,30,0.70)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.stroke();
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 10px monospace';
  ctx.fillStyle   = '#c8a84b';
  ctx.shadowColor = 'rgba(200,150,40,0.8)'; ctx.shadowBlur = 8;
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
  try {
    const raw = JSON.parse(localStorage.getItem(HS_KEY)) || [];
    return raw.filter(s => s && typeof s === 'object').map(s => ({
      waves: Math.min(9999,  Math.max(0, parseInt(s.waves)  || 0)),
      slain: Math.min(99999, Math.max(0, parseInt(s.slain)  || 0)),
      gold:  Math.min(9999999, Math.max(0, parseInt(s.gold) || 0)),
      name:  String(s.name || 'Anonymous').replace(/[^a-zA-Z0-9 _\-]/g, '').slice(0, 16) || 'Anonymous',
    }));
  } catch { return []; }
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
      const name = input.value.trim().replace(/[^a-zA-Z0-9 _\-]/g, '').slice(0, 16) || 'Anonymous';
      highScores = saveHighScore({ ..._pendingScore, name });
      if (_currentMapName && _pendingScore) saveMapBest(_currentMapName, _pendingScore.waves, _pendingScore.slain);
      _pendingScore = null;
    }
  };
  input.addEventListener('keydown', onKey);
}

// ── restart / init ────────────────────────────────────────────────────────────

// Resets all combat state. Does NOT touch campaign state (stars, runeInventory,
// battlesCompleted, STARTING_LIVES). Call initBattle() for a full battle start.
function restartCombatState() {
  _newBattleTalentUnlocks = [];
  // Return any equipped runes to inventory before clearing tower array
  for (const t of towers) {
    if (t.rune) runeInventory[t.rune] = (runeInventory[t.rune] ?? 0) + 1;
  }
  _roster.releaseAll();

  grid.cells = Array.from({ length: ROWS }, () => new Array(COLS).fill(CELL.EMPTY));
  grid.setCell(SPAWN.col, SPAWN.row, CELL.SPAWN);
  grid.setCell(GOAL.col,  GOAL.row,  CELL.GOAL);

  currentPath   = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
  enemies       = [];
  towers        = [];
  bullets       = [];
  particles     = [];
  gold          = STARTING_GOLD + (_fortressBonuses?.startingGoldBonus ?? 0);
  _displayGold  = gold;
  lives         = STARTING_LIVES;
  slain         = 0;
  bossesDefeated = 0;
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
  jotunnWarningTimer  = 0;
  dragItem           = null;
  pendingSell        = null;
  _pendingDismiss    = null;
  _rosterScrollOffset = 0;
  _renameState       = null;
  _enemyIntroBanner  = null;
  _battleXpData      = [];
  _reserveContrib    = 0;
  _bossLootBanner    = null;
  gridZoom          = 1.0;
  gridPanX          = 0;
  gridPanY          = 0;
  isPanning         = false;
  rightClickDragged = false;
  rightClickSaved   = null;
  chainKillDone     = new Set();
  chainKillDisplay  = null;
  lifeLostTimer     = 0;
  pathChevronsTimer = 300;
  pathBlockFlash    = null;
  _synergyDirty     = true;
  _buildBtnsCache   = null;
  bestWave          = { wave: 0, slain: 0, gold: 0 };
  waveSlainCount    = 0;
  waveGoldStart     = goldEarned;

  flawlessCount     = 0;
  flawlessStreak    = 0;
  showRuneMenu      = false;
  showRunePicker    = false;
  runePickerTower   = null;
  endlessMode       = false;
  endlessBanner     = 0;
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
  ancestralAidActive = false;
  waveRangeMult      = 1;
  bossRings          = [];
  pathDirty          = true;
  towerTargetLines   = [];
  lastWaveTimeSec   = 0;
  flawlessTimer     = 0;
  _battleResult     = null;

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

// Set map geometry and start a battle without resetting campaign state.
// Stars, runeInventory, and battlesCompleted are preserved.
function initBattle(preset) {
  // Recompute fortress bonuses from latest saved upgrades each battle
  const _curFortressUpgrades = _campaignState?.fortressUpgrades ?? {};
  _fortressBonuses      = getFortressBonuses(_curFortressUpgrades);
  _effectiveWallCost    = Math.max(4, 12 - _fortressBonuses.wallCostReduction);
  _wallSlowFactor       = Math.max(0.35, 0.65 - _fortressBonuses.wallSlowBonus);
  _effectiveRecruitCost = Math.max(10, 30 - _fortressBonuses.recruitCostReduction);
  _buildBtnsCache       = null;  // regenerate with updated wall cost
  grid.setFortressUpgrades(_curFortressUpgrades);

  SPAWN.col = preset.spawn.col;
  SPAWN.row = preset.spawn.row;
  GOAL.col  = preset.goal.col;
  GOAL.row  = preset.goal.row;
  hoardX    = GRID_LEFT + GOAL.col * CELL_SIZE + CELL_SIZE / 2;
  hoardY    = GRID_TOP  + GOAL.row * CELL_SIZE + CELL_SIZE / 2;
  _currentMapName      = preset.name ?? '';
  _currentBattlePreset = preset;
  gamePhase = 'playing';
  restartCombatState();

  // Show Barracks starting-gold bonus as a floater at the spawn portal
  const sgBonus = _fortressBonuses?.startingGoldBonus ?? 0;
  if (sgBonus > 0) {
    const spawnPx = GRID_LEFT + SPAWN.col * CELL_SIZE + CELL_SIZE / 2;
    const spawnPy = GRID_TOP  + SPAWN.row * CELL_SIZE + CELL_SIZE / 2;
    dmgFloaters.push({
      x: spawnPx, y: spawnPy - 18,
      val: `+${sgBonus}g (Barracks)`, life: 150, maxLife: 150,
      color: '#88ee66', large: false, raw: true,
    });
  }
}

// Load or create the campaign save, restore campaign state, then start the first battle.
// Call this when starting a new session from map select.
function initCampaign(preset) {
  _campaignState   = migrateLegacySaves();
  battlesCompleted = _campaignState.battlesCompleted ?? 0;
  stars            = _campaignState.stars ?? 0;
  goldReserve         = _campaignState.goldReserve ?? 0;
  _equipmentInventory = (_campaignState.equipmentInventory ?? []).slice();
  runeInventory    = Object.assign(
    { ironEdge: 0, swiftStrike: 0, frostRune: 0, battleHymn: 0, valhalla: 0 },
    _campaignState.runeInventory ?? {}
  );
  STARTING_LIVES = 8;
  _roster = new Roster();
  _roster.load(_campaignState.defenders ?? []);
  initBattle(preset);
}

// Record battle outcome, persist campaign state, and transition to betweenBattles phase.
function recordBattleResult(result) {
  _battleResult = result;
  if (!_campaignState) return;
  battlesCompleted++;
  _campaignState.battlesCompleted = battlesCompleted;
  _campaignState.stars            = stars;
  _campaignState.runeInventory    = { ...runeInventory };
  _campaignState.achievements     = [..._earnedAch];

  const mvpTower = towers.length
    ? towers.reduce((best, t) => {
        const sc = (t.damageDealt || 0) + (t.killCount || 0) * 32;
        const bs = best ? ((best.damageDealt || 0) + (best.killCount || 0) * 32) : -1;
        return sc > bs ? t : best;
      }, null)
    : null;

  _campaignState.battleHistory.push({
    battleNumber:  battlesCompleted,
    mapName:       _currentMapName,
    wavesCleared:  waveNumber,
    enemiesSlain:  slain,
    goldEarned,
    bossesKilled:  [],
    mvpDefenderId: mvpTower?.defenderId ?? null,
    timestamp:     Date.now(),
  });

  _reserveContrib = Math.floor(goldEarned * 0.25);
  goldReserve += _reserveContrib;
  _campaignState.goldReserve       = goldReserve;
  _campaignState.equipmentInventory = _equipmentInventory.slice();

  const _preXpState = towers.map(t => {
    const d = _roster.find(t.defenderId);
    return d ? { id: d.defenderId, name: d.name, xp: d.xp, level: d.careerLevel } : null;
  }).filter(Boolean);

  _newBattleTalentUnlocks = _roster.grantBattleXP(towers, waveNumber);

  _battleXpData = _preXpState.map(prev => {
    const d = _roster.find(prev.id);
    return d ? { name: prev.name, xpGained: d.xp - prev.xp, oldLevel: prev.level, newLevel: d.careerLevel } : null;
  }).filter(Boolean);
  _rosterScrollOffset = 0;

  _roster.releaseAll();
  _campaignState.defenders = _roster.toJSON();

  _recruitType = null;

  try { saveCampaign(_campaignState); } catch {}
  if (_newBattleTalentUnlocks.length > 0) sfxTalentUnlock();
  _betweenFadeIn = 30;
  gamePhase = 'betweenBattles';
}

// Start game with chosen preset map (called from map select screen).
function initGame(preset) {
  initCampaign(preset);
}

// Count how many of a given rune type are currently equipped on towers
function runeEquippedCount(id)   { return towers.filter(t => t.rune === id).length; }
function _generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
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
  // Return the defender to the undeployed roster pool so they can be re-placed this battle or recruited next
  const def = _roster?.find(tower.defenderId);
  if (def) def.deployed = false;
  const fp = tower.footprint;
  for (let dc = 0; dc < fp.w; dc++) {
    for (let dr = 0; dr < fp.h; dr++) {
      grid.setCell(tower.col + dc, tower.row + dr, CELL.EMPTY);
    }
  }
  towers      = towers.filter(t => t !== tower);
  currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row) ?? currentPath;
  pathDirty      = true;
  _synergyDirty  = true;
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

const ENDLESS_FLAVOR_EVENTS = [
  { label: 'SKYFELL SWARM',  desc: 'Flying assault'   },
  { label: 'TITAN MARCH',    desc: 'Giants approach'   },
  { label: 'BLOOD FRENZY',   desc: 'All-out assault',  speedMult: 1.20 },
  { label: 'WRAITH RUSH',    desc: 'Wraiths unleashed' },
  { label: 'IRON HORDE',     desc: 'Mass draugr'       },
];

const BOSS_CONFIGS = {
  10:  { name: 'DRAUGEN-JARL',     type: ENEMY_TYPES.JOTUNN, hp: 1200,  radius: 18, speedMult: 0.85, reward: 80,  phase75: true,  phase50SlowImmune: true,  phase25: true,  hint: 'Spawns Draugr • Slow-immune at 50% • Death Shriek disables 2 towers at 25%' },
  25:  { name: 'JÖTUNHELM WALKER', type: ENEMY_TYPES.JOTUNN, hp: 3600,  radius: 22, speedMult: 0.60, reward: 150, phase75: false, phase50SlowImmune: false, phase25: true,  hint: 'EMP disables towers at 50% • Earth Stomp speed surge at 25%' },
  50:  { name: 'MARA-VOID',        type: ENEMY_TYPES.MARA,   hp: 9500,  radius: 16, speedMult: 1.10, reward: 250, phase75: false, phase50SlowImmune: false, phase25: true,  hint: 'Summons Mylings • Full EMP blackout at 50% • Death Surge spawns 2 Mara at 25%' },
  75:  { name: 'FENRIR',           type: ENEMY_TYPES.JOTUNN, hp: 24000, radius: 26, speedMult: 1.20, reward: 500, phase75: true,  phase50SlowImmune: true,  phase25: true,  hint: 'Enrages at 75% • Spawns Jötunn at 50% • The Howl stuns all towers at 25%' },
  100: { name: 'SURTR',            type: ENEMY_TYPES.JOTUNN, hp: 90000, radius: 32, speedMult: 0.75, reward: 1000,phase75: true,  phase50SlowImmune: true,  phase25: true,  hint: 'Summons Jötunn • Fire surge at 50% & 25% — fire columns across the path' },
};

let waveNumber      = 0;
let waveTotal       = 0;
let waveState       = 'countdown';  // 'countdown' | 'active' | 'break'
let waveTimer       = 0;
let spawnQueue      = [];
let spawnTimer      = 0;
let waveHpScale     = 1;
let waveSpeedScale  = 1;
let waveRangeMult   = 1;   // applied to tower.range this wave (MIST THICKENS: 0.90)
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
let _vigGradCache   = null, _vigCacheW  = 0, _vigCacheH  = 0;
let _baseVigCache   = null, _baseVigW   = 0, _baseVigH   = 0;
let _bossVigCache   = null, _bossVigW   = 0, _bossVigH   = 0;

// Path-blocked feedback flash: { col, row, timer }
let pathBlockFlash = null;

function spawnParticles(x, y, color, count = 10) {
  if (particles.length >= 300) return;
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
  if (goldCoins.length >= 20) goldCoins[0].t = 1;
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
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
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
    const r  = Math.max(5.5 * (1 - t * t * 0.88), 1.2);
    ctx.save();
    ctx.globalAlpha = t > 0.72 ? 1 - (t - 0.72) / 0.28 : 1;
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
    draugr:    n <= 5  ? Math.min(8 + Math.floor(n * 2.5), 22) : Math.min(12 + Math.floor(n * 2.8), draugrCap),
    mylings:   n >= 9  ? Math.min(Math.floor((n - 8) * 2.0), 32) : 0,
    jotunn:    n >= 11 ? Math.min(Math.floor((n - 10) * 1.1), eliteCap) : 0,
    maras:     n >= 22 ? Math.min(Math.floor((n - 21) * 0.8), eliteCap) : 0,
    wargs:     n >= 15 ? Math.min(Math.floor((n - 14) * 1.2), 18) : 0,
    einherjars: n >= 40 ? Math.min(Math.floor((n - 39) * 0.6), 10) : 0,
  };
}

function buildWave(num) {
  if (BOSS_WAVES.has(num)) {
    // Boss wave: herald squad themed per boss, then the boss enters last
    let heraldTypes;
    if (num === 10)  heraldTypes = [...Array(6).fill(ENEMY_TYPES.DRAUGR), ...Array(2).fill(ENEMY_TYPES.MYLING)];
    else if (num === 25) heraldTypes = [...Array(5).fill(ENEMY_TYPES.DRAUGR), ...Array(3).fill(ENEMY_TYPES.WARG), ...Array(2).fill(ENEMY_TYPES.JOTUNN)];
    else if (num === 50) heraldTypes = [...Array(4).fill(ENEMY_TYPES.MARA), ...Array(2).fill(ENEMY_TYPES.MYLING), ...Array(2).fill(ENEMY_TYPES.WARG)];
    else if (num === 75) heraldTypes = [...Array(3).fill(ENEMY_TYPES.MYLING), ...Array(2).fill(ENEMY_TYPES.JOTUNN), ...Array(2).fill(ENEMY_TYPES.EINHERJAR)];
    else               heraldTypes = [...Array(3).fill(ENEMY_TYPES.JOTUNN),  ...Array(2).fill(ENEMY_TYPES.MARA), ...Array(2).fill(ENEMY_TYPES.EINHERJAR)];
    for (let i = heraldTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [heraldTypes[i], heraldTypes[j]] = [heraldTypes[j], heraldTypes[i]];
    }
    const heralds = heraldTypes.map(t => ({ __herald: true, type: t }));
    heralds.push({ __boss: true, waveNum: num });
    return heralds;
  }

  // Solo introductions — new enemy type appears alone so player can learn it
  if (num === 1)  return Array(3).fill(ENEMY_TYPES.DRAUGR);
  if (num === 8)  return [...Array(2).fill(ENEMY_TYPES.MYLING)];
  if (num === 9)  return [...Array(2).fill(ENEMY_TYPES.JOTUNN)];
  if (num === 14) return [...Array(5).fill(ENEMY_TYPES.WARG)];     // warg pack introduction
  if (num === 21) return [ENEMY_TYPES.MARA, ENEMY_TYPES.MARA];
  if (num === 38) return [...Array(3).fill(ENEMY_TYPES.EINHERJAR)]; // einherjar introduction

  // Rest waves — 2 easier waves after each boss (1st = very light, 2nd = moderate)
  if (num === 11 || num === 26 || num === 51 || num === 76 || num === 101) {
    const { draugr: rd, mylings: rm, jotunn: rj, maras: ra, wargs: rw, einherjars: re } = waveComposition(Math.min(num - 5, MAX_WAVES));
    const rest = [...Array(rd).fill(ENEMY_TYPES.DRAUGR), ...Array(rm).fill(ENEMY_TYPES.MYLING), ...Array(rj).fill(ENEMY_TYPES.JOTUNN), ...Array(ra).fill(ENEMY_TYPES.MARA), ...Array(rw).fill(ENEMY_TYPES.WARG), ...Array(re).fill(ENEMY_TYPES.EINHERJAR)];
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    return rest;
  }
  if (num === 27 || num === 52 || num === 77) {
    const { draugr: rd, mylings: rm, jotunn: rj, maras: ra, wargs: rw, einherjars: re } = waveComposition(Math.min(num - 3, MAX_WAVES));
    const rest = [...Array(rd).fill(ENEMY_TYPES.DRAUGR), ...Array(rm).fill(ENEMY_TYPES.MYLING), ...Array(rj).fill(ENEMY_TYPES.JOTUNN), ...Array(ra).fill(ENEMY_TYPES.MARA), ...Array(rw).fill(ENEMY_TYPES.WARG), ...Array(re).fill(ENEMY_TYPES.EINHERJAR)];
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    return rest;
  }

  // Endless waves (102+): rotating flavored compositions
  if (endlessMode && num > 101) {
    const epoch  = num - 102;
    const flavor = epoch % 5;
    const scale  = 1 + Math.floor(epoch / 5) * 0.12;  // +12% enemies per 5-wave epoch
    let q;
    if      (flavor === 0) q = [...Array(Math.round(28*scale)).fill(ENEMY_TYPES.MYLING),  ...Array(Math.round(18*scale)).fill(ENEMY_TYPES.DRAUGR)];
    else if (flavor === 1) q = [...Array(Math.round(8*scale)).fill(ENEMY_TYPES.JOTUNN),   ...Array(Math.round(14*scale)).fill(ENEMY_TYPES.DRAUGR), ...Array(Math.round(4*scale)).fill(ENEMY_TYPES.MARA)];
    else if (flavor === 2) q = [...Array(Math.round(16*scale)).fill(ENEMY_TYPES.DRAUGR),  ...Array(Math.round(12*scale)).fill(ENEMY_TYPES.MYLING), ...Array(Math.round(5*scale)).fill(ENEMY_TYPES.JOTUNN), ...Array(Math.round(6*scale)).fill(ENEMY_TYPES.MARA)];
    else if (flavor === 3) q = [...Array(Math.round(14*scale)).fill(ENEMY_TYPES.MARA),    ...Array(Math.round(20*scale)).fill(ENEMY_TYPES.MYLING)];
    else                   q = [...Array(Math.round(60*scale)).fill(ENEMY_TYPES.DRAUGR),  ...Array(Math.round(6*scale)).fill(ENEMY_TYPES.JOTUNN)];
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
    return q;
  }

  const { draugr, mylings, jotunn, maras, wargs, einherjars } = waveComposition(num);
  const queue = [
    ...Array(draugr).fill(ENEMY_TYPES.DRAUGR),
    ...Array(mylings).fill(ENEMY_TYPES.MYLING),
    ...Array(jotunn).fill(ENEMY_TYPES.JOTUNN),
    ...Array(maras).fill(ENEMY_TYPES.MARA),
    ...Array(wargs).fill(ENEMY_TYPES.WARG),
    ...Array(einherjars).fill(ENEMY_TYPES.EINHERJAR),
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
  ancestralAidActive = false;   // clear any unused Aid from prior wave
  waveNumber++;
  const _bands   = getWaveBands(waveNumber);
  waveHpScale    = _bands.hp;
  waveSpeedScale = _bands.speed;
  waveRangeMult  = 1;
  currentWaveEvent = WAVE_EVENTS[waveNumber] ?? null;
  if (currentWaveEvent) {
    if (currentWaveEvent.hpMult)    waveHpScale    = Math.round(waveHpScale    * currentWaveEvent.hpMult    * 100) / 100;
    if (currentWaveEvent.speedMult) waveSpeedScale = Math.round(waveSpeedScale * currentWaveEvent.speedMult * 100) / 100;
    if (currentWaveEvent.rangeMult) waveRangeMult  = currentWaveEvent.rangeMult;
    if (currentWaveEvent.special === 'upgrade') {
      if (towers.some(t => !t.maxed)) {
        ancestralAidActive = true;
      } else if (towers.length > 0) {
        // All towers maxed — grant gold instead
        const bonus = 20;
        gold       += bonus;
        goldEarned += bonus;
        const bx = GOAL.col * CELL_SIZE + CELL_SIZE / 2;
        const by = GOAL.row * CELL_SIZE - 12;
        dmgFloaters.push({ x: bx, y: by, val: bonus, life: 100, maxLife: 100, color: '#80f0ff', large: false, suffix: 'g RUNE LEGACY' });
      }
    }
    if (currentWaveEvent.special === 'life') {
      if (lives < STARTING_LIVES) {
        lives++;
        const bx = GOAL.col * CELL_SIZE + CELL_SIZE / 2;
        const by = GOAL.row * CELL_SIZE - 20;
        dmgFloaters.push({ x: bx, y: by, val: '+1 LIFE', life: 120, maxLife: 120, color: '#60ee80', large: true, suffix: '' });
        spawnParticles(bx, by, '#60d8a0', 12);
      }
    }
  }
  spawnQueue  = buildWave(waveNumber);
  waveTotal   = spawnQueue.length;
  spawnTimer  = 0;
  waveActiveFrames = 0;
  waveState   = 'active';
  chainKillDone  = new Set();
  waveSlainCount = 0;
  waveGoldStart  = goldEarned;
  waveStartTick  = performance.now();
  if (waveNumber === 1) pathChevronsTimer = Math.max(pathChevronsTimer, 480);
  screenShake = Math.max(screenShake, Math.min(14, 2 + Math.floor(waveNumber * 0.12)));

  // Economy emergency valve — track poor waves (started with <25g = can't buy even a wall)
  if (gold < 25) poorWaveStreak++; else poorWaveStreak = 0;
  // Emergency gold floor: if player can't afford even a wall, grant minimum
  if (gold < _effectiveWallCost) {
    const boost = _effectiveWallCost * 3;
    gold       += boost;
    goldEarned += boost;
    dmgFloaters.push({ x: GOAL.col * CELL_SIZE + CELL_SIZE / 2, y: GOAL.row * CELL_SIZE - 20, val: boost, life: 90, maxLife: 90, color: '#f5d030', large: false, suffix: 'g EMERGENCY' });
  }

  // Chapter milestone banners
  if (waveNumber ===  1) { chapterBannerTimer = 240; chapterBannerText = 'CHAPTER 1: THE NORTHERN MARCH'; }
  if (waveNumber === 26) { chapterBannerTimer = 210; chapterBannerText = 'CHAPTER 2: THE CORRUPTED MARCH'; }
  if (waveNumber === 51) { chapterBannerTimer = 210; chapterBannerText = 'CHAPTER 3: THE IRON WINTER'; }
  if (waveNumber === 76) { chapterBannerTimer = 210; chapterBannerText = 'CHAPTER 4: RAGNARÖK'; }

  // Endless mode: flavored wave events + milestone banners every 25 waves
  if (endlessMode) {
    if (waveNumber === 101) { sfxEndlessStart(); }
    if (waveNumber > 101) {
      const epoch  = waveNumber - 102;
      currentWaveEvent = ENDLESS_FLAVOR_EVENTS[epoch % 5];
      if (currentWaveEvent?.speedMult) {
        waveSpeedScale = Math.round(waveSpeedScale * currentWaveEvent.speedMult * 100) / 100;
      }
    }
    if (waveNumber > 100 && (waveNumber - 100) % 25 === 0) {
      const depth  = Math.floor((waveNumber - 100) / 25);
      const names  = ['TITAN REALM', 'RAGNARÖK ETERNAL', 'BEYOND THE VEIL', 'JÖRMUNGANDR WAKES'];
      chapterBannerTimer = 240;
      chapterBannerText  = `∞ WAVE ${waveNumber}: ${names[(depth - 1) % names.length]}`;
      sfxEndlessMilestone();
    }
  }

  sfxWaveStart();
  spawnParticles(GRID_LEFT + SPAWN.col * CELL_SIZE + CELL_SIZE / 2, GRID_TOP + SPAWN.row * CELL_SIZE + CELL_SIZE / 2, '#c89040', 12);
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
      } else if (next && next.__herald) {
        const e = spawnEnemy(next.type, waveHpScale);
        if (e) e.isHerald = true;
      } else {
        spawnEnemy(next, waveHpScale);
      }
    }
  } else if (enemies.length === 0) {
    // Wave-clear bonus — stronger in early waves to help economy
    const rawBonus     = 30 + waveNumber * 4 + (waveNumber >= 40 ? (waveNumber - 40) * 2 : 0);
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
      if (stars === 1 && _runeForgeHintTimer <= 0) _runeForgeHintTimer = 360;
      flawlessCount++;
      flawlessStreak++;
      if (flawlessCount >= 5) unlockAchievement('flawless5');
      screenShake = Math.max(screenShake, 6);  // exhale — gentle shake on wave-clear
      grid.bannerWaveBoost = 1.0;  // fortress banners celebrate
      spawnParticles(hoardX - GRID_LEFT, hoardY - GRID_TOP, '#f5d030', 24);
      spawnParticles(SPAWN.col * CELL_SIZE + CELL_SIZE / 2, SPAWN.row * CELL_SIZE + CELL_SIZE / 2, '#a07830', 10);
      sfxFlawless();
      const streakSuffix = flawlessStreak >= 3 ? ` ×${flawlessStreak}` : '';
      dmgFloaters.push({ x: hoardX - GRID_LEFT, y: hoardY - GRID_TOP - 30, val: `1 ★${streakSuffix}`, life: 100, maxLife: 100, color: '#f0d040', large: true, suffix: '' });
    } else {
      sfxWaveDone();
      flawlessStreak = 0;
      hoardPulse = 18;
      grid.bannerWaveBoost = 0.45;  // subdued banner wave even on a leak
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
      // Battle cumulative total — shown above the wave floater, dimmer
      if (goldEarned > waveGoldTotal) {
        dmgFloaters.push({ x: fx, y: fy - 18, val: goldEarned, life: 110, maxLife: 110, color: '#c89820', large: false, suffix: 'g earned' });
      }
    }
    waveLeak  = false;
    waveTimer = 0;

    // --- MVP tower selection: choose the tower that contributed most this wave ---
    try {
      let bestTower = null;
      let bestScore = 0;
      for (const t of towers) {
        if (!t) continue;
        // Score combines damage, kills, and gold generated
        const score = (t.damageDealt || 0) + (t.killCount || 0) * 32 + (t.goldGenerated || 0) * 1.5;
        if (score > bestScore) { bestScore = score; bestTower = t; }
      }
      // Clear previous MVP timers
      for (const t of towers) if (t) t.mvpTimer = 0;
      if (bestTower && bestScore > 0) {
        bestTower.mvpTimer = 480; // show crown for ~8 seconds (60fps units used across code)
        const _mvpLabel = bestTower.name ? `⚔ ${bestTower.name}` : '⚔ MVP';
        dmgFloaters.push({ x: bestTower.x, y: bestTower.y - 18, val: _mvpLabel, life: 200, maxLife: 200, color: '#ffd060', large: true, suffix: '' });
        // Per-defender XP floaters — show battle contribution, rise from each deployed position
        for (const t of towers) {
          if (!t || !(t.killCount > 0)) continue;
          const xpEarned = t.killCount * XP_PER_KILL + XP_PER_WAVE;
          const floatC = t.glowRgb ? `rgba(${t.glowRgb},0.80)` : 'rgba(160,220,120,0.80)';
          dmgFloaters.push({ x: t.x, y: t.y - 10, val: `+${xpEarned}`, life: 110, maxLife: 110, color: floatC, large: false, suffix: 'xp' });
        }
        spawnParticles(bestTower.x, bestTower.y, '#f5d030', 16);
        try { sfxRune(); } catch (e) {}
      }
    } catch (e) { /* safe: don't crash gameplay on visual bonus */ }

    // Wave milestone achievements
    if (waveNumber === 25)  unlockAchievement('wave25');
    if (waveNumber === 50)  unlockAchievement('wave50');
    if (waveNumber >= MAX_WAVES && !endlessMode) {
      unlockAchievement('wave100');
      highScores = saveHighScore({ waves: waveNumber, slain, goldEarned, cleared: true, date: new Date().toLocaleDateString('en-GB') });
      recordBattleResult('victory');
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

    // Dark tundra base — kept deep so units read against it
    tc.fillStyle = '#111f0b';
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

    // Large moss / earth patches
    for (let i = 0; i < 25; i++) {
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

    // Grass clusters
    tc.lineCap = 'round';
    for (let ci = 0; ci < 35; ci++) {
      const gcx = rng() * W, gcy = rng() * H;
      const count = 4 + Math.floor(rng() * 9);
      const gr = Math.floor(38 + rng() * 26);
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
  for (let i = 0, n = 3 + Math.floor(rng() * 4); i < n; i++) {
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

  // ── Wildflowers — sparse clusters only (reduced for readability) ─────────
  {
    const flowerColors = [
      ['rgba(230,210,40,0.70)', 'rgba(255,245,120,0.35)'],  // yellow
      ['rgba(238,238,248,0.65)', 'rgba(200,215,255,0.30)'], // white
      ['rgba(125,55,175,0.62)', 'rgba(155,95,215,0.28)'],   // purple
      ['rgba(205,95,138,0.60)', 'rgba(238,148,175,0.28)'],  // pink
    ];
    for (let i = 0, n = 5 + Math.floor(rng() * 4); i < n; i++) {
      const fx = rng() * W, fy = rng() * H;
      const [main, glow] = flowerColors[Math.floor(rng() * flowerColors.length)];
      const count = 2 + Math.floor(rng() * 5);
      for (let f = 0; f < count; f++) {
        const px = fx + (rng() - 0.5) * cs * 1.8;
        const py = fy + (rng() - 0.5) * cs * 1.2;
        const r  = 0.85 + rng() * 0.85;
        // Stem
        tc.strokeStyle = `rgba(45,82,22,${0.45 + rng() * 0.3})`;
        tc.lineWidth   = 0.45;
        tc.beginPath();
        tc.moveTo(px, py + r + 0.8);
        tc.lineTo(px + (rng() - 0.5) * 1.5, py + r + 2.8);
        tc.stroke();
        // Glow halo
        tc.fillStyle = glow;
        tc.beginPath(); tc.arc(px, py, r + 0.9, 0, Math.PI * 2); tc.fill();
        // Petal disc
        tc.fillStyle = main;
        tc.beginPath(); tc.arc(px, py, r, 0, Math.PI * 2); tc.fill();
        // Centre dot on larger flowers
        if (r > 1.3) {
          tc.fillStyle = 'rgba(255,245,200,0.65)';
          tc.beginPath(); tc.arc(px, py, r * 0.28, 0, Math.PI * 2); tc.fill();
        }
      }
    }
    tc.lineWidth = 1;
  }

  // ── Pebble scatter — tiny stones between larger rocks ─────────────────────
  for (let i = 0, n = 90 + Math.floor(rng() * 60); i < n; i++) {
    const px = rng() * W, py = rng() * H;
    const g  = Math.floor(48 + rng() * 38);
    tc.fillStyle = `rgba(${g},${g - 2},${g + 5},${0.30 + rng() * 0.28})`;
    tc.beginPath();
    tc.ellipse(px, py, 0.55 + rng() * 0.72, 0.38 + rng() * 0.48, rng() * Math.PI, 0, Math.PI * 2);
    tc.fill();
  }

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
    tc.moveTo(0, -rh * 0.3); tc.lineTo(0, rh * 0.3);
    tc.moveTo(-rw * 0.3, -rh * 0.05); tc.lineTo(rw * 0.3, -rh * 0.05);
    tc.moveTo(-rw * 0.28, -rh * 0.22); tc.lineTo(rw * 0.28, rh * 0.12);
    tc.stroke();
    tc.restore();
  }

  // ── Boulder formations — dramatic rocky outcroppings ──────────────────────
  for (let fi = 0; fi < 9; fi++) {
    const fcx = rng() * W, fcy = rng() * H;
    const count = 2 + Math.floor(rng() * 4);
    for (let r = 0; r < count; r++) {
      const rx  = fcx + (rng() - 0.5) * cs * 3.8;
      const ry  = fcy + (rng() - 0.5) * cs * 2.4;
      const sr  = 4.0 + rng() * 7.5;
      const sg  = Math.floor(38 + rng() * 34);
      const ang = rng() * Math.PI;
      // Drop shadow
      tc.fillStyle = 'rgba(0,0,0,0.62)';
      tc.beginPath(); tc.ellipse(rx + sr * 0.32, ry + sr * 0.24, sr * 1.08, sr * 0.62, ang, 0, Math.PI * 2); tc.fill();
      // Rock body radial gradient
      const rGrad = tc.createRadialGradient(rx - sr * 0.22, ry - sr * 0.28, sr * 0.05, rx, ry, sr);
      rGrad.addColorStop(0,    `rgb(${sg + 44},${sg + 40},${sg + 50})`);
      rGrad.addColorStop(0.55, `rgb(${sg},${sg - 2},${sg + 6})`);
      rGrad.addColorStop(1,    `rgb(${Math.max(0, sg - 22)},${Math.max(0, sg - 24)},${Math.max(0, sg - 16)})`);
      tc.fillStyle = rGrad;
      tc.beginPath(); tc.ellipse(rx, ry, sr, sr * (0.50 + rng() * 0.38), ang, 0, Math.PI * 2); tc.fill();
      // Specular highlight
      tc.fillStyle = `rgba(${sg + 72},${sg + 66},${sg + 58},${0.28 + rng() * 0.28})`;
      tc.beginPath(); tc.ellipse(rx - sr * 0.25, ry - sr * 0.30, sr * 0.33, sr * 0.20, ang, 0, Math.PI * 2); tc.fill();
      // Crack
      if (rng() < 0.60) {
        tc.strokeStyle = `rgba(${Math.max(0, sg - 26)},${Math.max(0, sg - 28)},${Math.max(0, sg - 18)},0.68)`;
        tc.lineWidth = 0.55;
        const cla = rng() * Math.PI, cll = sr * (0.32 + rng() * 0.48);
        tc.beginPath(); tc.moveTo(rx, ry); tc.lineTo(rx + Math.cos(cla) * cll, ry + Math.sin(cla) * cll); tc.stroke();
        tc.lineWidth = 1;
      }
      // Lichen/moss
      if (rng() < 0.42) {
        tc.fillStyle = `rgba(28,48,18,${0.28 + rng() * 0.22})`;
        tc.beginPath(); tc.ellipse(rx + (rng() - 0.5) * sr, ry - sr * 0.4, sr * 0.38, sr * 0.18, ang + 0.4, 0, Math.PI * 2); tc.fill();
      }
    }
  }

  // ── Bushes — leafy shrubs with depth and shadow ───────────────────────────
  for (let bi = 0; bi < 16; bi++) {
    const bx = rng() * W, by = rng() * H;
    const br = 4.0 + rng() * 6.5;
    const gBase = Math.floor(28 + rng() * 26);
    // Ground shadow
    tc.fillStyle = 'rgba(0,0,0,0.42)';
    tc.beginPath(); tc.ellipse(bx + br * 0.20, by + br * 0.54, br * 1.10, br * 0.32, 0, 0, Math.PI * 2); tc.fill();
    // 3-5 overlapping leaf lobes
    const lobeCount = 3 + Math.floor(rng() * 3);
    for (let l = 0; l < lobeCount; l++) {
      const la  = (l / lobeCount) * Math.PI * 2 + rng() * 0.70;
      const ld  = br * (0.14 + rng() * 0.45);
      const lr  = br * (0.50 + rng() * 0.40);
      const lx2 = bx + Math.cos(la) * ld;
      const ly3 = by + Math.sin(la) * ld * 0.58 - br * 0.12;
      const lg  = gBase + Math.floor(rng() * 20);
      tc.fillStyle = `rgba(${Math.floor(lg * 0.24)},${lg},${Math.floor(lg * 0.10)},${0.68 + rng() * 0.24})`;
      tc.beginPath(); tc.arc(lx2, ly3, lr, 0, Math.PI * 2); tc.fill();
    }
    // Bright top highlight
    tc.fillStyle = `rgba(${Math.floor(gBase * 0.38)},${Math.min(255, gBase + 64)},${Math.floor(gBase * 0.18)},0.34)`;
    tc.beginPath(); tc.ellipse(bx - br * 0.10, by - br * 0.44, br * 0.44, br * 0.27, 0, 0, Math.PI * 2); tc.fill();
    // Leaf stroke detail
    tc.strokeStyle = `rgba(${Math.floor(gBase * 0.22)},${Math.min(255, gBase + 42)},${Math.floor(gBase * 0.09)},0.22)`;
    tc.lineWidth = 0.45; tc.lineCap = 'round';
    for (let ls = 0; ls < 5; ls++) {
      const lsa = rng() * Math.PI * 2;
      const lsd = br * (0.12 + rng() * 0.60);
      const lsx = bx + Math.cos(lsa) * lsd;
      const lsy = by + Math.sin(lsa) * lsd * 0.7;
      tc.beginPath(); tc.moveTo(lsx, lsy); tc.lineTo(lsx + (rng() - 0.5) * 3.0, lsy - 1.8 - rng() * 2.0); tc.stroke();
    }
    tc.lineCap = 'butt'; tc.lineWidth = 1;
  }

  // ── Fallen logs — mossy timber with bark texture ──────────────────────────
  tc.lineCap = 'round';
  for (let li = 0; li < 6; li++) {
    const lx  = cs * 2 + rng() * (W - cs * 4);
    const ly2 = cs * 0.5 + rng() * (H - cs);
    const len = cs * 2.5 + rng() * cs * 4.2;
    const thk = 3.0 + rng() * 2.8;
    const ang = rng() * Math.PI;
    const br  = Math.floor(34 + rng() * 26);
    tc.save();
    tc.translate(lx, ly2);
    tc.rotate(ang);
    // Shadow
    tc.fillStyle = 'rgba(0,0,0,0.50)';
    tc.beginPath(); tc.ellipse(thk * 0.38, thk * 0.62, len / 2, thk * 0.55, 0, 0, Math.PI * 2); tc.fill();
    // Log body with gradient
    const lGrad = tc.createLinearGradient(0, -thk, 0, thk);
    lGrad.addColorStop(0,    `rgb(${br + 22},${Math.floor(br * 0.58)},${Math.floor(br * 0.24)})`);
    lGrad.addColorStop(0.42, `rgb(${br + 10},${Math.floor(br * 0.50)},${Math.floor(br * 0.20)})`);
    lGrad.addColorStop(1,    `rgb(${br - 6},${Math.floor(br * 0.40)},${Math.floor(br * 0.15)})`);
    tc.fillStyle = lGrad;
    tc.beginPath(); tc.ellipse(0, 0, len / 2, thk, 0, 0, Math.PI * 2); tc.fill();
    // End grain
    tc.fillStyle = `rgb(${br - 6},${Math.floor(br * 0.44)},${Math.floor(br * 0.16)})`;
    tc.beginPath(); tc.ellipse(-len / 2 + thk * 0.55, 0, thk * 0.70, thk, 0, 0, Math.PI * 2); tc.fill();
    tc.strokeStyle = `rgba(${br + 30},${Math.floor(br * 0.64)},${Math.floor(br * 0.28)},0.36)`;
    tc.lineWidth = 0.45;
    tc.beginPath(); tc.ellipse(-len / 2 + thk * 0.55, 0, thk * 0.38, thk * 0.62, 0, 0, Math.PI * 2); tc.stroke();
    // Bark crack lines
    tc.strokeStyle = `rgba(${br - 14},${Math.floor(br * 0.38)},${Math.floor(br * 0.12)},0.55)`;
    tc.lineWidth = 0.5;
    for (let c = 0; c < 5; c++) {
      const cx2 = -len * (0.25 + rng() * 0.52);
      const cy2 = (rng() - 0.5) * thk * 0.75;
      tc.beginPath(); tc.moveTo(cx2, cy2); tc.lineTo(cx2 + len * (0.04 + rng() * 0.10), cy2 + (rng() - 0.5) * thk * 0.48); tc.stroke();
    }
    // Moss on top surface
    if (rng() < 0.65) {
      tc.fillStyle = 'rgba(18,50,12,0.35)';
      tc.beginPath(); tc.ellipse(len * (rng() * 0.5 - 0.22), -thk * 0.58, len * 0.18, thk * 0.24, 0, 0, Math.PI * 2); tc.fill();
    }
    tc.restore();
  }
  tc.lineCap = 'butt'; tc.lineWidth = 1;

  // ── Portal stone archway runes (etched into terrain around spawn area) ────
  {
    const spawnX = SPAWN.col * cs + cs / 2;
    const spawnY = SPAWN.row * cs + cs / 2;
    // Three carved rune stones framing the portal
    const archStones = [
      { ox: -cs * 1.5, oy: -cs * 2.2, lean:  0.18, rw: 4, rh: 9 },
      { ox:  cs * 1.5, oy: -cs * 2.2, lean: -0.18, rw: 4, rh: 9 },
      { ox:  0,        oy: -cs * 3.0, lean:  0.0,  rw: 6, rh: 5 },
    ];
    for (const { ox, oy, lean, rw: sw, rh: sh } of archStones) {
      const sx = spawnX + ox, sy = spawnY + oy;
      const sg = 42;
      tc.save();
      tc.translate(sx, sy);
      tc.rotate(lean);
      tc.fillStyle = 'rgba(0,0,0,0.50)';
      tc.fillRect(-sw / 2 + 1, -sh / 2 + 1, sw, sh);
      tc.fillStyle = `rgb(${sg},${sg - 2},${sg + 8})`;
      tc.fillRect(-sw / 2, -sh / 2, sw, sh);
      tc.fillStyle = `rgba(${sg + 40},${sg + 38},${sg + 52},0.55)`;
      tc.fillRect(-sw / 2, -sh / 2, sw, 1.5);
      // Purple rune glow carved into stone
      tc.strokeStyle = 'rgba(140,60,220,0.50)';
      tc.lineWidth = 0.55;
      tc.beginPath();
      tc.moveTo(-sw * 0.25, -sh * 0.3); tc.lineTo(-sw * 0.25, sh * 0.25);
      tc.moveTo( sw * 0.25, -sh * 0.3); tc.lineTo( sw * 0.25, sh * 0.25);
      tc.moveTo(-sw * 0.28, 0); tc.lineTo(sw * 0.28, 0);
      tc.stroke();
      tc.restore();
    }
    // Scorched earth ring beneath portal
    const scorchGrad = tc.createRadialGradient(spawnX, spawnY, cs * 0.5, spawnX, spawnY, cs * 2.8);
    scorchGrad.addColorStop(0,   'rgba(4,2,12,0.72)');
    scorchGrad.addColorStop(0.55,'rgba(14,6,28,0.38)');
    scorchGrad.addColorStop(1,   'rgba(0,0,0,0)');
    tc.fillStyle = scorchGrad;
    tc.beginPath(); tc.arc(spawnX, spawnY, cs * 2.8, 0, Math.PI * 2); tc.fill();
  }

  // ── Darken overlay — suppresses terrain contrast so gameplay reads clearly ───
  tc.fillStyle = 'rgba(0,0,0,0.62)';
  tc.fillRect(0, 0, W, H);

  // ── Vignette — darken edges, slight warm centre ───────────────────────────
  const vig = tc.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.22, W / 2, H / 2, Math.max(W, H) * 0.82);
  vig.addColorStop(0,   'rgba(0,0,0,0)');
  vig.addColorStop(0.55,'rgba(0,0,0,0.28)');
  vig.addColorStop(1,   'rgba(0,0,0,0.82)');
  tc.fillStyle = vig;
  tc.fillRect(0, 0, W, H);

  const glow = tc.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * 0.48);
  glow.addColorStop(0, 'rgba(255,200,120,0.03)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  tc.fillStyle = glow;
  tc.fillRect(0, 0, W, H);

  // ── Named battlefield landmarks — fixed-position Norse world-building ────────
  // Drawn last so they sit on top of the darkened terrain base.
  {
    const lm = tc;

    // ── 1. Standing rune monolith — top-left clearing ───────────────────────────
    {
      const mx = cs * 5 + cs / 2, my = cs * 3 + cs / 2;
      const sw = Math.round(cs * 0.38), sh = Math.round(cs * 0.88);
      const lean = 0.06;
      lm.save();
      lm.translate(mx, my);
      lm.rotate(lean);
      // Drop shadow
      lm.fillStyle = 'rgba(0,0,0,0.55)';
      lm.fillRect(-sw / 2 + 2, -sh / 2 + 2, sw, sh);
      // Stone body
      const sg = 62;
      const mGrad = lm.createLinearGradient(-sw / 2, 0, sw / 2, 0);
      mGrad.addColorStop(0,    `rgb(${sg + 28},${sg + 25},${sg + 32})`);
      mGrad.addColorStop(0.45, `rgb(${sg},${sg - 2},${sg + 5})`);
      mGrad.addColorStop(1,    `rgb(${sg - 16},${sg - 18},${sg - 12})`);
      lm.fillStyle = mGrad;
      lm.fillRect(-sw / 2, -sh / 2, sw, sh);
      // Top facet (lighter)
      lm.fillStyle = `rgba(${sg + 52},${sg + 48},${sg + 58},0.60)`;
      lm.fillRect(-sw / 2, -sh / 2, sw, Math.round(sh * 0.12));
      // Carved rune lines
      lm.strokeStyle = 'rgba(140,80,200,0.58)'; lm.lineWidth = 0.7;
      lm.beginPath();
      lm.moveTo(0, -sh * 0.32); lm.lineTo(0, sh * 0.28);
      lm.moveTo(-sw * 0.32, -sh * 0.08); lm.lineTo(sw * 0.32, -sh * 0.08);
      lm.moveTo(-sw * 0.30, -sh * 0.24); lm.lineTo(sw * 0.30, sh * 0.06);
      lm.moveTo(sw * 0.30, -sh * 0.24); lm.lineTo(-sw * 0.30, sh * 0.06);
      lm.stroke();
      // Rune glow halo
      lm.shadowColor = 'rgba(130,70,210,0.55)'; lm.shadowBlur = 5;
      lm.strokeStyle = 'rgba(160,100,240,0.28)'; lm.lineWidth = 1.5;
      lm.strokeRect(-sw / 2 - 2, -sh / 2 - 2, sw + 4, sh + 4);
      lm.shadowBlur = 0;
      // Ground scatter
      lm.fillStyle = 'rgba(35,26,12,0.48)';
      lm.beginPath(); lm.ellipse(0, sh / 2 + 1, sw * 1.2, sh * 0.14, 0, 0, Math.PI * 2); lm.fill();
      lm.restore();
    }

    // ── 2. Sacred tree — ancient gnarled oak, top centre ────────────────────────
    {
      const tx2 = cs * 14 + cs / 2, ty2 = cs * 3 + cs / 2;
      lm.save();
      lm.translate(tx2, ty2);
      // Ground shadow
      lm.fillStyle = 'rgba(0,0,0,0.40)';
      lm.beginPath(); lm.ellipse(2, cs * 0.6, cs * 0.55, cs * 0.18, 0, 0, Math.PI * 2); lm.fill();
      // Trunk
      const trunkW = Math.round(cs * 0.24);
      const trunkH = Math.round(cs * 0.72);
      lm.fillStyle = '#2a1808';
      lm.fillRect(-trunkW / 2, -trunkH / 2, trunkW, trunkH + trunkW / 2);
      // Trunk highlight
      lm.fillStyle = 'rgba(80,48,18,0.45)';
      lm.fillRect(-trunkW / 2, -trunkH / 2, Math.round(trunkW * 0.3), trunkH);
      // Root flares
      for (const [ra, rl] of [[-0.9, cs * 0.32], [0.0, cs * 0.28], [0.9, cs * 0.32], [-1.8, cs * 0.22]]) {
        lm.strokeStyle = 'rgba(28,16,6,0.65)'; lm.lineWidth = 1.4; lm.lineCap = 'round';
        lm.beginPath();
        lm.moveTo(0, trunkH / 2 + 1);
        lm.lineTo(Math.sin(ra) * rl, trunkH / 2 + Math.cos(ra) * rl * 0.5 + rl * 0.2);
        lm.stroke();
      }
      lm.lineCap = 'butt';
      // Main branches (bare, gnarled)
      const branches = [
        { a: -1.25, l: cs * 0.62, sub: [{ da: 0.55, fl: 0.55 }, { da: -0.45, fl: 0.48 }] },
        { a:  0.20, l: cs * 0.55, sub: [{ da: 0.48, fl: 0.52 }, { da: -0.52, fl: 0.44 }] },
        { a: -0.55, l: cs * 0.48, sub: [{ da: 0.60, fl: 0.50 }] },
        { a:  1.30, l: cs * 0.42, sub: [{ da: -0.38, fl: 0.46 }] },
      ];
      const drawBranch = (x, y, angle, len, thick) => {
        const ex = x + Math.cos(angle - Math.PI / 2) * len;
        const ey = y + Math.sin(angle - Math.PI / 2) * len;
        lm.strokeStyle = `rgba(28,16,6,${0.55 + thick * 0.35})`; lm.lineWidth = Math.max(0.6, thick * 2.2); lm.lineCap = 'round';
        lm.beginPath(); lm.moveTo(x, y); lm.lineTo(ex, ey); lm.stroke();
        lm.lineCap = 'butt';
        return [ex, ey];
      };
      for (const { a, l, sub } of branches) {
        const [bx2, by2] = drawBranch(0, -trunkH / 2, a, l, 0.55);
        for (const { da, fl } of sub) {
          drawBranch(bx2, by2, a + da, l * fl, 0.32);
        }
      }
      // Amber rune glyph burned into trunk
      lm.strokeStyle = 'rgba(200,140,30,0.55)'; lm.lineWidth = 0.55;
      lm.beginPath();
      lm.moveTo(0, -trunkH * 0.22); lm.lineTo(0, trunkH * 0.12);
      lm.moveTo(-trunkW * 0.3, -trunkH * 0.06); lm.lineTo(trunkW * 0.3, -trunkH * 0.06);
      lm.stroke();
      lm.restore();
    }

    // ── 3. Viking grave mound — bottom right, with sword marker ─────────────────
    {
      const gx2 = cs * 27 + cs / 2, gy2 = cs * 18 + cs / 2;
      lm.save();
      lm.translate(gx2, gy2);
      // Mound base shadow
      lm.fillStyle = 'rgba(0,0,0,0.48)';
      lm.beginPath(); lm.ellipse(2, cs * 0.12, cs * 0.82, cs * 0.28, 0, 0, Math.PI * 2); lm.fill();
      // Earth mound body
      const mGrad2 = lm.createRadialGradient(-cs * 0.15, -cs * 0.22, 0, 0, 0, cs * 0.65);
      mGrad2.addColorStop(0,    'rgba(38,30,16,0.88)');
      mGrad2.addColorStop(0.55, 'rgba(22,16,8,0.72)');
      mGrad2.addColorStop(1,    'rgba(10,7,3,0)');
      lm.fillStyle = mGrad2;
      lm.beginPath(); lm.ellipse(0, 0, cs * 0.65, cs * 0.22, 0, 0, Math.PI * 2); lm.fill();
      // Grass turf on mound
      lm.fillStyle = 'rgba(20,42,14,0.62)';
      lm.beginPath(); lm.ellipse(0, -cs * 0.05, cs * 0.48, cs * 0.14, 0, 0, Math.PI * 2); lm.fill();
      // Stone ring outline around base
      lm.strokeStyle = 'rgba(55,45,28,0.55)'; lm.lineWidth = 0.6;
      lm.setLineDash([1.5, 2.5]);
      lm.beginPath(); lm.ellipse(0, cs * 0.04, cs * 0.70, cs * 0.24, 0, 0, Math.PI * 2); lm.stroke();
      lm.setLineDash([]);
      // Sword marker (blade + crossguard + pommel)
      const swX = 0, swY = -cs * 0.22;
      lm.fillStyle = 'rgba(0,0,0,0.40)';
      lm.fillRect(swX + 1, swY - cs * 0.52 + 1, 2, cs * 0.52);
      lm.fillStyle = '#4a4438';
      lm.fillRect(swX - 1, swY - cs * 0.52, 2, cs * 0.52);
      lm.fillStyle = 'rgba(160,140,90,0.55)';
      lm.fillRect(swX - 1, swY - cs * 0.52, 1, cs * 0.52 * 0.6);
      // Crossguard
      lm.fillStyle = '#3c3428';
      lm.fillRect(swX - cs * 0.18, swY - cs * 0.08, cs * 0.36, Math.round(cs * 0.06));
      // Pommel circle
      lm.fillStyle = '#4a4438';
      lm.beginPath(); lm.arc(swX, swY, cs * 0.08, 0, Math.PI * 2); lm.fill();
      lm.restore();
    }

    // ── 4. Broken wagon — bottom left, shattered wheel and spilled goods ─────────
    {
      const wx = cs * 7 + cs / 2, wy = cs * 17 + cs / 2;
      lm.save();
      lm.translate(wx, wy);
      lm.rotate(-0.22);
      // Ground shadow
      lm.fillStyle = 'rgba(0,0,0,0.38)';
      lm.beginPath(); lm.ellipse(2, cs * 0.3, cs * 0.92, cs * 0.22, 0, 0, Math.PI * 2); lm.fill();
      // Wagon bed (tilted)
      lm.fillStyle = '#2c1a08';
      lm.fillRect(-cs * 0.72, -cs * 0.12, cs * 1.44, cs * 0.30);
      // Side boards
      lm.fillStyle = '#381e0a';
      lm.fillRect(-cs * 0.72, -cs * 0.22, cs * 1.44, cs * 0.12);
      lm.fillRect(-cs * 0.72, cs * 0.18, cs * 1.44, cs * 0.12);
      // Plank lines
      lm.strokeStyle = 'rgba(0,0,0,0.38)'; lm.lineWidth = 0.5;
      for (let pi = 1; pi < 5; pi++) {
        const lx2 = -cs * 0.72 + pi * cs * 1.44 / 5;
        lm.beginPath(); lm.moveTo(lx2, -cs * 0.12); lm.lineTo(lx2, cs * 0.18); lm.stroke();
      }
      // Front axle (snapped)
      lm.strokeStyle = '#3a2010'; lm.lineWidth = 2.5; lm.lineCap = 'round';
      lm.beginPath(); lm.moveTo(-cs * 0.72, cs * 0.18); lm.lineTo(-cs * 0.40, cs * 0.38); lm.stroke();
      // Intact back wheel (right)
      const drawWheel = (wX2, wY2, wr, broken) => {
        lm.strokeStyle = '#2c1806'; lm.lineWidth = 2.2;
        lm.beginPath(); lm.arc(wX2, wY2, wr, 0, Math.PI * 2); lm.stroke();
        lm.strokeStyle = broken ? 'rgba(55,30,10,0.55)' : '#3a2010'; lm.lineWidth = 1.0;
        const spokes = broken ? 4 : 6;
        for (let sp = 0; sp < spokes; sp++) {
          const sa = (sp / spokes) * Math.PI * 2;
          const endR = broken && sp > 2 ? wr * 0.55 : wr;
          lm.beginPath(); lm.moveTo(wX2, wY2); lm.lineTo(wX2 + Math.cos(sa) * endR, wY2 + Math.sin(sa) * endR); lm.stroke();
        }
        lm.fillStyle = '#2c1806';
        lm.beginPath(); lm.arc(wX2, wY2, wr * 0.18, 0, Math.PI * 2); lm.fill();
      };
      lm.lineCap = 'butt';
      drawWheel(cs * 0.58, cs * 0.30, cs * 0.32, false);
      // Broken front wheel (left — shattered arc)
      drawWheel(-cs * 0.58, cs * 0.35, cs * 0.28, true);
      // Spilled crate fragment
      lm.fillStyle = '#2e1a08';
      lm.fillRect(cs * 0.62, -cs * 0.10, cs * 0.30, cs * 0.25);
      lm.strokeStyle = 'rgba(0,0,0,0.35)'; lm.lineWidth = 0.5;
      lm.strokeRect(cs * 0.62, -cs * 0.10, cs * 0.30, cs * 0.25);
      // Spilled apples/cargo dots
      for (const [ax, ay] of [[cs * 0.70, cs * 0.22],[cs * 0.88, cs * 0.16],[cs * 0.80, cs * 0.32]]) {
        lm.fillStyle = '#6a1810';
        lm.beginPath(); lm.arc(ax, ay, 1.6, 0, Math.PI * 2); lm.fill();
      }
      lm.lineCap = 'butt';
      lm.restore();
    }

    // ── 5. Frozen pond — bottom centre, icy reflective pool ─────────────────────
    {
      const px2 = cs * 18 + cs / 2, py2 = cs * 18 + cs / 2;
      const prX = cs * 0.82, prY = cs * 0.35;
      lm.save();
      lm.translate(px2, py2);
      lm.rotate(0.18);
      // Outer mud rim
      lm.fillStyle = 'rgba(14,10,4,0.62)';
      lm.beginPath(); lm.ellipse(0, 0, prX + 3.5, prY + 2.0, 0, 0, Math.PI * 2); lm.fill();
      // Ice surface gradient
      const iceGrad = lm.createRadialGradient(-prX * 0.20, -prY * 0.30, 0, 0, 0, prX);
      iceGrad.addColorStop(0,    'rgba(185,215,245,0.72)');
      iceGrad.addColorStop(0.45, 'rgba(120,170,210,0.55)');
      iceGrad.addColorStop(0.80, 'rgba(70,110,165,0.42)');
      iceGrad.addColorStop(1,    'rgba(18,28,55,0.62)');
      lm.fillStyle = iceGrad;
      lm.beginPath(); lm.ellipse(0, 0, prX, prY, 0, 0, Math.PI * 2); lm.fill();
      // Ice crack lines
      lm.strokeStyle = 'rgba(200,230,255,0.40)'; lm.lineWidth = 0.55;
      for (const [ca, cl] of [[0.3, prX * 0.62], [-1.1, prX * 0.45], [2.2, prX * 0.38], [-2.8, prX * 0.52]]) {
        const cx3 = Math.cos(ca) * prX * 0.22, cy3 = Math.sin(ca) * prY * 0.22;
        lm.beginPath(); lm.moveTo(cx3, cy3); lm.lineTo(cx3 + Math.cos(ca) * cl, cy3 + Math.sin(ca) * cl * (prY / prX)); lm.stroke();
        // Branch crack
        lm.beginPath();
        lm.moveTo(cx3 + Math.cos(ca) * cl * 0.6, cy3 + Math.sin(ca) * cl * 0.6 * (prY / prX));
        lm.lineTo(cx3 + Math.cos(ca + 0.7) * cl * 0.38, cy3 + Math.sin(ca + 0.7) * cl * 0.38 * (prY / prX));
        lm.stroke();
      }
      // Highlight shimmer ellipse
      lm.fillStyle = 'rgba(235,248,255,0.28)';
      lm.beginPath(); lm.ellipse(-prX * 0.28, -prY * 0.42, prX * 0.32, prY * 0.22, -0.5, 0, Math.PI * 2); lm.fill();
      // Dark water edge (depth at rim)
      lm.strokeStyle = 'rgba(8,14,28,0.55)'; lm.lineWidth = 1.0;
      lm.beginPath(); lm.ellipse(0, 0, prX - 0.5, prY - 0.5, 0, 0, Math.PI * 2); lm.stroke();
      // Small embedded reeds at edge
      lm.strokeStyle = 'rgba(38,58,22,0.65)'; lm.lineWidth = 0.7; lm.lineCap = 'round';
      for (const [rx2, ry2, rl] of [
        [prX * 0.72, -prY * 0.30, prY * 0.55],
        [-prX * 0.68, prY * 0.25, prY * 0.48],
        [prX * 0.45, prY * 0.60, prY * 0.44],
      ]) {
        lm.beginPath(); lm.moveTo(rx2, ry2); lm.lineTo(rx2 + (Math.random() - 0.5) * 2, ry2 - rl); lm.stroke();
      }
      lm.lineCap = 'butt';
      lm.restore();
    }
  }
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

let _buildBtnsCache = null;
function getBuildButtons() {
  if (_buildBtnsCache) return _buildBtnsCache;
  const nBtn   = BUILD_ITEMS.length;
  const panelX = GRID_LEFT + 2;
  const panelW = COLS * CELL_SIZE - 4;
  const padX   = 4;
  const gap    = 3;
  const cardW  = nBtn > 0 ? Math.floor((panelW - 2 * padX - (nBtn - 1) * gap) / nBtn) : 0;
  const btnY   = GRID_BOTTOM + 7;
  _buildBtnsCache = BUILD_ITEMS.map((item, i) => ({
    ...item,
    cost:   item.id === 'wall' ? _effectiveWallCost : item.cost,
    x:      panelX + padX + i * (cardW + gap),
    y:      btnY,
    width:  cardW,
    height: BUILD_BTN.h
  }));
  return _buildBtnsCache;
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
  if (type === ENEMY_TYPES.JOTUNN && !newEnemy.isBoss) {
    newEnemy.reward += Math.min(40, Math.floor(waveNumber / 10) * 5);
  }
  if (type === ENEMY_TYPES.MARA && !newEnemy.isBoss) {
    newEnemy.reward += Math.min(20, Math.floor(waveNumber / 15) * 3);
  }
  if (newEnemy.flying && mylingWarningTimer === 0) mylingWarningTimer = 210;
  if (type === ENEMY_TYPES.JOTUNN && !newEnemy.isBoss && jotunnWarningTimer === 0) jotunnWarningTimer = 210;

  // Elite variant: larger, faster, higher reward — 15% chance past wave 15 for ground enemies
  if (waveNumber >= 15 && type !== ENEMY_TYPES.JOTUNN && Math.random() < 0.15) {
    newEnemy.isElite        = true;
    newEnemy.isEliteSpawned = true;
    newEnemy.hp             = Math.round(newEnemy.hp * 1.45);
    newEnemy.maxHp          = newEnemy.hp;
    newEnemy.baseSpeed     *= 1.12;
    newEnemy.speed         *= 1.12;
    newEnemy.reward         = Math.round(newEnemy.reward * 2.0);
    newEnemy.radius        += 2;
    newEnemy.eliteLabel     = 'ELITE ' + (ENEMY_DEFS[type]?.label?.toUpperCase() ?? type.toUpperCase());
  }

  // First-encounter intro banner for new enemy types
  const _INTRO_HINTS = {
    [ENEMY_TYPES.WARG]:      { label: '⚡ NEW: WARG',      hint: 'Fast wolf pack — kite shield them; splash towers shine here' },
    [ENEMY_TYPES.EINHERJAR]: { label: '🛡 NEW: EINHERJAR', hint: 'Armored Viking — slow but very tanky; focus burst damage' },
    [ENEMY_TYPES.MYLING]:    { label: '★ NEW: MYLING',     hint: 'Spectral flier — ignores walls; use ranged defenders' },
    [ENEMY_TYPES.JOTUNN]:    { label: '★ NEW: JÖTUNN',     hint: 'Earth giant — massive HP but very slow; early upgrade focus' },
    [ENEMY_TYPES.MARA]:      { label: '★ NEW: MARA',       hint: 'Nightmare spirit — moderate HP; high threat at mid waves' },
  };
  if (!_enemyIntroSeen.has(type) && _INTRO_HINTS[type]) {
    _enemyIntroSeen.add(type);
    const { label, hint } = _INTRO_HINTS[type];
    _enemyIntroBanner = { label, hint, timer: 210, maxTimer: 210 };
  }

  enemies.push(newEnemy);
  return newEnemy;
}

function estimateWaveHp(waveNum) {
  const comp  = waveComposition(Math.max(1, waveNum));
  const scale = getWaveBands(waveNum).hp;
  return Math.round((comp.draugr * 130 + comp.mylings * 110 + comp.jotunn * 700 + comp.maras * 180 + (comp.wargs ?? 0) * 95 + (comp.einherjars ?? 0) * 460) * scale);
}

function spawnBoss(waveNum) {
  if (!currentPath || gameOver) return;
  const cfg  = BOSS_CONFIGS[waveNum];
  const path = currentPath.map(({ col, row }) => grid.cellCenter(col, row));

  screenShake      = Math.max(screenShake, 22);
  portalFlash      = 48;
  portalFlashColor = 'red';

  // Portal surge: 4 concentric expanding rings at the spawn portal
  const _spawnPx = SPAWN.col * CELL_SIZE + CELL_SIZE / 2;
  const _spawnPy = SPAWN.row * CELL_SIZE + CELL_SIZE / 2;
  for (let ri = 0; ri < 4; ri++) {
    bossRings.push({
      x: _spawnPx, y: _spawnPy,
      r: 4, maxR: 55 + ri * 28,
      life: 36 + ri * 10, maxLife: 36 + ri * 10,
      color: ri % 2 === 0 ? '#ff2010' : '#ff8030'
    });
  }

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
  boss.stunTimer    = 55;   // longer dramatic entrance pause for bosses
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
      if (fc === null || fc === CELL.SPAWN || fc === CELL.GOAL) return false;
      if (fc !== CELL.EMPTY) {
        pathBlockFlash = { col, row, timer: 70, type: 'occupied' };
        return false;
      }
      if (hasEnemyInCell(c, r)) return false;
    }
  }

  const cost = mode === CELL.WALL ? _effectiveWallCost : TOWER_DEFS[towerType].cost;
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
    // Link to roster: reuse an existing veteran if available, otherwise register the new recruit.
    const def = _roster.link(towerType, t.defenderId, t.name);
    const rawEq         = getItemBonuses(def.equipment);
    const hasEquip      = def.equipment.some(Boolean);
    const armoryMult    = _fortressBonuses.equipDmMult ?? 1;
    const eqBonuses     = hasEquip && armoryMult !== 1
      ? { dm: rawEq.dm * armoryMult, rm: rawEq.rm, cm: rawEq.cm }
      : rawEq;
    const talentBonuses = getTalentBonuses(def.talents);
    const hasBonus = def.careerLevel > 0 || hasEquip || def.talents.length > 0;
    if (hasBonus) t.applyCareerData(def.defenderId, def.name, def.careerLevel, eqBonuses, talentBonuses);
    else { t.defenderId = def.defenderId; t.name = def.name; }
    towers.push(t);
    _synergyDirty = true;
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
      gold += Math.floor(_effectiveWallCost * 0.75);
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
  // Rename intercept — consume all input while renaming a defender
  if (_renameState) {
    e.preventDefault();
    if (e.key === 'Escape') {
      _renameState = null;
      return;
    }
    if (e.key === 'Enter') {
      const def = _roster?.find(_renameState.defenderId);
      if (def && _renameState.draft.trim().length > 0) {
        def.name = _renameState.draft.trim().slice(0, 16);
        _campaignState.defenders = _roster.toJSON();
        try { saveCampaign(_campaignState); } catch {}
        sfxRename();
      }
      _renameState = null;
      return;
    }
    if (e.key === 'Backspace') {
      _renameState.draft = _renameState.draft.slice(0, -1);
      return;
    }
    if (e.key.length === 1 && _renameState.draft.length < 16) {
      _renameState.draft += e.key;
    }
    return;
  }

  const key = e.key.toLowerCase();

  // Map select keyboard navigation
  if (gamePhase === 'mapSelect') {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); selectedMapIdx = (selectedMapIdx + PRESET_MAPS.length - 1) % PRESET_MAPS.length; return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); selectedMapIdx = (selectedMapIdx + 1) % PRESET_MAPS.length; return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); initGame(PRESET_MAPS[selectedMapIdx]); return; }
  }

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
    if (_renameState)    { _renameState  = null;  return; }
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
    dmgFloaters.push({ x: COLS * CELL_SIZE / 2, y: ROWS * CELL_SIZE * 0.25, val: `×${gameSpeed}`, life: 50, maxLife: 50, color: gameSpeed >= 4 ? '#ff8040' : gameSpeed >= 2 ? '#f0c840' : '#a0f080', large: true, suffix: '', vy: 0, raw: true });
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

  // Runtime sprite scale adjustments for quick visual tests
  if (e.key === '[') {
    changeSpriteScale(-0.05);
    console.log('Sprite scale:', getSpriteScale());
    return;
  }
  if (e.key === ']') {
    changeSpriteScale(0.05);
    console.log('Sprite scale:', getSpriteScale());
    return;
  }
  if (e.key === '0') {
    setSpriteScale(1.0);
    console.log('Sprite scale reset to 1.0');
    return;
  }

  if (key === 'z') {
    gridZoom = 1.0;
    gridPanX = 0;
    gridPanY = 0;
    return;
  }

  if (key === '?' || key === 'h') {
    showHelp = !showHelp;
    return;
  }

  // Arrow keys: pan the grid view
  const PAN_STEP = CELL_SIZE * 2;
  if (key === 'arrowleft')  { e.preventDefault(); gridPanX += PAN_STEP; clampGridPan(); return; }
  if (key === 'arrowright') { e.preventDefault(); gridPanX -= PAN_STEP; clampGridPan(); return; }
  if (key === 'arrowup')    { e.preventDefault(); gridPanY += PAN_STEP; clampGridPan(); return; }
  if (key === 'arrowdown')  { e.preventDefault(); gridPanY -= PAN_STEP; clampGridPan(); return; }

  // Keyboard upgrade / sell for selected tower
  if (key === 'u' && selectedTower) {
    if (!selectedTower.maxed && gold >= selectedTower.upgradeCost) {
      goldSpent += selectedTower.upgradeCost;
      gold      -= selectedTower.upgradeCost;
      selectedTower.upgrade();
      sfxUpgrade(selectedTower.type);
      if (selectedTower.maxed) spawnParticles(selectedTower.x, selectedTower.y, selectedTower.color, 28);
    }
    return;
  }
  if (key === 'x' && selectedTower) {
    const anchorKey = `${selectedTower.col}_${selectedTower.row}`;
    if (pendingSell && pendingSell.key === anchorKey) {
      sfxSell();
      removeTower(selectedTower);
      selectedTower = null;
      pendingSell   = null;
    } else {
      pendingSell = { key: anchorKey, col: selectedTower.col, row: selectedTower.row, timer: 90 };
    }
    return;
  }

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

  // Between-battles summary screen
  if (gamePhase === 'betweenBattles') {
    if (e.button === 0) {
      for (const btn of _betweenBtns) {
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          if (!['pendingDismiss', 'confirmDismiss'].includes(btn.action)) _pendingDismiss = null;
          if (!['startRename'].includes(btn.action)) _renameState = null;
          if (btn.action === 'fightAgain') {
            _betweenSubtab = 'recruit';
            initBattle(_currentBattlePreset);
          } else if (btn.action === 'mapSelect') {
            gamePhase = 'mapSelect';
            mapAutoTimerStart = performance.now();
            selectedMapIdx = 0;
            _betweenSubtab = 'recruit';
          } else if (btn.action === 'selectRecruitType') {
            _recruitType = _recruitType === btn.recruitType ? null : btn.recruitType;
          } else if (btn.action === 'pendingDismiss') {
            _pendingDismiss = _pendingDismiss === btn.defenderId ? null : btn.defenderId;
          } else if (btn.action === 'confirmDismiss') {
            const dismissDef = _roster.find(btn.defenderId);
            if (dismissDef) {
              for (const itemId of dismissDef.equipment) {
                if (itemId) _equipmentInventory.push(itemId);
              }
            }
            _roster.dismiss(btn.defenderId);
            _pendingDismiss = null;
            _campaignState.defenders = _roster.toJSON();
            _campaignState.equipmentInventory = _equipmentInventory.slice();
            try { saveCampaign(_campaignState); } catch {}
            sfxDismiss();
          } else if (btn.action === 'startRename') {
            const def = _roster?.find(btn.defenderId);
            if (def) _renameState = { defenderId: def.defenderId, draft: def.name };
          } else if (btn.action === 'scrollRoster') {
            _rosterScrollOffset = Math.max(0, _rosterScrollOffset + btn.dir);
          } else if (btn.action === 'cycleEquip') {
            const def = _roster.find(btn.defenderId);
            if (def) {
              const slotIdx  = btn.slotIdx;
              const slotType = slotIdx === 0 ? 'weapon' : 'armor';
              const currentId = def.equipment[slotIdx];
              const equippedByOthers = new Set(
                _roster.defenders
                  .filter(d => d.defenderId !== def.defenderId)
                  .flatMap(d => d.equipment)
                  .filter(Boolean)
              );
              const freeInInv = _equipmentInventory.filter(id =>
                ITEM_DEFS[id]?.slot === slotType && !equippedByOthers.has(id)
              );
              const allAccessible = [...freeInInv];
              if (currentId && !allAccessible.includes(currentId)) allAccessible.push(currentId);
              allAccessible.sort();
              const cycle = [null, ...allAccessible];
              if (cycle.length > 1) {
                const curIdx = cycle.indexOf(currentId ?? null);
                const nextId = cycle[(curIdx + 1) % cycle.length];
                if (nextId !== currentId) {
                  if (currentId) _equipmentInventory.push(currentId);
                  if (nextId) {
                    const pos = _equipmentInventory.indexOf(nextId);
                    if (pos !== -1) _equipmentInventory.splice(pos, 1);
                  }
                  def.equipment[slotIdx] = nextId ?? null;
                  _campaignState.defenders = _roster.toJSON();
                  _campaignState.equipmentInventory = _equipmentInventory.slice();
                  try { saveCampaign(_campaignState); } catch {}
                }
              }
            }
          } else if (btn.action === 'recruit') {
            if (goldReserve >= _effectiveRecruitCost && _recruitType) {
              const id   = _generateId();
              const name = getDefenderName(_recruitType);
              const def  = new Defender({ defenderId: id, name, type: _recruitType });
              _roster.defenders.push(def);
              goldReserve -= _effectiveRecruitCost;
              _campaignState.goldReserve = goldReserve;
              _campaignState.defenders   = _roster.toJSON();
              try { saveCampaign(_campaignState); } catch {}
              sfxRecruit();
            }
          } else if (btn.action === 'switchTab') {
            _betweenSubtab = btn.tab;
          } else if (btn.action === 'upgradeFortress') {
            const fDef = FORTRESS_DEFS[btn.key];
            const upgrades = _campaignState.fortressUpgrades ?? {};
            const lvl = upgrades[btn.key] ?? 0;
            if (lvl < fDef.maxLevel) {
              const cost = fDef.cost[lvl];
              if (goldReserve >= cost) {
                goldReserve -= cost;
                upgrades[btn.key] = lvl + 1;
                _campaignState.fortressUpgrades = upgrades;
                _campaignState.goldReserve = goldReserve;
                // Recompute fortress bonuses immediately so UI reflects new level
                _fortressBonuses      = getFortressBonuses(upgrades);
                _effectiveWallCost    = Math.max(4, 12 - _fortressBonuses.wallCostReduction);
                _wallSlowFactor       = Math.max(0.35, 0.65 - _fortressBonuses.wallSlowBonus);
                _effectiveRecruitCost = Math.max(10, 30 - _fortressBonuses.recruitCostReduction);
                grid.setFortressUpgrades(upgrades);
                try { saveCampaign(_campaignState); } catch {}
                sfxFortressUpgrade();
              }
            }
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

  // Speed toggle button — single click cycles ×1 → ×2 → ×4 → ×1
  for (const sb of speedBtns) {
    if (e.button === 0 && mouseX >= sb.x && mouseX <= sb.x + sb.w &&
        mouseY >= sb.y && mouseY <= sb.y + sb.h) {
      gameSpeed = gameSpeed >= 4 ? 1 : gameSpeed >= 2 ? 4 : 2;
      dmgFloaters.push({ x: COLS * CELL_SIZE / 2, y: ROWS * CELL_SIZE * 0.25, val: `×${gameSpeed}`, life: 50, maxLife: 50, color: gameSpeed >= 4 ? '#ff8040' : gameSpeed >= 2 ? '#f0c840' : '#a0f080', large: true, suffix: '', vy: 0, raw: true });
      return;
    }
  }

  // Auto-next toggle button (right panel, break/countdown)
  if (e.button === 0 && autoNextBtn && !gameOver) {
    if (mouseX >= autoNextBtn.x && mouseX <= autoNextBtn.x + autoNextBtn.w &&
        mouseY >= autoNextBtn.y && mouseY <= autoNextBtn.y + autoNextBtn.h) {
      autoNextWave = !autoNextWave;
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

  // Left-click on placed tower: select it (or consume Ancestral Aid free upgrade)
  if (cell === CELL.TOWER) {
    const clickedT = getTowerAtCell(col, row);
    if (ancestralAidActive && clickedT) {
      if (clickedT.maxed) {
        dmgFloaters.push({ x: clickedT.x, y: clickedT.y - 16, val: 'ALREADY MAXED', life: 80, maxLife: 80, color: '#ff8040', large: false, suffix: '' });
      } else {
        ancestralAidActive = false;
        const savedGold = clickedT.upgradeCost ?? 0;
        clickedT.upgrade();
        sfxUpgrade(clickedT.type);
        spawnParticles(clickedT.x, clickedT.y, '#80f0ff', 20);
        const suffix = savedGold > 0 ? `  ≈${savedGold}g SAVED` : '';
        dmgFloaters.push({ x: clickedT.x, y: clickedT.y - 16, val: 'FREE UPGRADE', life: 120, maxLife: 120, color: '#80f0ff', large: true, suffix });
        selectedTower = clickedT;
        return;
      }
    }
    selectedTower = clickedT ?? null;
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

function clampRightPanelScale() {
  rightPanelScale = Math.max(0.92, Math.min(1.08, rightPanelScale));
}

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
  if (jotunnWarningTimer  > 0) jotunnWarningTimer--;

  updateWave();

  // ── Synergy detection — only recomputed when towers change ───────────────────
  if (_synergyDirty) {
    _synergyDirty = false;
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
        else if (types === 'berserk+valkyrie') { a._synergy = b._synergy = 'shieldWall'; }
        else if (types === 'drakship+hydda')   { a._synergy = b._synergy = 'tidecall'; }
        else if (types === 'isjatten+piltorn') { a._synergy = b._synergy = 'runeChain'; }
      }
    }
  }

  // ── Hydda adjacency aura — +8% damage to all towers adjacent to a Healer ────
  for (const t of towers) t._hyddaAdjacent = false;
  for (const hydda of towers) {
    if (hydda.type !== TOWER_TYPES.HYDDA) continue;
    for (const t of towers) {
      if (t === hydda) continue;
      const fp = t.footprint ?? { w: 1, h: 1 };
      let adj = false;
      for (let dc = 0; dc < fp.w && !adj; dc++)
        for (let dr = 0; dr < fp.h && !adj; dr++)
          if (Math.abs(t.col + dc - hydda.col) <= 1 && Math.abs(t.row + dr - hydda.row) <= 1) adj = true;
      if (adj) t._hyddaAdjacent = true;
    }
  }

  // ── Tower updates ─────────────────────────────────────────────────────────────
  for (const tower of towers) {
    // Apply synergy stat boosts temporarily around update()
    const _origRange  = tower.range;
    const _origSplash = tower.splashDamage;
    if (waveRangeMult !== 1) tower.range = Math.round(tower.range * waveRangeMult);
    if (tower._synergy === 'eagleEye')  tower.range = Math.round(tower.range * 1.15);
    if (tower._synergy === 'siegeFury' && tower.splashDamage)
      tower.splashDamage = Math.round(tower.splashDamage * 1.20);
    if (tower._synergy === 'tidecall' && tower.splashDamage)
      tower.splashDamage = Math.round(tower.splashDamage * 1.15);
    tower._synergyDmgBoost = tower._synergy === 'winterGrip' ? 1.15
                           : tower._synergy === 'shieldWall' ? 1.10
                           : tower._synergy === 'runeChain'  ? 1.15
                           : 1;
    if (tower._hyddaAdjacent) tower._synergyDmgBoost *= 1.08;

    // Tag new bullets with this tower as source (for kill tracking)
    const _prevBulletLen = bullets.length;
    const tr = tower.update(enemies, bullets);
    for (let _bi = _prevBulletLen; _bi < bullets.length; _bi++) {
      bullets[_bi].source = tower;
    }
    if (bullets.length > _prevBulletLen) sfxShoot(tower.bulletShape, tower.type);

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
      if (lives >= STARTING_LIVES) tower.fireFlash = 0;
      // Tidecall: Healer also slows nearest enemy within 100px on heal
      if (tower._synergy === 'tidecall' && healCount > 0) {
        let nearestEnemy = null, nearestDist = 100;
        for (const e of enemies) {
          if (!e.alive || e.reached) continue;
          const d = Math.hypot(e.x - tower.x, e.y - tower.y);
          if (d < nearestDist) { nearestDist = d; nearestEnemy = e; }
        }
        if (nearestEnemy) {
          nearestEnemy.slowTimer  = Math.max(nearestEnemy.slowTimer ?? 0, 60);
          nearestEnemy.slowFactor = Math.min(nearestEnemy.slowFactor ?? 1, 0.65);
        }
      }
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
    // Pierce chain sfx: fire once when bullet hits its 2nd distinct target
    if (b.canPierce && b.alive && b.pierced?.size === 2 && !b._pierceSfxDone) {
      b._pierceSfxDone = true;
      sfxChainKill();
    }
    // Boss hit (not kill): strong impact ring + screen shake
    if (b.bossDmg) {
      screenShake = Math.max(screenShake, 9);
      impactFlashes.push({ x: b.bossDmg.x, y: b.bossDmg.y, maxR: 32, life: 1, color: '#ff7030' });
    }
    if (reward > 0) {
      slain++;
      waveSlainCount++;
      // Kill milestone celebrations
      if (slain === 100 || slain === 250 || slain === 500 || slain === 1000 || slain === 2000) {
        const mx = (GOAL.col + 1) * CELL_SIZE;
        const my = (GOAL.row + 0.5) * CELL_SIZE - 28;
        dmgFloaters.push({ x: mx, y: my, val: `${slain} SLAIN!`, life: 130, maxLife: 130, color: '#ffd040', large: true, suffix: '' });
        spawnParticles(mx, my + 16, '#ffd040', 20);
      }
      const valBonus = (b.source?.rune === 'valhalla') ? Math.min(20, Math.ceil(reward * 0.5)) : 0;
      gold        += reward + valBonus;
      goldEarned  += reward + valBonus;
      if (b.source) { b.source.killCount++; b.source.goldGenerated = (b.source.goldGenerated || 0) + reward + valBonus; }
      // For pierce bullets that stay alive, use stored kill position instead of current target
      const killX    = (b.canPierce && b.alive) ? b.lastKillX : (b.target?.x ?? b.x);
      const killY    = (b.canPierce && b.alive) ? b.lastKillY : (b.target?.y ?? b.y);
      const killBoss = (b.canPierce && b.alive) ? b.lastKillIsBoss : (b.target?.isBoss ?? false);
      const killType = (b.canPierce && b.alive) ? null : (b.target?.type ?? '');
      sfxDie(killBoss, killType);
      const isCrit = !killBoss && Math.random() < 0.15;
      if (isCrit) {
        dmgFloaters.push({ x: killX, y: killY - 18, val: 'CRIT!', life: 38, maxLife: 38, color: '#ff8820', large: true, suffix: '' });
        screenShake = Math.max(screenShake, 3);
        impactFlashes.push({ x: killX, y: killY, maxR: 24, life: 1, color: '#ffd060' });
        spawnParticles(killX, killY, '#ffd060', 7);
      }
      dmgFloaters.push({ x: killX, y: killY - 8, val: reward + valBonus, life: isCrit ? 70 : 52, maxLife: isCrit ? 70 : 52, color: isCrit ? '#ff8820' : valBonus > 0 ? '#f0c840' : (reward + valBonus) >= 20 ? '#ff9040' : '#ffcc44', large: isCrit });
      if (killBoss) {
        if (b.target && b.canPierce && b.alive) { /* boss killed mid-pierce — handled at deathTimer */ }
        else if (b.target?.isBoss) onBossKilled(b.target);
      } else {
        const _killType = (b.canPierce && b.alive) ? null : b.target?.type;
        const _killColor = (b.canPierce && b.alive) ? '#c0a060' : (b.target?.highlightColor ?? b.target?.color ?? '#c0a060');
        const _pc = _killType === ENEMY_TYPES.JOTUNN ? 22 : _killType === ENEMY_TYPES.MARA ? 12 : _killType === ENEMY_TYPES.MYLING ? 8 : 7;
        spawnParticles(killX, killY, _killColor, _pc);
        if (_killType === ENEMY_TYPES.JOTUNN) {
          spawnParticles(killX, killY, '#ffffff', 6);
          impactFlashes.push({ x: killX, y: killY, maxR: 28, life: 1, color: '#ffffff' });
        } else if (_killType === ENEMY_TYPES.MYLING) {
          // Frost shatter: icy blue burst + soft frost ring
          spawnParticles(killX, killY, '#a8d8ff', 5);
          impactFlashes.push({ x: killX, y: killY, maxR: 18, life: 1, color: '#c4e8ff' });
        } else if (_killType === ENEMY_TYPES.DRAUGR) {
          // Bone dust: muted brown puff
          spawnParticles(killX, killY, '#90603c', 4);
        }
        screenShake = Math.max(screenShake, _killType === ENEMY_TYPES.JOTUNN ? 6 : _killType === ENEMY_TYPES.MARA ? 2 : 1);
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
            enemy.hitFlash      = b.splashDamage > 40 ? 7 : 4;
            enemy.hitFlashMax   = enemy.hitFlash;
            enemy.hitFlashColor = b.splashDamage > 50 ? '255,136,32' : b.splashDamage >= 15 ? '240,200,64' : '96,128,255';
            if (enemy.hp <= 0) {
              enemy.hp    = 0;
              enemy.kill();
              slain++;
              waveSlainCount++;
              splashKills++;
              const _splashVal = (b.source?.rune === 'valhalla') ? Math.ceil(enemy.reward * 1.5) : enemy.reward;
              gold       += _splashVal;
              goldEarned += _splashVal;
              if (b.source) { b.source.killCount++; b.source.goldGenerated = (b.source.goldGenerated || 0) + _splashVal; }
              if (splashKills === 1) sfxDie(enemy.isBoss, enemy.type);  // only play once per splash cluster
              if (b.source) b.source.damageDealt += b.splashDamage;
              dmgFloaters.push({ x: enemy.x, y: enemy.y - 8, val: _splashVal, life: 52, maxLife: 52, color: _splashVal >= 20 ? '#ff9040' : '#ffcc44' });
              if (enemy.isBoss) {
                onBossKilled(enemy);
              } else {
                spawnParticles(enemy.x, enemy.y, enemy.highlightColor, 5);
                spawnGoldCoins(GRID_LEFT + gridPanX + gridZoom * enemy.x, GRID_TOP + gridPanY + gridZoom * enemy.y, enemy.reward);
              }
            }
          }
        }
        if (splashKills >= 3 && b.source && !chainKillDone.has(b.source)) {
          chainKillDone.add(b.source);
          chainKillDisplay = { x: ix, y: iy - 20, life: 100, maxLife: 100, count: splashKills };
          sfxChainKill();
        }
      }
      // IMMUNE floater when a slowing/stunning bullet hits a slow-immune boss
      if (b.slowDuration > 0 && b.target?.slowImmune) {
        dmgFloaters.push({ x: b.target.x, y: b.target.y - 16, val: 'IMMUNE', life: 44, maxLife: 44, color: '#ffcc00', suffix: '' });
      }
      // Enemy stagger pushback on heavy hits (Catapult, Berserker, Drakship, Valkyrie)
      if (b.damage > 40 && b.target != null) {
        const tgt = b.target;
        const nxt = tgt.path?.[tgt.pathIndex + 1];
        if (nxt) {
          const ddx = nxt.x - tgt.x, ddy = nxt.y - tgt.y;
          const dlen = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dlen > 0) {
            tgt.staggerVX    = -(ddx / dlen) * 2;
            tgt.staggerVY    = -(ddy / dlen) * 2;
            tgt.staggerTimer = 4;
            // Immediate push so killing blows also show recoil during death animation
            tgt.x += tgt.staggerVX;
            tgt.y += tgt.staggerVY;
          }
        }
      }
      // Impact flash for direct-hit bullets (splash already has splashRings)
      if (b.splashRadius === 0) {
        const flashColor = b.shape === 'spear' ? '#f0e0a0'
                         : b.shape === 'arrow' ? '#e8c870'
                         : b.shape === 'stun'  ? '#ffe840'
                         : '#ffd86b';
        impactFlashes.push({ x: b.x, y: b.y, maxR: Math.max(10, b.damage * 0.28), life: 1, color: flashColor });
      }
      bullets[i] = bullets[bullets.length - 1]; bullets.length--;
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
        enemies[i] = enemies[enemies.length - 1]; enemies.length--;
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
      dmgFloaters.push({ x: GOAL.col * CELL_SIZE + CELL_SIZE / 2, y: GOAL.row * CELL_SIZE - 10, val: '♥ -1 LIFE!', life: 80, maxLife: 80, color: '#ff4040', large: true, suffix: '', vy: 0.6, raw: true });
      enemies[i] = enemies[enemies.length - 1]; enemies.length--;
      if (lives <= 0) {
        gameOver   = true;
        sfxGameOver();
        promptNameAndSave({ waves: waveNumber, slain, goldEarned, date: new Date().toLocaleDateString('en-GB') });
        recordBattleResult('defeat');
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
        tower.disabledTimer = Math.max(tower.disabledTimer, EMP_DISABLE_FRAMES);
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
        if (_wallSlowFactor < enemy.slowFactor) enemy.slowFactor = _wallSlowFactor;
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
    if (!enemy.phase25Done && ratio <= 0.25) {
      enemy.phase25Done = true;
      onBossPhase25(enemy);
    }
  }

  if (bossDefeatTimer   > 0) bossDefeatTimer--;
  if (fortressHeldTimer > 0) fortressHeldTimer--;
  if (lifeLostTimer     > 0) lifeLostTimer--;
  if (pathChevronsTimer > 0) pathChevronsTimer--;
  if (chainKillDisplay) { chainKillDisplay.life--; if (chainKillDisplay.life <= 0) chainKillDisplay = null; }

  // Advance floating gold numbers (swap-and-pop for O(1) removal)
  for (let i = dmgFloaters.length - 1; i >= 0; i--) {
    const df = dmgFloaters[i];
    df.y    -= df.vy ?? 0.5;
    df.life--;
    if (df.life <= 0) {
      dmgFloaters[i] = dmgFloaters[dmgFloaters.length - 1];
      dmgFloaters.length--;
    }
  }

  // Update splash rings
  for (let i = splashRings.length - 1; i >= 0; i--) {
    const sr = splashRings[i];
    sr.r    = sr.maxR * (1 - sr.life / sr.maxLife);
    sr.life--;
    if (sr.life <= 0) { splashRings[i] = splashRings[splashRings.length - 1]; splashRings.length--; }
  }

  // Update EMP rings
  for (let i = empRings.length - 1; i >= 0; i--) {
    const er = empRings[i];
    er.r    = EMP_RANGE * (1 - er.life / er.maxLife);
    er.life--;
    if (er.life <= 0) { empRings[i] = empRings[empRings.length - 1]; empRings.length--; }
  }

  // Update nova rings (quadratic ease-in for punchy expansion)
  for (let i = novaRings.length - 1; i >= 0; i--) {
    const nr = novaRings[i];
    const frac = 1 - nr.life / nr.maxLife;
    nr.r    = nr.maxR * frac * frac;
    nr.life--;
    if (nr.life <= 0) { novaRings[i] = novaRings[novaRings.length - 1]; novaRings.length--; }
  }

  updateParticles();

  for (let i = goldCoins.length - 1; i >= 0; i--) {
    goldCoins[i].t += goldCoins[i].speed;
    if (goldCoins[i].t >= 1) {
      goldCoins[i] = goldCoins[goldCoins.length - 1]; goldCoins.length--;
      hoardPulse = 10;
      spawnParticles(hoardX - GRID_LEFT, hoardY - GRID_TOP, '#f5d030', 4);
      impactFlashes.push({ x: hoardX - GRID_LEFT, y: hoardY - GRID_TOP, maxR: 10, life: 1, color: '#f5d030' });
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

  // ── Will-o'-wisps: 2 ghostly orbs drifting along the path (reduced for clarity) ──
  if (totalLen > 0) {
    for (let wi = 0; wi < 2; wi++) {
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
      const alpha  = 0.18 + Math.sin(t * 2.1 + wi * 1.4) * 0.10;
      const radius = 2.0 + Math.sin(t * 1.5 + wi * 0.8) * 0.5;
      ctx.save();
      ctx.fillStyle   = `rgba(130,220,255,${alpha})`;
      ctx.shadowColor = 'rgba(100,200,255,0.35)';
      ctx.shadowBlur  = 2;
      ctx.beginPath();
      ctx.arc(wsx + wobX, wsy + wobY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  ctx.restore();
}

// ── Fortress Complex — procedural architectural details around GOAL ───────────
// Drawn before grid.draw() so GOAL cell content (sprite, gold pile) renders on top.
function drawFortressComplex() {
  if (gamePhase !== 'playing') return;
  const cs  = CELL_SIZE;
  const gx  = GOAL.col * cs + cs / 2;
  const gy  = GOAL.row * cs + cs / 2;
  const now = performance.now() * 0.001;

  // ── Great Hall (longhouse) — extends left of the fortress sprite ──────────
  {
    const hw = cs * 3.0, hh = cs * 1.05;
    const hx = gx - cs * 4.9, hy = gy - cs * 0.65;
    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(hx + 2, hy + 3, hw, hh);
    // Aged timber walls
    ctx.fillStyle = '#211205';
    ctx.fillRect(hx, hy, hw, hh);
    // Vertical plank lines
    ctx.save();
    ctx.strokeStyle = 'rgba(10,6,1,0.42)';
    ctx.lineWidth   = 0.65;
    for (let i = 1; i < 7; i++) {
      const lx = hx + i * hw / 7;
      ctx.beginPath(); ctx.moveTo(lx, hy); ctx.lineTo(lx, hy + hh); ctx.stroke();
    }
    ctx.restore();
    // Thatched roof — trapezoid
    const roofH = cs * 0.85;
    ctx.fillStyle = '#38200a';
    ctx.beginPath();
    ctx.moveTo(hx - cs * 0.18, hy);
    ctx.lineTo(hx + hw + cs * 0.18, hy);
    ctx.lineTo(hx + hw * 0.5 + cs * 0.22, hy - roofH);
    ctx.lineTo(hx + hw * 0.5 - cs * 0.22, hy - roofH);
    ctx.closePath();
    ctx.fill();
    // Roof ridge
    ctx.strokeStyle = '#583520';
    ctx.lineWidth   = 1.3;
    ctx.beginPath();
    ctx.moveTo(hx + hw * 0.5 - cs * 0.22, hy - roofH + 1.5);
    ctx.lineTo(hx + hw * 0.5 + cs * 0.22, hy - roofH + 1.5);
    ctx.stroke();
    // Thatch stroke lines
    ctx.save();
    ctx.strokeStyle = 'rgba(70,48,18,0.30)';
    ctx.lineWidth   = 0.55;
    for (let i = 0; i < 6; i++) {
      const t  = i / 6;
      const lx = hx + t * hw;
      const ly = hy;
      const tx = hx + hw * 0.5 + (t - 0.5) * cs * 0.44;
      const ty = hy - roofH;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(tx, ty); ctx.stroke();
    }
    ctx.restore();
    // Windows (amber glow slits)
    ctx.save();
    const _winPulse  = 0.12 + Math.sin(now * 1.1) * 0.07;  // 0.05..0.19 — slow heartbeat
    ctx.fillStyle   = `rgba(255,190,65,${_winPulse})`;
    ctx.strokeStyle = 'rgba(50,28,8,0.55)';
    ctx.lineWidth   = 0.5;
    for (const wx of [hx + hw * 0.2, hx + hw * 0.58]) {
      ctx.fillRect(wx - 2, hy + hh * 0.18, 4, 5);
      ctx.strokeRect(wx - 2, hy + hh * 0.18, 4, 5);
      ctx.beginPath();
      ctx.moveTo(wx - 2, hy + hh * 0.18 + 2.5);
      ctx.lineTo(wx + 2, hy + hh * 0.18 + 2.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Shields on Great Hall wall ─────────────────────────────────────────────
  {
    const sy  = gy - cs * 0.65 + cs * 1.05 * 0.45;
    const sx0 = gx - cs * 5.25;
    const shR = cs * 0.27;
    for (let i = 0; i < 4; i++) {
      const sx  = sx0 + i * cs * 0.65;
      const isB = i % 2 === 0;
      ctx.save();
      // Rim
      ctx.fillStyle = '#180904';
      ctx.beginPath(); ctx.arc(sx, sy, shR, 0, Math.PI * 2); ctx.fill();
      // Quadrant face
      ctx.save();
      ctx.beginPath(); ctx.arc(sx, sy, shR - 0.8, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = isB ? '#17388c' : '#7a1208';
      ctx.fillRect(sx - shR, sy - shR, shR, shR);
      ctx.fillRect(sx, sy, shR, shR);
      ctx.fillStyle = '#c8b850';
      ctx.fillRect(sx, sy - shR, shR, shR);
      ctx.fillRect(sx - shR, sy, shR, shR);
      ctx.restore();
      // Boss stud
      ctx.fillStyle = '#2e1606';
      ctx.beginPath(); ctx.arc(sx, sy, shR * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // ── Watchtower — stone tower; tip peeks above fortress sprite ─────────────
  {
    const tw = cs * 0.88, th = cs * 3.1;
    const tx = gx - cs * 4.4, ty = gy - cs * 4.2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(tx + 2, ty + 3, tw, th);
    // Stone body
    ctx.fillStyle = '#262012';
    ctx.fillRect(tx, ty, tw, th);
    // Mortar lines
    ctx.save();
    ctx.strokeStyle = 'rgba(8,6,2,0.40)';
    ctx.lineWidth   = 0.5;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(tx, ty + i * th / 8);
      ctx.lineTo(tx + tw, ty + i * th / 8);
      ctx.stroke();
    }
    ctx.restore();
    // Arrow slits
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.fillRect(tx + tw * 0.35, ty + th * 0.22, tw * 0.3, th * 0.13);
    ctx.fillRect(tx + tw * 0.35, ty + th * 0.56, tw * 0.3, th * 0.10);
    // Crenellations
    const cn = 3, cw = tw / (cn * 2 - 1), ch = cs * 0.27;
    ctx.fillStyle = '#262012';
    for (let i = 0; i < cn; i++) {
      ctx.fillRect(tx + i * cw * 2, ty - ch, cw, ch);
    }
    ctx.fillStyle = '#1a1408';
    ctx.fillRect(tx - 1, ty - ch, tw + 2, 2);
    // Animated torch on side
    const flick = 0.55 + Math.sin(now * 9.1) * 0.24 + Math.sin(now * 13.8) * 0.10;
    ctx.fillStyle = '#5a3810';
    ctx.fillRect(tx + tw + 1.5, ty + th * 0.18, 1.5, cs * 0.38);
    const tg = ctx.createRadialGradient(
      tx + tw + 2.5, ty + th * 0.16, 0,
      tx + tw + 2.5, ty + th * 0.16, 5 * flick
    );
    tg.addColorStop(0, `rgba(255,235,140,${flick * 0.95})`);
    tg.addColorStop(0.4, `rgba(255,130,20,${flick * 0.62})`);
    tg.addColorStop(1, 'rgba(200,50,0,0)');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.ellipse(tx + tw + 2.5, ty + th * 0.14, 2.5 * flick, 3.8 * flick, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Banner on watchtower crossbar ─────────────────────────────────────────
  {
    const tw = cs * 0.88;
    const tx = gx - cs * 4.4, ty = gy - cs * 4.2;
    const bw = cs * 0.55, bh = cs * 0.65;
    const barY = ty - cs * 0.27 + 1;
    ctx.save();
    // Crossbar
    ctx.strokeStyle = '#5a3810'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx + tw * 0.5, barY);
    ctx.lineTo(tx + tw * 0.5 + bw, barY);
    ctx.stroke();
    // Banner cloth
    ctx.fillStyle = '#8a1020';
    ctx.beginPath();
    ctx.moveTo(tx + tw * 0.5, barY);
    ctx.lineTo(tx + tw * 0.5 + bw, barY);
    ctx.lineTo(tx + tw * 0.5 + bw, barY + bh);
    ctx.lineTo(tx + tw * 0.5 + bw * 0.6, barY + bh + cs * 0.18);
    ctx.lineTo(tx + tw * 0.5, barY + bh);
    ctx.closePath();
    ctx.fill();
    // Norse symbol
    const bsx = tx + tw * 0.5 + bw * 0.5, bsy = barY + bh * 0.45;
    ctx.strokeStyle = 'rgba(228,185,68,0.72)'; ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(bsx, bsy - 3);   ctx.lineTo(bsx, bsy + 3);
    ctx.moveTo(bsx - 3, bsy);   ctx.lineTo(bsx + 3, bsy);
    ctx.moveTo(bsx - 2, bsy - 2); ctx.lineTo(bsx + 2, bsy + 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Treasury — heavy stone vault below-left ───────────────────────────────
  {
    const vw = cs * 1.35, vh = cs * 0.88;
    const vx = gx - cs * 3.8, vy = gy + cs * 0.85;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(vx + 2, vy + 3, vw, vh);
    // Stone walls
    ctx.fillStyle = '#1a1205';
    ctx.fillRect(vx, vy, vw, vh);
    // Mortar grid
    ctx.save();
    ctx.strokeStyle = 'rgba(8,5,1,0.38)'; ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(vx, vy + vh / 2); ctx.lineTo(vx + vw, vy + vh / 2); ctx.stroke();
    ctx.moveTo(vx + vw / 2, vy); ctx.lineTo(vx + vw / 2, vy + vh); ctx.stroke();
    ctx.restore();
    // Peaked stone roof
    ctx.fillStyle = '#241808';
    ctx.beginPath();
    ctx.moveTo(vx - 1, vy);
    ctx.lineTo(vx + vw + 1, vy);
    ctx.lineTo(vx + vw / 2, vy - cs * 0.58);
    ctx.closePath();
    ctx.fill();
    // Arched door
    const dr = vw * 0.17;
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.beginPath();
    ctx.arc(vx + vw / 2, vy + vh - dr, dr, Math.PI, 0);
    ctx.fillRect(vx + vw / 2 - dr, vy + vh - dr, dr * 2, dr);
    ctx.fill();
    // Gold finial on peak
    ctx.save();
    ctx.shadowColor = 'rgba(255,200,40,0.60)';
    ctx.shadowBlur  = 5;
    ctx.fillStyle   = 'rgba(255,215,50,0.38)';
    ctx.beginPath(); ctx.arc(vx + vw / 2, vy - cs * 0.58, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ── Second banner (Great Hall left end) ───────────────────────────────────
  {
    const bx = gx - cs * 5.4, by = gy - cs * 0.65 - cs * 0.85 - cs * 0.4;
    const bw = cs * 0.5, bh = cs * 0.58;
    ctx.save();
    ctx.strokeStyle = '#5a3810'; ctx.lineWidth = 1;
    // Pole
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + cs * 1.3); ctx.stroke();
    // Crossbar
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.stroke();
    // Cloth
    ctx.fillStyle = '#6a1c30';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw, by + bh);
    ctx.lineTo(bx, by + bh);
    ctx.closePath();
    ctx.fill();
    // Stripe details
    ctx.strokeStyle = 'rgba(218,172,58,0.58)'; ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(bx, by + bh * 0.35); ctx.lineTo(bx + bw, by + bh * 0.35);
    ctx.moveTo(bx, by + bh * 0.68); ctx.lineTo(bx + bw, by + bh * 0.68);
    ctx.stroke();
    ctx.restore();
  }
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
  const pw = BASE_W - px - 36;
  speedBtns = [];
  runeForgeBtn = null;
  if (pw < 60) return;

  const fullH    = BASE_H - GRID_TOP - 36;
  const panelBot = GRID_TOP + fullH;
  drawFantasyPanel(px, GRID_TOP, pw, fullH, 'rgba(10,6,20,0.98)');

  // Wave-announcement banner occupies y=GRID_TOP+2..+46 during break/countdown
  let ly = waveState === 'active' ? GRID_TOP + 8 : GRID_TOP + 50;

  const _now = performance.now();
  ctx.save();

  // ── Section layout primitives ─────────────────────────────────────────────────
  const sX  = px + 6;        // section left x
  const sW  = pw - 12;       // section width
  const dLX = px + 14;       // data label x
  const dVX = px + pw - 8;   // data value x (right-aligned)
  const bX  = px + 14;       // bar left x
  const bW  = pw - 22;       // bar width
  const ROW = 9;              // data row height
  const HDR = 11;             // section header height
  const GAP = 4;              // gap between sections

  // Section header: dark bg, left color strip, icon, ALL-CAPS label, optional right text
  function _hdr(color, icon, label, rightTxt, rightColor) {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.roundRect(sX, ly, sW, HDR, [3,3,0,0]); ctx.fill();
    ctx.fillStyle = color; ctx.globalAlpha = 0.82;
    ctx.fillRect(sX, ly, 3, HDR);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 4;
    ctx.fillText(icon, sX + 8, ly + HDR - 2);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 6.5px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = color; ctx.globalAlpha = 0.88;
    ctx.fillText(label, sX + 17, ly + HDR - 2);
    ctx.globalAlpha = 1;
    if (rightTxt) {
      ctx.font = 'bold 7px monospace'; ctx.textAlign = 'right';
      ctx.fillStyle = rightColor ?? 'rgba(180,150,80,0.80)';
      ctx.shadowColor = rightColor ?? 'transparent'; ctx.shadowBlur = rightColor ? 3 : 0;
      ctx.fillText(rightTxt, dVX, ly + HDR - 2);
      ctx.shadowBlur = 0;
    }
    ctx.textAlign = 'left';
    ly += HDR;
  }

  // Data row: label left (muted) + value right (bold)
  function _row(label, value, valColor) {
    ctx.font = '6px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(180,155,105,0.55)';
    ctx.fillText(label, dLX, ly + ROW - 2);
    ctx.font = 'bold 7.5px monospace'; ctx.textAlign = 'right';
    ctx.fillStyle = valColor ?? 'rgba(225,205,165,0.88)';
    if (valColor) { ctx.shadowColor = valColor; ctx.shadowBlur = 2; }
    ctx.fillText(value, dVX, ly + ROW - 2);
    ctx.shadowBlur = 0; ctx.textAlign = 'left';
    ly += ROW;
  }

  // Dual-value row: label + v1 at mid-right + v2 at far right
  function _rowDual(label, v1, v1c, v2, v2c) {
    const midX = sX + Math.floor(sW * 0.52);
    ctx.font = '6px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(180,155,105,0.55)';
    ctx.fillText(label, dLX, ly + ROW - 2);
    ctx.font = 'bold 7.5px monospace';
    ctx.fillStyle = v1c ?? 'rgba(225,205,165,0.88)'; ctx.textAlign = 'right';
    ctx.fillText(v1, midX, ly + ROW - 2);
    ctx.fillStyle = v2c ?? 'rgba(225,205,165,0.88)'; ctx.textAlign = 'right';
    ctx.fillText(v2, dVX, ly + ROW - 2);
    ctx.textAlign = 'left';
    ly += ROW;
  }

  // Thin progress bar (4px)
  function _bar(frac, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.50)';
    ctx.beginPath(); ctx.roundRect(bX, ly, bW, 4, 2); ctx.fill();
    if (frac > 0.001) {
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 3;
      ctx.beginPath(); ctx.roundRect(bX, ly, Math.max(3, bW * Math.min(1, frac)), 4, 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ly += 5;
  }

  // Segmented threat bar — N colored squares
  function _segBar(filled, total, color, warnColor) {
    const sw = Math.floor((bW - (total - 1) * 2) / total);
    for (let i = 0; i < total; i++) {
      const sx      = bX + i * (sw + 2);
      const isFull  = i < filled;
      const isWarn  = i >= total - 2;
      ctx.fillStyle = isFull ? (isWarn ? warnColor : color) : 'rgba(50,40,28,0.55)';
      ctx.globalAlpha = isFull ? 0.88 : 0.40;
      ctx.beginPath(); ctx.roundRect(sx, ly, sw, 5, 1); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ly += 7;
  }

  // ── 1. THREAT (active only — wave banner covers this during break) ────────────
  if (waveState === 'active') {
    const dispW     = waveNumber;
    const tRatio    = endlessMode ? 1.0 : Math.min(1, dispW / MAX_WAVES);
    const isBossW   = BOSS_WAVES.has(dispW);
    const tColor    = isBossW ? '#ff2010' : tRatio > 0.8 ? '#ff6020' : tRatio > 0.5 ? '#e8c040' : '#50d060';
    const onField   = enemies.filter(e => e.alive && !e.reached).length;
    const curEv     = currentWaveEvent;
    const nextBossW = [...BOSS_WAVES].filter(w => w > dispW).sort((a,b)=>a-b)[0] ?? null;

    _hdr(tColor, '☠', 'THREAT', `W${dispW}`, 'rgba(180,150,80,0.65)');
    _segBar(Math.ceil(tRatio * 10), 10, tColor, '#ff4020');

    if (isBossW) {
      _row('Enemies:', '☠ BOSS ACTIVE', '#ff5030');
    } else {
      const comp  = waveComposition(dispW);
      const parts = [comp.draugr      > 0 && `${comp.draugr}D`,
                     comp.mylings     > 0 && `${comp.mylings}M`,
                     comp.jotunn      > 0 && `${comp.jotunn}J`,
                     comp.maras       > 0 && `${comp.maras}X`,
                     (comp.wargs ?? 0)      > 0 && `${comp.wargs}W`,
                     (comp.einherjars ?? 0) > 0 && `${comp.einherjars}E`].filter(Boolean);
      _row('Enemies:', `${onField} ∙ ${parts.join(' ')}`, tColor);
    }
    if (nextBossW) {
      const _nbName = BOSS_CONFIGS[nextBossW]?.name ?? `Wave ${nextBossW}`;
      _row('Next Threat:', `☠ ${_nbName}`, '#d05828');
    } else if (curEv) {
      _row('Event:', `⚡ ${curEv.label}`, curEv.id === 'ancestralAid' ? '#80d8ff' : '#e8c040');
    }
    ly += GAP;
  }

  // ── 2. FORTRESS ──────────────────────────────────────────────────────────────
  {
    const livC  = lives <= 2 ? '#ff3030' : lives <= 4 ? '#ff7040' : '#50e870';
    const flash = lifeLostTimer > 0 ? Math.min(1, lifeLostTimer / 20) * (lifeLostTimer > 60 ? 1 : lifeLostTimer / 60) : 0;
    const effC  = flash > 0 ? '#ff1818' : livC;
    const stat  = lives <= 2 ? 'CRITICAL' : lives <= 4 ? 'BREACHED' : lives < STARTING_LIVES ? 'DAMAGED' : 'SECURE';
    const statC = lives <= 2 ? '#ff3030' : lives <= 4 ? '#ff7040' : lives < STARTING_LIVES ? '#e8c040' : '#50e870';

    if (flash > 0) { ctx.shadowColor = effC; ctx.shadowBlur = 8; }
    ctx.globalAlpha = flash > 0 ? 0.85 + flash * 0.15 : 1;
    _hdr('#5882c8', '♜', 'FORTRESS', stat, statC);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;

    _row('Ramparts:', `${lives} / ${STARTING_LIVES}`, effC);
    _bar(lives / STARTING_LIVES, effC);
    _row('Deployed:', `${towers.length}`, '#90a8c8');
    ly += GAP;
  }

  // ── 3. DEFENDERS ─────────────────────────────────────────────────────────────
  {
    const defC  = '#9070d8';
    const scored = towers.map(t => ({
      t,
      score: (t.damageDealt||0) + (t.killCount||0)*32 + (t.goldGenerated||0)*1.5,
    })).sort((a, b) => b.score - a.score);
    const mvpT     = scored.length ? scored[0].t : null;
    const mvpLabel = mvpT?.mvpTimer > 0 ? (mvpT.name ?? TOWER_DEFS[mvpT.type]?.label) : null;

    // Roster status word based on mean career level of deployed defenders
    const meanLvl = towers.length
      ? towers.reduce((s, t) => s + (t._careerLevel || 0), 0) / towers.length : 0;
    const rStatus = meanLvl >= 7 ? 'VETERAN' : meanLvl >= 4 ? 'BLOODED' : meanLvl >= 2 ? 'TRAINED' : 'GREEN';
    const rStatusC = meanLvl >= 7 ? '#ffd040' : meanLvl >= 4 ? '#e89040' : meanLvl >= 2 ? '#90c870' : '#8090c0';

    const _defRightTxt = mvpLabel ? `MVP: ${mvpLabel}` : `${towers.length} · ${rStatus}`;
    _hdr(defC, '⚔', 'DEFENDERS', _defRightTxt, mvpLabel ? '#ffd040' : rStatusC);

    if (towers.length === 0) {
      _row('No defenders', 'deployed', 'rgba(140,120,90,0.50)');
    } else {
      const show = Math.min(scored.length, 5);
      for (let i = 0; i < show; i++) {
        const { t } = scored[i];
        const isMvp  = i === 0;
        const tName  = t.name ?? TOWER_DEFS[t.type]?.label ?? t.type;
        const tLvl   = t._careerLevel > 0 ? ` [${ROMAN[t._careerLevel] ?? t._careerLevel}]` : '';
        const def    = _roster?.find(t.defenderId);
        // Show battle kills during fight; fall back to career kills (marked ✦); then class as context
        const bKills = t.killCount || 0;
        const killStr = bKills > 0 ? `${bKills}K ☠`
                      : def?.careerKills > 0 ? `${def.careerKills}K✦`
                      : (TOWER_DEFS[t.type]?.label ?? '');
        const nameC  = isMvp
          ? `rgba(${t.glowRgb ?? '180,150,255'},0.95)`
          : 'rgba(185,165,130,0.72)';
        _row(tName + tLvl, killStr, nameC);
      }
    }
    ly += GAP;
  }

  // ── 4. TREASURY ──────────────────────────────────────────────────────────────
  {
    const hG      = gold;
    const hLevel  = hG >= 5000 ? 'LEGENDARY' : hG >= 1000 ? 'WEALTHY' : hG >= 500 ? 'PROSPEROUS' : hG >= 100 ? 'TREASURY' : 'SPARSE';
    const hColor  = hG >= 5000 ? '#ffd040' : hG >= 1000 ? '#f0a030' : hG >= 500 ? '#c08020' : hG >= 100 ? '#c89828' : '#786040';
    const pulse   = hoardPulse > 0;
    const lastInc = goldEarned - waveGoldStart;
    const incEst  = lastWaveTimeSec > 0 ? Math.ceil(lastInc / Math.max(1, lastWaveTimeSec)) : 0;

    _hdr('#c89828', '◆', 'TREASURY', hLevel, hColor);

    // Gold — hero-sized value
    ctx.font = '6px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(180,155,105,0.55)';
    ctx.fillText('Gold:', dLX, ly + 10);
    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'right';
    ctx.fillStyle = pulse ? '#fff8a0' : '#f0c840';
    if (pulse) { ctx.shadowColor = '#ffffa0'; ctx.shadowBlur = 10; }
    ctx.fillText(`${Math.floor(_displayGold)}g`, dVX, ly + 10);
    ctx.shadowBlur = 0; ctx.textAlign = 'left';
    ly += 12;

    _row('Gold / sec:', `${incEst}g`, '#c89828');

    const hFrac = hG >= 5000 ? 1.0 : hG >= 1000 ? 0.80 : hG >= 500 ? 0.60 : hG >= 100 ? 0.35 : Math.min(0.20, hG/100);
    _bar(hFrac, hColor);
    ly += GAP;
  }

  // ── 5. CAMPAIGN ──────────────────────────────────────────────────────────────
  {
    const dispW    = waveState === 'countdown' ? waveNumber + 1 : waveNumber;
    const progress = endlessMode ? 1.0 : Math.min(1, dispW / MAX_WAVES);
    const bColor   = progress < 0.5 ? '#60c840' : progress < 0.8 ? '#e8c040' : '#e84040';
    const campC    = 'rgba(130,130,195,0.90)';

    _hdr(campC, '✦', 'CAMPAIGN', `✦ ${stars}`, 'rgba(230,200,80,0.80)');
    _row('Wave Progress:', endlessMode ? `${dispW} / ∞` : `${dispW} / ${MAX_WAVES}`, 'rgba(210,195,160,0.90)');
    _bar(progress, bColor);
    _row('Chieftains Slain:', `${bossesDefeated} / ${BOSS_WAVES.size}`,
      bossesDefeated >= BOSS_WAVES.size ? '#ffd040' : 'rgba(200,180,130,0.80)');
    _row('Reserve:', `◆ ${goldReserve}g`, 'rgba(190,170,100,0.70)');
    {
      const fb = _fortressBonuses;
      const fParts = [];
      if ((fb.startingGoldBonus   ?? 0) > 0) fParts.push(`+${fb.startingGoldBonus}g`);
      if ((fb.recruitCostReduction ?? 0) > 0) fParts.push(`−${fb.recruitCostReduction}g recruit`);
      if ((fb.wallCostReduction   ?? 0) > 0) fParts.push(`−${fb.wallCostReduction}g wall`);
      if ((fb.equipDmMult         ?? 1) > 1) fParts.push(`+${Math.round((fb.equipDmMult - 1) * 100)}%eq`);
      if (fParts.length > 0) _row('Fortress:', fParts.join(' · '), 'rgba(140,180,140,0.65)');
    }
    ly += GAP;
  }

  // ── HOARD VISUAL — coin pile in gap between sections and speed button ─────────
  {
    const spY     = panelBot - 152;   // speed button top
    const hoarGap = spY - ly - 4;
    if (waveState !== 'active' && hoarGap >= 20) {
      const hcx    = px + pw * 0.5;
      const hcy    = ly + hoarGap * 0.52;
      const stack  = gold >= 5000 ? 8 : gold >= 1000 ? 6 : gold >= 500 ? 5 : gold >= 100 ? 3 : gold >= 20 ? 2 : 1;
      const hScale = Math.min(1.0, hoarGap / 48);
      const hPulse = 0.88 + Math.sin(_now * 0.0019) * 0.12;
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath(); ctx.ellipse(hcx, hcy+5*hScale, 13*hScale, 3*hScale, 0, 0, Math.PI*2); ctx.fill();
      const coinRX = 12*hScale, coinRY = coinRX*0.36, coinGap = 2.0*hScale;
      ctx.globalAlpha = 0.70 * hPulse;
      for (let ci = 0; ci < stack; ci++) {
        const coinY = hcy - ci*coinGap, bright = 0.68 + (ci/stack)*0.32;
        ctx.fillStyle = `rgb(${Math.floor(200*bright+20)},${Math.floor(148*bright)},28)`;
        ctx.beginPath(); ctx.ellipse(hcx, coinY, coinRX, coinRY, 0, 0, Math.PI*2); ctx.fill();
        if (ci === stack-1) { ctx.strokeStyle='rgba(255,220,80,0.55)'; ctx.lineWidth=0.8; ctx.stroke(); }
      }
      if (gold >= 500) {
        ctx.globalAlpha = 0.14*hPulse; ctx.shadowColor='#f0c030'; ctx.shadowBlur=10; ctx.fillStyle='#f0c030';
        ctx.beginPath(); ctx.ellipse(hcx, hcy-stack*coinGap*0.5, coinRX+3, coinRY+2, 0, 0, Math.PI*2);
        ctx.fill(); ctx.shadowBlur=0;
      }
      ctx.restore();
    }
  }

  // ── SPEED CONTROL ─────────────────────────────────────────────────────────────
  {
    const spH = 24, spY = panelBot - 152, spX = px + 6, spW = pw - 12;
    speedBtns = [];

    function drawSpeedTriangles(cx, cy, n, color, size = 5) {
      const gap = 3.5, total = n * size + (n-1) * gap;
      let tx = cx - total/2;
      ctx.fillStyle = color;
      for (let i = 0; i < n; i++) {
        let ox = tx, oy = cy;
        if (n === 4) {
          const col = i%2, rr = Math.floor(i/2), g2=3, t2=2*size+g2;
          ox = cx - t2/2 + col*(size+g2); oy = cy + (rr===0 ? -3.5 : 3.5);
        }
        ctx.beginPath();
        ctx.moveTo(ox, oy-size*0.6); ctx.lineTo(ox+size, oy); ctx.lineTo(ox, oy+size*0.6);
        ctx.closePath(); ctx.fill();
        if (n !== 4) tx += size + gap;
      }
    }

    const sp      = gameSpeed;
    const _spIdle = waveState === 'active' && sp === 1;
    const spFill  = sp >= 4 ? 'rgba(200,55,18,0.97)' : sp >= 2 ? 'rgba(190,120,18,0.97)' : _spIdle ? 'rgba(14,30,12,0.90)' : 'rgba(30,60,22,0.97)';
    const spBord  = sp >= 4 ? 'rgba(255,110,50,0.95)' : sp >= 2 ? 'rgba(255,180,50,0.88)' : _spIdle ? 'rgba(40,90,38,0.45)' : 'rgba(80,200,80,0.80)';
    const triCol  = sp >= 4 ? '#ffb080' : sp >= 2 ? '#ffe090' : _spIdle ? '#507050' : '#a0f080';
    const nextSp  = sp >= 4 ? 1 : sp >= 2 ? 4 : 2;

    ctx.save();
    ctx.beginPath(); ctx.roundRect(spX, spY, spW, spH, 5);
    ctx.fillStyle = spFill; ctx.fill();
    ctx.strokeStyle = spBord; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.shadowColor = spBord; ctx.shadowBlur = _spIdle ? 2 : 8;
    ctx.beginPath(); ctx.roundRect(spX, spY, spW, spH, 5); ctx.stroke();
    ctx.shadowBlur = 0; ctx.restore();

    drawSpeedTriangles(spX + spW*0.38, spY + spH*0.42, sp===1?1:sp===2?2:4, triCol, 4.5);
    ctx.font = 'bold 9px monospace'; ctx.fillStyle = triCol; ctx.textAlign = 'left';
    ctx.fillText(`×${sp}`, spX + spW*0.60, spY + spH - 4);
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(180,140,80,0.55)'; ctx.textAlign = 'right';
    ctx.fillText(`→ ×${nextSp}`, spX + spW - 4, spY + spH - 4);
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(160,120,60,0.70)'; ctx.textAlign = 'center';
    ctx.fillText('[F] speed', spX + spW/2, spY + spH + 8);
    ctx.textAlign = 'left';
    speedBtns.push({ x: spX, y: spY, w: spW, h: spH });
  }

  // ── RUNE FORGE (break/countdown only) ─────────────────────────────────────────
  if (!gameOver && waveState !== 'active') {
    const rfH = 34, rfY = panelBot - 116, rfX = px + 6, rfW = pw - 12;
    const rfActive = showRuneMenu, hasStars = stars > 0;
    const rfPulse  = hasStars ? 0.65 + Math.sin(_now * 0.004) * 0.35 : 0;
    ctx.globalAlpha = hasStars ? 1 : 0.38;
    ctx.save();
    if (hasStars && !rfActive) { ctx.shadowColor = `rgba(180,120,255,${rfPulse*0.6})`; ctx.shadowBlur = 12; }
    drawFantasyPanel(rfX, rfY, rfW, rfH, rfActive ? 'rgba(28,14,52,0.98)' : 'rgba(16,8,36,0.96)',
      rfActive ? 0.88 : (hasStars ? 0.55 : 0.2), 6);
    ctx.shadowBlur = 0;
    const iX = rfX+14, iY = rfY+rfH/2;
    ctx.fillStyle = rfActive ? '#c0a0ff' : (hasStars ? `rgba(160,120,220,${0.5+rfPulse*0.5})` : '#403050');
    ctx.fillRect(iX-6, iY-4, 12, 4); ctx.fillRect(iX-4, iY, 8, 4);
    ctx.save(); ctx.translate(iX+1, iY-8); ctx.rotate(-0.5);
    ctx.fillStyle = rfActive ? '#e0d0ff' : (hasStars ? `rgba(200,180,255,${0.4+rfPulse*0.5})` : '#503860');
    ctx.fillRect(-1,0,2,7); ctx.fillRect(-3,-3,6,3); ctx.restore();
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = rfActive ? '#d0b0ff' : (hasStars ? `rgba(180,140,255,${0.6+rfPulse*0.4})` : '#504060');
    ctx.shadowColor = rfActive ? 'rgba(180,120,255,0.7)' : 'rgba(140,80,220,0.4)';
    ctx.shadowBlur  = rfActive ? 10 : (hasStars ? rfPulse*8 : 0);
    ctx.fillText('RUNE FORGE', rfX+28, rfY+14);
    ctx.shadowBlur = 0;
    ctx.font = '8px monospace';
    ctx.fillStyle = hasStars ? '#f0d040' : 'rgba(160,130,60,0.4)';
    ctx.fillText(hasStars ? `✦ ${stars} stars  [R]` : 'earn ✦ via flawless waves', rfX+28, rfY+26);
    ctx.restore(); ctx.globalAlpha = 1;
    runeForgeBtn = hasStars ? { x: rfX, y: rfY, w: rfW, h: rfH } : null;
  } else {
    runeForgeBtn = null;
  }

  // ── AUTO NEXT (break/countdown only) ──────────────────────────────────────────
  if (!gameOver && waveState !== 'active') {
    const aH = 24, aY = panelBot - 76, aX = px + 6, aW = pw - 12;
    drawFantasyPanel(aX, aY, aW, aH, autoNextWave ? 'rgba(18,52,20,0.98)' : 'rgba(18,18,28,0.94)',
      autoNextWave ? 0.88 : 0.24, 5);
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = autoNextWave ? '#8af090' : 'rgba(210,210,240,0.75)';
    ctx.fillText(autoNextWave ? 'AUTO NEXT: ON' : 'AUTO NEXT: OFF', aX + aW/2, aY + 14);
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(170,140,80,0.65)';
    ctx.fillText('[A] toggle', aX + aW/2, aY + 22);
    ctx.textAlign = 'left';
    autoNextBtn = { x: aX, y: aY, w: aW, h: aH };
  } else {
    autoNextBtn = null;
  }

  // ── NEXT WAVE ────────────────────────────────────────────────────────────────
  if (!gameOver && waveState !== 'active') {
    const bH = 44, bY = panelBot - bH - 4, bX = px + 6, bW = pw - 12;
    ctx.shadowColor = 'rgba(200,30,20,0.8)'; ctx.shadowBlur = 12;
    drawFantasyPanel(bX, bY, bW, bH, 'rgba(140,18,18,0.97)', 0.92, 6);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center'; ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#f0e8d0'; ctx.shadowColor = 'rgba(255,100,80,0.7)'; ctx.shadowBlur = 8;
    ctx.fillText('MARCH BEGINS', bX + bW/2, bY + 17);
    ctx.font = '11px monospace'; ctx.shadowBlur = 0;
    ctx.fillStyle = autoNextWave ? '#60ee80' : 'rgba(255,200,180,0.8)';
    ctx.fillText(autoNextWave ? 'AUTO ENGAGED' : '[Space]', bX + bW/2, bY + 32);
    ctx.textAlign = 'left';
    nextWaveBtn = { x: bX, y: bY, w: bW, h: bH };
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
  ctx.fillText('NORTHERN SHIELD', avX + avR + 5, cy - 4);
  ctx.shadowBlur  = 0;
  if (_currentMapName) {
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(160,130,80,0.55)';
    ctx.fillText(_currentMapName, avX + avR + 5, cy + 7);
  }

  // ── CENTER: wave label + timer ───────────────────────────────────────────────
  const midX = Math.round(BASE_W / 2);
  const displayWave = waveState === 'countdown' ? waveNumber + 1 : waveNumber;
  const wLabel  = endlessMode ? `WAVE ${displayWave} / ∞` : `WAVE ${displayWave} / ${MAX_WAVES}`;
  const wThreat = endlessMode ? 1.0 : displayWave / MAX_WAVES;
  const wIsBoss = BOSS_WAVES.has(displayWave);
  const wColor  = wIsBoss ? '#ff6040' : wThreat > 0.8 ? '#ff9040' : wThreat > 0.5 ? '#e8c040' : '#a8ecd0';
  const wGlow   = wIsBoss ? 'rgba(255,80,20,0.55)' : wThreat > 0.8 ? 'rgba(255,130,20,0.45)' : wThreat > 0.5 ? 'rgba(230,180,30,0.4)' : 'rgba(100,220,160,0.45)';

  // Map name is the primary identity; wave label demoted to small subtitle
  const _centerName = _currentMapName || 'NORTHERN SHIELD';
  ctx.font        = `bold ${wIsBoss ? 13 : 12}px monospace`;
  ctx.fillStyle   = wColor;
  ctx.shadowColor = wGlow;
  ctx.shadowBlur  = wIsBoss ? 10 : 6;
  ctx.textAlign   = 'center';
  ctx.fillText(_centerName, midX - 30, cy - 3);
  ctx.shadowBlur  = 0;
  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(140,110,70,0.45)';
  ctx.fillText(wLabel, midX - 30, cy + 8);

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
  ctx.fillText(`⚑ ${lives}/${STARTING_LIVES}`, rx, cy);
  ctx.globalAlpha = 1;
  rx -= ctx.measureText(`⚑ ${lives}/${STARTING_LIVES}`).width + 18;
  ctx.shadowBlur  = 0;

  // ── Gold ────────────────────────────────────────────────────────────────────
  const goldStr = `◆ ${Math.floor(_displayGold)}g`;
  ctx.font        = 'bold 11px monospace';
  ctx.fillStyle   = hoardPulse > 0 ? '#fff8a0' : '#e8c040';
  ctx.shadowColor = 'rgba(220,180,30,0.5)';
  ctx.shadowBlur  = hoardPulse > 0 ? 8 : 3;
  ctx.fillText(goldStr, rx, cy);
  ctx.shadowBlur  = 0;
  rx -= ctx.measureText(goldStr).width + 18;

  ctx.fillStyle = '#b0d0f0';
  ctx.fillText(`⚔ ${slain}`, rx, cy);
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
  {
    ctx.fillStyle   = gameSpeed >= 4 ? '#ff8040' : gameSpeed >= 2 ? '#f0c840' : 'rgba(100,130,80,0.65)';
    ctx.shadowColor = gameSpeed >= 4 ? 'rgba(255,100,20,0.6)' : gameSpeed >= 2 ? 'rgba(240,180,20,0.4)' : 'transparent';
    ctx.shadowBlur  = gameSpeed >= 2 ? 4 : 0;
    ctx.fillText(`×${gameSpeed}`, lx2, cy);
    ctx.shadowBlur = 0;
    lx2 += ctx.measureText(`×${gameSpeed}`).width + 10;
  }
  ctx.fillStyle = isMuted ? '#ff6060' : '#506050';
  ctx.fillText(isMuted ? '◈MUTE' : '◈SFX', lx2, cy);

  // Help hint — far right, muted (? key)
  ctx.textAlign = 'right';
  ctx.font      = '10px monospace';
  ctx.fillStyle = showHelp ? 'rgba(240,200,80,0.85)' : 'rgba(140,110,60,0.75)';
  ctx.fillText('[?]', FT + pw - 6, cy);

  // Sprite scale pill — only shown when help overlay is open
  if (showHelp) {
    try {
      const sc = getSpriteScale();
      const pillW = 74, pillH = 20;
      const pillX = FT + pw - pillW - 12;
      const pillY = barMid - pillH / 2;
      ctx.save();
      ctx.globalAlpha = 0.70;
      ctx.fillStyle = 'rgba(10,10,12,0.78)';
      ctx.beginPath(); ctx.roundRect(pillX, pillY, pillW, pillH, 6); ctx.fill();
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#a0a0b0';
      ctx.fillText(`Scale ${sc.toFixed(2)}`, pillX + pillW / 2, pillY + pillH / 2 + 3);
      ctx.restore();
    } catch (err) { /* ignore */ }
  }

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

  // Panel identity label — reads as warband roster, not tower build menu
  ctx.save();
  ctx.font      = 'bold 7px monospace';
  ctx.fillStyle = 'rgba(200,155,80,0.50)';
  ctx.textAlign = 'left';
  ctx.fillText('WARBAND', buildPanelX + 8, buildPanelY + 11);
  ctx.restore();

  for (const btn of buttons) {
    const isSelected = btn.mode === CELL.WALL
      ? buildMode === CELL.WALL
      : buildMode === CELL.TOWER && selectedTowerType === btn.id;
    const affordable = gold >= btn.cost;

    const isWall      = btn.mode === CELL.WALL;
    const fillStyle   = isSelected
      ? (isWall ? 'rgba(20,34,50,0.97)' : 'rgba(70,40,10,0.97)')
      : (isWall ? 'rgba(8,14,22,0.92)'  : 'rgba(18,9,28,0.92)');
    const borderAlpha = isSelected ? 0.90 : 0.35;
    drawFantasyPanel(btn.x, btn.y, btn.width, btn.height, fillStyle, borderAlpha, 6);

    // Category color stripe — 2px across top of card
    const _catColor = btn.category === 'warriors' ? 'rgba(200,70,30,0.60)'
                    : btn.category === 'siege'     ? 'rgba(140,115,75,0.60)'
                    : btn.category === 'mystic'    ? 'rgba(130,55,195,0.60)'
                    : 'rgba(55,95,140,0.55)';  // walls
    ctx.fillStyle   = _catColor;
    ctx.globalAlpha = affordable ? 1 : 0.45;
    ctx.beginPath(); ctx.roundRect(btn.x + 3, btn.y + 3, btn.width - 6, 3, [1, 1, 0, 0]); ctx.fill();
    ctx.globalAlpha = 1;

    // Colored bottom accent strip — matches tower glow on the board
    if (btn.glowRgb) {
      const stripAlpha = affordable ? (isSelected ? 1.0 : 0.70) : 0.20;
      ctx.globalAlpha = stripAlpha;
      ctx.fillStyle   = `rgba(${btn.glowRgb},0.90)`;
      ctx.beginPath();
      ctx.roundRect(btn.x + 3, btn.y + btn.height - 3, btn.width - 6, 3, [0, 0, 3, 3]);
      ctx.fill();
      if (isSelected) {
        // glow bloom on selected card
        ctx.shadowColor = `rgba(${btn.glowRgb},0.8)`; ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    }

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
    ctx.font      = 'bold 10px monospace';
    ctx.fillStyle = isSelected ? '#e8c040' : 'rgba(200,160,80,0.85)';
    ctx.textAlign = 'left';
    ctx.fillText(`[${btn.key}]`, btn.x + 4, btn.y + 11);

    // ── Veteran indicator top-right ─────────────────────────────────────────────
    if (btn.mode === CELL.TOWER) {
      const vet = _roster?.defenders.find(d => d.type === btn.id && !d.deployed);
      if (vet && vet.careerLevel > 0) {
        ctx.font = '7px monospace'; ctx.textAlign = 'right';
        ctx.fillStyle = `rgba(${TOWER_DEFS[btn.id]?.glowRgb ?? '220,180,60'},0.80)`;
        ctx.fillText(`V.${ROMAN[vet.careerLevel] ?? vet.careerLevel}`, btn.x + btn.width - 3, btn.y + 10);
      }
    }

    // ── Info strip (bottom 26px) ────────────────────────────────────────────────
    const infoY = btn.y + btn.height - INFO_H;

    ctx.strokeStyle = isSelected ? 'rgba(220,170,50,0.4)' : 'rgba(160,120,40,0.2)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(btn.x + 4, infoY); ctx.lineTo(btn.x + btn.width - 4, infoY);
    ctx.stroke();

    const labelSz = btn.width < 60 ? 7 : 9;

    // Row 1: veteran name if roster member available, otherwise class name
    const _vetCard = btn.mode === CELL.TOWER ? _roster?.defenders.find(d => d.type === btn.id && !d.deployed) : null;
    const _cardLabel = (_vetCard?.name) ? _vetCard.name : btn.label;
    ctx.font      = `bold ${labelSz}px monospace`;
    ctx.fillStyle = !affordable ? '#3a3020' : isSelected ? '#f0e8d0' : '#c0b090';
    ctx.textAlign = 'left';
    ctx.fillText(_cardLabel, btn.x + 4, infoY + 9);

    // Row 2: ability label (left) + cost (right)
    const abilityLabel = ABILITY_LABELS[btn.id];
    ctx.font = `${labelSz}px monospace`;
    if (abilityLabel) {
      ctx.fillStyle = !affordable ? '#2a2010' : isSelected ? 'rgba(160,200,255,0.9)' : 'rgba(100,140,190,0.6)';
      ctx.textAlign = 'left';
      ctx.fillText(abilityLabel, btn.x + 4, infoY + 20);
    }
    ctx.textAlign = 'right';
    if (!affordable) {
      ctx.fillStyle = '#e84040';
      ctx.fillText(`◆${btn.cost}`, btn.x + btn.width - 3, infoY + 20);
    } else {
      ctx.fillStyle = isSelected ? '#e8c040' : '#706040';
      ctx.fillText(`◆${btn.cost}`, btn.x + btn.width - 3, infoY + 20);
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
      // Unit name + star requirement
      ctx.font = `bold ${labelSz}px monospace`;
      ctx.fillStyle = '#f0d040';
      ctx.fillText(`✦ ${stars} / ${gate}`, cx2, cy + 13);
      ctx.font = `${labelSz - 1}px monospace`;
      ctx.fillStyle = 'rgba(220,180,80,0.65)';
      const _lockLabel = TOWER_DEFS[btn.id]?.label ?? btn.label;
      ctx.fillText(`${_lockLabel} · ${gate} ✦`, cx2, cy + 24);
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
      const livesLostForTier = STARTING_LIVES - lives;
      const tierLabel = livesLostForTier === 0 ? 'LEGENDARY DEFENSE'
                      : livesLostForTier <= 2   ? 'STALWART SHIELD'
                      :                           'THE NORTH ENDURES';
      ctx.fillStyle   = '#f0c840';
      ctx.font        = 'bold 11px monospace';
      ctx.fillText(tierLabel, cx, cy - 14);
      ctx.font        = '13px monospace';
      ctx.fillText('Northern Shield held for 100 waves', cx, cy - 0);
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
      ctx.fillText(`✦ ${stars} campaign stars total`, cx, cy + 54);
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
        ? `→ Earn ${TOWER_STAR_GATES.isjatten} ★ to unlock Ice Giant`
        : stars < TOWER_STAR_GATES.drakship
          ? `→ Earn ${TOWER_STAR_GATES.drakship} ★ to unlock Dragonship`
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
  const tb = tower._talentBonuses;
  const hasTalents = !!(tb && (
    (tb.dm ?? 1) !== 1 || (tb.rm ?? 1) !== 1 ||
    (tb.cm ?? 1) !== 1 || (tb.slowMult ?? 1) !== 1
  ));
  const talentExtraH = hasTalents ? 13 : 0;
  const defForPanel = _roster?.find(tower.defenderId);
  const hasItems = !!defForPanel;  // always show equipment section for roster-linked defenders
  const itemsExtraH = hasItems ? 14 : 0;
  const panelH = (tower.maxed ? 146 : 160) + talentExtraH + itemsExtraH;
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

  // Defender name + career level
  if (tower.name) {
    const careerRoman = tower._careerLevel > 0 ? `  [${ROMAN[tower._careerLevel] ?? tower._careerLevel}]` : '';
    ctx.textAlign = 'left';
    ctx.font      = '10px monospace';
    ctx.fillStyle = 'rgba(220,190,130,0.80)';
    ctx.fillText(tower.name + careerRoman, px + 10, py + 28);
  }

  // Stats
  ctx.textAlign = 'left';
  ctx.font      = '11px monospace';
  ctx.fillStyle = '#8aaccc';
  if (tower.type === 'hydda') {
    ctx.fillText(`HEALS ${tower.level >= 5 ? 2 : 1} life every ${Math.round(tower.fireRate / 30)}s`, px + 10, py + 44);
  } else if (tower.type === 'blondie') {
    const slowPct = Math.round((1 - (def.slowFactor ?? 0.4)) * 100);
    const durSec  = Math.round((def.slowDuration ?? 60) / 30);
    ctx.fillText(`${slowPct}% SLOW · ${durSec}s · RNG ${tower.range}`, px + 10, py + 44);
  } else if (tower.type === 'isjatten') {
    ctx.fillText(`DMG ${tower.damage}  RNG ${tower.range}  AoE`, px + 10, py + 44);
  } else {
    const dps = tower.fireRate > 0 ? Math.round(tower.damage * 30 / tower.fireRate) : 0;
    ctx.fillText(`DMG ${tower.damage}  RNG ${tower.range}  DPS ~${dps}`, px + 10, py + 44);
  }

  if (!tower.maxed) {
    const n       = tower.level;
    const nextDmg = Math.round(tower.baseDamage * (1 + n * 0.25));
    const nextRng = Math.round(tower.baseRange  * (1 + n * 0.08));
    const nextFR  = Math.max(4, Math.round(tower.baseFireRate * (1 - n * 0.05)));
    ctx.font      = '9px monospace';
    ctx.fillStyle = 'rgba(120,200,120,0.65)';
    ctx.fillText(`▸ Lv${n + 1}: DMG ${nextDmg}  RNG ${nextRng}  SPD ${nextFR}`, px + 10, py + 55);
  }

  // Kill stats + damage dealt / synergy (right side)
  const killRow = tower.maxed ? py + 57 : py + 70;
  ctx.font      = '10px monospace';
  ctx.fillStyle = '#80aa70';
  ctx.fillText(`☠ ${tower.killCount ?? 0} kills`, px + 10, killRow);
  ctx.textAlign = 'right';
  if (tower._synergy) {
    const synLabels = { eagleEye: 'Eagle Eye +15%rng', siegeFury: 'Siege Fury +20%spl', winterGrip: "Winter's Grip +15%dmg", shieldWall: 'Shield Wall +10%dmg', tidecall: 'Tidecall +15%spl', runeChain: 'Rune Chain +15%dmg +1pierce' };
    const synColors = { eagleEye: '#88aaee', siegeFury: '#e87030', winterGrip: '#60c8f0', shieldWall: '#e0a040', tidecall: '#40b8e0', runeChain: '#c080f0' };
    ctx.fillStyle = synColors[tower._synergy];
    ctx.fillText(`⬡ ${synLabels[tower._synergy]}`, px + panelW - 10, killRow);
  } else if ((tower.damageDealt ?? 0) > 0) {
    ctx.fillStyle = '#c07050';
    ctx.fillText(`⚔ ${tower.damageDealt}`, px + panelW - 10, killRow);
  }
  ctx.textAlign = 'left';

  // Talent bonuses row
  if (hasTalents) {
    const talParts = [];
    if ((tb.dm  ?? 1) !== 1) talParts.push(`+${Math.round((tb.dm  - 1) * 100)}%dmg`);
    if ((tb.rm  ?? 1) !== 1) talParts.push(`+${Math.round((tb.rm  - 1) * 100)}%rng`);
    if ((tb.cm  ?? 1) !== 1) talParts.push(`−${Math.round((1 - tb.cm)  * 100)}%cd`);
    if ((tb.slowMult ?? 1) !== 1) talParts.push(`−${Math.round((1 - tb.slowMult) * 100)}%slow`);
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(240,200,60,0.75)';
    ctx.fillText(`✦ ${talParts.join(' · ')}`, px + 10, killRow + 13);
  }

  // Divider
  const divY = (tower.maxed ? py + 65 : py + 78) + talentExtraH;
  ctx.strokeStyle = 'rgba(210,160,40,0.2)';
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  ctx.moveTo(px + 8, divY); ctx.lineTo(px + panelW - 8, divY);
  ctx.stroke();

  // Upgrade button
  const btnY  = (tower.maxed ? py + 72 : py + 86) + talentExtraH;
  const btnH  = 28;
  const upgW  = 94;
  const sellW = 52;
  const upgX  = px + 8;
  const sellX = px + panelW - 8 - sellW;

  const canUpgrade = !tower.maxed && gold >= tower.upgradeCost;
  drawFantasyPanel(upgX, btnY, upgW, btnH,
    tower.maxed ? 'rgba(10,8,20,0.97)' : canUpgrade ? 'rgba(8,24,8,0.97)' : 'rgba(60,20,20,0.97)',
    canUpgrade ? 0.65 : tower.maxed ? 0.18 : 0.55, 4);

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

  // Recall button — first click shows CONFIRM?, second click recalls defender to roster
  const isSellPending = pendingSell && pendingSell.key === `${tower.col}_${tower.row}`;
  drawFantasyPanel(sellX, btnY, sellW, btnH, isSellPending ? 'rgba(40,6,6,0.97)' : 'rgba(22,6,6,0.97)', isSellPending ? 0.85 : 0.55, 4);
  ctx.font      = 'bold 10px monospace';
  ctx.fillStyle = isSellPending ? '#ff4040' : '#ee6666';
  ctx.fillText(isSellPending ? 'CONFIRM?' : 'Recall', sellX + sellW / 2, btnY + 12);
  ctx.font      = '9px monospace';
  ctx.fillStyle = 'rgba(160,130,80,0.55)';
  ctx.fillText('to roster', sellX + sellW / 2, btnY + 23);

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

  // ── Equipped items ───────────────────────────────────────────────────────────
  if (hasItems) {
    const itemSecY = runeSecY + (runeDef ? 30 : 20);
    ctx.strokeStyle = 'rgba(180,140,60,0.15)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(px + 8, itemSecY); ctx.lineTo(px + panelW - 8, itemSecY); ctx.stroke();
    ctx.font = '8px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(110,90,55,0.65)';
    ctx.fillText('ITEMS', px + 10, itemSecY + 10);
    [0, 1].forEach(si => {
      const iid = defForPanel.equipment[si];
      const slotIcon = si === 0 ? '⚔' : '🛡';
      const slotX    = px + 36 + si * 62;
      ctx.font = '8px monospace'; ctx.textAlign = 'left';
      if (!iid) {
        ctx.fillStyle = 'rgba(80,65,40,0.40)';
        ctx.fillText(`${slotIcon} —`, slotX, itemSecY + 10);
        return;
      }
      const iDef = ITEM_DEFS[iid];
      if (!iDef) return;
      const ec = RARITY_COLOR[iDef.rarity] ?? '#aaa';
      ctx.fillStyle = ec;
      ctx.fillText(`${slotIcon} ${iDef.name.slice(0, 10)}`, slotX, itemSecY + 10);
    });
  }

  ctx.restore();

  panelUpgradeBtn = { x: upgX,  y: btnY, w: upgW,  h: btnH };
  panelSellBtn    = { x: sellX, y: btnY, w: sellW, h: btnH };
}

function onBossPhase75(boss) {
  sfxBossPhase();
  screenShake = Math.max(screenShake, 8);
  spawnParticles(boss.x, boss.y, boss.highlightColor, 22);
  bossDefeatTimer = 180;
  bossDefeatText  = (boss.bossName ?? 'BOSS') + ' — PHASE SHIFT';
  // Expanding flash ring — telegraphs the summon event
  bossRings.push({ x: boss.x, y: boss.y, r: boss.radius, maxR: boss.radius * 5.5, life: 34, maxLife: 34, color: boss.highlightColor });
  // Portal-side ring: shows WHERE the minions will spawn (grid-local coords)
  const spawnPx = SPAWN.col * CELL_SIZE + CELL_SIZE / 2;
  const spawnPy = SPAWN.row * CELL_SIZE + CELL_SIZE / 2;
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
      empRings.push({ x: t.x, y: t.y, r: 0, life: 28, maxLife: 28 });
    }
    if (chosen.length > 0) {
      const cx = COLS * CELL_SIZE / 2;
      const cy = ROWS * CELL_SIZE / 2;
      dmgFloaters.push({ x: cx, y: cy, val: `${chosen.length} TOWERS DISABLED`, life: 90, maxLife: 90, color: '#e8a040', large: true, suffix: '' });
    }
    boss.stunTimer = 30;
  } else if (boss.waveNum === 50) {
    // Mara-Void: summons 6 Mylings + stun pause
    boss.slowImmune = true;
    boss.stunTimer  = 45;
    for (let i = 0; i < 6; i++) spawnEnemy(ENEMY_TYPES.MYLING, waveHpScale * 0.80);
    bossRings.push({ x: boss.x, y: boss.y, r: boss.radius, maxR: boss.radius * 7, life: 40, maxLife: 40, color: '#9040e0' });
  } else if (boss.waveNum === 75) {
    // Fenrir: spawns 3 Jötunn at 50% — the pack before the final howl
    boss.stunTimer = 30;
    for (let i = 0; i < 3; i++) spawnEnemy(ENEMY_TYPES.JOTUNN, waveHpScale * 0.80);
    bossRings.push({ x: boss.x, y: boss.y, r: boss.radius, maxR: boss.radius * 8, life: 36, maxLife: 36, color: '#e0c020' });
  }

  bossDefeatTimer = 150;
  bossDefeatText  = `${boss.bossName} — ENRAGED!`;
  bossDefeatGold  = 0;
}

function onBossPhase25(boss) {
  sfxBossPhase();
  screenShake = Math.max(screenShake, 22);
  spawnParticles(boss.x, boss.y, boss.highlightColor, 30);
  spawnParticles(boss.x, boss.y, '#ffffff', 12);
  bossRings.push({ x: boss.x, y: boss.y, r: boss.radius, maxR: boss.radius * 12, life: 40, maxLife: 40, color: '#ff8800' });
  bossDefeatTimer = 180;
  bossDefeatGold  = 0;

  // Survival bonus: 10% of boss reward for lasting to final stand
  const survivalBonus = Math.round(boss.reward * 0.10);
  if (survivalBonus > 0) {
    gold       += survivalBonus;
    goldEarned += survivalBonus;
    dmgFloaters.push({ x: boss.x, y: boss.y + boss.radius + 10, val: `+${survivalBonus}`, life: 110, maxLife: 110, color: '#ffd060', large: false, suffix: 'g ENDURED' });
  }

  const FINAL_STAND_NAMES = {
    10:  'DRAUGEN-JARL — DEATH SHRIEK',
    25:  'JÖTUNHELM WALKER — EARTH STOMP',
    50:  'MARA-VOID — DEATH SURGE',
    75:  'FENRIR — THE HOWL',
    100: 'SURTR — WORLD FIRE',
  };
  bossDefeatText = FINAL_STAND_NAMES[boss.waveNum] ?? `${boss.bossName} — FINAL STAND`;

  if (boss.waveNum === 10) {
    // Draugen-Jarl DEATH SHRIEK: disable the 2 nearest towers + scream ring
    const byDist = towers.slice().sort((a, b) =>
      Math.hypot(a.x - boss.x, a.y - boss.y) - Math.hypot(b.x - boss.x, b.y - boss.y));
    const chosen = byDist.slice(0, 2);
    for (const t of chosen) {
      t.disabledTimer = 60;
      empRings.push({ x: t.x, y: t.y, r: 0, life: 28, maxLife: 28 });
    }
    bossRings.push({ x: boss.x, y: boss.y, r: boss.radius, maxR: boss.radius * 8, life: 30, maxLife: 30, color: '#8040e0' });
    boss.stunTimer = 20;
  } else if (boss.waveNum === 25) {
    // Jötunhelm Walker EARTH STOMP: speed surge + rumble ring
    boss.baseSpeed *= 1.35;
    bossRings.push({ x: boss.x, y: boss.y, r: boss.radius, maxR: boss.radius * 6, life: 30, maxLife: 30, color: '#c87020' });
    const cx = COLS * CELL_SIZE / 2;
    const cy = ROWS * CELL_SIZE / 2;
    dmgFloaters.push({ x: cx, y: cy, val: 'GROUND STOMP', life: 90, maxLife: 90, color: '#e8a040', large: true, suffix: '' });
    boss.stunTimer = 20;
  } else if (boss.waveNum === 50) {
    // Mara-Void DEATH SURGE: speed burst + 2 EMP Mara spawns + purple portal flash
    boss.baseSpeed *= 1.30;
    portalFlash      = 22;
    portalFlashColor = 'purple';
    for (let i = 0; i < 2; i++) spawnEnemy(ENEMY_TYPES.MARA, waveHpScale * 0.85);
  } else if (boss.waveNum === 75) {
    // Fenrir THE HOWL: stun ALL towers, empRing per tower, gameSpeed-adjusted duration
    const stunDur = Math.max(30, Math.round(30 / gameSpeed));
    for (const t of towers) {
      t.disabledTimer = stunDur;
      empRings.push({ x: t.x, y: t.y, r: 0, life: 28, maxLife: 28 });
    }
    boss.stunTimer = 35;
    bossRings.push({ x: boss.x, y: boss.y, r: boss.radius, maxR: COLS * CELL_SIZE, life: 28, maxLife: 28, color: '#e0a020' });
    if (towers.length > 0) {
      const cx = COLS * CELL_SIZE / 2;
      const cy = ROWS * CELL_SIZE / 2;
      dmgFloaters.push({ x: cx, y: cy, val: `${towers.length} TOWERS DISABLED`, life: 90, maxLife: 90, color: '#e8a040', large: true, suffix: '' });
    }
  } else if (boss.waveNum === 100) {
    // Surtr WORLD FIRE: fire surge — 3 splash columns across the path (grid-local coords)
    const pts = currentPath ?? [];
    const step = Math.floor(pts.length / 4);
    for (let s = 1; s <= 3; s++) {
      const pt = pts[s * step] ?? pts[pts.length - 1];
      if (pt) {
        const px = (pt.col + 0.5) * CELL_SIZE;
        const py = (pt.row + 0.5) * CELL_SIZE;
        spawnParticles(px, py, '#ff1800', 20);
        splashRings.push({ x: px, y: py, r: 0, maxR: 40, life: 18, maxLife: 18, color: '#ff6020' });
      }
    }
    screenShake = Math.max(screenShake, 22);
  }
}

function onBossKilled(boss) {
  bossesDefeated++;
  stars         += 3;
  unlockAchievement('firstBoss');
  sfxDie(true);
  screenShake    = Math.max(screenShake, 28);
  hoardPulse     = 120;  // mega pulse on boss kill
  portalFlash      = 20;
  portalFlashColor = 'gold';
  bossDefeatTimer = 210;
  bossDefeatText  = boss.bossName + ' DEFEATED';
  bossDefeatGold  = boss.reward;

  // Particle explosion — layered burst (Tier 1 spectacle)
  spawnParticles(boss.x, boss.y, boss.highlightColor, 60);
  spawnParticles(boss.x, boss.y, '#f5d030', 40);
  spawnParticles(boss.x, boss.y, '#ffffff', 20);
  spawnParticles(boss.x, boss.y, boss.color, 30);
  screenShake = Math.max(screenShake, 32);

  // Treasure burst — 25 staggered coin arcs from boss position
  for (let i = 0; i < 25; i++) {
    const ox = (Math.random() - 0.5) * boss.radius * 3;
    const oy = (Math.random() - 0.5) * boss.radius * 3;
    spawnGoldCoins(
      GRID_LEFT + gridPanX + gridZoom * (boss.x + ox),
      GRID_TOP  + gridPanY + gridZoom * (boss.y + oy),
      Math.ceil(boss.reward / 25)
    );
  }

  // Additional expand rings for dramatic visual payoff (reuse bossRings)
  for (let ri = 0; ri < 3; ri++) {
    bossRings.push({ x: boss.x, y: boss.y, r: boss.radius, maxR: boss.radius * (4 + ri * 3), life: 40 + ri * 8, maxLife: 40 + ri * 8, color: ri === 0 ? '#ffd040' : ri === 1 ? boss.highlightColor : '#ffffff' });
  }

  // Equipment drop — each boss wave drops one item from its pool
  const dropPool = BOSS_DROP_TABLE[waveNumber];
  if (dropPool) {
    const itemId  = dropPool[Math.floor(Math.random() * dropPool.length)];
    const itemDef = ITEM_DEFS[itemId];
    _equipmentInventory.push(itemId);
    _campaignState.equipmentInventory = _equipmentInventory.slice();
    const rarCol  = RARITY_COLOR[itemDef.rarity] ?? '#fff';
    dmgFloaters.push({
      x: boss.x - 40, y: boss.y - 50,
      val: `⚔ ${itemDef.name}`, life: 240, maxLife: 240,
      color: rarCol, large: true, raw: true,
    });
    impactFlashes.push({ x: boss.x, y: boss.y, maxR: 60, life: 1, color: rarCol });
    _bossLootBanner = { itemId, timer: 300 };
    sfxLootDrop();
  }

  // One-time Rune Forge hint after first boss kill
  if (_runeForgeHintTimer === 0) _runeForgeHintTimer = 360;
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
  ctx.shadowColor = isKill ? 'rgba(40,220,80,0.95)' : 'rgba(255,136,0,0.95)';
  ctx.shadowBlur  = 20;
  ctx.fillStyle   = isKill ? '#60ee80' : '#ff8800';
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

function drawRuneForgeHint() {
  if (_runeForgeHintTimer <= 0) return;
  _runeForgeHintTimer--;
  if (waveState === 'active') return;  // only show during break
  const alpha = _runeForgeHintTimer > 40 ? Math.min(1, (360 - _runeForgeHintTimer) / 30) : _runeForgeHintTimer / 40;
  const tw = 240, th = 36;
  const tx = GRID_LEFT + (COLS * CELL_SIZE) / 2 - tw / 2;
  const ty = GRID_TOP + ROWS * CELL_SIZE * 0.55;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = 'rgba(30,10,50,0.97)';
  ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(180,100,240,0.80)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 6); ctx.stroke();
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 10px monospace';
  ctx.fillStyle   = '#d080ff';
  ctx.shadowColor = 'rgba(180,80,240,0.8)'; ctx.shadowBlur = 8;
  ctx.fillText(`✦ ${stars} RUNES EARNED — Press R to open Rune Forge`, tx + tw / 2, ty + 15);
  ctx.shadowBlur  = 0;
  ctx.font        = '9px monospace';
  ctx.fillStyle   = 'rgba(200,160,240,0.65)';
  ctx.fillText('Arm your defenders between waves', tx + tw / 2, ty + 27);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBossWarning() {
  if (bossWarnAlpha <= 0.01 || gameOver) return;
  const { width, height } = getViewSize();
  const cx      = GRID_LEFT + (COLS * CELL_SIZE) / 2;

  // Screen-edge red vignette — pulses on every beat during boss countdown
  const edgePulse = 0.5 + Math.sin(performance.now() * 0.005) * 0.5;
  const edgeAlpha = bossWarnAlpha * (0.18 + edgePulse * 0.12);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);  // draw in screen space
  const edgeGrad = ctx.createRadialGradient(width / 2, height / 2, height * 0.25, width / 2, height / 2, height * 0.72);
  edgeGrad.addColorStop(0, 'rgba(180,10,10,0)');
  edgeGrad.addColorStop(1, `rgba(180,10,10,${edgeAlpha})`);
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Boss wave countdown — show seconds remaining in large text below banner
  if (waveState === 'countdown') {
    const secsLeft = Math.max(1, Math.ceil(waveTimer / 30));
    if (secsLeft <= 5) {
      ctx.save();
      ctx.textAlign   = 'center';
      ctx.font        = `bold ${18 + (6 - secsLeft) * 2}px monospace`;
      ctx.fillStyle   = `rgba(255,80,40,${bossWarnAlpha * (0.70 + edgePulse * 0.30)})`;
      ctx.shadowColor = 'rgba(255,40,10,0.9)'; ctx.shadowBlur = 14;
      ctx.fillText(secsLeft.toString(), cx, GRID_TOP + 100);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
  const bossCfg  = BOSS_CONFIGS[waveNumber + 1];
  const bossLabel = bossCfg ? bossCfg.name : 'BOSS';
  const bannerY = GRID_TOP + 36;
  const bannerH = bossCfg?.hint ? 46 : 34;
  const bannerW = 280;

  ctx.save();
  ctx.globalAlpha = bossWarnAlpha;
  ctx.fillStyle   = 'rgba(130,16,16,0.94)';
  ctx.beginPath();
  ctx.roundRect(cx - bannerW / 2, bannerY, bannerW, bannerH, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,70,30,0.75)';
  ctx.lineWidth   = 1.2;
  ctx.stroke();

  ctx.textAlign   = 'center';
  ctx.font        = 'bold 11px monospace';
  ctx.fillStyle   = '#f0e8d0';
  ctx.shadowColor = 'rgba(255,50,20,0.95)';
  ctx.shadowBlur  = 14;
  ctx.fillText(`⚠  ${bossLabel}  ⚠`, cx, bannerY + 13);
  ctx.font        = '11px monospace';
  ctx.fillStyle   = 'rgba(255,180,140,0.85)';
  ctx.shadowBlur  = 6;
  ctx.fillText('BOSS APPROACHING', cx, bannerY + 26);
  if (bossCfg?.hint) {
    ctx.font      = '9px monospace';
    ctx.fillStyle = 'rgba(220,140,80,0.75)';
    ctx.shadowBlur = 0;
    ctx.fillText(bossCfg.hint, cx, bannerY + 39);
  }
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawWaveAnnouncement() {
  if (gameOver) return;
  if (waveState === 'active') return;

  const bX = GRID_LEFT + COLS * CELL_SIZE + 4;
  const bW = BASE_W - bX - 36;
  const bY = GRID_TOP + 2;
  const bH = 44;
  const tx = bX + 14;

  const nextW       = waveState === 'countdown' ? waveNumber : waveNumber + 1;
  const isBoss      = BOSS_WAVES.has(nextW);
  const nextEvent   = WAVE_EVENTS[nextW] ?? (endlessMode && nextW > 101 ? ENDLESS_FLAVOR_EVENTS[(nextW - 102) % 5] : null);
  // Watchtower: peek ahead at events beyond nextW
  const _epBonus    = _fortressBonuses?.eventPreviewBonus ?? 0;
  const futureEvent = _epBonus > 0 ? (() => {
    for (let w = nextW + 1; w <= nextW + _epBonus; w++) {
      const ev = WAVE_EVENTS[w];
      if (ev) return { wave: w, ev };
    }
    return null;
  })() : null;
  const threatRatio = endlessMode ? 1.0 : Math.min(1, nextW / MAX_WAVES);
  const isClear     = waveState === 'break';
  const accentColor = isBoss ? '#ff3820' : isClear ? '#50d870' : '#e8c040';
  const nextBossW   = [...BOSS_WAVES].filter(w => w > waveNumber).sort((a,b) => a-b)[0] ?? null;

  ctx.save();

  // Card background
  ctx.fillStyle = isBoss ? 'rgba(28,6,6,0.96)' : isClear ? 'rgba(4,18,8,0.96)' : 'rgba(10,8,20,0.96)';
  ctx.beginPath(); ctx.roundRect(bX, bY, bW, bH, 4); ctx.fill();
  // Left accent strip
  ctx.fillStyle = accentColor; ctx.globalAlpha = 0.80;
  ctx.fillRect(bX, bY, 3, bH);
  ctx.globalAlpha = 1;

  // TOP LINE — small muted label (what just happened / what's coming)
  ctx.font = '7px monospace'; ctx.textAlign = 'left';
  if (isClear) {
    const flawless = flawlessTimer > 0;
    ctx.fillStyle = flawless ? 'rgba(240,215,80,0.72)' : 'rgba(80,200,100,0.65)';
    ctx.fillText(flawless ? `★ W${waveNumber} FLAWLESS` : `W${waveNumber} CLEARED`, tx, bY + 12);
  } else {
    ctx.fillStyle = isBoss ? 'rgba(255,120,60,0.70)' : nextEvent ? 'rgba(255,200,60,0.68)' : 'rgba(180,160,100,0.55)';
    ctx.fillText(isBoss ? '☠ BOSS WAVE' : nextEvent ? `⚡ ${nextEvent.label}` : 'INCOMING', tx, bY + 12);
    if (futureEvent) {
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(200,170,80,0.45)';
      ctx.fillText(`W${futureEvent.wave} ${futureEvent.ev.label}`, tx, bY + 20);
    }
  }
  // Right of top line: AUTO badge or [Space] hint
  ctx.textAlign = 'right';
  if (autoNextWave) {
    const p = 0.72 + Math.sin(performance.now() * 0.005) * 0.28;
    ctx.fillStyle = `rgba(80,220,140,${p})`;
    ctx.fillText('AUTO', bX + bW - 6, bY + 12);
  } else {
    ctx.fillStyle = 'rgba(200,170,90,0.45)';
    ctx.fillText('[Space]', bX + bW - 6, bY + 12);
  }

  // MAIN LINE — bold: upcoming wave + composition
  ctx.textAlign = 'left';
  let mainText, mainColor;
  if (isBoss && BOSS_CONFIGS[nextW]) {
    mainText  = `☠  ${BOSS_CONFIGS[nextW].name}`;
    mainColor = '#ff5030';
  } else {
    const comp  = waveComposition(nextW);
    const parts = [comp.draugr      > 0 && `${comp.draugr}D`,
                   comp.mylings     > 0 && `${comp.mylings}M`,
                   comp.jotunn      > 0 && `${comp.jotunn}J`,
                   comp.maras       > 0 && `${comp.maras}X`,
                   (comp.wargs ?? 0)      > 0 && `${comp.wargs}W`,
                   (comp.einherjars ?? 0) > 0 && `${comp.einherjars}E`].filter(Boolean);
    mainText  = `W${nextW}  —  ${parts.join(' · ')}`;
    mainColor = accentColor;
  }
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = mainColor;
  ctx.shadowColor = mainColor; ctx.shadowBlur = 6;
  ctx.fillText(mainText, tx, bY + 27);
  ctx.shadowBlur = 0;

  // Right of main line: next boss marker (if far away)
  if (!isBoss && nextBossW && nextBossW !== nextW) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(220,80,30,0.55)';
    ctx.textAlign = 'right';
    ctx.fillText(`☠W${nextBossW}`, bX + bW - 6, bY + 27);
  }

  // BOTTOM BAR — thin wave arc progress
  const barY = bY + 36, barX = tx, barW2 = bW - 20;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.roundRect(barX, barY, barW2, 3, 2); ctx.fill();
  if (threatRatio > 0.001) {
    const bColor = isBoss ? '#ff3820' : threatRatio > 0.8 ? '#ff7040' : threatRatio > 0.5 ? '#e8c040' : '#50d870';
    ctx.fillStyle = bColor; ctx.shadowColor = bColor; ctx.shadowBlur = 3;
    ctx.beginPath(); ctx.roundRect(barX, barY, Math.max(3, barW2 * threatRatio), 3, 2); ctx.fill();
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
      const t     = 1 - f.life / f.maxLife;
      const alpha = f.life < 20 ? f.life / 20 : 1;
      const fy    = GRID_TOP + gridPanY + f.y * gridZoom;
      const fx    = GRID_LEFT + gridPanX + f.x * gridZoom;
      ctx.globalAlpha = alpha;
      ctx.font        = `bold ${large ? Math.round(13 + t * 4) : Math.round(9 + t * 3)}px monospace`;
      ctx.fillStyle   = f.color;
      ctx.shadowColor = f.color;
      const text = f.raw ? f.val : `+${f.val}${f.suffix ?? ''}`;
      ctx.fillText(text, fx, fy);
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
  const barH    = 14;
  const pulse   = 0.55 + Math.sin(performance.now() * 0.005) * 0.45;
  const hpColor = '#e84848';

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

  // Phase threshold markers — gold (75%) → amber (50%) → red/cream (25%)
  ctx.strokeStyle = 'rgba(200,140,20,0.80)';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(barX + barW * 0.5, barY - 2); ctx.lineTo(barX + barW * 0.5, barY + barH + 2); ctx.stroke();
  if (cfg?.phase75) {
    ctx.strokeStyle = 'rgba(240,190,30,0.90)';
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.moveTo(barX + barW * 0.75, barY - 1); ctx.lineTo(barX + barW * 0.75, barY + barH + 1); ctx.stroke();
  }
  ctx.strokeStyle = ratio <= 0.30 ? 'rgba(255,255,200,0.95)' : 'rgba(255,80,40,0.80)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.moveTo(barX + barW * 0.25, barY - 2); ctx.lineTo(barX + barW * 0.25, barY + barH + 2); ctx.stroke();

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

function drawBossLootBanner() {
  if (!_bossLootBanner || _bossLootBanner.timer <= 0) return;
  _bossLootBanner.timer--;
  const { timer, itemId } = _bossLootBanner;
  const alpha = Math.min(1, timer / 30) * (timer < 60 ? timer / 60 : 1);
  const iDef  = ITEM_DEFS[itemId];
  if (!iDef) return;
  const rarCol = RARITY_COLOR[iDef.rarity] ?? '#fff';
  const bw = 220, bh = 40;
  const bx = GRID_LEFT + (COLS * CELL_SIZE - bw) / 2;
  const by = GRID_TOP + ROWS * CELL_SIZE - bh - 8;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawFantasyPanel(bx, by, bw, bh, 'rgba(4,2,14,0.97)', 0.85, 6);
  ctx.textAlign = 'center';
  const cx = bx + bw / 2;
  ctx.font = 'bold 10px monospace'; ctx.fillStyle = rarCol;
  ctx.shadowColor = rarCol; ctx.shadowBlur = 8;
  ctx.fillText(`◈ LOOT DROPPED`, cx, by + 14);
  ctx.shadowBlur = 0;
  ctx.font = '10px monospace'; ctx.fillStyle = rarCol;
  ctx.fillText(`${iDef.slot === 'weapon' ? '⚔' : '🛡'} ${iDef.name}`, cx, by + 28);
  ctx.restore();
}

function drawEnemyIntroBanner() {
  if (!_enemyIntroBanner || _enemyIntroBanner.timer <= 0) return;
  _enemyIntroBanner.timer--;
  const { timer, maxTimer, label, hint } = _enemyIntroBanner;
  const alpha = Math.min(1, (maxTimer - timer) / 20) * (timer < 40 ? timer / 40 : 1);
  const bw = 230, bh = 34;
  const bx = GRID_LEFT + 6;
  const by = GRID_TOP + ROWS * CELL_SIZE - bh - 26;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(4,8,20,0.95)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(60,120,200,0.55)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.stroke();
  // Accent strip
  ctx.fillStyle = 'rgba(60,120,200,0.70)';
  ctx.fillRect(bx, by, 3, bh);
  ctx.textAlign = 'left';
  ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#80b8ff';
  ctx.shadowColor = '#4080ff'; ctx.shadowBlur = 6;
  ctx.fillText(label, bx + 9, by + 13);
  ctx.shadowBlur = 0;
  ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(140,170,220,0.70)';
  ctx.fillText(hint, bx + 9, by + 26);
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
  const streakText = flawlessStreak >= 3 ? `  ×${flawlessStreak} STREAK` : '';
  ctx.fillText(`+1 ✦  FLAWLESS!${streakText}`, BASE_W / 2, cy);
  ctx.shadowBlur  = 0;
  ctx.font        = '10px monospace';
  ctx.fillStyle   = `rgba(232,216,184,${alpha * 0.75})`;
  ctx.fillText('No lives lost this wave', BASE_W / 2, cy + 14);
  ctx.restore();
}

function drawHelpOverlay() {
  if (!showHelp) return;
  const { width, height } = getViewSize();
  const shortcuts = [
    ['SPC',         'Launch next wave'],
    ['P',           'Pause'],
    ['M',           'Mute sound'],
    ['R',           'Rune Forge (between waves)'],
    ['F',           'Cycle speed ×1 → ×2 → ×4'],
    ['A',           'Toggle auto next wave'],
    ['G',           'Toggle grid lines'],
    ['Z',           'Reset zoom'],
    ['U',           'Upgrade selected tower'],
    ['X',           'Sell tower (press twice)'],
    ['Scroll',      'Zoom in / out'],
    ['Mid-drag',    'Pan grid'],
    ['↑↓←→',       'Pan grid'],
    ['1-9',         'Select tower / wall'],
    ['Esc',         'Deselect / close'],
    ['? / H',       'This cheatsheet'],
  ];
  const pw = 320, ph = 36 + shortcuts.length * 18 + 20;
  const px = width / 2 - pw / 2, py = height / 2 - ph / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, width, height);
  drawFantasyPanel(px, py, pw, ph, 'rgba(6,3,16,0.98)', 0.9, 10);
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 14px monospace';
  ctx.fillStyle   = '#f0c840';
  ctx.shadowColor = 'rgba(220,170,30,0.7)'; ctx.shadowBlur = 10;
  ctx.fillText('KEYBOARD SHORTCUTS', px + pw / 2, py + 22);
  ctx.shadowBlur = 0;
  let ky = py + 42;
  for (const [key, desc] of shortcuts) {
    ctx.font      = 'bold 10px monospace';
    ctx.fillStyle = '#c0a060';
    ctx.textAlign = 'left';
    ctx.fillText(key, px + 16, ky);
    ctx.font      = '10px monospace';
    ctx.fillStyle = '#e0d0b0';
    ctx.fillText(desc, px + 90, ky);
    ky += 18;
  }
  ctx.font      = '9px monospace';
  ctx.fillStyle = 'rgba(140,110,70,0.6)';
  ctx.textAlign = 'center';
  ctx.fillText('Press ? or H to close', px + pw / 2, py + ph - 8);
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

// ── Between-battles summary screen ───────────────────────────────────────────

let _betweenBtns = [];  // hit areas: [{x,y,w,h,action}, ...]

function drawBetweenBattles() {
  _betweenBtns = [];
  const W = BASE_W, H = BASE_H;

  // Fade-in on screen entry
  const fadeAlpha = _betweenFadeIn > 0
    ? Math.min(1, (30 - _betweenFadeIn) / 20)
    : 1;
  if (_betweenFadeIn > 0) _betweenFadeIn--;
  ctx.save();
  ctx.globalAlpha = fadeAlpha;

  // Starfield background
  const t = performance.now() * 0.001;
  for (const s of STARS) {
    const sx = s.x * W, sy = s.y * H;
    const alpha = 0.25 + Math.sin(t * 0.4 + s.phase) * 0.18;
    ctx.beginPath();
    ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,210,255,${alpha})`;
    ctx.fill();
  }

  const isVictory = _battleResult === 'victory';

  // ── LEFT PANEL: Battle summary ──────────────────────────────
  const lpX = 12, lpY = 12, lpW = 308, lpH = H - 24;
  drawFantasyPanel(lpX, lpY, lpW, lpH, 'rgba(4,2,12,0.97)', 0.88, 10);
  const lcx = lpX + lpW / 2;

  const lpSep = (y) => {
    ctx.strokeStyle = 'rgba(180,140,60,0.22)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(lpX + 12, y); ctx.lineTo(lpX + lpW - 12, y);
    ctx.stroke();
  };

  ctx.save();
  ctx.textAlign = 'center';

  const hdrColor  = isVictory ? '#40e880' : '#e84040';
  const hdrShadow = isVictory ? 'rgba(50,220,100,0.7)' : 'rgba(220,50,50,0.7)';
  ctx.font        = 'bold 28px monospace';
  ctx.fillStyle   = hdrColor;
  ctx.shadowColor = hdrShadow;
  ctx.shadowBlur  = 18;
  ctx.fillText(isVictory ? 'VICTORY!' : 'DEFEATED', lcx, lpY + 42);
  ctx.shadowBlur = 0;

  ctx.font      = '10px monospace';
  ctx.fillStyle = 'rgba(200,170,100,0.65)';
  ctx.fillText(`BATTLE ${battlesCompleted}  —  ${_currentMapName}`, lcx, lpY + 57);

  lpSep(lpY + 66);

  ctx.font      = '11px monospace';
  ctx.fillStyle = '#e8c040';
  ctx.fillText(`Waves cleared: ${waveNumber}`, lcx, lpY + 80);
  ctx.fillStyle = 'rgba(200,170,100,0.8)';
  ctx.fillText(`Enemies slain: ${slain}`, lcx, lpY + 95);
  ctx.fillText(`Gold earned: +${goldEarned}g  (+${_reserveContrib}g reserve)`, lcx, lpY + 110);

  ctx.font        = '12px monospace';
  ctx.fillStyle   = '#f0d040';
  ctx.shadowColor = 'rgba(240,190,20,0.6)';
  ctx.shadowBlur  = 6;
  ctx.fillText(`✦ ${stars} campaign stars  ·  ◆ ${goldReserve}g reserve`, lcx, lpY + 129);
  ctx.shadowBlur = 0;

  lpSep(lpY + 139);

  ctx.font      = '9px monospace';
  ctx.fillStyle = 'rgba(160,140,100,0.6)';
  ctx.fillText('TOP DEFENDERS THIS BATTLE', lcx, lpY + 153);

  const top3 = [...towers]
    .sort((a, b) => ((b.killCount || 0) + (b.damageDealt || 0) * 0.02) -
                    ((a.killCount || 0) + (a.damageDealt || 0) * 0.02))
    .slice(0, 3);

  if (top3.length === 0) {
    ctx.fillStyle = 'rgba(120,100,70,0.5)';
    ctx.fillText('none deployed', lcx, lpY + 170);
  } else {
    const icons = ['★', '·', '·'];
    top3.forEach((tower, i) => {
      const def2   = TOWER_DEFS[tower.type];
      const lvlTag = tower._careerLevel > 0 ? ` [${ROMAN[tower._careerLevel] ?? ''}]` : '';
      const rowY   = lpY + 170 + i * 22;
      ctx.font      = i === 0 ? 'bold 11px monospace' : '10px monospace';
      ctx.fillStyle = i === 0 ? `rgba(${tower.glowRgb ?? '220,180,60'},0.95)` : 'rgba(180,160,120,0.7)';
      ctx.fillText(`${icons[i]} ${tower.name}${lvlTag}  ☠${tower.killCount ?? 0}  ⚔${Math.round(tower.damageDealt ?? 0)}`, lcx, rowY);
      if (i === 0) {
        ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.5)';
        ctx.fillText(def2?.label ?? tower.type, lcx, rowY + 11);
      }
    });
  }

  // Talent unlocks earned this battle
  let postTop3Y = lpY + 170 + top3.length * 22 + 14;
  if (top3.length > 0 && top3[0]) postTop3Y += 11; // extra for class label on first entry

  if (_newBattleTalentUnlocks.length > 0) {
    const tlY0 = postTop3Y;
    ctx.strokeStyle = 'rgba(180,140,60,0.22)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(lpX + 12, tlY0); ctx.lineTo(lpX + lpW - 12, tlY0); ctx.stroke();
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.6)';
    ctx.fillText('TALENTS UNLOCKED', lcx, tlY0 + 13);
    _newBattleTalentUnlocks.forEach(({ defName, talentId }, i) => {
      const tDef2  = TALENT_DEFS[talentId];
      if (!tDef2) return;
      const entryY = tlY0 + 27 + i * 18;
      ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#f0d060';
      ctx.shadowColor = 'rgba(240,200,60,0.5)'; ctx.shadowBlur = 5;
      ctx.fillText(`✦ ${defName} — ${tDef2.name}`, lcx, entryY);
      ctx.shadowBlur = 0;
      ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(160,140,80,0.6)';
      ctx.fillText(tDef2.desc, lcx, entryY + 10);
    });
    postTop3Y = tlY0 + 27 + _newBattleTalentUnlocks.length * 18 + 6;
  }

  // Per-defender XP progress
  if (_battleXpData.length > 0) {
    const xpY0 = postTop3Y + 4;
    const btnsTopLimit = lpY + lpH - 56;
    if (xpY0 + 24 < btnsTopLimit) {
      ctx.strokeStyle = 'rgba(180,140,60,0.18)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(lpX + 12, xpY0); ctx.lineTo(lpX + lpW - 12, xpY0); ctx.stroke();
      ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(140,120,90,0.55)';
      ctx.fillText('DEFENDER XP', lcx, xpY0 + 12);
      let ey = xpY0 + 25;
      for (const { name, xpGained, oldLevel, newLevel } of _battleXpData) {
        if (ey + 12 > btnsTopLimit) break;
        const leveled  = newLevel > oldLevel;
        const lvlStr   = leveled ? `  ▲ Lv ${ROMAN[newLevel] ?? newLevel}` : '';
        ctx.font = leveled ? 'bold 9px monospace' : '9px monospace';
        ctx.fillStyle = leveled ? '#f0d060' : 'rgba(180,160,110,0.65)';
        if (leveled) { ctx.shadowColor = 'rgba(240,200,60,0.45)'; ctx.shadowBlur = 4; }
        ctx.fillText(`${name}  +${xpGained}xp${lvlStr}`, lcx, ey);
        ctx.shadowBlur = 0;
        ey += 13;
      }
    }
  }

  ctx.restore();

  // Buttons at bottom of left panel
  const btnW = 130, btnH = 34, btnGap = 10;
  const btnsY = lpY + lpH - 50;
  const b1x = lcx - btnW - btnGap / 2;
  const b2x = lcx + btnGap / 2;
  drawFantasyPanel(b1x, btnsY, btnW, btnH, 'rgba(8,26,8,0.97)', 0.75, 6);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#88ee66';
  ctx.shadowColor = 'rgba(100,220,80,0.5)'; ctx.shadowBlur = 8;
  ctx.fillText('FIGHT AGAIN', b1x + btnW / 2, btnsY + 22);
  ctx.restore();
  _betweenBtns.push({ x: b1x, y: btnsY, w: btnW, h: btnH, action: 'fightAgain' });

  drawFantasyPanel(b2x, btnsY, btnW, btnH, 'rgba(12,8,28,0.97)', 0.7, 6);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#a0b8e0';
  ctx.shadowColor = 'rgba(120,150,220,0.5)'; ctx.shadowBlur = 8;
  ctx.fillText('MAP SELECT', b2x + btnW / 2, btnsY + 22);
  ctx.restore();
  _betweenBtns.push({ x: b2x, y: btnsY, w: btnW, h: btnH, action: 'mapSelect' });

  // ── RIGHT PANEL: Warband Roster ─────────────────────────────
  const rpX = 328, rpY = 12, rpW = W - 328 - 12, rpH = H - 24;
  drawFantasyPanel(rpX, rpY, rpW, rpH, 'rgba(4,2,14,0.97)', 0.88, 10);
  const rix = rpX + 10;
  const riW = rpW - 20;

  ctx.save();
  ctx.textAlign = 'left';

  ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#c8b060';
  ctx.shadowColor = 'rgba(200,170,60,0.5)'; ctx.shadowBlur = 6;
  ctx.fillText('⚔  WARBAND ROSTER', rix, rpY + 24);
  ctx.shadowBlur = 0;

  const rCount = _roster.defenders.length;
  ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.55)';
  ctx.fillText(`${rCount} defender${rCount !== 1 ? 's' : ''} in warband`, rix, rpY + 37);

  ctx.strokeStyle = 'rgba(180,140,60,0.22)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(rpX + 6, rpY + 44); ctx.lineTo(rpX + rpW - 6, rpY + 44); ctx.stroke();

  // Recruit section: 112px at the bottom
  const recruitH = 112;
  const listTop  = rpY + 49;
  const listBot  = rpY + rpH - recruitH - 4;
  const listH    = listBot - listTop;
  const rowH     = 80;
  const maxRows  = Math.floor(listH / rowH);

  // Clamp scroll offset
  const totalDefs = _roster.defenders.length;
  _rosterScrollOffset = Math.max(0, Math.min(_rosterScrollOffset, Math.max(0, totalDefs - maxRows)));

  // Scroll arrows (drawn outside clip region)
  if (_rosterScrollOffset > 0) {
    const arY = listTop - 1;
    ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(200,170,80,0.65)';
    ctx.fillText('▲', rpX + rpW - 16, arY + 10);
    _betweenBtns.push({ x: rpX + rpW - 26, y: arY, w: 22, h: 14, action: 'scrollRoster', dir: -1 });
  }
  if (_rosterScrollOffset + maxRows < totalDefs) {
    const arY = listBot - 13;
    ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(200,170,80,0.65)';
    ctx.fillText('▼', rpX + rpW - 16, arY + 10);
    _betweenBtns.push({ x: rpX + rpW - 26, y: arY, w: 22, h: 14, action: 'scrollRoster', dir: 1 });
  }

  // Roster list (clip to avoid overflow)
  ctx.save();
  ctx.beginPath();
  ctx.rect(rpX + 4, listTop, rpW - 8, listH);
  ctx.clip();

  const _RARITY_BG = { common: 'rgba(168,168,168,0.14)', rare: 'rgba(64,144,255,0.14)', epic: 'rgba(204,68,255,0.14)', legendary: 'rgba(255,144,32,0.14)' };

  _roster.defenders.slice(_rosterScrollOffset, _rosterScrollOffset + maxRows).forEach((def, i) => {
    const ry = listTop + i * rowH;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
    ctx.fillRect(rpX + 4, ry, rpW - 8, rowH - 2);

    const tDef   = TOWER_DEFS[def.type];
    const glow   = tDef?.glowRgb ?? '180,150,80';
    const lvlStr = def.careerLevel > 0 ? ` [${ROMAN[def.careerLevel] ?? '?'}]` : '';

    // Name + level (or rename draft if active)
    const isRenaming = _renameState?.defenderId === def.defenderId;
    const displayName = isRenaming
      ? _renameState.draft + (Math.floor(performance.now() / 450) % 2 === 0 ? '|' : '')
      : `${def.name}${lvlStr}`;
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = isRenaming ? `rgba(255,220,100,0.95)` : `rgba(${glow},0.95)`;
    if (isRenaming) { ctx.shadowColor = 'rgba(255,200,60,0.5)'; ctx.shadowBlur = 4; }
    ctx.fillText(displayName, rix, ry + 14);
    ctx.shadowBlur = 0;

    // ✏ rename button (small, top-right of name)
    const rnW = 18, rnH = 12, rnX = rpX + rpW - 12 - rnW - 55, rnY = ry + 4;
    ctx.fillStyle   = isRenaming ? 'rgba(80,60,10,0.9)' : 'rgba(40,35,15,0.6)';
    ctx.strokeStyle = isRenaming ? 'rgba(255,200,60,0.7)' : 'rgba(120,100,40,0.3)';
    ctx.lineWidth   = 0.8;
    ctx.beginPath(); ctx.roundRect(rnX, rnY, rnW, rnH, 2); ctx.fill(); ctx.stroke();
    ctx.font = '7px monospace'; ctx.fillStyle = isRenaming ? '#ffd040' : 'rgba(160,140,60,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText('✏', rnX + rnW / 2, rnY + 9);
    ctx.textAlign = 'left';
    _betweenBtns.push({ x: rnX, y: rnY, w: rnW, h: rnH, action: 'startRename', defenderId: def.defenderId });

    // Class label
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.55)';
    ctx.fillText(tDef?.label ?? def.type, rix, ry + 26);

    // XP bar
    const nextXP = CAREER_XP[Math.min(def.careerLevel + 1, CAREER_XP.length - 1)];
    const prevXP = CAREER_XP[def.careerLevel] ?? 0;
    const frac   = nextXP > prevXP ? Math.min(1, (def.xp - prevXP) / (nextXP - prevXP)) : 1;
    const barX   = rix + 54;
    const barW   = riW - 58;
    ctx.fillStyle = 'rgba(60,50,30,0.7)';
    ctx.fillRect(barX, ry + 20, barW, 5);
    ctx.fillStyle = def.careerLevel >= 10 ? '#f0d040' : `rgba(${glow},0.8)`;
    ctx.fillRect(barX, ry + 20, barW * frac, 5);
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.5)';
    ctx.textAlign = 'left';
    ctx.fillText(def.careerLevel >= 10 ? 'MAX' : `${def.xp}/${nextXP}xp`, barX + barW + 3, ry + 25);

    // Career stats — kills, battles, career damage
    const cdmgStr = (def.careerDamage ?? 0) > 999
      ? `${Math.round((def.careerDamage ?? 0) / 1000)}k`
      : `${def.careerDamage ?? 0}`;
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(140,130,100,0.65)';
    ctx.fillText(`☠${def.careerKills}  ×${def.battlesPlayed}  ⚔${cdmgStr}`, rix, ry + 37);

    // Equipment chips: weapon (slot 0) | armor (slot 1)
    const chipSlotW = Math.floor((riW - 6) / 2);
    [0, 1].forEach(slotIdx => {
      const itemId  = def.equipment[slotIdx];
      const itemDef = itemId ? ITEM_DEFS[itemId] : null;
      const cx2     = rix + slotIdx * (chipSlotW + 3);
      const cy2     = ry + 42;
      const cH      = itemDef?.desc ? 22 : 12;
      const rarCol  = itemDef ? (RARITY_COLOR[itemDef.rarity] ?? '#aaa') : null;
      const icon    = slotIdx === 0 ? '⚔' : '🛡';
      ctx.fillStyle   = itemDef ? (_RARITY_BG[itemDef.rarity] ?? 'rgba(168,168,168,0.14)') : 'rgba(30,20,10,0.5)';
      ctx.strokeStyle = rarCol ?? 'rgba(80,60,30,0.3)';
      ctx.lineWidth   = rarCol ? 0.8 : 0.5;
      ctx.beginPath(); ctx.roundRect(cx2, cy2, chipSlotW, cH, 2); ctx.fill(); ctx.stroke();
      ctx.font      = '7px monospace';
      ctx.fillStyle = rarCol ?? 'rgba(100,80,50,0.45)';
      ctx.textAlign = 'left';
      const label   = itemDef ? `${icon} ${itemDef.name.slice(0, 10)}` : `${icon} —`;
      ctx.fillText(label, cx2 + 3, cy2 + 9);
      _betweenBtns.push({ x: cx2, y: cy2, w: chipSlotW, h: cH, action: 'cycleEquip', defenderId: def.defenderId, slotIdx });
      // Item stat description inside chip
      if (itemDef?.desc) {
        ctx.font = '7px monospace'; ctx.fillStyle = rarCol ?? 'rgba(120,100,70,0.45)';
        ctx.globalAlpha = 0.65;
        ctx.fillText(itemDef.desc, cx2 + 3, cy2 + 18);
        ctx.globalAlpha = 1;
      }
    });

    // Talent row — up to 2 talent names (truncated), plus next milestone hint
    const talY = ry + 72;
    const nextTalLevel = [3, 5, 8, 10].find(lv => lv > def.careerLevel);
    const nextTalId    = nextTalLevel ? (CLASS_TALENTS[def.type]?.[nextTalLevel]) : null;
    const nextTalDef   = nextTalId ? TALENT_DEFS[nextTalId] : null;

    if (def.talents.length > 0) {
      const talNames = def.talents.map(id => TALENT_DEFS[id]?.name ?? id);
      const display  = talNames.length > 2 ? talNames.slice(0, 2).join(' · ') + ' …' : talNames.join(' · ');
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(240,200,60,0.55)';
      ctx.fillText(`✦ ${display}`, rix, talY);
    } else if (nextTalDef) {
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(130,110,60,0.40)';
      ctx.fillText(`✦ → Lv ${ROMAN[nextTalLevel] ?? nextTalLevel}: ${nextTalDef.name}`, rix, talY);
    } else {
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(100,80,50,0.30)';
      ctx.fillText('✦ no talents yet', rix, talY);
    }

    // DISMISS button (two-click confirm)
    const isPendingDismiss = _pendingDismiss === def.defenderId;
    const dW = 52, dH = 16, dX = rpX + rpW - 12 - dW, dY = ry + 14;
    ctx.fillStyle   = isPendingDismiss ? 'rgba(80,8,8,0.92)' : 'rgba(60,10,10,0.75)';
    ctx.strokeStyle = isPendingDismiss ? 'rgba(255,60,60,0.8)' : 'rgba(160,50,50,0.5)';
    ctx.lineWidth   = isPendingDismiss ? 1.2 : 0.8;
    ctx.beginPath(); ctx.roundRect(dX, dY, dW, dH, 3); ctx.fill(); ctx.stroke();
    ctx.font = '8px monospace'; ctx.fillStyle = isPendingDismiss ? '#ff5050' : 'rgba(200,80,80,0.85)';
    ctx.textAlign = 'center';
    ctx.fillText(isPendingDismiss ? 'CONFIRM?' : 'DISMISS', dX + dW / 2, dY + 11);
    ctx.textAlign = 'left';
    _betweenBtns.push({ x: dX, y: dY, w: dW, h: dH,
      action: isPendingDismiss ? 'confirmDismiss' : 'pendingDismiss',
      defenderId: def.defenderId });
  });

  if (totalDefs === 0) {
    ctx.textAlign = 'center';
    ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(120,100,70,0.45)';
    ctx.fillText('No defenders in warband yet', rpX + rpW / 2, listTop + 30);
    ctx.textAlign = 'left';
  } else if (totalDefs > maxRows) {
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(140,120,70,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText(`${_rosterScrollOffset + 1}–${Math.min(_rosterScrollOffset + maxRows, totalDefs)} of ${totalDefs}`, rpX + rpW / 2, listBot - 4);
    ctx.textAlign = 'left';
  }

  ctx.restore(); // remove clip

  // Inventory count line between list and separator
  const freeItemCount = _equipmentInventory.length;
  if (freeItemCount > 0) {
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(160,130,60,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(`◈ ${freeItemCount} item${freeItemCount !== 1 ? 's' : ''} in stash — click slot chips to equip`, rix, listBot + 10);
  }

  // Separator before recruit section
  const rsepY = rpY + rpH - recruitH - 2;
  ctx.strokeStyle = 'rgba(180,140,60,0.22)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(rpX + 6, rsepY); ctx.lineTo(rpX + rpW - 6, rsepY); ctx.stroke();

  // ── TAB BAR: RECRUIT | FORTRESS ──
  const tabY   = rsepY + 5;
  const tabH   = 17;
  const tabW   = Math.floor(riW / 2) - 1;
  ['recruit', 'fortress'].forEach((tab, i) => {
    const tx2 = rix + i * (tabW + 2);
    const sel  = _betweenSubtab === tab;
    ctx.fillStyle   = sel ? 'rgba(200,170,60,0.18)' : 'rgba(20,16,10,0.5)';
    ctx.strokeStyle = sel ? 'rgba(200,170,60,0.6)'  : 'rgba(100,80,40,0.3)';
    ctx.lineWidth   = sel ? 1 : 0.5;
    ctx.beginPath(); ctx.roundRect(tx2, tabY, tabW, tabH, 3); ctx.fill(); ctx.stroke();
    ctx.font = sel ? 'bold 9px monospace' : '9px monospace';
    ctx.fillStyle = sel ? '#e8c040' : 'rgba(140,120,70,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(tab === 'recruit' ? 'RECRUIT' : 'FORTRESS', tx2 + tabW / 2, tabY + 12);
    ctx.textAlign = 'left';
    _betweenBtns.push({ x: tx2, y: tabY, w: tabW, h: tabH, action: 'switchTab', tab });
  });

  const recY = tabY + tabH + 3;

  if (_betweenSubtab === 'recruit') {
    // ── RECRUIT ────────────────────────────────────────────────────────────────
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.5)';
    ctx.fillText(`◆ ${goldReserve}g reserve · ${_effectiveRecruitCost}g each`, rix, recY + 10);

    const allTypes = [
      { type: 'berserk', short: 'Ber' }, { type: 'valkyrie', short: 'Val' },
      { type: 'military', short: 'Arc' }, { type: 'catapult', short: 'Cat' },
      { type: 'blondie', short: 'Blo' }, { type: 'piltorn', short: 'War' },
      { type: 'hydda', short: 'Hea' }, { type: 'isjatten', short: 'Ice' },
      { type: 'drakship', short: 'Dra' },
    ];
    const chipW = Math.floor((riW - 4) / 5);
    const chipH = 18;
    allTypes.forEach(({ type, short }, i) => {
      const col = i % 5, row = Math.floor(i / 5);
      const cx2 = rix + col * (chipW + 1), cy2 = recY + 14 + row * (chipH + 3);
      const sel = _recruitType === type;
      const tDef2 = TOWER_DEFS[type]; const glow2 = tDef2?.glowRgb ?? '180,150,80';
      ctx.fillStyle   = sel ? `rgba(${glow2},0.25)` : 'rgba(30,25,15,0.7)';
      ctx.strokeStyle = sel ? `rgba(${glow2},0.8)`  : 'rgba(140,110,50,0.3)';
      ctx.lineWidth   = sel ? 1.2 : 0.6;
      ctx.beginPath(); ctx.roundRect(cx2, cy2, chipW - 1, chipH, 3); ctx.fill(); ctx.stroke();
      ctx.font = sel ? 'bold 9px monospace' : '9px monospace';
      ctx.fillStyle = sel ? `rgba(${glow2},0.95)` : 'rgba(160,140,100,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText(short, cx2 + (chipW - 1) / 2, cy2 + 13);
      ctx.textAlign = 'left';
      _betweenBtns.push({ x: cx2, y: cy2, w: chipW - 1, h: chipH, action: 'selectRecruitType', recruitType: type });
    });

    const rBtnY  = recY + 14 + 2 * (chipH + 3) + 3;
    const rBtnH  = 24;
    const canAfford = goldReserve >= _effectiveRecruitCost && _recruitType !== null;
    drawFantasyPanel(rix, rBtnY, riW, rBtnH,
      canAfford ? 'rgba(8,22,8,0.97)' : 'rgba(20,16,10,0.85)', canAfford ? 0.75 : 0.4, 4);
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = canAfford ? '#88ee66' : 'rgba(120,110,70,0.5)';
    if (canAfford) { ctx.shadowColor = 'rgba(100,220,80,0.5)'; ctx.shadowBlur = 8; }
    ctx.fillText(
      _recruitType ? `RECRUIT  ${TOWER_DEFS[_recruitType]?.label ?? _recruitType}  (${_effectiveRecruitCost}g)` : 'SELECT CLASS TO RECRUIT',
      rix + riW / 2, rBtnY + 16);
    ctx.shadowBlur = 0; ctx.textAlign = 'left';
    if (canAfford) _betweenBtns.push({ x: rix, y: rBtnY, w: riW, h: rBtnH, action: 'recruit' });

  } else {
    // ── FORTRESS ───────────────────────────────────────────────────────────────
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.5)';
    ctx.fillText(`◆ ${goldReserve}g reserve`, rix, recY + 10);

    const upgrades  = _campaignState?.fortressUpgrades ?? {};
    const nodeKeys  = ['barracks', 'armory', 'watchtower', 'wallworks'];
    const nodeRowH  = 22;
    nodeKeys.forEach((key, i) => {
      const def    = FORTRESS_DEFS[key];
      const lvl    = upgrades[key] ?? 0;
      const maxed  = lvl >= def.maxLevel;
      const cost   = maxed ? 0 : def.cost[lvl];
      const ry2    = recY + 14 + i * nodeRowH;

      // Row background
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
      ctx.fillRect(rix, ry2, riW, nodeRowH - 2);

      // Icon + label + level
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = maxed ? '#f0d040' : '#c8b060';
      ctx.fillText(`${def.icon} ${def.label}`, rix, ry2 + 14);

      const lvlStr = `Lv ${lvl}/${def.maxLevel}`;
      ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.6)';
      ctx.textAlign = 'right';
      if (!maxed) {
        const descIdx = lvl; // levelDesc[0] = what lv1 gives, etc.
        ctx.fillText(`${def.levelDesc[descIdx] ?? ''}`, rix + riW - 52, ry2 + 14);
      }
      ctx.textAlign = 'left';

      // Level badge
      ctx.font = '8px monospace';
      ctx.fillStyle = maxed ? 'rgba(240,200,60,0.7)' : 'rgba(160,140,100,0.5)';
      const lvlBadgeX = rix + riW - 50;
      ctx.fillText(maxed ? 'MAX' : lvlStr, lvlBadgeX, ry2 + 14);

      // UPGRADE button (right side)
      if (!maxed) {
        const btnW2 = 38, btnH2 = 14, btnX = rpX + rpW - 12 - btnW2, btnY2 = ry2 + 3;
        const canBuy = goldReserve >= cost;
        ctx.fillStyle   = canBuy ? 'rgba(8,22,8,0.9)'  : 'rgba(20,16,10,0.6)';
        ctx.strokeStyle = canBuy ? 'rgba(80,200,80,0.5)' : 'rgba(80,60,30,0.3)';
        ctx.lineWidth   = 0.8;
        ctx.beginPath(); ctx.roundRect(btnX, btnY2, btnW2, btnH2, 3); ctx.fill(); ctx.stroke();
        ctx.font = '7px monospace';
        ctx.fillStyle = canBuy ? '#88ee66' : 'rgba(120,110,70,0.4)';
        ctx.textAlign = 'center';
        ctx.fillText(`+  ${cost}g`, btnX + btnW2 / 2, btnY2 + 10);
        ctx.textAlign = 'left';
        if (canBuy) _betweenBtns.push({ x: btnX, y: btnY2, w: btnW2, h: btnH2, action: 'upgradeFortress', key });
      }
    });

    // Active bonuses summary
    const fb = getFortressBonuses(upgrades);
    const fbParts = [];
    if ((fb.startingGoldBonus   ?? 0) > 0) fbParts.push(`+${fb.startingGoldBonus}g start`);
    if ((fb.recruitCostReduction ?? 0) > 0) fbParts.push(`−${fb.recruitCostReduction}g recruit`);
    if ((fb.wallCostReduction   ?? 0) > 0) fbParts.push(`wall −${fb.wallCostReduction}g`);
    if ((fb.equipDmMult         ?? 1) > 1) fbParts.push(`items +${Math.round((fb.equipDmMult - 1) * 100)}%`);
    if ((fb.eventPreviewBonus   ?? 0) > 0) fbParts.push(`${1 + fb.eventPreviewBonus} waves ahead`);
    if ((fb.wallSlowBonus       ?? 0) > 0) fbParts.push(`slow +${Math.round(fb.wallSlowBonus * 100)}%`);
    if (fbParts.length > 0) {
      const summY = recY + 14 + nodeKeys.length * nodeRowH + 8;
      ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(120,200,120,0.65)';
      ctx.fillText(`Active: ${fbParts.join(' · ')}`, rix, summY);
    }
  }

  ctx.restore(); // right panel clip
  ctx.restore(); // fade-in globalAlpha
}

const MAP_SELECT_FLAVOR = [
  'The first scouts have been spotted. Your warband stands ready.',
  'They have learned your walls. Expect them to come in greater numbers.',
  'Three battles behind you. The jarl\'s name spreads fear in the north.',
  'Word has reached the outer holds — the shield line holds.',
  'A rival warlord has joined the siege. Their banners have been sighted.',
  'Your veterans remember every wave. The enemy will not surprise them.',
  'The fortress grows stronger with each campaign. Hold the line.',
  'Seven battles. The warband speaks of this place as home.',
  'Runners report a great host gathering beyond the ridge.',
  'The saga will remember this stand for a thousand winters.',
];

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
  const startY = 118;

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
  ctx.fillText('— SELECT YOUR MAP —', W / 2, 84);

  // Campaign context: battle count + warband size
  if (battlesCompleted > 0 || _roster.defenders.length > 0) {
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(150,130,80,0.65)';
    const warbandStr = _roster.defenders.length > 0 ? `  ·  ${_roster.defenders.length} in warband` : '';
    ctx.fillText(`Battle ${battlesCompleted + 1}${warbandStr}`, W / 2, 98);
  }

  // Flavor text — escalates with battlesCompleted
  const flavorIdx  = Math.min(battlesCompleted, MAP_SELECT_FLAVOR.length - 1);
  const flavorText = MAP_SELECT_FLAVOR[flavorIdx];
  ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(120,100,65,0.55)';
  ctx.fillText(flavorText, W / 2, 110);

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

  if (gamePhase === 'betweenBattles') {
    drawBetweenBattles();
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
  const _shakeMag = screenShake > 20 ? Math.min(screenShake, 10) : Math.min(screenShake, 4);
  const shakeX = _shakeMag > 0.3 ? (Math.random() - 0.5) * _shakeMag * 2 : 0;
  const shakeY = _shakeMag > 0.3 ? (Math.random() - 0.5) * _shakeMag * 2 : 0;
  ctx.translate(GRID_LEFT + gridPanX + shakeX, GRID_TOP + gridPanY + shakeY);
  ctx.scale(gridZoom, gridZoom);

  const time = performance.now() * 0.001;
  // Animated gold display — lags slightly behind real value (coins land, then counter ticks up)
  _displayGold += (gold - _displayGold) * 0.10;
  if (Math.abs(_displayGold - gold) < 0.5) _displayGold = gold;
  grid.healthRatio = Math.max(0, lives / STARTING_LIVES);
  grid.gold        = gold;
  grid.hoardPulse  = hoardPulse;

  // Grass terrain (blit pre-rendered offscreen canvas — free per frame)
  if (terrainCanvas) ctx.drawImage(terrainCanvas, 0, 0);

  // ── Fortress warm light — large amber glow from fortress area ────────────
  {
    const hgx    = GOAL.col * CELL_SIZE + CELL_SIZE / 2;
    const hgy    = GOAL.row * CELL_SIZE + CELL_SIZE / 2;
    const gPulse = 0.5 + Math.sin(performance.now() * 0.0018) * 0.5;
    const pulse  = hoardPulse > 0 ? 1 + (hoardPulse / 60) * 0.30 : 1;
    const targetR = Math.round((90 + gPulse * 12) * pulse);
    if (_hoardGradR !== targetR) {
      _hoardGradCache = ctx.createRadialGradient(hgx, hgy, 0, hgx, hgy, targetR);
      _hoardGradCache.addColorStop(0,    'rgba(255,190,60,0.32)');
      _hoardGradCache.addColorStop(0.28, 'rgba(220,130,30,0.18)');
      _hoardGradCache.addColorStop(0.60, 'rgba(160,80,15,0.07)');
      _hoardGradCache.addColorStop(1,    'rgba(80,35,5,0)');
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
    const _frostPulse = 0.85 + Math.sin(performance.now() * 0.0022) * 0.15;
    ctx.save();
    ctx.globalAlpha = 0.20 * _frostPulse;
    ctx.fillStyle   = 'rgba(160,210,255,1)';
    for (const fc of wallFrostCells) ctx.fillRect(fc.x, fc.y, fc.cs, fc.cs);
    ctx.globalAlpha = 0.10 * _frostPulse;
    ctx.strokeStyle = 'rgba(180,230,255,1)';
    ctx.lineWidth   = 0.5;
    for (const fc of wallFrostCells) ctx.strokeRect(fc.x + 0.25, fc.y + 0.25, fc.cs - 0.5, fc.cs - 0.5);
    ctx.restore();
  }

  drawFortressComplex();

  // Grid: nearly invisible during combat, readable during placement, visible during breaks
  const _inPlacementMode = buildMode === CELL.WALL || buildMode === CELL.TOWER;
  const _gridAlpha = showGrid
    ? (waveState === 'active' ? 0 : (_inPlacementMode ? 0.20 : 0.022))
    : 0;
  grid.draw(ctx, time, _gridAlpha);
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

  // Tower light pools — per-tower signature color halo
  for (const t of towers) {
    if (t.disabledTimer > 0) continue;
    const _tlr = CELL_SIZE * 2.8;
    const rgb = t.glowRgb;
    const _tlg = ctx.createRadialGradient(t.x, t.y + 2, 0, t.x, t.y + 2, _tlr);
    _tlg.addColorStop(0,    `rgba(${rgb},0.12)`);
    _tlg.addColorStop(0.50, `rgba(${rgb},0.05)`);
    _tlg.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = _tlg;
    ctx.beginPath(); ctx.arc(t.x, t.y, _tlr, 0, Math.PI * 2); ctx.fill();
  }

  [...towers].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)
    .forEach(t => { t.selected = (t === selectedTower); t.draw(ctx); });

  // Hover range ring — faint range circle on tower under cursor (without selecting)
  if (!selectedTower && !dragItem) {
    const hoverT = getTowerAtCell(hoverCol, hoverRow);
    if (hoverT && hoverT.range > 0) {
      ctx.save();
      ctx.strokeStyle = hoverT.rangeColor ?? 'rgba(200,200,200,0.15)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([2, 6]);
      ctx.globalAlpha = 0.80;
      ctx.beginPath();
      ctx.arc(hoverT.x, hoverT.y, hoverT.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    // Ancestral Aid: pulsing gold outline on hovered upgradeable tower
    if (ancestralAidActive && hoverT && !hoverT.maxed) {
      const aidPulse = 0.65 + Math.abs(Math.sin(performance.now() * 0.010)) * 0.35;
      const fp = hoverT.footprint ?? { w: 1, h: 1 };
      const fx = hoverT.col * CELL_SIZE;
      const fy = hoverT.row * CELL_SIZE;
      const fw = fp.w * CELL_SIZE;
      const fh = fp.h * CELL_SIZE;
      ctx.save();
      ctx.strokeStyle = `rgba(240,200,60,${aidPulse})`;
      ctx.lineWidth   = 2;
      ctx.setLineDash([3, 4]);
      ctx.shadowColor = '#f0c840';
      ctx.shadowBlur  = 6 * aidPulse;
      ctx.strokeRect(fx, fy, fw, fh);
      ctx.setLineDash([]);
      ctx.shadowBlur  = 0;
      ctx.restore();
    }
  }

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
    const synColors = { eagleEye: 'rgba(120,160,240,0.32)', siegeFury: 'rgba(230,110,40,0.32)', winterGrip: 'rgba(80,200,240,0.32)', shieldWall: 'rgba(220,160,40,0.32)', tidecall: 'rgba(40,180,220,0.32)', runeChain: 'rgba(180,100,240,0.32)' };
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

  // Defender nameplates — prominent name tag below each deployed, named defender
  {
    ctx.save();
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.font         = 'bold 6px monospace';
    for (const t of towers) {
      if (!t.name) continue;
      const fp   = t.footprint ?? { w: 1, h: 1 };
      const nx   = t.x;
      const ny   = t.y + fp.h * CELL_SIZE / 2 + 2;
      const tw   = ctx.measureText(t.name).width;
      const padX = 2.5;
      const tagH = 8;
      // Pill shadow for depth
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.roundRect(nx - tw / 2 - padX + 0.5, ny + 0.5, tw + padX * 2, tagH, 1.5); ctx.fill();
      // Pill background — tinted with the defender's glow color
      const pillC = t.glowRgb ? `rgba(${t.glowRgb},0.22)` : 'rgba(20,10,30,0.88)';
      ctx.fillStyle = pillC;
      ctx.beginPath(); ctx.roundRect(nx - tw / 2 - padX, ny, tw + padX * 2, tagH, 1.5); ctx.fill();
      // Name text with glow
      ctx.fillStyle   = t.glowRgb ? `rgba(${t.glowRgb},1.0)` : 'rgba(235,210,155,1.0)';
      ctx.shadowColor = t.glowRgb ? `rgba(${t.glowRgb},0.70)` : 'rgba(220,180,100,0.50)';
      ctx.shadowBlur  = 4;
      ctx.fillText(t.name, nx, ny + 1);
      ctx.shadowBlur  = 0;
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign    = 'left';
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
    const maxFrames = portalFlashColor === 'red' ? 32 : portalFlashColor === 'gold' ? 20 : 14;
    const fa = (portalFlash / maxFrames) * 0.75;
    const [fr, fg, fb] = portalFlashColor === 'red'    ? [255, 40,  20]
                       : portalFlashColor === 'gold'   ? [255, 190, 30]
                       : portalFlashColor === 'purple' ? [180, 60,  240]
                       : [60, 140, 255];
    ctx.save();
    ctx.shadowColor = `rgba(${fr},${fg},${fb},${fa})`;
    ctx.shadowBlur  = portalFlashColor === 'red' ? 36 : portalFlashColor === 'gold' ? 28 : 20;
    ctx.fillStyle   = `rgba(${fr},${fg},${fb},${fa * 0.55})`;
    ctx.beginPath();
    ctx.arc(spx, spy, CELL_SIZE * (portalFlashColor === 'red' ? 1.2 : portalFlashColor === 'gold' ? 1.0 : 0.85), 0, Math.PI * 2);
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

  enemies.slice().sort((a, b) => a.y - b.y).forEach(e => e.draw(ctx));

  // ── Post-draw overlays: elite rings, leaking warnings, boss aura ─────────────
  if (!gameOver) {
    const _now = performance.now();
    for (const e of enemies) {
      if (!e.alive || e.reached) continue;

      // Elite ring + nameplate (Tier 2 unit — gold outline, float label)
      if (e.isEliteSpawned) {
        const ePulse = 0.55 + Math.sin(_now * 0.007 + e.x) * 0.45;
        ctx.save();
        ctx.strokeStyle = `rgba(255,205,50,${0.55 + ePulse * 0.30})`;
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = '#ffd040'; ctx.shadowBlur = 6 * ePulse;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        // Nameplate
        ctx.font      = 'bold 7px monospace';
        ctx.textAlign = 'center';
        const label   = e.eliteLabel ?? 'ELITE';
        const tw      = ctx.measureText(label).width + 5;
        const ty      = e.y - e.radius - 14;
        ctx.fillStyle = 'rgba(10,6,2,0.78)';
        ctx.fillRect(e.x - tw / 2, ty - 8, tw, 9);
        ctx.fillStyle = '#ffd860';
        ctx.fillText(label, e.x, ty);
        ctx.restore();
      }

      // Leaking warning — red pulse ring when enemy is past 60% of path (Tier 1 threat)
      if (!e.isBoss && e.path && e.path.length > 1 && e.pathIndex / (e.path.length - 1) >= 0.60) {
        const lPulse = 0.5 + Math.sin(_now * 0.012) * 0.5;
        ctx.save();
        ctx.strokeStyle = `rgba(255,50,30,${0.50 + lPulse * 0.35})`;
        ctx.lineWidth   = 1.2;
        ctx.shadowColor = 'rgba(255,40,10,0.8)'; ctx.shadowBlur = 5 * lPulse;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 2, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Boss aura — pulsing red/amber ring around boss while on field (Tier 1)
      if (e.isBoss) {
        const bPulse = 0.5 + Math.sin(_now * 0.004) * 0.5;
        ctx.save();
        ctx.strokeStyle = `rgba(255,80,30,${0.28 + bPulse * 0.22})`;
        ctx.lineWidth   = 3 + bPulse * 2;
        ctx.shadowColor = '#ff4020'; ctx.shadowBlur = 14 + bPulse * 8;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 5 + bPulse * 3, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }
  }

  // Enemy hover tooltip — name, HP, and type hint when cursor is near an enemy
  if (!gameOver && !dragItem) {
    const { x: hgx, y: hgy } = outerToGridLocal(dragX, dragY);
    const inGrid = hgx >= 0 && hgx <= COLS * CELL_SIZE && hgy >= 0 && hgy <= ROWS * CELL_SIZE;
    if (inGrid) {
      const closest = enemies.reduce((best, e) => {
        if (!e.alive) return best;
        const d2 = (e.x - hgx) ** 2 + (e.y - hgy) ** 2;
        return d2 < best.d2 ? { e, d2 } : best;
      }, { e: null, d2: (10 / gridZoom) ** 2 });
      if (closest.e) {
        const def   = ENEMY_DEFS[closest.e.type];
        const label = closest.e.bossName ?? def.label;
        const hpPct = Math.round((closest.e.hp / closest.e.maxHp) * 100);
        const tx    = GRID_LEFT + gridPanX + closest.e.x * gridZoom;
        const ty    = GRID_TOP  + gridPanY + (closest.e.y - closest.e.radius - 12) * gridZoom;
        ctx.save();
        ctx.font      = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        const tw = ctx.measureText(label).width + 6;
        ctx.fillRect(tx - tw / 2, ty - 11, tw, 12);
        ctx.fillStyle = closest.e.isBoss ? '#ff9040' : def.color ?? '#e8d0a0';
        ctx.fillText(label, tx, ty - 1);
        ctx.font      = '8px monospace';
        ctx.fillStyle = 'rgba(200,200,200,0.75)';
        ctx.fillText(`${hpPct}% HP`, tx, ty + 8);
        ctx.restore();
      }
    }
  }

  bullets.forEach(b => b.draw(ctx));
  drawParticles();
  drawImpactFlashes();

  // ── Mara EMP shockwave rings (amber-red: danger, not frost) ────────────────
  for (const er of empRings) {
    const alpha = (er.life / er.maxLife) * 0.7;
    ctx.save();
    ctx.strokeStyle = `rgba(255,120,20,${alpha})`;
    ctx.lineWidth   = 1.2;
    ctx.beginPath(); ctx.arc(er.x, er.y, er.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,180,60,${alpha * 0.55})`;
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.arc(er.x, er.y, er.r * 0.7, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // ── Boss phase rings — clipped to grid bounds to avoid bleeding into HUD/frame ─
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE);
  ctx.clip();
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
  ctx.restore();

  // ── Tower targeting lines — brief aimline from tower to last fired target ───
  if (!gameOver && waveState === 'active') {
    ctx.save();
    for (const t of towers) {
      if (!t.targetLineTimer || t.targetLineTimer <= 0) continue;
      const tlAlpha = (t.targetLineTimer / 20) * 0.60;
      ctx.strokeStyle = `rgba(255,230,100,${tlAlpha})`;
      ctx.lineWidth   = 1.8;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.lastTargetX, t.lastTargetY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Isjätte nova rings (lineWidth thins as ring expands) ───────────────────
  for (const nr of novaRings) {
    const frac  = 1 - nr.life / nr.maxLife;
    const alpha = (nr.life / nr.maxLife) * 0.80;
    ctx.save();
    ctx.shadowColor = `rgba(140,220,255,${alpha})`;
    ctx.shadowBlur  = 6;
    ctx.strokeStyle = `rgba(160,230,255,${alpha})`;
    ctx.lineWidth   = Math.max(0.5, 2.5 * (1 - frac));
    ctx.beginPath(); ctx.arc(nr.x, nr.y, nr.r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(200,240,255,${alpha * 0.35})`;
    ctx.lineWidth   = Math.max(0.5, 5 * (1 - frac));
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

  // ── Permanent low-alpha scroll-animated directional arrows ───────────────────
  if (_pathPts.length >= 2) {
    const _chevT       = performance.now() * 0.00010;
    const _chevAlpha   = waveState === 'active' ? 0.055 : 0.085;
    const _chevSize    = 2.2;
    const _chevSpacing = CELL_SIZE * 4.5;  // one per ~4.5 cells — sparse, not carpeted
    ctx.save();
    ctx.fillStyle = `rgba(220,200,100,${_chevAlpha})`;
    let _pathDist = 0;
    const _scrollOff = (_chevT % 1) * _chevSpacing;
    for (let i = 0; i < _pathPts.length - 1; i++) {
      const ax = _pathPts[i].x, ay = _pathPts[i].y;
      const bx = _pathPts[i + 1].x, by = _pathPts[i + 1].y;
      const segLen = Math.hypot(bx - ax, by - ay);
      if (segLen < 0.01) { _pathDist += segLen; continue; }
      const ang  = Math.atan2(by - ay, bx - ax);
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      let t0 = (Math.ceil((_pathDist - _scrollOff) / _chevSpacing) * _chevSpacing) - _pathDist + _scrollOff;
      if (t0 < 0) t0 += _chevSpacing;
      while (t0 < segLen) {
        ctx.save();
        ctx.translate(ax + cosA * t0, ay + sinA * t0);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(_chevSize, 0);
        ctx.lineTo(-_chevSize * 0.65, -_chevSize * 0.55);
        ctx.lineTo(-_chevSize * 0.65,  _chevSize * 0.55);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        t0 += _chevSpacing;
      }
      _pathDist += segLen;
    }
    ctx.restore();
  }

  // Path direction chevrons removed — the arrows read as tower-defense genre signal.
  // The path stones already communicate terrain; directional arrows are redundant.

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
    ctx.fillText(`RAMPART BREACHED  (${lives} remain)`, hx, hy);
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

  // Permanent atmospheric vignette — always-on edge darkening for scene depth
  {
    const { width, height } = getViewSize();
    if (!_baseVigCache || width !== _baseVigW || height !== _baseVigH) {
      _baseVigCache = ctx.createRadialGradient(width / 2, height / 2, height * 0.28, width / 2, height / 2, height * 0.88);
      _baseVigCache.addColorStop(0, 'rgba(0,0,0,0)');
      _baseVigCache.addColorStop(1, 'rgba(0,0,0,1)');
      _baseVigW = width; _baseVigH = height;
    }
    ctx.globalAlpha = 0.30;
    ctx.fillStyle   = _baseVigCache;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  // Boss ambient — deep red atmospheric tint when a boss is alive on field
  {
    const bossOnField = enemies.some(e => e.alive && !e.reached && e.isBoss);
    if (bossOnField && !gameOver) {
      const { width, height } = getViewSize();
      if (!_bossVigCache || width !== _bossVigW || height !== _bossVigH) {
        _bossVigCache = ctx.createRadialGradient(width / 2, height / 2, height * 0.22, width / 2, height / 2, height * 0.85);
        _bossVigCache.addColorStop(0, 'rgba(180,10,10,0)');
        _bossVigCache.addColorStop(1, 'rgba(180,10,10,1)');
        _bossVigW = width; _bossVigH = height;
      }
      const bPulse = 0.5 + Math.sin(performance.now() * 0.0018) * 0.5;
      ctx.globalAlpha = 0.14 + bPulse * 0.06;
      ctx.fillStyle   = _bossVigCache;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
  }

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

  // Life-loss flash vignette — brief intense red pulse on screen when a life is lost
  if (!gameOver && lifeLostTimer > 60) {
    const { width, height } = getViewSize();
    const flashAlpha = ((lifeLostTimer - 60) / 30) * 0.45;
    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle   = '#ff0000';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  drawRightPanel();
  drawHud();
  drawGoldCoins();
  drawBossWarning();
  drawBossDefeat();
  drawBossLootBanner();
  drawEnemyIntroBanner();
  drawRuneForgeHint();
  drawWaveAnnouncement();
  drawChapterBanner();
  drawAncestralAidBanner();
  drawMylingWarning();
  drawMaraEmpWarning();
  drawJotunnWarning();
  drawWave1Hint();
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
  drawHelpOverlay();

  drawFrames();
  ctx.restore();
}

function drawChapterBanner() {
  if (chapterBannerTimer <= 0) return;
  chapterBannerTimer--;
  const maxT  = 240;
  const alpha = chapterBannerTimer > 40
    ? Math.min(1, (maxT - chapterBannerTimer) / 22)
    : chapterBannerTimer / 40;
  const cx = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const cy = GRID_TOP + (ROWS * CELL_SIZE) / 2 - 18;
  ctx.save();
  ctx.textAlign = 'center';

  // Dark backing strip for legibility
  ctx.fillStyle = `rgba(4,2,10,${alpha * 0.68})`;
  ctx.beginPath(); ctx.roundRect(cx - 130, cy - 22, 260, 42, 4); ctx.fill();

  ctx.font        = 'bold 18px monospace';
  ctx.fillStyle   = `rgba(240,200,60,${alpha})`;
  ctx.shadowColor = `rgba(200,130,20,${alpha * 0.95})`;
  ctx.shadowBlur  = 14;
  ctx.fillText(chapterBannerText, cx, cy);
  ctx.font        = '11px monospace';
  ctx.fillStyle   = `rgba(200,160,80,${alpha * 0.80})`;
  ctx.shadowBlur  = 6;
  ctx.fillText(endlessMode ? '— THE ENDLESS SIEGE —' : '— THE SIEGE INTENSIFIES —', cx, cy + 16);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawAncestralAidBanner() {
  if (!ancestralAidActive) return;
  const pulse = 0.65 + Math.abs(Math.sin(performance.now() * 0.010)) * 0.35;
  const cx = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const cy = GRID_TOP + 22;
  ctx.save();
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 13px monospace';
  ctx.fillStyle   = `rgba(140,220,255,${pulse})`;
  ctx.shadowColor = `rgba(80,180,255,${pulse * 0.9})`;
  ctx.shadowBlur  = 14;
  ctx.fillText('✦ ANCESTRAL AID — Click a tower for a free upgrade', cx, cy);
  ctx.shadowBlur  = 0;
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

function drawJotunnWarning() {
  if (jotunnWarningTimer <= 0) return;
  const fadeAlpha = jotunnWarningTimer < 60 ? jotunnWarningTimer / 60 : 1;
  const cx = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const by = GRID_TOP + 50;
  ctx.save();
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 11px monospace';
  ctx.fillStyle   = `rgba(80,180,255,${fadeAlpha * 0.92})`;
  ctx.shadowColor = `rgba(40,120,220,${fadeAlpha * 0.8})`;
  ctx.shadowBlur  = 10;
  ctx.fillText('◆ JÖTUNN — MASSIVE HP, RESISTS SLOWING', cx, by);
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawWave1Hint() {
  if (waveNumber !== 0 || waveState !== 'countdown') return;
  const cx     = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const cy     = GRID_TOP + ROWS * CELL_SIZE - 18;
  const pulse  = 0.5 + Math.abs(Math.sin(performance.now() * 0.003)) * 0.5;
  ctx.save();
  ctx.textAlign   = 'center';
  ctx.font        = '10px monospace';
  ctx.fillStyle   = `rgba(200,170,100,${pulse * 0.80})`;
  ctx.shadowColor = `rgba(160,120,60,${pulse * 0.6})`;
  ctx.shadowBlur  = 6;
  ctx.fillText('Enemies march  Portal → Fortress  •  Build walls to maze them', cx, cy);
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawPathBlockFlash() {
  if (!pathBlockFlash) return;
  pathBlockFlash.timer--;
  if (pathBlockFlash.timer <= 0) { pathBlockFlash = null; return; }
  const { col, row, timer, type } = pathBlockFlash;
  const occupied = type === 'occupied';
  const alpha = Math.min(1, timer / 20) * (timer % 8 < 4 ? 1 : 0.4); // strobe flash
  const vx = GRID_LEFT + gridPanX + col * CELL_SIZE * gridZoom;
  const vy = GRID_TOP  + gridPanY + row * CELL_SIZE * gridZoom;
  const vs = CELL_SIZE * gridZoom;
  ctx.save();
  ctx.globalAlpha  = alpha * 0.55;
  ctx.fillStyle    = occupied ? '#e8b040' : '#e84040';
  ctx.fillRect(vx, vy, vs, vs);
  ctx.globalAlpha  = alpha * 0.9;
  ctx.strokeStyle  = occupied ? '#ffd040' : '#ff4040';
  ctx.lineWidth    = 2;
  ctx.strokeRect(vx + 1, vy + 1, vs - 2, vs - 2);
  ctx.globalAlpha  = Math.min(1, timer / 20) * 0.92;
  ctx.font         = 'bold 14px monospace';
  ctx.fillStyle    = occupied ? '#ffe080' : '#ff8080';
  ctx.textAlign    = 'center';
  ctx.shadowColor  = occupied ? 'rgba(220,160,0,0.8)' : 'rgba(220,0,0,0.8)';
  ctx.shadowBlur   = 10;
  ctx.fillText(occupied ? 'OCCUPIED' : 'PATH BLOCKED', vx + vs / 2, vy - 4);
  // Also show center-screen label so it's visible at any zoom
  ctx.font      = 'bold 14px monospace';
  ctx.fillStyle = occupied ? '#ffe080' : '#ff4040';
  ctx.fillText(occupied ? 'OCCUPIED' : 'PATH BLOCKED', GRID_LEFT + COLS * CELL_SIZE / 2, GRID_TOP + ROWS * CELL_SIZE / 2);
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
  if (tower) {
    ctx.fillText(`RECALL? (${sellCountdown}s)`, vx + vsW / 2, vy + vsH / 2 - 3);
    ctx.font      = '8px monospace';
    ctx.fillStyle = `rgba(160,200,160,${pulse * 0.8})`;
    ctx.fillText('Returns to warband', vx + vsW / 2, vy + vsH / 2 + 9);
  } else {
    ctx.fillText(`SELL? (${sellCountdown}s)`, vx + vsW / 2, vy + vsH / 2 - 3);
    ctx.font      = '8px monospace';
    ctx.fillStyle = `rgba(240,200,60,${pulse * 0.8})`;
    ctx.fillText(`Refund: ◆${Math.floor(_effectiveWallCost * 0.75)}`, vx + vsW / 2, vy + vsH / 2 + 9);
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
      const tDef   = TOWER_DEFS[dragItem.id];
      const tRange = tDef?.range ?? 0;
      if (tRange > 0) {
        const cx2 = fpVX + fpVW / 2;
        const cy2 = fpVY + fpVH / 2;
        ctx.strokeStyle = tDef?.rangeColor ?? 'rgba(200,200,200,0.3)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(cx2, cy2, tRange * gridZoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Splash radius ring for catapult/drakship
        const splashR = tDef?.splashRadius ?? 0;
        if (splashR > 0) {
          ctx.strokeStyle = 'rgba(255,140,40,0.70)';
          ctx.lineWidth   = 1;
          ctx.setLineDash([6, 2]);
          ctx.beginPath();
          ctx.arc(cx2, cy2, splashR * gridZoom, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
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
