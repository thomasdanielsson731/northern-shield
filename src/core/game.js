import { ctx, canvas } from './renderer.js';
import { Grid, CELL } from '../grid/grid.js';
import { Enemy, ENEMY_TYPES, ENEMY_DEFS, getEnemyGoldSteal, getEnemyTargetPriority, computeAssaultDefeatGoldRaid } from '../entities/enemy.js';
import { Tower, TOWER_DEFS, TOWER_TYPES } from '../entities/tower.js';
import { SPRITES } from '../assets.js';
import {
  UI_COLORS,
  drawWarRoomBarBg,
  drawTopStatChip,
  drawTopBarTextBlock,
  drawTopBarShield,
  drawMetaTopBar,
  META_TOP_BAR_COMPACT_H,
} from '../ui/uiTheme.js';
import {
  drawPanelHpBar,
  getHeroHpFrac,
} from '../ui/assaultPanels.js';
import { drawProceduralStructureIcon } from '../ui/structurePortrait.js';
import { ONBOARDING, advanceOnboarding, resolveOnboardingHint } from '../campaign/onboarding.js';
import { getSpriteScale, setSpriteScale, changeSpriteScale } from '../config.js';
import { saveCampaign, loadCampaign, createNewCampaign } from '../campaign/save.js';
import {
  SLOT_COUNT, loadSlotsMeta, migrateLegacyToSlots, loadSession, saveSession,
  slotHasSave, deleteSlot, createCampaignInSlot, touchSlotMeta,
} from '../campaign/saveSlots.js';
import { getAvailableEvent } from '../campaign/events.js';
import {
  CAMPAIGN_MAP_COUNT,
  createEmptyCampaignProgress,
  getCampaignMapMeta,
  getMapDisplayName,
  getPortalCountForMap,
  getNodeCountForMap,
  getWaveCountForNode,
  getNodeBossConfig,
  isTutorialNode,
  getMarchSuppliesGold,
  buildNodeWavePlan,
  buildCampaignNodeSpawnQueue,
  difficultyToEquivWave,
  getNodeDifficulty,
  getMapRun,
} from '../campaign/campaignMaps.js';
import {
  FRONT_IDS,
  FRONT_LABELS,
  getFrontLayout,
  getAssaultInfo,
  getFrontProgress,
  getFrontStatusLine,
  getFrontSubtitle,
  getNextAvailableAssault,
  isAssaultUnlocked,
} from '../campaign/campaignFronts.js';
import {
  serializeFieldState,
  mergeFallenHeroesIntoFieldState,
  attachDeploySnapshot,
  prepareFieldForNewAssault,
  completeNode,
  canPlaceHero,
  canPlaceStructure,
  isNodeCasualty,
  markNodeCasualty,
  clearNodeCasualties,
  isHeroTowerType,
  MAX_FIELD_HEROES,
  MAX_FIELD_STRUCTURES,
  ensurePostAssignments,
} from '../campaign/campaignRun.js';
import {
  isAssaultDeployPhase,
  canUpgradeHeroLevelBetweenAssaults,
} from '../campaign/campaignDeploy.js';
import {
  getSagaDebriefProse,
  getSagaDebriefTitle,
  buildFortressDamageReport,
  formatDebriefCompactStats,
} from '../campaign/debriefReport.js';
import {
  formatDefenderPostBadge,
} from '../roster/postTitles.js';
import {
  buildAssaultTargetPriority,
  isGateWallTarget,
  isStructureWallTarget,
  shouldPrioritizeFortressGates,
} from '../combat/assaultTargeting.js';
import { Roster } from '../roster/roster.js';
import { ROMAN, Defender, CAREER_XP, XP_PER_KILL, XP_PER_WAVE } from '../roster/defender.js';
import { getDefenderName } from '../roster/names.js';
import { ITEM_DEFS, BOSS_DROP_TABLE, RARITY_COLOR, getItemBonuses } from '../roster/items.js';
import { TALENT_DEFS, CLASS_TALENTS, getTalentBonuses } from '../roster/talents.js';
import { FORTRESS_DEFS, getFortressBonuses, getNextFortressUpgradeOffer } from '../fortress/fortress.js';
import {
  HERO_POST_IDS, POST_DEFS, resolvePostCell, getPrimaryGateForFront,
  assignDefender, clearPost, validateAssignments, buildTowerPlacements, countAssignedHeroes,
} from '../fortress/defensivePosts.js';
import {
  createChronicle, generateBattleReport, checkTitles, getPrimaryTitle, TITLE_DEFS, wrapText,
  getRandomTrait, TRAIT_DEFS, SCAR_DEFS, checkScars, getRank, VETERAN_RANKS,
  generateBio, generateEpitaph, generateBondName,
} from '../chronicle/chronicle.js';
import {
  FORTRESS_ROLES, FORTRESS_ROLE_IDS, cycleFortressRole, getDefaultFortressRole,
  getPortalCells, isInGateZone, isInWallZone, isInCoreZone, isRoleInZone,
  getFortressRoleDamageMult, countDeployedRoleBonus,
} from '../roster/heroRoles.js';
import {
  SQUAD_PRESETS, analyzeWarband, getRecommendedDeploy, getCompositionWarnings,
  getRecommendedStructureCount, getStructureWarnings,
  applySquadPreset, getCombatRole, COMBAT_ROLES,
} from '../roster/warbandComposition.js';
import { getTraitModifiers } from '../roster/traitGameplay.js';
import { updateHeroMovement, snapWarbandToDeploy } from '../roster/heroMovement.js';
import { pickWarbandHealTargets, getHyddaHealAmount } from '../roster/warbandHeal.js';
import { MAX_HERO_LEVEL, getHeroUpgradeCost, getHyddaHealCount } from '../roster/heroLevel.js';
import {
  getMaxLevelForTowerType,
  getStructureUpgradeCost,
  getStructureCombatHp,
  scalePassiveByLevel,
  MAX_STRUCTURE_LEVEL,
} from '../roster/structureLevel.js';
import {
  ensureAudio, setMuted, sfxShoot, sfxNova, sfxDie,
  sfxPlace, sfxLifeLost, sfxHeal, sfxUpgrade, sfxBossPhase,
  sfxRune, sfxSell, sfxSplash, sfxChainKill, sfxEmp, sfxWaveStart, sfxGameOver,
  sfxFlawless, sfxWaveDone, sfxEndlessStart, sfxEndlessMilestone,
  sfxTalentUnlock, sfxLootDrop, sfxFortressUpgrade, sfxRecruit, sfxDismiss, sfxRename, sfxBond,
  sfxBossPhase25, sfxBossPhase50,
  sfxRetireCeremony, sfxEnemyIntro, sfxPortalOpens, sfxEventResolve, sfxBondGrief,
  sfxChapterBanner, sfxKillMilestone, sfxEquipItem, sfxSynergy, sfxBossEntry,
  sfxAssaultHorn,
} from './sounds.js';
import {
  createPrepShellState,
  loadPrepFieldMeta,
  mergePrepFieldMeta,
  applyFirstSagaAssaultRewards,
  syncPrepMetaForAssault,
  updatePrepCamera,
  drawFortressSchematic,
  drawCommanderContextPanel,
  handlePrepShellPointer,
  applyPanelAction,
  startHornAnimation,
  getHornBlockReason,
} from '../preparation/fortressCommanderShell.js';
import {
  isFirstSagaMap,
  FIRST_SAGA_A3_NODE,
  FIRST_SAGA_A4_NODE,
  isFirstSagaRecruitUnlocked,
  isFirstSagaSliceLockedRegion,
  isFirstSagaSettlementComplete,
  ensureFirstSagaState,
  isFirstSagaAssaultNode,
  getFirstSagaWaveBands,
  getFirstSagaSpawnGap,
  getFirstSagaStartingLives,
  getFirstSagaWaveBreakFrames,
  getFirstSagaBetweenWaveHealFraction,
} from '../campaign/firstSaga.js';
import {
  shouldOfferSettlementCeremony,
  applySettlementComplete,
  validateSettlementName,
} from '../campaign/settlementCeremony.js';
import {
  shouldOfferHeroNaming,
  applyHeroNaming,
  validateHeroName,
  getUnnamedSagaHero,
} from '../campaign/heroNamingCeremony.js';
import {
  drawFirstSagaCommandMap,
  drawSettlementCeremony,
  drawHeroNamingCeremony,
  SETTLEMENT_STAGE_COUNT,
} from '../campaign/firstSagaUI.js';

const COLS = 48;
const ROWS = 30;
const CELL_SIZE = 14;

const RIGHT_PANEL_W  = 188;
const FRAME_THICK    = 16;   // must match thick inside drawFrames()
const FRAME_PAD      = FRAME_THICK + 4; // inner inset for side/bottom panels
const META_SCREEN_TOP = FRAME_THICK + META_TOP_BAR_COMPACT_H + 6; // below meta top bar
const DOCK_TAB_H     = 22;
const LEFT_DOCK_W    = 172;  // left dock: WARBAND | STRUCTURES tabs
const ASSAULT_RIGHT_PANEL_W = LEFT_DOCK_W; // match left panel width
const ROSTER_PANEL_W = LEFT_DOCK_W;
const GRID_LEFT      = FRAME_THICK + LEFT_DOCK_W;
const GRID_TOP       = FRAME_THICK + 40; // frame strip + War Room command bar
const GRID_BOTTOM    = GRID_TOP + ROWS * CELL_SIZE;

const SPAWN = { col: 0,                    row: Math.floor(ROWS / 2) };
const GOAL  = { col: Math.floor(COLS / 2), row: Math.floor(ROWS / 2) };

const WALL_COST = 12;
const WALL_BASE_HP = 100;
const WALL_HP_BY_LEVEL      = [100, 120, 140, 160, 180];  // index = level 0-4
const WALL_UPGRADE_COST     = [8, 14, 20, 28];            // legacy — fortress ring only
const WALL_MAX_LEVEL        = 4;
const WALL_WAVE_DAMAGE      = 5;                           // HP lost per wave for walls adjacent to path
const FORTRESS_RING_R       = 5;   // Chebyshev radius of pre-placed fortress wall ring
const GATE_COST             = 28;
const GATE_HP               = 120;

const BUILD_BTN = { x: GRID_LEFT, w: 110, h: 62, gap: 4 };

// Command Center navigation sidebar items
const NAV_ITEMS = [
  { id: 'battle',    icon: '⚔',  label: 'BATTLE'    },
  { id: 'warband',   icon: '🛡',  label: 'WAR BAND'  },
  { id: 'fortress',  icon: '🏰',  label: 'FORTRESS'  },
  { id: 'chronicle', icon: '📜',  label: 'CHRONICLE' },
  { id: 'hall',      icon: '⚱',  label: 'HALL'      },
];

/** War Camp management tabs — one view at a time, no stacked panels. */
const WAR_CAMP_TABS = [
  { id: 'warband',  label: 'WARBAND'  },
  { id: 'recruit',  label: 'RECRUIT'  },
  { id: 'fortress', label: 'FORTRESS' },
];

// Natural game dimensions at CELL_SIZE=14 — used to derive the scale factor
const BASE_W = FRAME_THICK + LEFT_DOCK_W + COLS * CELL_SIZE + RIGHT_PANEL_W;
const BASE_H = GRID_BOTTOM + FRAME_THICK + 6;

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

const REINFORCE_WAVES = 3;   // legacy temp-wall decay (no longer built by player)

// TOWER items: static siege/defensive structures
const TOWER_BUILD_ITEMS = [
  { id: 'gate',       label: 'Fortress Gate', key: '1', color: '#a07830', cost: GATE_COST, mode: CELL.GATE, category: 'gates' },
  { id: 'watchtower',  ...TOWER_DEFS['watchtower'], mode: CELL.TOWER, category: 'outpost' },
  { id: 'ballista',    ...TOWER_DEFS['ballista'],   mode: CELL.TOWER, category: 'siege'   },
  { id: 'catapult',    ...TOWER_DEFS['catapult'],   mode: CELL.TOWER, category: 'siege' },
  { id: 'mine',        ...TOWER_DEFS['mine'],       mode: CELL.TOWER, category: 'outpost' },
  { id: 'barracks',    ...TOWER_DEFS['barracks'],   mode: CELL.TOWER, category: 'outpost' },
  { id: 'runeshrine',  ...TOWER_DEFS['runeshrine'], mode: CELL.TOWER, category: 'outpost' },
  { id: 'piltorn',     ...TOWER_DEFS['piltorn'],    mode: CELL.TOWER, category: 'siege' },
  { id: 'drakship',    ...TOWER_DEFS['drakship'],   mode: CELL.TOWER, category: 'siege' },
];
let selectedGateType = 'gate';
// HERO items: warband characters with roster identity
const HERO_BUILD_ITEMS = [
  ...['berserk', 'valkyrie', 'military', 'hydda', 'blondie', 'isjatten'].map(type => ({
    id:       type,
    label:    TOWER_DEFS[type].label,
    key:      TOWER_DEFS[type].key,
    color:    TOWER_DEFS[type].color,
    glowRgb:  TOWER_DEFS[type].glowRgb,
    cost:     TOWER_DEFS[type].cost,
    mode:     CELL.TOWER,
    category: (['berserk', 'valkyrie', 'military'].includes(type)) ? 'warriors' : 'mystic',
    isHero:   true,
  })),
];
const BUILD_ITEMS = [...TOWER_BUILD_ITEMS, ...HERO_BUILD_ITEMS];

const _LEFT_DOCK_TABS = [
  { id: 'warband',    label: 'WARBAND'    },
  { id: 'structures', label: 'STRUCTURES' },
];

/** Wave 1 on fortress maps: gates first, then siege unlocks after a gate is placed. */
function getVisibleStructureItems() {
  const all = TOWER_BUILD_ITEMS;
  if (!hasFortressRing()) {
    return all.filter(i => i.category !== 'gates');
  }
  const anySiege = towers.length > 0 || Object.values(wallData).some(w => w.isGate);
  if (gamePhase === 'playing' && waveNumber === 1 && !anySiege && !_hintSeen.firstPlacement
      && !(isCampaignCombat() && isTutorialNode(_campaignMapIndex, _campaignNodeIndex))) {
    return all.filter(i => i.category === 'gates');
  }
  return all;
}

function drawHorizTabs(px, py, pw, tabs, activeId, outBtns, opts = {}) {
  outBtns.length = 0;
  const ghost = !!opts.transparent;
  const tabW = Math.max(40, Math.floor(pw / tabs.length));
  for (let i = 0; i < tabs.length; i++) {
    const tab    = tabs[i];
    const tx     = px + i * tabW;
    const active = activeId === tab.id;
    ctx.fillStyle = active
      ? (ghost ? 'rgba(160,100,20,0.10)' : 'rgba(160,100,20,0.32)')
      : (ghost ? 'transparent' : 'rgba(8,5,16,0.55)');
    if (!ghost || active) ctx.fillRect(tx, py, tabW, DOCK_TAB_H);
    if (active) {
      ctx.fillStyle = '#c8901a';
      ctx.fillRect(tx, py + DOCK_TAB_H - 2, tabW, 2);
    }
    if (opts.pulseId === tab.id) {
      const pulse = 0.45 + Math.sin(performance.now() * 0.008) * 0.4;
      ctx.strokeStyle = `rgba(240,200,80,${0.35 + pulse * 0.55})`;
      ctx.lineWidth = 1.2 + pulse * 0.8;
      ctx.shadowColor = 'rgba(240,200,80,0.45)';
      ctx.shadowBlur = 4 + pulse * 6;
      ctx.beginPath(); ctx.roundRect(tx - 1, py - 1, tabW + 2, DOCK_TAB_H + 2, 3); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.font = 'bold 6px monospace';
    ctx.fillStyle = active ? '#f0d080' : 'rgba(130,100,50,0.55)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tab.label, tx + tabW / 2, py + DOCK_TAB_H / 2);
    outBtns.push({ x: tx, y: py, w: tabW, h: DOCK_TAB_H, id: tab.id });
  }
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  return DOCK_TAB_H;
}

const STRUCTURE_DOCK_CARD_H  = 44;
const STRUCTURE_DOCK_CARD_GAP = 3;

function _structureListLayout(px, py, pw, ph) {
  const items      = getVisibleStructureItems();
  const padX       = 5;
  const headerH    = 14;
  const contentTop = py + DOCK_TAB_H + headerH + 4;
  const contentH   = ph - DOCK_TAB_H - headerH - 8;
  const cardW      = pw - 2 * padX;
  const cardH      = STRUCTURE_DOCK_CARD_H;
  const gap        = STRUCTURE_DOCK_CARD_GAP;
  const totalH     = items.length > 0 ? items.length * (cardH + gap) - gap : 0;
  const maxScroll  = Math.max(0, totalH - contentH);
  _structureScrollY = Math.max(0, Math.min(_structureScrollY, maxScroll));
  return { items, padX, contentTop, contentH, cardW, cardH, gap, maxScroll, totalH };
}

function _drawStructureDockCard(item, cardX, cardY, cardW, cardH, isBuildSel) {
  const cost       = item.cost;
  const affordable = gold >= cost;
  const glowRgb    = TOWER_DEFS[item.id]?.glowRgb
    ?? (item.category === 'gates' ? '160,120,60' : item.category === 'siege' ? '140,115,75' : '80,130,90');
  const bgColor    = isBuildSel ? `rgba(${glowRgb},0.22)` : affordable ? 'rgba(16,8,30,0.94)' : 'rgba(10,5,18,0.88)';
  drawFantasyPanel(cardX, cardY, cardW, cardH, bgColor, isBuildSel ? 0.78 : 0.32, 5);

  ctx.fillStyle = `rgba(${glowRgb},${isBuildSel ? 0.95 : 0.65})`;
  ctx.beginPath(); ctx.roundRect(cardX, cardY, 3, cardH, [4, 0, 0, 4]); ctx.fill();

  if (isBuildSel) {
    ctx.strokeStyle = `rgba(${glowRgb},0.95)`; ctx.lineWidth = 1.5;
    ctx.shadowColor = `rgba(${glowRgb},0.45)`; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.roundRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2, 4); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = isBuildSel ? '#f0d040' : 'rgba(200,160,80,0.75)';
  ctx.fillText(`[${item.key}]`, cardX + 6, cardY + 10);

  const avX = cardX + 18;
  const avY = cardY + cardH / 2 + 2;
  const ringR = Math.min(cardH * 0.30, 11);
  if (!affordable) ctx.globalAlpha = 0.38;
  drawStructurePortrait(avX, avY, item.id, ringR * 2.2, affordable);
  ctx.globalAlpha = 1;

  const textX = cardX + 34;
  const lbl   = STRUCTURE_SHORT[item.id] ?? item.label;
  ctx.font = 'bold 7.5px monospace';
  ctx.fillStyle = affordable ? '#d8c8a8' : '#3a3020';
  ctx.fillText(lbl.length > 12 ? lbl.slice(0, 11) + '…' : lbl, textX, cardY + cardH / 2 - 4);

  const abilLbl = ABILITY_LABELS[item.id];
  if (abilLbl) drawRoleChip(textX, cardY + cardH / 2 + 6, abilLbl, glowRgb, { alpha: affordable ? 1 : 0.45 });

  ctx.font = '6px monospace'; ctx.textAlign = 'right';
  ctx.fillStyle = affordable ? '#a08050' : '#e84040';
  ctx.fillText(`${cost}g`, cardX + cardW - 5, cardY + cardH / 2 - 2);

  ctx.fillStyle = `rgba(${glowRgb},${affordable ? 0.45 : 0.15})`;
  ctx.beginPath(); ctx.roundRect(cardX + 4, cardY + cardH - 3, cardW - 8, 2, [0, 0, 2, 2]); ctx.fill();

  if (item.id === 'gate' && _onboardingStep === ONBOARDING.DEPLOY && !assaultFieldHasGate()) {
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f0d060';
    ctx.fillText('PORT', cardX + cardW - 6, cardY + 9);
    ctx.textAlign = 'left';
  }

  const gate = TOWER_STAR_GATES[item.id];
  if (gate && stars < gate) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 5); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = '7px monospace'; ctx.fillStyle = '#f0d040';
    ctx.fillText(`✦ ${stars}/${gate}`, cardX + cardW / 2, cardY + cardH / 2 + 2);
    ctx.textAlign = 'left';
  }
}

/** Display labels for structure build slots (Title Case). */
const STRUCTURE_SHORT = {
  gate:        'Fortress Gate',
  watchtower:  'Watch Tower',
  ballista:    'Ballista',
  catapult:    'Catapult',
  mine:        'Mine',
  barracks:    'Barracks',
  runeshrine:  'Rune Shrine',
  piltorn:     'Warden',
  drakship:    'Dragonship',
};

// Tactical high-ground choke tiles — defenders placed here get +15% range.
// Keyed by preset name → Set of 'col_row' strings.
const CHOKE_CELLS_BY_PRESET = {
  midgard: new Set(['16_11', '24_5', '24_17', '32_11']),
};
let _chokeCells = new Set(); // active choke cells for current map

const STARTING_GOLD  = 120;
const RECRUIT_COST   = 30;    // goldReserve cost to recruit a new defender between battles
const WAR_CHEST_COST = 50;    // optional gold sink — morale donation in War Camp
const WAR_CHEST_ELITE_COST = 100;
let   STARTING_LIVES = 8;

const grid = new Grid(COLS, ROWS, CELL_SIZE);
grid.setCell(SPAWN.col, SPAWN.row, CELL.SPAWN);
grid.setCell(GOAL.col,  GOAL.row,  CELL.GOAL);

let currentPath  = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
let _extraSpawns = [];  // [{col, row, path, active}] – additional portals for multiPortal maps
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
let panelMoveBtn    = null;
let _heroMoveMode   = null;  // tower being repositioned; set by MOVE button click
let restartBtn      = null;
let toplistBtn      = null;
let nextWaveBtn     = null;
let autoNextBtn     = null;
let runeForgeBtn    = null;
let gameSpeed  = 1;
let speedBtns  = [];   // [{x,y,w,h,speed}, ...]
let _frameTick = 0;
let rightPanelScale = 1.0;

let dragItem    = null;  // { id, label, color, cost, mode } while dragging from warband panel
let pendingSell = null;  // { col, row, timer } — tower awaiting sell confirmation
let dragX     = 0;
let dragY     = 0;
let dragStartX = 0;
let dragStartY = 0;
let hoverCol  = -1;
let hoverRow  = -1;

let goldCoins  = [];   // flying coin particles: { sx, sy, t, speed }
let hoardPulse = 0;    // frames of bounce animation when coin lands
let _lastTreasuryStage = 1; // tracked to fire hoardPulse on stage change
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
let wallData          = {};  // `${col}_${row}` → {level, hp, maxHp}

// Playtest UX
let firstTowerPlaced  = false;  // hides build-bar arrow after first placement
let firstKillDone     = false;  // triggers enhanced coin arc on first kill
let mylingWarningTimer    = 0;   // frames remaining for first-Myling warning banner
let maraEmpWarningTimer   = 0;  // frames remaining for first-Mara EMP warning banner
let jotunnWarningTimer    = 0;  // frames remaining for first-Jötunn warning banner
let fossegrimWarningTimer = 0;  // frames remaining for first-Fossegrim warning banner
let chainKillDone     = new Set();  // per-tower chain kill (catapult 3+), cleared each wave
let _synergyDirty    = true;        // recompute synergy pairs on next tick
let chainKillDisplay  = null;   // { x, y, life, maxLife, count }
let lifeLostTimer     = 0;      // frames for LIFE LOST text near hoard
let _bossPhase25Flash = 0;     // frames for red screen flash on boss 25% phase transition
let pathChevronsTimer = 0;      // countdown for wave-1 path direction chevrons
let bestWave          = { wave: 0, slain: 0, gold: 0 };  // best single-wave record
let waveSlainCount    = 0;      // enemies killed this wave (for best-wave tracking)
let waveGoldStart     = 0;      // goldEarned at wave start (delta = wave earnings)

// Stars & Rune system
let stars           = 0;        // earned in current run (flawless waves + boss kills)
let runeInventory   = { ironEdge: 0, swiftStrike: 0, frostRune: 0, battleHymn: 0, valhalla: 0 };
let showRuneMenu    = false;    // Rune Carver panel open (inline right panel)
let runeMenuBtns    = [];       // hit areas for rune buy buttons
let showRunePicker    = false;  // per-tower rune equip overlay
let _itemRunePickMode = false;  // true when picker is for item rune slot
let runePickerTower  = null;    // tower currently being outfitted
let runePickerBtns   = [];      // hit areas in rune picker
let panelRuneBtn     = null;    // hit area for equip-rune button in tower panel
let panelItemRuneBtn = null;    // hit area for equip-rune button in item rune slot

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
let _depthBannerTimer  = 0;       // frames to show depth banner (endless 5-wave tiers)
let _depthBannerTier   = 0;       // current endless depth tier number
let _bossPhaseDesc     = null;    // { text, timer } — 2s auto-display on boss phase transition
let _bossEntryVignette = 0;       // frames of boss entry vignette darkening
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
let _pathAdjacentCells = [];      // cached cells adjacent to path cells (rebuilt when pathDirty)
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
let _lastDefeatReason    = null;   // 'ramparts' | 'field_wiped'
let _newBattleTalentUnlocks = [];  // [{defName, talentId}] — talents unlocked at end of last battle
let _fortressBonuses     = getFortressBonuses({});  // recomputed in initBattle
let _effectiveWallCost   = 12;     // WALL_COST adjusted by Wallworks
let _wallSlowFactor      = 0.65;   // adjusted by Wallworks; applied in enemy proximity-slow loop
let _effectiveRecruitCost = 30;    // RECRUIT_COST adjusted by Barracks

// Command Center navigation state
let _navActiveId  = 'battle';   // currently active nav section
let _navBtns      = [];          // hit-test rects for nav items (rebuilt each frame)
let _navHover     = -1;          // index of hovered nav item (-1 = none)
let _rosterPanelBtns = []; // hit regions for roster panel hero cards (rebuilt each frame)

// Between-battles UI state
let _recruitType        = null;          // currently selected class in recruit picker
let _betweenSubtab      = 'recruit';     // legacy alias — kept in sync with _warCampTab
let _warCampTab         = 'warband';     // 'warband' | 'recruit' | 'fortress'
let _pendingDismiss     = null;          // defenderId awaiting dismiss confirm
let _rosterScrollOffset = 0;            // how many defender rows scrolled past top
let _renameState        = null;          // { defenderId, draft } while canvas rename is active
let _enemyIntroSeen     = new Set();     // enemy types shown intro banner this campaign
let _enemyIntroBanner   = null;          // { type, timer, label, hint } for first-encounter tooltip
let _enemyIntroQueue    = [];            // queued { label, hint } banners waiting to display
let _betweenFadeIn      = 0;             // countdown for betweenBattles screen fade-in (30 frames)
let _debriefTimer       = 0;             // frames since debrief opened (used for entry anim + click gate)
let _pendingCampaignEvent = null;        // EVENT_DEFS entry shown as card in betweenBattles
let _pendingEventBtns     = [];          // [{x,y,w,h,choice,canAfford}] hit areas for event card
let _eventCardAnim        = 0;           // frames since card opened (slide-in)
let _campaignVictoryScreen = false;     // true after W100 victory, until dismissed
let _battleXpData       = [];           // [{name, xpGained, oldLevel, newLevel}] per defender
let _battleFieldStats   = [];           // persisted tower stats (survives field wipe removal)
let _reserveContrib     = 0;            // gold added to reserve this battle (25% of goldEarned)
let _bossLootBanner     = null;         // { itemId, timer } for loot callout display
let _lastBossLootItemId = null;         // item dropped from last boss kill (shown in debrief)
let _starsEarnedThisBattle = 0;        // stars gained this battle (flawless waves + boss kills)
let _lastResolvedEventTitle = null;    // event card title resolved this between-battles (for echo)
let _defKillMilestones  = new Set();   // 'defenderId_milestone' combos that fired this session

// Chronicle event accumulators — reset each battle, consumed in recordBattleResult
let _chronBossKills  = [];    // [{boss, killerName, killerId}]
let _chronBreached   = false; // did any enemy reach the hoard this battle?
let _chronLastStand  = null;  // {defenderName, defenderId, survived, ramparts} or null
let _showChronicle   = false; // overlay showing full chronicle log
let _chronicleScrollY = 0;    // scroll offset in chronicle overlay (px)

// Defender Legacy System state
let _firstChampionTooltipTimer = 0;  // frames remaining for one-time CHAMPION retire tooltip
let _promotionQueue      = [];   // [{defenderName, rankLabel, text, type}] — cleared on next battle
let _promoBannerTimer    = 0;   // auto-dismiss countdown (600 frames = 10s at 60fps)
let _retirementCeremony  = null; // defender obj whose retirement ceremony is showing
let _retireCeremonyFade  = 0;   // fade-in counter (30 → 0)
let _chronicleDefFilter  = null; // null=all, defenderId=filter chronicle to one defender
let _showDefenderBio     = null; // { defenderId, bioText } or null; bioText cached on first draw
let _chronicleBtns       = [];   // hit regions in the chronicle overlay (filter chips)
let _chronicleChipCache  = null; // { battleCount, chips: [{id, w}] } — cached chip widths
let _chronicleProseCache = new Map(); // battleNumber → wrapped prose lines
let _chronicleOC        = null;   // offscreen HTMLCanvasElement for scrollable content
let _chronicleOCCtx     = null;
let _chronicleOCKey     = '';     // invalidation key: battles+filter+halls
let _chronicleOCH       = 0;     // rendered content height
let _hintSeen            = {};         // one-time hint flags: { firstPlacement, runeForge, retirement, goldPools }
let _leftDockTab         = 'warband';  // 'warband' | 'structures'
let _leftDockTabBtns     = [];
let _structureScrollY    = 0;
let _rightNavTabBtns     = [];
let _rosterHighlightTimer = 0;       // frames — pulse left warband dock when nav WAR BAND clicked
let _dossierSlideT       = 0;        // 0–1 slide-in for defender dossier
let _equipFlash          = null;     // { defenderId, timer, color } equip ceremony in betweenBattles
let _btParticles         = null;     // ambient snow/ember pool (betweenBattles)
let _starDeployFanfare   = new Set(); // star-gated types that already played unlock fanfare
let _waveDoneRingFx      = null;       // { x, y, r, alpha } — expanding ring on last-kill
let _finalKillRings      = [];         // white expanding rings at last-enemy kill coords
let _uiToast             = null;       // { text, timer, color } — placement / cap feedback
let _mapUnlockFx         = null;       // { name, timer } — region unlock celebration
let _regionClearFx       = null;       // { timer } — map fully secured fanfare
let _commandMapHintTimer = 0;          // first command-map onboarding
let _onboardingStep      = ONBOARDING.NONE;
let _mapAutoStartEnabled = false;      // skirmish mapSelect 10s auto-start only
let _eventOutcomeToast   = null;      // { text, timer, color }
let _chronicleBattleFilter = null;    // null | 'victory' | 'defeat' | 'boss'
let _goldPoolsHintTimer  = 0;
let _warCampWelcomeTimer = 0;
let _skirmishDiscoveryTimer = 0;
let _warCampTabPulse       = null;   // 'recruit' | 'fortress' — pulse tab on first visits
let _structuresTabPulse    = 0;      // frames — pulse STRUCTURES tab during deploy onboarding
let _pendingAssaultNode    = null;   // assault node queued from command map / war camp
let _placingDefenderId     = null;   // roster bench hero being dragged to field (legacy skirmish)
let _fieldPrepBtns         = [];     // hit areas on fortress-prep right panel
let _postAssignments       = {};     // defensive post → defender / structure
let _postPickerPostId      = null;   // post awaiting roster pick
let _postPrepBtns          = [];     // hit areas on post list (left panel)
let _prepShell             = null;   // Fortress Commander prep UI
let _prepFieldMeta         = null;   // wood, gate scar (First Saga)
let _lastPrepFrameTime     = 0;
let _hornLaunchPending     = false;
let _equipSparkles         = [];     // { x, y, vx, vy, life, color }
let _autoMoveHintFrames  = 0;
let _synergySeenThisTick = new Set();  // tower IDs that formed a new synergy this tick (cleared each tick)
let _prevSynergyMap      = new Map();  // tower ID → previous _synergy key (for change detection)
let _panelDirty          = true;       // redraw right panel flag
let _frostTrailCells     = new Map();  // `${col}_${row}` → expiry tick — FROST MARCH event trail

// Map selection
let gamePhase        = 'slotSelect';  // slotSelect | campaignSelect | nodeMap | mapSelect | playing | debrief | betweenBattles
let _activeSlotIndex = null;
let _slotsMeta       = null;
let _slotSelectBtns  = [];
let _slotConfirmBtns = [];
let _slotDeleteConfirm = null;
let _metaBarBtns       = [];
let _campaignMapIndex     = 0;
let _campaignRegionActive = false;
let _campaignNodeIndex  = 0;
let _campaignNodeMode   = false;
let _nodeWavePlan       = null;
let _nodeWaveMax        = 0;
let _nodeCasualties     = new Set();
let _campaignMapPage    = 0;
let _campaignSelectBtns = [];
let _nodeMapBtns        = [];
let _commandMapView     = 'overview';  // 'overview' | 'front'
let _selectedFrontId    = null;
let _debriefBtns        = [];
let _lastClearedFrontId = null;
let _assaultDeploySnapshot = null;
let _pendingNextAssaultNode = null;
let _lastAssaultCasualtyCount = 0;
let _tutorialBannerTimer = 0;
let _marchSuppliesShown  = 0;
let _nodeWaveIndex      = 0;
let _fortressGateBreached = false;
let _gateBreachBannerTimer = 0;
let _returnToNodeMapAfterDebrief = false;
let _pendingSettlementCeremony = false;
let _settlementCeremonyStep = 0;
let _settlementCeremonyBtns = [];
let _settlementStoneFlash = 0;
let _settlementRecruitType = null;
let _settlementNameDraft = '';
let _heroNamingDraft = '';
let _heroNamingDefenderId = null;
let _heroNamingBtns = [];
/** @type {{ action: string, nodeIndex?: number } | null} */
let _heroNamingPending = null;
const CAMPAIGN_MAPS_PER_PAGE = 10;
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
  hydda:    'HEAL',
  isjatten: 'NOVA',
  drakship: 'VOLLEY',
  gate:     'PORT',
  mine:      'TRAP',
  watchtower:'SCOUT',
  ballista:  'PIERCE',
  runeshrine:'BUFF',
  barracks:  'DISCOUNT',
};

const DEFENDER_SPRITE_KEYS = {
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

const PRESET_MAPS = [
  { name: 'MIDGARD',       desc: 'Fortress at center',  spawn: {col:0, row:11}, goal: {col:24, row:11}, multiPortal: true },
  { name: 'BIFROST PASS',  desc: 'Off-center lanes',    spawn: {col:0, row:5},  goal: {col:47, row:16} },
  { name: "NIDHOGG'S RUN", desc: 'Corner crossing',     spawn: {col:0, row:1},  goal: {col:47, row:20} },
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
  38: { id: 'cursedShields',   label: '🛡 CURSED SHIELDS',   desc: 'Each enemy absorbs its first hit', special: 'cursedShields' },
  39: { id: 'shieldRest',      label: '♥ SHIELD REST',       desc: '+1 life (up to max)',             special: 'life' },
  40: { id: 'ironHide',        label: '⚔ IRON HIDE',        desc: '+30% HP, −15% speed',            hpMult: 1.30, speedMult: 0.85 },
  47: { id: 'frostMarch',      label: '❄ FROST MARCH',       desc: 'Enemies leave frost trails',      special: 'frostMarch' },
  48: { id: 'wraithHunt',      label: '👁 WRAITH HUNT',      desc: 'Extra Myling pack +8',           bonus: { type: 'myling', count: 8 } },
  33: { id: 'howlingGale',    label: '💨 HOWLING GALE',     desc: '+20% speed, −10% HP',            hpMult: 0.90, speedMult: 1.20 },
  42: { id: 'ghostTide',      label: '👻 GHOST TIDE',       desc: '+10 Myling, enemies +10% speed', bonus: { type: 'myling', count: 10 }, speedMult: 1.10 },
  44: { id: 'stoneskin',       label: '⚔ STONE SKIN',       desc: '+15% HP, −10% speed',           hpMult: 1.15, speedMult: 0.90 },
  45: { id: 'ghostWalk',      label: '👻 GHOST WALK',       desc: '+6 Myling, +15% speed',          bonus: { type: 'myling', count: 6 }, speedMult: 1.15 },
  56: { id: 'frostWall',      label: '❄ FROST WALL',       desc: 'All enemies 20% slower',         speedMult: 0.80 },
  50: { id: 'boneTide',       label: '☠ BONE TIDE',         desc: '+20 Draugr to wave',             bonus: { type: 'draugr', count: 20 } },
  52: { id: 'northernRelief2',label: '♥ SHIELD MENDING',    desc: '+1 life (up to max)',             special: 'life' },
  54: { id: 'mistThickens',   label: '🌫 MIST THICKENS',    desc: 'Towers −10% range this wave',    rangeMult: 0.90 },
  55: { id: 'shieldwall',     label: '⚔ SHIELD WALL',       desc: '+4 Einherjar to wave',           bonus: { type: 'einherjar', count: 4 } },
  58: { id: 'bloodMoon',      label: '🌑 BLOOD MOON',        desc: '+25% HP, +15% speed',            hpMult: 1.25, speedMult: 1.15 },
  60: { id: 'frostStorm',     label: '❄ FROST STORM',       desc: '+30% HP, 20% slower',            hpMult: 1.30, speedMult: 0.80 },
  63: { id: 'jotunnRaid',     label: '⚔ JÖTUNN RAID',       desc: '+6 Jötunn to wave',              bonus: { type: 'jotunn', count: 6 } },
  65: { id: 'blitz',          label: '⚡ BLITZ',              desc: '+40% speed',                     speedMult: 1.40 },
  68: { id: 'wargHunt',       label: '🐺 WARG HUNT',         desc: '+12 Warg, +10% speed',           bonus: { type: 'warg', count: 12 }, speedMult: 1.10 },
  70: { id: 'ancientCurse',   label: '☠ ANCIENT CURSE',     desc: '+35% HP, −20% speed',            hpMult: 1.35, speedMult: 0.80 },
  72: { id: 'ragnarokEcho',   label: '⚔ RAGNAROK ECHO',     desc: '+20% HP, +20% speed',            hpMult: 1.20, speedMult: 1.20 },
  75: { id: 'shieldRest2',    label: '♥ LAST RESERVES',     desc: '+1 life (up to max)',             special: 'life' },
  77: { id: 'einherjarsWrath',label: '⚔ EINHERJAR\'S WRATH',desc: '+6 Einherjar to wave',           bonus: { type: 'einherjar', count: 6 } },
  80: { id: 'darkHarvest',    label: '☠ DARK HARVEST',      desc: '+40% HP, +4 Jötunn',             hpMult: 1.40, bonus: { type: 'jotunn', count: 4 } },
  84: { id: 'twilightBreach', label: '🌑 TWILIGHT BREACH',   desc: '+30% HP, +30% speed',            hpMult: 1.30, speedMult: 1.30 },
  86: { id: 'ashenMarch',     label: '🔥 ASHEN MARCH',      desc: '+25% HP, +4 Warg',               hpMult: 1.25, bonus: { type: 'warg', count: 4 } },
  87: { id: 'lastSwarm',      label: '☠ LAST SWARM',        desc: '+15 Myling, +20% HP',            bonus: { type: 'myling', count: 15 }, hpMult: 1.20 },
  88: { id: 'einherjarCall',  label: '⚔ EINHERJAR CALL',    desc: '+5 Einherjar, +15% HP',          bonus: { type: 'einherjar', count: 5 }, hpMult: 1.15 },
  90: { id: 'ragnarok',       label: '⚔ THE PRELUDE',        desc: '+50% HP, +40% speed',            hpMult: 1.50, speedMult: 1.40 },
  98: { id: 'finalStorm',     label: '⛈ FINAL STORM',       desc: '+45% HP, +25% speed',            hpMult: 1.45, speedMult: 1.25 },
  95: { id: 'valhallaCalling',label: '⭐ VALHALLA CALLS',    desc: '+60% HP, +20% speed, +8 Jötunn', hpMult: 1.60, speedMult: 1.20, bonus: { type: 'jotunn', count: 8 } },
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
  // Return any equipped runes (tower + item slot) to inventory before clearing tower array
  for (const t of towers) {
    if (t.rune)     runeInventory[t.rune]     = (runeInventory[t.rune]     ?? 0) + 1;
    if (t.itemRune) runeInventory[t.itemRune] = (runeInventory[t.itemRune] ?? 0) + 1;
  }
  _roster.releaseAll();

  grid.cells = Array.from({ length: ROWS }, () => new Array(COLS).fill(CELL.EMPTY));
  grid.setCell(SPAWN.col, SPAWN.row, CELL.SPAWN);
  grid.setCell(GOAL.col,  GOAL.row,  CELL.GOAL);

  // Campaign / multi-portal maps: reserve extra spawn cells
  _extraSpawns = [];
  const _portalCount = _currentBattlePreset?.campaignPortalCount
    ?? (_currentBattlePreset?.multiPortal ? 4 : 1);
  if (_portalCount > 1) {
    const _candidates = [
      { col: COLS - 1,  row: GOAL.row,  activateWave: 1, dir: 'EAST',  name: 'EAST FEN'    },
      { col: GOAL.col,  row: 0,          activateWave: 2, dir: 'NORTH', name: 'NORTH ROAD'  },
      { col: GOAL.col,  row: ROWS - 1,   activateWave: 2, dir: 'SOUTH', name: 'SOUTH WATCH' },
      { col: 0,         row: 0,          activateWave: 3, dir: 'NW',    name: 'DARK GATE'   },
    ];
    for (let _pi = 0; _pi < Math.min(_portalCount - 1, _candidates.length); _pi++) {
      const _pp = _candidates[_pi];
      grid.setCell(_pp.col, _pp.row, CELL.SPAWN);
      _extraSpawns.push({
        col: _pp.col, row: _pp.row, path: null,
        active: _pp.activateWave === 1,
        activateWave: _pp.activateWave, dir: _pp.dir, name: _pp.name,
      });
    }
  } else if (_currentBattlePreset?.multiPortal) {
    const _candidates = [
      { col: COLS - 1,  row: GOAL.row,  activateWave: 11, dir: 'EAST',  name: 'EAST FEN'    },
      { col: GOAL.col,  row: 0,          activateWave: 21, dir: 'NORTH', name: 'NORTH ROAD'  },
      { col: GOAL.col,  row: ROWS - 1,   activateWave: 41, dir: 'SOUTH', name: 'SOUTH WATCH' },
      { col: 0,         row: 0,          activateWave: 71, dir: 'NW',    name: 'DARK GATE'   },
    ];
    for (const _pp of _candidates) {
      grid.setCell(_pp.col, _pp.row, CELL.SPAWN);
      _extraSpawns.push({ col: _pp.col, row: _pp.row, path: null, active: false, activateWave: _pp.activateWave, dir: _pp.dir, name: _pp.name });
    }
  }

  // Pre-place fortress ring walls around GOAL for campaign / multiPortal maps
  if (_currentBattlePreset?.pathless || _currentBattlePreset?.multiPortal) {
    const _R = FORTRESS_RING_R;
    for (let _rc = GOAL.col - _R; _rc <= GOAL.col + _R; _rc++) {
      for (let _rr = GOAL.row - _R; _rr <= GOAL.row + _R; _rr++) {
        if (_rc < 0 || _rc >= COLS || _rr < 0 || _rr >= ROWS) continue;
        if (Math.max(Math.abs(_rc - GOAL.col), Math.abs(_rr - GOAL.row)) !== _R) continue;
        // Single-cell gaps at N/S/E/W for gates
        const _isNS = (_rc === GOAL.col) && (_rr === GOAL.row - _R || _rr === GOAL.row + _R);
        const _isEW = (_rr === GOAL.row) && (_rc === GOAL.col - _R || _rc === GOAL.col + _R);
        if (_isNS || _isEW) continue;
        if (grid.getCell(_rc, _rr) !== CELL.EMPTY) continue;
        grid.setCell(_rc, _rr, CELL.WALL);
        wallData[`${_rc}_${_rr}`] = { level: 0, hp: WALL_BASE_HP, maxHp: WALL_BASE_HP };
      }
    }
    wallFrostDirty = true;
  }

  if (_currentBattlePreset?.pathless) {
    currentPath = [{ col: SPAWN.col, row: SPAWN.row }, { col: GOAL.col, row: GOAL.row }];
    for (const _es of _extraSpawns) {
      _es.path = [{ col: _es.col, row: _es.row }, { col: GOAL.col, row: GOAL.row }];
    }
  } else {
    currentPath   = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
    for (const _es of _extraSpawns) {
      _es.path = grid.findPath(_es.col, _es.row, GOAL.col, GOAL.row);
    }
  }
  enemies       = [];
  towers        = [];
  _fortressGateBreached = false;
  _gateBreachBannerTimer = 0;
  bullets       = [];
  particles     = [];
  gold          = STARTING_GOLD + (_fortressBonuses?.startingGoldBonus ?? 0);
  _displayGold  = gold;
  lives         = STARTING_LIVES;
  slain         = 0;
  bossesDefeated    = 0;
  _chronBossKills      = [];
  _chronBreached       = false;
  _chronLastStand      = null;
  _promotionQueue      = [];
  _promoBannerTimer    = 0;
  _retirementCeremony  = null;
  _showDefenderBio     = null;
  _campaignVictoryScreen = false;
  gameOver      = false;
  victory       = false;
  waveLeak      = false;
  selectedTower = null;
  screenShake   = 0;
  goldSpent     = 0;
  goldEarned    = 0;
  goldStolen    = 0;
  showTopList   = false;
  highScores    = loadHighScores();
  gameSpeed     = 1;
  _frameTick    = 0;
  goldCoins     = [];
  hoardPulse    = 0;
  _lastTreasuryStage = getHoardStage(STARTING_GOLD).level;
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
  wallData          = {};
  grid.wallData     = wallData;

  firstTowerPlaced  = false;
  firstKillDone     = false;
  mylingWarningTimer    = 0;
  maraEmpWarningTimer   = 0;
  jotunnWarningTimer    = 0;
  fossegrimWarningTimer = 0;
  dragItem           = null;
  pendingSell        = null;
  _pendingDismiss    = null;
  _rosterScrollOffset = 0;
  _renameState       = null;
  _enemyIntroBanner  = null;
  _enemyIntroQueue   = [];
  _starsEarnedThisBattle = 0;
  _defKillMilestones = new Set();
  _battleXpData      = [];
  _battleFieldStats  = [];
  _reserveContrib    = 0;
  _bossLootBanner    = null;
  _lastBossLootItemId = null;
  _waveDoneRingFx   = null;
  _finalKillRings   = [];
  _prevSynergyMap.clear();
  _frostTrailCells.clear();
  _panelDirty       = true;
  gridZoom          = 1.0;
  gridPanX          = 0;
  gridPanY          = 0;
  isPanning         = false;
  rightClickDragged = false;
  rightClickSaved   = null;
  chainKillDone     = new Set();
  chainKillDisplay  = null;
  lifeLostTimer     = 0;
  _bossPhase25Flash = 0;
  pathChevronsTimer = 300;
  pathBlockFlash    = null;
  _synergyDirty     = true;
  _buildBtnsCache   = null;
  _navActiveId      = 'battle';
  bestWave          = { wave: 0, slain: 0, gold: 0 };
  waveSlainCount    = 0;
  waveGoldStart     = goldEarned;

  flawlessCount     = 0;
  flawlessStreak    = 0;
  showRuneMenu      = false;
  showRunePicker    = false;
  _itemRunePickMode = false;
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
  _depthBannerTimer  = 0;
  _depthBannerTier   = 0;
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
  // Load tactical choke cells for this map
  const _presetKey = (preset.name ?? '').toLowerCase().replace(/\s+/g, '');
  _chokeCells = CHOKE_CELLS_BY_PRESET[_presetKey] ?? new Set();
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
  if (!_campaignState && _activeSlotIndex != null) {
    _campaignState = loadCampaign(localStorage, _activeSlotIndex);
  }
  if (!_campaignState) _campaignState = createNewCampaign();
  battlesCompleted = _campaignState.battlesCompleted ?? 0;
  stars            = _campaignState.stars ?? 0;
  goldReserve         = _campaignState.goldReserve ?? 0;
  _enemyIntroSeen.clear();
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
function recordBattleResult(result, { skipDebrief = false } = {}) {
  _battleResult = result;
  if (!_campaignState) return;
  for (const t of towers) captureBattleFieldStat(t);
  const _xpTowerPool = towers.length > 0 ? towers : getBattleHeroStats();
  battlesCompleted++;
  _campaignState.battlesCompleted = battlesCompleted;
  _campaignState.stars            = stars;
  _campaignState.runeInventory    = { ...runeInventory };
  _campaignState.achievements     = [..._earnedAch];

  const mvpTower = pickBattleMvp();

  _campaignState.battleHistory.push({
    battleNumber:  battlesCompleted,
    mapName:       _currentMapName,
    wavesCleared:  waveNumber,
    enemiesSlain:  slain,
    goldEarned,
    bossesKilled:  _chronBossKills.map(bk => bk.boss),
    mvpDefenderId: mvpTower?.defenderId ?? null,
    timestamp:     Date.now(),
  });

  // ── Chronicle — generate battle report and check for new titles ────────────
  if (!_campaignState.chronicle) _campaignState.chronicle = { battles: [], warbandName: '' };
  const _chron = _campaignState.chronicle;

  // Build trait map for trait-aware prose
  const _defTraitMap = {};
  for (const s of getBattleHeroStats()) {
    const def = _roster.find(s.defenderId);
    if (def?.trait && s.defenderId) _defTraitMap[s.defenderId] = def.trait;
  }

  const _chronicleBattleData = {
    battleNumber:    battlesCompleted,
    mapName:         _currentMapName,
    result,
    wavesCleared:    waveNumber,
    enemiesSlain:    slain,
    rampartsEnd:     lives,
    rampartsStart:   STARTING_LIVES,
    breach:          _chronBreached,
    mvpId:           mvpTower?.defenderId ?? null,
    mvpName:         mvpTower?.name ?? null,
    mvpKills:        mvpTower?.killCount ?? 0,
    bossKills:       _chronBossKills.slice(),
    lastStand:       _chronLastStand,
    defenderTraits:  _defTraitMap,
    defenders:       getBattleHeroStats().map(s => ({
      defenderId: s.defenderId ?? null,
      name:       s.name,
      kills:      s.killCount ?? 0,
    })),
    prose: '',
  };
  if (_campaignRegionActive && _campaignNodeIndex != null) {
    const _ai = getAssaultInfo(_campaignMapIndex, _campaignNodeIndex);
    if (_ai) {
      _chronicleBattleData.assaultCodename = _ai.codename;
      _chronicleBattleData.assaultTier     = _ai.tierLabel;
      _chronicleBattleData.assaultFront    = _ai.frontId;
    }
  }
  _chronicleBattleData.prose = generateBattleReport(_chronicleBattleData, _chron);
  _chron.battles.push(_chronicleBattleData);

  _reserveContrib = result === 'defeat'
    ? Math.floor(goldEarned * 0.08)
    : Math.floor(goldEarned * 0.25);
  if (result === 'defeat' && _campaignNodeMode) {
    const reservePenalty = Math.floor(goldReserve * 0.12) + Math.floor(goldStolen * 0.25);
    if (reservePenalty > 0) {
      goldReserve = Math.max(0, goldReserve - reservePenalty);
      _reserveContrib = 0;
    }
  }
  goldReserve += _reserveContrib;
  _campaignState.goldReserve       = goldReserve;
  _campaignState.equipmentInventory = _equipmentInventory.slice();

  // Capture pre-XP state including rank (for detecting rank promotions after XP)
  const _preXpState = _xpTowerPool.map(t => {
    const d = _roster.find(t.defenderId);
    return d ? { id: d.defenderId, name: d.name, xp: d.xp, level: d.careerLevel, rankId: getRank(d).id, defType: d.type } : null;
  }).filter(Boolean);

  // Update breach counter for every deployed defender before XP
  if (_chronBreached) {
    for (const t of _xpTowerPool) {
      const def = _roster.find(t.defenderId);
      if (def) def.breachesDeployed = (def.breachesDeployed ?? 0) + 1;
    }
  }

  _newBattleTalentUnlocks = _roster.grantBattleXP(_xpTowerPool, waveNumber);

  _battleXpData = _preXpState.map(prev => {
    const d = _roster.find(prev.id);
    return d ? { name: prev.name, xpGained: d.xp - prev.xp, oldLevel: prev.level, newLevel: d.careerLevel, defType: prev.defType, defenderId: prev.id } : null;
  }).filter(Boolean);

  // Check scars for all deployed defenders
  for (const t of _xpTowerPool) {
    const def = _roster.find(t.defenderId);
    if (!def) continue;
    if (!def.scars) def.scars = [];
    const newScars = checkScars(def, _chronicleBattleData, _chron.battles);
    if (newScars.length > 0) {
      def.scars.push(...newScars);
      for (const scarId of newScars) {
        _promotionQueue.push({
          defenderName: def.name,
          rankLabel: SCAR_DEFS[scarId]?.label ?? scarId,
          text: `${def.name} has earned the ${SCAR_DEFS[scarId]?.label ?? scarId}.`,
          type: 'scar',
        });
      }
    }
  }

  // Check and grant new titles to all defenders based on full chronicle
  for (const def of _roster.defenders) {
    const newTitles = checkTitles(def, _chron.battles);
    if (newTitles.length > 0) {
      if (!def.titles) def.titles = [];
      def.titles.push(...newTitles);
      for (const titleId of newTitles) {
        _promotionQueue.push({
          defenderName: def.name,
          rankLabel:    TITLE_DEFS[titleId]?.label ?? titleId,
          text:         `${def.name} has earned the title of "${TITLE_DEFS[titleId]?.label ?? titleId}."`,
          type:         'title',
        });
      }
    }
  }

  // Check for rank promotions (compare pre-XP rank to post-XP rank)
  for (const prev of _preXpState) {
    const def = _roster.find(prev.id);
    if (!def) continue;
    const newRank = getRank(def);
    if (newRank.id !== prev.rankId && newRank.id !== 'greenhorn') {
      _promotionQueue.push({
        defenderName: def.name,
        rankLabel:    newRank.label,
        text:         `${def.name} has been promoted to ${newRank.label}.`,
        type:         'rank',
      });
      // First-time CHAMPION: show one-time retire tooltip (3 s)
      if (newRank.id === 'champion' && !_campaignState.firstChampionTooltipShown) {
        _campaignState.firstChampionTooltipShown = true;
        _firstChampionTooltipTimer = 180;
      }
    }
  }

  // Approaching rank milestone banners (fires at 5 or 1 battle from next rank's battles threshold)
  for (const t of towers) {
    const _mDef = _roster.find(t.defenderId);
    if (!_mDef || _mDef.battlesPlayed === 0) continue;
    const _mRankIdx = VETERAN_RANKS.findIndex(r => r.id === getRank(_mDef).id);
    if (_mRankIdx <= 0) continue; // already legend
    const _mNextRank = VETERAN_RANKS[_mRankIdx - 1];
    const _mBGap = _mNextRank.minBattles - _mDef.battlesPlayed;
    if (_mBGap === 5 || _mBGap === 1) {
      _promotionQueue.push({
        defenderName: _mDef.name,
        rankLabel:    _mBGap === 1 ? 'ONE BATTLE' : '5 BATTLES',
        text:         `${_mDef.name} — ${_mBGap === 1 ? 'one battle' : '5 battles'} from ${_mNextRank.label}`,
        type:         'milestone',
      });
    }
  }

  // Co-deployment tracking and bond formation
  const _deployedIds = towers.map(t => t.defenderId).filter(Boolean);
  if (!_campaignState.coDeployments) _campaignState.coDeployments = {};
  if (!_campaignState.bonds) _campaignState.bonds = [];
  for (let _ci = 0; _ci < _deployedIds.length; _ci++) {
    for (let _cj = _ci + 1; _cj < _deployedIds.length; _cj++) {
      const _bondKey = [_deployedIds[_ci], _deployedIds[_cj]].sort().join(':');
      _campaignState.coDeployments[_bondKey] = (_campaignState.coDeployments[_bondKey] ?? 0) + 1;
      const _count = _campaignState.coDeployments[_bondKey];
      const _alreadyBonded = _campaignState.bonds.some(b =>
        b.defenderIds.includes(_deployedIds[_ci]) && b.defenderIds.includes(_deployedIds[_cj])
      );
      if (!_alreadyBonded && _count >= 5) {
        const _defA = _roster.find(_deployedIds[_ci]);
        const _defB = _roster.find(_deployedIds[_cj]);
        if (_defA && _defB) {
          const _bondName = generateBondName(_defA, _defB);
          _campaignState.bonds.push({
            defenderIds: [_deployedIds[_ci], _deployedIds[_cj]].sort(),
            name:        _bondName,
            battleCount: _count,
            formed:      battlesCompleted,
          });
          _promotionQueue.push({
            defenderName: `${_defA.name} & ${_defB.name}`,
            rankLabel:    'BOND FORMED',
            text:         `${_bondName} — ${_defA.name} & ${_defB.name}  (${_count} battles together)`,
            type:         'bond',
          });
          sfxBond();
        }
      }
    }
  }

  // Cap promotion queue at 6 items — group overflow into a summary entry
  if (_promotionQueue.length > 6) {
    const _overflow = _promotionQueue.splice(6);
    _promotionQueue.push({
      defenderName: 'Warband',
      rankLabel:    `+${_overflow.length} MORE`,
      text:         `${_overflow.length} more event${_overflow.length !== 1 ? 's' : ''} recorded in the Chronicle.`,
      type:         'milestone',
    });
  }

  _rosterScrollOffset = 0;

  _roster.releaseAll();
  _campaignState.defenders = _roster.toJSON();

  _pendingCampaignEvent    = getAvailableEvent(_campaignState);
  _eventCardAnim           = 0;
  _lastResolvedEventTitle  = null;

  _recruitType = null;

  try { persistCampaign(); } catch {}
  if (_newBattleTalentUnlocks.length > 0) sfxTalentUnlock();
  if (result === 'victory' && waveNumber >= MAX_WAVES) _campaignVictoryScreen = true;
  if (!skipDebrief) {
    _debriefTimer = 0;
    gamePhase = 'debrief';
  }
}

// Start game with chosen preset map (called from map select screen).
function initGame(preset) {
  _campaignNodeMode = false;
  _campaignRegionActive = false;
  initCampaign(preset);
}

function isPathlessMode() {
  return !!_currentBattlePreset?.pathless;
}

/** Campaign node combat (pathless maps) — not 100-wave skirmish. */
function isCampaignCombat() {
  return isPathlessMode();
}

/** Campaign assault battle screen — no docks, HUD-only right panel. */
function isCampaignAssaultBattle() {
  return _campaignNodeMode && gamePhase === 'playing';
}

function useCampaignCombatLayout() {
  return isCampaignAssaultBattle();
}

/** Pathless assault — hide cell grid lines during active waves; show during deploy prep. */
function hideAssaultBattleGrid() {
  if (isFortressPrepPhase()) return true;
  if (isCampaignAssaultBattle()) return true;
  return isPathlessMode() && gamePhase === 'playing' && waveState === 'active';
}

function commanderPrepLayout() {
  return isFortressPrepPhase();
}

/** Assault/skirmish active wave — full-width playfield, glass side panels. */
function assaultPlayfieldWide() {
  return gamePhase === 'playing' && (useAssaultFieldDock() || useCampaignCombatLayout());
}

function combatRightPanelW() {
  return assaultPlayfieldWide() ? ASSAULT_RIGHT_PANEL_W : RIGHT_PANEL_W;
}

function combatRightPanelX() {
  return assaultPlayfieldWide()
    ? BASE_W - FRAME_PAD - combatRightPanelW()
    : GRID_LEFT + COLS * CELL_SIZE + 4;
}

function playfieldLeft() {
  if (assaultPlayfieldWide() || commanderPrepLayout()) return FRAME_THICK;
  return GRID_LEFT;
}

function combatPanelFullH() {
  return BASE_H - GRID_TOP - FRAME_PAD;
}

function playfieldWidth() {
  if (assaultPlayfieldWide()) {
    return BASE_W - FRAME_THICK - FRAME_PAD;
  }
  if (commanderPrepLayout()) {
    return BASE_W - FRAME_THICK - FRAME_PAD - combatRightPanelW();
  }
  return COLS * CELL_SIZE;
}

function playfieldHeight() {
  return assaultPlayfieldWide() ? combatPanelFullH() : ROWS * CELL_SIZE;
}

/** Scale grid to cover full assault playfield (extends under transparent side panels). */
function playfieldScale() {
  if (!assaultPlayfieldWide()) return 1;
  const scaleX = playfieldWidth() / (COLS * CELL_SIZE);
  const scaleY = playfieldHeight() / (ROWS * CELL_SIZE);
  return Math.max(scaleX, scaleY);
}

function effectiveGridZoom() {
  return gridZoom * playfieldScale();
}

function playfieldShiftX() {
  if (!assaultPlayfieldWide()) return 0;
  const s = effectiveGridZoom();
  const goalLX = GOAL.col * CELL_SIZE + CELL_SIZE / 2;
  const cx = COLS * CELL_SIZE * 0.5;
  const goalX = playfieldLeft() + cx + (goalLX - cx) * s;
  return playfieldLeft() + playfieldWidth() / 2 - goalX;
}

function playfieldShiftY() {
  if (!assaultPlayfieldWide()) return 0;
  const s = effectiveGridZoom();
  const goalLY = GOAL.row * CELL_SIZE + CELL_SIZE / 2;
  const cy = ROWS * CELL_SIZE * 0.5;
  const goalY = GRID_TOP + cy + (goalLY - cy) * s;
  return GRID_TOP + playfieldHeight() / 2 - goalY;
}

function gridScreenX(localX) {
  const s = effectiveGridZoom();
  const cx = COLS * CELL_SIZE * 0.5;
  return playfieldLeft() + gridPanX + playfieldShiftX() + cx + (localX - cx) * s;
}

function gridScreenY(localY) {
  const s = effectiveGridZoom();
  const cy = ROWS * CELL_SIZE * 0.5;
  return GRID_TOP + gridPanY + playfieldShiftY() + cy + (localY - cy) * s;
}

function gridScreenCell(cells) {
  return cells * effectiveGridZoom();
}

function gridScreenOriginX() {
  return gridScreenX(0);
}

function hoardScreenX() {
  return gridScreenX(GOAL.col * CELL_SIZE + CELL_SIZE / 2);
}

function hoardScreenY() {
  return gridScreenY(GOAL.row * CELL_SIZE + CELL_SIZE / 2);
}

function assaultUiGlass() {
  return assaultPlayfieldWide() ? 0.62 : 1;
}

// ── Save slots (10 campaigns) ─────────────────────────────────────────────────

function loadRosterFromCampaignState() {
  if (!_roster) _roster = new Roster();
  _roster.load(_campaignState?.defenders ?? []);
  for (const d of _roster.defenders) {
    if (!d.fortressRole) d.fortressRole = getDefaultFortressRole(d.type);
  }
}

function serializeGameSession() {
  const session = {
    version: 1,
    gamePhase,
    campaignMapIndex: _campaignMapIndex,
    campaignNodeIndex: _campaignNodeIndex,
    campaignRegionActive: _campaignRegionActive,
    campaignMapPage: _campaignMapPage,
    selectedMapIdx,
    returnToNodeMapAfterDebrief: _returnToNodeMapAfterDebrief,
  };
  if (gamePhase === 'fortressPrep' && _campaignMapIndex != null) {
    session.fortressPrep = {
      pendingAssaultNode: _pendingAssaultNode,
      postAssignments: { ..._postAssignments },
      shellHotspot: _prepShell?.selectedHotspot ?? null,
    };
  } else if (gamePhase === 'settlementCeremony') {
    session.settlementCeremony = {
      step: _settlementCeremonyStep,
      recruitType: _settlementRecruitType,
      nameDraft: _settlementNameDraft,
    };
  } else if (gamePhase === 'heroNamingCeremony') {
    session.heroNamingCeremony = {
      nameDraft: _heroNamingDraft,
      defenderId: _heroNamingDefenderId,
      pending: _heroNamingPending,
    };
  } else if (gamePhase === 'playing' && _campaignNodeMode) {
    session.combat = {
      mapIndex: _campaignMapIndex,
      nodeIndex: _campaignNodeIndex,
      waveNumber,
      waveState: waveState === 'active' ? 'break' : waveState,
      nodeWaveIndex: _nodeWaveIndex,
      lives,
      gold,
      field: serializeFieldState(towers, wallData, gold),
      casualties: [..._nodeCasualties],
    };
  } else if (gamePhase === 'playing' && !_campaignNodeMode) {
    session.combat = {
      skirmishPresetIndex: selectedMapIdx,
      waveNumber,
      waveState: waveState === 'active' ? 'break' : waveState,
      lives,
      gold,
    };
  }
  return session;
}

function resumeCampaignBattle(combat) {
  startCampaignNodeBattle(combat.mapIndex, combat.nodeIndex, {
    skipFieldPrep: true,
    fieldOverride: combat.field,
    initialCasualties: combat.casualties,
  });
  waveNumber = combat.waveNumber ?? 0;
  _nodeWaveIndex = combat.nodeWaveIndex ?? 0;
  waveState = combat.waveState ?? 'break';
  lives = combat.lives ?? STARTING_LIVES;
  gold = combat.gold ?? gold;
  _displayGold = gold;
  gamePhase = 'playing';
  gameOver = false;
  victory = false;
}

function restoreGameSession(session) {
  if (!session) {
    gamePhase = 'campaignSelect';
    return;
  }
  _campaignMapIndex = session.campaignMapIndex ?? 0;
  _campaignNodeIndex = session.campaignNodeIndex ?? 0;
  _campaignRegionActive = !!session.campaignRegionActive;
  _campaignMapPage = session.campaignMapPage ?? 0;
  selectedMapIdx = session.selectedMapIdx ?? 0;
  _returnToNodeMapAfterDebrief = !!session.returnToNodeMapAfterDebrief;

  switch (session.gamePhase) {
    case 'playing':
      if (session.combat?.mapIndex != null) {
        resumeCampaignBattle(session.combat);
      } else if (session.combat?.skirmishPresetIndex != null) {
        initGame(PRESET_MAPS[session.combat.skirmishPresetIndex]);
        waveNumber = session.combat.waveNumber ?? 0;
        waveState = session.combat.waveState ?? 'countdown';
        lives = session.combat.lives ?? STARTING_LIVES;
        gold = session.combat.gold ?? gold;
        _displayGold = gold;
      } else {
        gamePhase = 'campaignSelect';
      }
      break;
    case 'fortressPrep': {
      const mapIdx = session.campaignMapIndex ?? 0;
      const nodeIdx = session.fortressPrep?.pendingAssaultNode
        ?? session.campaignNodeIndex
        ?? 0;
      enterFieldPrep(mapIdx, nodeIdx);
      if (session.fortressPrep?.postAssignments) {
        _postAssignments = { ...session.fortressPrep.postAssignments };
      }
      if (session.fortressPrep?.shellHotspot && _prepShell) {
        _prepShell.selectedHotspot = session.fortressPrep.shellHotspot;
      }
      persistCampaignFieldLayout();
      break;
    }
    case 'betweenBattles':
      enterCampaignWarCamp();
      break;
    case 'nodeMap':
      gamePhase = 'nodeMap';
      gameOver = false;
      victory = false;
      break;
    case 'debrief':
      gamePhase = 'debrief';
      _debriefTimer = 60;
      gameOver = false;
      break;
    case 'settlementCeremony':
      _settlementCeremonyStep = session.settlementCeremony?.step ?? 0;
      _settlementRecruitType = session.settlementCeremony?.recruitType ?? null;
      _settlementNameDraft = session.settlementCeremony?.nameDraft ?? '';
      gamePhase = 'settlementCeremony';
      gameOver = false;
      victory = false;
      break;
    case 'heroNamingCeremony':
      _heroNamingDraft = session.heroNamingCeremony?.nameDraft ?? '';
      _heroNamingDefenderId = session.heroNamingCeremony?.defenderId ?? null;
      _heroNamingPending = session.heroNamingCeremony?.pending ?? { action: 'warCamp' };
      _heroNamingBtns = [];
      gamePhase = 'heroNamingCeremony';
      gameOver = false;
      victory = false;
      break;
    case 'mapSelect':
      gamePhase = 'mapSelect';
      _mapAutoStartEnabled = false;
      break;
    default:
      gamePhase = session.gamePhase;
  }
}

function persistCampaign() {
  if (!_campaignState || _activeSlotIndex == null) return;
  _campaignState.uiHints = { ...(_campaignState.uiHints ?? {}), ..._hintSeen };
  saveCampaign(_campaignState, localStorage, _activeSlotIndex);
  const session = serializeGameSession();
  saveSession(session, _activeSlotIndex);
  _slotsMeta = touchSlotMeta(_activeSlotIndex, _campaignState, session);
}

function activateSlot(slotIndex) {
  _activeSlotIndex = slotIndex;
  _slotDeleteConfirm = null;

  if (!slotHasSave(slotIndex)) {
    const { campaign } = createCampaignInSlot(slotIndex);
    _campaignState = campaign;
    if (_campaignState.uiHints) Object.assign(_hintSeen, _campaignState.uiHints);
    ensureCampaignProgress();
    loadRosterFromCampaignState();
    // First Saga — one unnamed Berserker (naming after A0 survival)
    const id = _generateId();
    const def = new Defender({ defenderId: id, name: '', type: 'berserk' });
    def.trait = getRandomTrait('berserk');
    def.fortressRole = getDefaultFortressRole('berserk');
    _roster.defenders.push(def);
    ensureFirstSagaState(_campaignState);
    _campaignState.defenders = _roster.toJSON();
    gamePhase = 'campaignSelect';
    if (!_hintSeen.skirmishDiscovery) _skirmishDiscoveryTimer = 420;
    persistCampaign();
    return;
  }

  _campaignState = loadCampaign(localStorage, slotIndex) ?? createNewCampaign();
  if (_campaignState.uiHints) Object.assign(_hintSeen, _campaignState.uiHints);
  _chronicleDefFilter = _campaignState.uiHints?.chronicleDefFilter ?? null;
  _chronicleBattleFilter = _campaignState.uiHints?.chronicleBattleFilter ?? null;
  if (_campaignState.uiHints?.skirmishDiscovery) _hintSeen.skirmishDiscovery = true;
  if (_campaignState.uiHints?.recruitTab) _hintSeen.recruitTab = true;
  if (_campaignState.uiHints?.fortressTab) _hintSeen.fortressTab = true;
  ensureCampaignProgress();
  loadRosterFromCampaignState();
  battlesCompleted = _campaignState.battlesCompleted ?? 0;
  stars = _campaignState.stars ?? 0;
  goldReserve = _campaignState.goldReserve ?? 0;
  _equipmentInventory = (_campaignState.equipmentInventory ?? []).slice();
  runeInventory = Object.assign(
    { ironEdge: 0, swiftStrike: 0, frostRune: 0, battleHymn: 0, valhalla: 0 },
    _campaignState.runeInventory ?? {}
  );
  restoreGameSession(loadSession(slotIndex));
  if (!_hintSeen.skirmishDiscovery && battlesCompleted === 0) {
    _skirmishDiscoveryTimer = 420;
  }
  persistCampaign();
}

function returnToSlotSelect() {
  persistCampaign();
  _activeSlotIndex = null;
  _slotDeleteConfirm = null;
  _slotsMeta = loadSlotsMeta();
  gamePhase = 'slotSelect';
  gameOver = false;
  victory = false;
}

function getCampaignBattlePreset(mapIndex) {
  const midgard = PRESET_MAPS[0];
  const useMidgardLayout = mapIndex === 0;
  return {
    name:                getMapDisplayName(mapIndex),
    desc:                'Campaign region',
    spawn:               useMidgardLayout ? { ...midgard.spawn } : { col: 0, row: Math.floor(ROWS / 2) },
    goal:                useMidgardLayout ? { ...midgard.goal } : { col: Math.floor(COLS / 2), row: Math.floor(ROWS / 2) },
    pathless:            true,
    campaignPortalCount: getPortalCountForMap(mapIndex),
  };
}

function ensureCampaignProgress() {
  if (!_campaignState) {
    _campaignState = _activeSlotIndex != null
      ? (loadCampaign(localStorage, _activeSlotIndex) ?? createNewCampaign())
      : createNewCampaign();
  }
  if (!_campaignState.campaignProgress) {
    _campaignState.campaignProgress = createEmptyCampaignProgress();
  }
  const p = _campaignState.campaignProgress;
  if (!Number.isFinite(p.mapsUnlocked) || p.mapsUnlocked < 1) p.mapsUnlocked = 1;
  if (!Array.isArray(p.clearedMaps)) p.clearedMaps = [];
  if (!p.mapRuns || typeof p.mapRuns !== 'object') p.mapRuns = {};
  return p;
}

function getHeroCombatHp(tower) {
  const def = _roster?.find(tower.defenderId);
  const lvl = def?.careerLevel ?? tower.level ?? 1;
  let hp = 80 + lvl * 25;
  if (_campaignNodeMode) hp += 20;
  if (def) {
    const ctx = buildHeroModifierCtx(tower);
    hp = Math.round(hp * getTraitModifiers(def, ctx).combatHpMult);
  }
  return hp;
}

function buildHeroModifierCtx(tower, targetIsBoss = false) {
  const portalCells = getPortalCells(SPAWN, _extraSpawns);
  const col = tower.col, row = tower.row;
  return {
    col, row,
    inGateZone:  isInGateZone(col, row, portalCells),
    inWallZone:  isInWallZone(col, row, wallData, GOAL),
    inCoreZone:  isInCoreZone(col, row, GOAL),
    portalCells, wallData, goal: GOAL, towers,
    waveInNode:  _nodeWavePlan?.waves?.[_nodeWaveIndex]?.waveInNode ?? waveNumber,
    livesFull:   lives >= STARTING_LIVES,
    rampartsLostThisBattle: Math.max(0, STARTING_LIVES - lives),
    targetIsBoss,
    vengeanceActive: false,
  };
}

function getWarChestCost(elite = false) {
  const base = elite ? WAR_CHEST_ELITE_COST : WAR_CHEST_COST;
  const disc = _fortressBonuses?.warChestDiscount ?? 0;
  return Math.max(15, base - disc);
}

function drawFortressGateHpBars() {
  if (!isPathlessMode() || gamePhase !== 'playing') return;
  for (const [key, w] of Object.entries(wallData)) {
    if (!w.isGate || (w.hp ?? 1) <= 0) continue;
    const [c, r] = key.split('_').map(Number);
    const pos = grid.cellCenter(c, r);
    const max = w.maxHp ?? GATE_HP;
    const frac = Math.max(0, Math.min(1, (w.hp ?? max) / max));
    const barW = CELL_SIZE * 0.85;
    const barH = 3;
    const bx = pos.x - barW / 2;
    const by = pos.y + CELL_SIZE * 0.32;
    const accent = frac > 0.5 ? UI_COLORS.gold : frac > 0.25 ? '#c89040' : UI_COLORS.threat;
    ctx.save();
    if (w.damageFlash > 0) {
      const hf = w.damageFlash / 16;
      ctx.fillStyle = `rgba(255,80,50,${0.18 + hf * 0.35})`;
      ctx.fillRect(pos.x - CELL_SIZE / 2, pos.y - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
    }
    drawPanelHpBar(ctx, bx, by, barW, barH, frac, accent);
    ctx.restore();
  }
}

function showAssaultDamageFloater(x, y, dmg, kind) {
  const styles = {
    hero:      { color: '#ff5858', suffix: '' },
    gate:      { color: '#ff8040', suffix: ' GATE' },
    wall:      { color: '#d07040', suffix: '' },
    structure: { color: '#c89850', suffix: '' },
  };
  const s = styles[kind] ?? styles.wall;
  dmgFloaters.push({
    x, y: y - 10,
    val: `-${dmg}`,
    life: 72, maxLife: 72,
    color: s.color,
    large: kind === 'hero' || kind === 'gate',
    suffix: s.suffix,
    vy: -0.4,
    raw: true,
  });
}

function refreshSagaHeroesBetweenWaves() {
  if (!_campaignNodeMode || !isFirstSagaMap(_campaignMapIndex)) return;
  const frac = getFirstSagaBetweenWaveHealFraction(_campaignNodeIndex);
  if (frac <= 0) return;
  for (const t of towers) {
    if (!isHeroTowerType(t.type)) continue;
    if (t.combatHp == null) initHeroCombatHp(t);
    const missing = t.combatMaxHp - t.combatHp;
    if (missing <= 0) continue;
    const heal = Math.max(1, Math.round(t.combatMaxHp * frac));
    const applied = Math.min(missing, heal);
    t.combatHp += applied;
    dmgFloaters.push({
      x: t.x, y: t.y - 18,
      val: `+${applied}`, life: 90, maxLife: 90,
      color: '#70e8a8', large: false, suffix: ' HP', vy: -0.3, raw: true,
    });
  }
  try { sfxHeal(); } catch {}
}

function tickAssaultDamageFlashes() {
  if (gamePhase !== 'playing') return;
  for (const t of towers) {
    if ((t.combatHitFlash ?? 0) > 0) t.combatHitFlash--;
  }
  for (const w of Object.values(wallData)) {
    if ((w.damageFlash ?? 0) > 0) w.damageFlash--;
  }
}

function drawAssaultEnemyTelegraph() {
  if (!shouldPrioritizeFortressGates(isPathlessMode(), _fortressGateBreached, wallData)) return;
  if (gamePhase !== 'playing' || waveState !== 'active') return;
  const pulse = 0.5 + Math.sin(performance.now() * 0.012) * 0.5;
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.reached || enemy.isBoss) continue;
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(200,160,80,${0.55 + pulse * 0.45})`;
    ctx.fillText('▣', enemy.x, enemy.y - enemy.radius - 8);
    ctx.font = '5px monospace';
    ctx.fillStyle = `rgba(232,215,181,${0.35 + pulse * 0.35})`;
    ctx.fillText('PORT', enemy.x, enemy.y - enemy.radius - 1);
  }
}

function drawGateBreachBanner() {
  if (_gateBreachBannerTimer <= 0) return;
  _gateBreachBannerTimer--;
  const alpha = Math.min(1, _gateBreachBannerTimer / 30) * (_gateBreachBannerTimer < 40 ? _gateBreachBannerTimer / 40 : 1);
  const cx = playfieldLeft() + playfieldWidth() / 2;
  const cy = GRID_TOP + 54;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#e8a050';
  ctx.shadowColor = 'rgba(220,140,40,0.8)';
  ctx.shadowBlur = 8;
  ctx.fillText('PORT BREACHED — raiders rush the hoard', cx, cy);
  ctx.shadowBlur = 0;
  ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(232,215,181,0.75)';
  ctx.fillText('Remaining ports ignored · defend warband & treasury', cx, cy + 12);
  ctx.restore();
}

function drawHeroCombatHpBar(tower) {
  if (!isHeroTowerType(tower.type)) return;
  if (tower.combatHp == null || tower.combatMaxHp == null) return;
  if (!isPathlessMode()) return;
  const frac = Math.max(0, Math.min(1, tower.combatHp / tower.combatMaxHp));
  const barW = CELL_SIZE * 0.9;
  const barH = frac < 0.25 ? 4 : 3;
  const bx = tower.x - barW / 2;
  const by = tower.y + CELL_SIZE * 0.36;
  const accent = frac > 0.5 ? UI_COLORS.fortress : frac > 0.25 ? UI_COLORS.gold : UI_COLORS.threat;
  ctx.save();
  if ((tower.combatHitFlash ?? 0) > 0) {
    const hf = tower.combatHitFlash / 12;
    ctx.strokeStyle = `rgba(255,90,70,${0.35 + hf * 0.55})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, CELL_SIZE * 0.42, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawPanelHpBar(ctx, bx, by, barW, barH, frac, accent);
  if (frac < 0.25 && frac > 0) {
    const pulse = 0.5 + Math.sin(performance.now() * 0.012) * 0.5;
    ctx.strokeStyle = `rgba(169,50,38,${0.35 + pulse * 0.45})`;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(bx - 1, by - 1, barW + 2, barH + 2);
  }
  ctx.restore();
}

function initHeroCombatHp(tower) {
  tower.combatHp    = getHeroCombatHp(tower);
  tower.combatMaxHp = tower.combatHp;
}

function resetAssaultFieldVitality(towerList, walls) {
  for (const t of towerList) {
    if (isHeroTowerType(t.type)) {
      initHeroCombatHp(t);
    } else {
      t.structureHp    = getStructureCombatHp(t.type, t.level ?? 1);
      t.structureMaxHp = t.structureHp;
    }
  }
  for (const w of Object.values(walls)) {
    const maxHp = w.maxHp ?? w.hp ?? WALL_BASE_HP;
    w.hp = maxHp;
    w.maxHp = maxHp;
  }
}

function isFortressPrepPhase() {
  return gamePhase === 'fortressPrep';
}

function restoreCampaignField(state, options = {}) {
  const { skipTowers = false } = options;
  if (!state) return;
  gold = state.gold ?? gold;
  _displayGold = gold;
  if (!skipTowers) {
  for (const wt of state.towers ?? []) {
    if (isNodeCasualty(_nodeCasualties, wt.defenderId)) continue;
    const fp = TOWER_DEFS[wt.type]?.footprint ?? { w: 1, h: 1 };
    let blocked = false;
    for (let dc = 0; dc < fp.w && !blocked; dc++) {
      for (let dr = 0; dr < fp.h; dr++) {
        const c = wt.col + dc, r = wt.row + dr;
        const fc = grid.getCell(c, r);
        if (fc === null || fc === CELL.SPAWN || fc === CELL.GOAL || fc !== CELL.EMPTY) blocked = true;
      }
    }
    if (blocked) continue;
    for (let dc = 0; dc < fp.w; dc++) {
      for (let dr = 0; dr < fp.h; dr++) {
        grid.setCell(wt.col + dc, wt.row + dr, CELL.TOWER);
      }
    }
    const cx = (wt.col + fp.w / 2) * CELL_SIZE;
    const cy = (wt.row + fp.h / 2) * CELL_SIZE;
    const t = new Tower(cx, cy, wt.col, wt.row, wt.type);
    t.level = wt.level ?? 1;
    if (wt.defenderId) {
      const def = _roster.find(wt.defenderId);
      if (def) {
        t.defenderId = def.defenderId;
        t.name = wt.name ?? def.name;
        def.deployed = true;
        const rawEq = getItemBonuses(def.equipment);
        const eqBonuses = rawEq;
        const talentBonuses = getTalentBonuses(def.talents);
        t.applyCareerData(def.defenderId, t.name, def.careerLevel, eqBonuses, talentBonuses, def.legacyBonus ?? null);
      }
    }
    if (wt.rune) t.rune = wt.rune;
    if (wt.itemRune) t.itemRune = wt.itemRune;
    if (!isHeroTowerType(t.type)) t._applyLevel();
    if (isHeroTowerType(t.type)) initHeroCombatHp(t);
    towers.push(t);
  }
  }
  for (const [key, w] of Object.entries(state.walls ?? {})) {
    const [c, r] = key.split('_').map(Number);
    if (grid.getCell(c, r) !== CELL.EMPTY) continue;
    grid.setCell(c, r, w.isGate ? CELL.GATE : CELL.WALL);
    wallData[key] = { ...w };
  }
  wallFrostDirty = true;
  _synergyDirty  = true;
}

function startCampaignNodeBattle(mapIndex, nodeIndex, options = {}) {
  const { skipFieldPrep = false, fieldOverride = null, initialCasualties = null, autoStartCombat = false } = options;
  ensureCampaignProgress();
  _campaignRegionActive = true;
  _campaignMapIndex  = mapIndex;
  _campaignNodeIndex = nodeIndex;
  _campaignNodeMode  = true;
  _navActiveId       = 'battle';
  showRuneMenu       = false;
  _nodeWavePlan      = buildNodeWavePlan(mapIndex, nodeIndex);
  _nodeWaveIndex     = 0;
  clearNodeCasualties(_nodeCasualties);
  if (initialCasualties?.length) {
    for (const id of initialCasualties) _nodeCasualties.add(id);
  }

  if (!_campaignState) {
    _campaignState = _activeSlotIndex != null
      ? (loadCampaign(localStorage, _activeSlotIndex) ?? createNewCampaign())
      : createNewCampaign();
  }
  battlesCompleted = _campaignState.battlesCompleted ?? 0;
  stars            = _campaignState.stars ?? 0;
  goldReserve      = _campaignState.goldReserve ?? 0;
  _equipmentInventory = (_campaignState.equipmentInventory ?? []).slice();
  runeInventory    = Object.assign(
    { ironEdge: 0, swiftStrike: 0, frostRune: 0, battleHymn: 0, valhalla: 0 },
    _campaignState.runeInventory ?? {}
  );
  if (!_roster) _roster = new Roster();
  _roster.load(_campaignState.defenders ?? []);
  for (const d of _roster.defenders) {
    if (!d.fortressRole) d.fortressRole = getDefaultFortressRole(d.type);
  }

  const preset = getCampaignBattlePreset(mapIndex);
  if (isFirstSagaMap(mapIndex) && isFirstSagaAssaultNode(nodeIndex)) {
    STARTING_LIVES = getFirstSagaStartingLives(nodeIndex);
  } else {
    STARTING_LIVES = 8;
  }
  initBattle(preset);
  lives = STARTING_LIVES;
  let field = fieldOverride ?? getMapRun(_campaignState.campaignProgress, mapIndex).fieldState;
  if (!skipFieldPrep && !fieldOverride) {
    field = prepareFieldForNewAssault(field);
  }
  const _fieldEmpty = !field?.towers?.length && !Object.keys(field?.walls ?? {}).length;
  restoreCampaignField(field);
  if (!skipFieldPrep) {
    resetAssaultFieldVitality(towers, wallData);
  }
  _assaultDeploySnapshot = serializeFieldState(towers, wallData, gold);
  if (_fieldEmpty && nodeIndex === 0) {
    const bonus = getMarchSuppliesGold(mapIndex, goldReserve) + (_fortressBonuses?.marchSuppliesBonus ?? 0);
    if (bonus > 0) {
      gold += bonus;
      _displayGold = gold;
      _marchSuppliesShown = bonus;
    }
  }
  if (isTutorialNode(mapIndex, nodeIndex)) _tutorialBannerTimer = 360;
  if (_onboardingStep === ONBOARDING.DEPLOY && !assaultFieldHasGate()) {
    _structuresTabPulse = 120;
  }
  waveNumber = 0;
  endlessMode = false;
  if (autoStartCombat && towers.some(t => isHeroTowerType(t.type))) {
    startNextWave();
  }
}

function finishCampaignNodeVictory() {
  const progress = ensureCampaignProgress();
  let field = serializeFieldState(towers, wallData, gold);
  if (_assaultDeploySnapshot) {
    field = mergeFallenHeroesIntoFieldState(field, _assaultDeploySnapshot);
    field = attachDeploySnapshot(field, _assaultDeploySnapshot);
  }
  field = applyFirstSagaAssaultRewards(field, _campaignNodeIndex);
  const _completeMeta = completeNode(progress, _campaignMapIndex, _campaignNodeIndex, field);
  const updatedProgress = _completeMeta.progress;
  if (isFirstSagaMap(_campaignMapIndex) && !isFirstSagaSettlementComplete(_campaignState)) {
    updatedProgress.mapsUnlocked = 1;
    _completeMeta.newRegionUnlocked = null;
    _completeMeta.mapCompleted = false;
  }
  if (shouldOfferSettlementCeremony(_campaignState, _campaignMapIndex, _campaignNodeIndex)) {
    _pendingSettlementCeremony = true;
  }
  if (_completeMeta.newRegionUnlocked != null) {
    const _unlockMeta = getCampaignMapMeta(_completeMeta.newRegionUnlocked);
    _mapUnlockFx = {
      name: _unlockMeta?.name ?? `Region ${_completeMeta.newRegionUnlocked + 1}`,
      timer: 300,
    };
  }
  if (_completeMeta.mapCompleted) {
    _regionClearFx = { name: getCampaignMapMeta(_campaignMapIndex)?.name ?? 'REGION', timer: 360 };
  }
  _campaignState.campaignProgress = updatedProgress;
  _campaignState.stars = stars;
  _campaignState.runeInventory = { ...runeInventory };
  _lastAssaultCasualtyCount = _nodeCasualties.size;
  clearNodeCasualties(_nodeCasualties);
  _assaultDeploySnapshot = null;
  try { persistCampaign(); } catch {}
  const _assault = getAssaultInfo(_campaignMapIndex, _campaignNodeIndex);
  _lastClearedFrontId = _assault?.frontId ?? null;
  _pendingNextAssaultNode = getNextAvailableAssault(updatedProgress, _campaignMapIndex, _lastClearedFrontId)?.nodeIndex ?? null;
  recordBattleResult('victory', { skipDebrief: true });
  _campaignNodeMode = false;
  _returnToNodeMapAfterDebrief = true;
  victory = true;
  _battleResult = 'victory';
  _debriefTimer = 0;
  gamePhase = 'debrief';
}

function enterCampaignWarCamp() {
  _campaignRegionActive = true;
  _returnToNodeMapAfterDebrief = false;
  gameOver = false;
  victory = false;
  _warCampTab = 'warband';
  _betweenSubtab = 'recruit';
  _betweenFadeIn = 30;
  if (!_hintSeen.warCamp && battlesCompleted <= 2) {
    _warCampWelcomeTimer = 280;
    _hintSeen.warCamp = true;
    if (_campaignState) {
      _campaignState.uiHints = { ...(_campaignState.uiHints ?? {}), warCamp: true };
      try { persistCampaign(); } catch {}
    }
  }
  if (battlesCompleted === 1 && !_hintSeen.recruitTab && isFirstSagaRecruitUnlocked(_campaignState)) {
    _warCampTabPulse = 'recruit';
  } else if (battlesCompleted >= 3 && !_hintSeen.fortressTab && _warCampTab !== 'fortress') {
    _warCampTabPulse = 'fortress';
  }
  gridZoom = 1.0;
  gridPanX = 0;
  gridPanY = 0;
  gamePhase = 'betweenBattles';
}

function isCampaignWarCamp() {
  return _campaignRegionActive && _campaignMapIndex != null;
}

function beginSettlementCeremony() {
  ensureFirstSagaState(_campaignState);
  _settlementCeremonyStep = 0;
  _settlementRecruitType = null;
  _settlementNameDraft = '';
  _settlementCeremonyBtns = [];
  _settlementStoneFlash = 0;
  _pendingSettlementCeremony = false;
  gamePhase = 'settlementCeremony';
  sfxChapterBanner();
}

function beginHeroNamingCeremony(pendingBtn) {
  const unnamed = getUnnamedSagaHero(_roster);
  if (!unnamed) return false;
  _heroNamingDefenderId = unnamed.defenderId;
  _heroNamingDraft = '';
  _heroNamingBtns = [];
  _heroNamingPending = pendingBtn
    ? { action: pendingBtn.action, nodeIndex: pendingBtn.nodeIndex }
    : { action: 'warCamp' };
  gamePhase = 'heroNamingCeremony';
  sfxChapterBanner();
  return true;
}

function routeAfterHeroNaming() {
  const pending = _heroNamingPending ?? { action: 'warCamp' };
  _heroNamingPending = null;
  _heroNamingDefenderId = null;
  _heroNamingDraft = '';
  _returnToNodeMapAfterDebrief = false;
  gameOver = false;
  victory = false;
  if (pending.action === 'nextAssault' && pending.nodeIndex != null) {
    enterFieldPrep(_campaignMapIndex, pending.nodeIndex);
  } else if (pending.action === 'retryAssault') {
    enterFieldPrep(_campaignMapIndex, _campaignNodeIndex);
  } else if (pending.action === 'commandMap') {
    _commandMapView = _lastClearedFrontId ? 'front' : 'overview';
    _selectedFrontId = _lastClearedFrontId;
    gamePhase = 'nodeMap';
  } else {
    enterCampaignWarCamp();
  }
}

function completeHeroNamingCeremony() {
  if (!applyHeroNaming(_campaignState, _roster, _heroNamingDefenderId, _heroNamingDraft)) return false;
  try { persistCampaign(); } catch {}
  routeAfterHeroNaming();
  return true;
}

function routeAfterCampaignDebrief(btn) {
  if (shouldOfferHeroNaming(_campaignState, _roster, _campaignMapIndex)) {
    beginHeroNamingCeremony(btn);
    return;
  }
  if (btn.action === 'nextAssault') {
    enterFieldPrep(_campaignMapIndex, btn.nodeIndex);
  } else if (btn.action === 'warCamp') {
    enterCampaignWarCamp();
  } else if (btn.action === 'retryAssault') {
    enterFieldPrep(_campaignMapIndex, _campaignNodeIndex);
  } else if (btn.action === 'commandMap') {
    _commandMapView = _lastClearedFrontId ? 'front' : 'overview';
    _selectedFrontId = _lastClearedFrontId;
    gamePhase = 'nodeMap';
  }
}

function advanceSettlementCeremonyStep() {
  if (_settlementCeremonyStep === 3 && !_settlementRecruitType) return false;
  if (_settlementCeremonyStep === 4) {
    if (!validateSettlementName(_settlementNameDraft)) return false;
    _settlementCeremonyStep = 5;
    return true;
  }
  if (_settlementCeremonyStep >= SETTLEMENT_STAGE_COUNT - 1) {
    completeSettlementCeremony();
    return true;
  }
  _settlementCeremonyStep++;
  if (_settlementCeremonyStep === 1) {
    _settlementStoneFlash = 520;
    screenShake = Math.max(screenShake, 8);
    sfxChapterBanner();
  }
  return true;
}

function completeSettlementCeremony() {
  if (!_campaignState || !_settlementRecruitType || !validateSettlementName(_settlementNameDraft)) return;
  const name = _settlementNameDraft.trim();
  applySettlementComplete(_campaignState, { recruitType: _settlementRecruitType, recruitName: name });
  const id = `def_${Date.now()}`;
  const def = new Defender({ defenderId: id, name, type: _settlementRecruitType });
  def.trait = getRandomTrait(_settlementRecruitType);
  def.fortressRole = getDefaultFortressRole(_settlementRecruitType);
  if (!_roster) _roster = new Roster();
  _roster.defenders.push(def);
  _campaignState.defenders = _roster.toJSON();
  const progress = ensureCampaignProgress();
  const mapIdx = _campaignMapIndex ?? 0;
  const run = getMapRun(progress, mapIdx);
  if (run.fieldState) {
    run.fieldState.stoneWestFace = true;
  }
  if (!progress.clearedMaps.includes(mapIdx)) {
    progress.clearedMaps.push(mapIdx);
    progress.clearedMaps.sort((a, b) => a - b);
  }
  progress.mapsUnlocked = 1;
  _campaignState.campaignProgress = progress;
  _regionClearFx = { name: 'SAGA I — THE SETTLEMENT', timer: 420 };
  try { persistCampaign(); } catch {}
  gamePhase = 'nodeMap';
  _commandMapView = 'overview';
  _selectedFrontId = null;
}

function canRecruitInCampaignWarCamp() {
  if (!isCampaignWarCamp() || !isFirstSagaMap(_campaignMapIndex)) return { ok: true };
  if (!isFirstSagaRecruitUnlocked(_campaignState)) {
    return { ok: false, reason: 'Recruitment opens after the Settlement Oath.' };
  }
  if ((_roster?.defenders?.length ?? 0) >= 2) {
    return { ok: false, reason: 'The saga warband is full for this chapter.' };
  }
  return { ok: true };
}

function canModifyWarbandDeployment() {
  return !isFortressPrepPhase() && isAssaultDeployPhase(_campaignNodeMode, waveNumber, waveState);
}

function canLayoutCampaignField() {
  if (isFortressPrepPhase()) return true;
  if (_campaignNodeMode) return false;
  return canModifyWarbandDeployment();
}

function persistCampaignFieldLayout() {
  if (_campaignMapIndex == null || !_campaignState) return;
  const progress = ensureCampaignProgress();
  const run = getMapRun(progress, _campaignMapIndex);
  if (!run) return;
  if (!run.fieldState) run.fieldState = { gold: 0, towers: [], walls: {} };
  if (isFortressPrepPhase()) {
    const assault = _pendingAssaultNode != null
      ? getAssaultInfo(_campaignMapIndex, _pendingAssaultNode) : null;
    const towersPlain = buildTowerPlacements(_postAssignments, _roster, GOAL, {
      frontId: assault?.frontId ?? 'west',
    });
    run.fieldState = mergePrepFieldMeta(
      serializeFieldState(towersPlain, wallData, gold, _postAssignments),
      _prepFieldMeta ?? loadPrepFieldMeta(null),
    );
  } else {
    run.fieldState = serializeFieldState(towers, wallData, gold, _postAssignments);
  }
  _campaignState.campaignProgress = progress;
  try { persistCampaign(); } catch {}
}

function enterFieldPrep(mapIndex, nodeIndex = null) {
  _pendingAssaultNode = nodeIndex;
  _campaignRegionActive = true;
  _campaignMapIndex = mapIndex;
  if (nodeIndex != null) _campaignNodeIndex = nodeIndex;
  _returnToNodeMapAfterDebrief = false;
  gameOver = false;
  victory = false;
  _postPickerPostId = null;

  if (!_campaignState) {
    _campaignState = _activeSlotIndex != null
      ? (loadCampaign(localStorage, _activeSlotIndex) ?? createNewCampaign())
      : createNewCampaign();
  }
  battlesCompleted = _campaignState.battlesCompleted ?? 0;
  stars            = _campaignState.stars ?? 0;
  goldReserve      = _campaignState.goldReserve ?? 0;
  _equipmentInventory = (_campaignState.equipmentInventory ?? []).slice();
  runeInventory    = Object.assign(
    { ironEdge: 0, swiftStrike: 0, frostRune: 0, battleHymn: 0, valhalla: 0 },
    _campaignState.runeInventory ?? {}
  );
  if (!_roster) _roster = new Roster();
  _roster.load(_campaignState.defenders ?? []);
  for (const d of _roster.defenders) {
    if (!d.fortressRole) d.fortressRole = getDefaultFortressRole(d.type);
  }
  _roster.releaseAll();

  if (isFirstSagaMap(mapIndex) && shouldOfferHeroNaming(_campaignState, _roster, mapIndex)) {
    beginHeroNamingCeremony({ action: 'nextAssault', nodeIndex: nodeIndex ?? _pendingAssaultNode });
    return;
  }

  const preset = getCampaignBattlePreset(mapIndex);
  initBattle(preset);
  _campaignNodeMode = true;

  const progress = ensureCampaignProgress();
  const run = getMapRun(progress, mapIndex);
  const field = run?.fieldState ?? { gold: 0, towers: [], walls: {} };
  restoreCampaignField(field, { skipTowers: true });
  _postAssignments = { ...ensurePostAssignments(field, GOAL, FORTRESS_RING_R) };
  _prepShell = createPrepShellState();
  _prepFieldMeta = loadPrepFieldMeta(field);
  _prepFieldMeta = syncPrepMetaForAssault(_prepFieldMeta, nodeIndex, battlesCompleted);
  _lastPrepFrameTime = performance.now();
  _hornLaunchPending = false;
  gamePhase = 'fortressPrep';

  waveNumber = 0;
  waveState  = 'countdown';
  _leftDockTab = 'warband';
  _buildBtnsCache = null;
  _structureScrollY = 0;
  selectedTower = null;
  buildMode = null;
  dragItem = null;
  _placingDefenderId = null;
  if (!assaultFieldHasGate()) _structuresTabPulse = 120;
  if (
    isFirstSagaMap(mapIndex)
    && nodeIndex === FIRST_SAGA_A3_NODE
    && _prepFieldMeta.westGateScarred
    && !_prepFieldMeta.westGateRepaired
  ) {
    _prepShell.selectedHotspot = 'wall_scar';
  }
  _onboardingStep = advanceOnboarding(_onboardingStep, 'startAssault');
}

function launchFieldPrepAssault() {
  if (_hornLaunchPending) return;
  if (_pendingAssaultNode == null) {
    _uiToast = { text: 'Pick an assault on the command map first', timer: 120, color: UI_COLORS.gold };
    return;
  }
  const assault = getAssaultInfo(_campaignMapIndex, _pendingAssaultNode);
  const validation = validateAssignments(_postAssignments, { minHeroes: 1 });
  if (!validation.ok) {
    _uiToast = { text: validation.errors[0] ?? 'Assign heroes to posts', timer: 120, color: UI_COLORS.warband };
    return;
  }
  const placementTowers = buildTowerPlacements(_postAssignments, _roster, GOAL, {
    frontId: assault?.frontId ?? 'west',
  });
  persistCampaignFieldLayout();
  const mapIndex = _campaignMapIndex;
  const nodeIndex = _pendingAssaultNode;
  _onboardingStep = advanceOnboarding(_onboardingStep, 'placedHero');
  startCampaignNodeBattle(mapIndex, nodeIndex, {
    skipFieldPrep: true,
    fieldOverride: mergePrepFieldMeta(
      serializeFieldState(placementTowers, wallData, gold, _postAssignments),
      _prepFieldMeta ?? loadPrepFieldMeta(null),
    ),
    autoStartCombat: true,
  });
}

function getCommanderPlayfield() {
  return {
    x: playfieldLeft(),
    y: GRID_TOP,
    w: playfieldWidth(),
    h: playfieldHeight(),
  };
}

function getPrepShellPanelCtx() {
  const assault = _pendingAssaultNode != null
    ? getAssaultInfo(_campaignMapIndex, _pendingAssaultNode) : null;
  const nodesCleared = _campaignState?.campaignProgress?.mapRuns?.[_campaignMapIndex]?.nodesCleared ?? [];
  return {
    pendingAssaultNode: _pendingAssaultNode,
    postAssignments: _postAssignments,
    prepMeta: _prepFieldMeta ?? loadPrepFieldMeta(null),
    assaultNodeIndex: _pendingAssaultNode,
    assault,
    roster: _roster,
    goldReserve,
    nodeCasualties: _nodeCasualties,
    treasuryUnlocked: battlesCompleted > 0 || nodesCleared.includes(0),
  };
}

function requestHornLaunch() {
  if (!_prepShell || _prepShell.hornAnim > 0 || _hornLaunchPending) return;
  const block = getHornBlockReason(getPrepShellPanelCtx());
  if (block) {
    _uiToast = { text: block, timer: 120, color: UI_COLORS.gold };
    return;
  }
  startHornAnimation(_prepShell);
  _hornLaunchPending = true;
  sfxAssaultHorn();
  try { persistCampaignFieldLayout(); } catch {}
}

function processPrepShellClick(action) {
  if (!action) return;
  if (action.type === 'horn') {
    requestHornLaunch();
    return;
  }
  if (action.action === 'warCamp') {
    persistCampaignFieldLayout();
    enterCampaignWarCamp();
    return;
  }
  if (action.action === 'commandMap') {
    persistCampaignFieldLayout();
    _commandMapView = _lastClearedFrontId ? 'front' : 'overview';
    _selectedFrontId = _lastClearedFrontId;
    gamePhase = 'nodeMap';
    return;
  }
  if (action.id === 'assign_gate' || action.id === 'assign_tower') {
    _postAssignments = assignDefender(_postAssignments, action.postId, action.defenderId);
    persistCampaignFieldLayout();
    return;
  }
  if (action.id === 'clear_gate' || action.id === 'clear_tower') {
    _postAssignments = clearPost(_postAssignments, action.postId);
    persistCampaignFieldLayout();
    return;
  }
  if (action.id === 'repair_gate') {
    const result = applyPanelAction(action, _prepFieldMeta);
    _prepFieldMeta = result.meta;
    if (result.repairAnim && _prepShell) _prepShell.repairAnim = result.repairAnim;
    sfxPlace('wall');
    persistCampaignFieldLayout();
  }
}

function tickFortressCommanderPrep() {
  if (!isFortressPrepPhase() || !_prepShell) return;
  const now = performance.now();
  const dt = Math.min(50, now - (_lastPrepFrameTime || now));
  _lastPrepFrameTime = now;
  const prevHorn = _prepShell.hornAnim;
  updatePrepCamera(_prepShell, dt);
  if (_hornLaunchPending && prevHorn > 0 && _prepShell.hornAnim <= 0) {
    _hornLaunchPending = false;
    launchFieldPrepAssault();
  }
}

function drawFortressCommanderPrepScreen() {
  if (!_prepShell) _prepShell = createPrepShellState();
  tickFortressCommanderPrep();
  const pf = getCommanderPlayfield();
  const panelCtx = getPrepShellPanelCtx();
  if (!_prepShell.selectedHotspot && _pendingAssaultNode != null) {
    _prepShell.selectedHotspot = 'west_gate';
  }
  drawFortressSchematic(ctx, pf, _prepShell, panelCtx);
}

function canUpgradeHeroNow() {
  if (_campaignNodeMode) {
    return canUpgradeHeroLevelBetweenAssaults(gamePhase, isCampaignWarCamp());
  }
  return true;
}

function getCampaignFieldHeroTower(defenderId) {
  if (_campaignMapIndex == null) return null;
  const progress = ensureCampaignProgress();
  const field = getMapRun(progress, _campaignMapIndex).fieldState;
  return field?.towers?.find(
    t => t.defenderId === defenderId && isHeroTowerType(t.type),
  ) ?? null;
}

function upgradeFieldTowerAtWarCamp(ref) {
  if (!canUpgradeHeroNow()) return;
  const progress = ensureCampaignProgress();
  const run = getMapRun(progress, _campaignMapIndex);
  if (!run.fieldState) run.fieldState = { gold: 0, towers: [], walls: {} };
  const wt = ref.defenderId
    ? run.fieldState.towers?.find(t => t.defenderId === ref.defenderId)
    : run.fieldState.towers?.find(t => t.col === ref.col && t.row === ref.row);
  if (!wt) return;
  const lvl = wt.level ?? 1;
  if (lvl >= getMaxLevelForTowerType(wt.type)) return;
  const base = TOWER_DEFS[wt.type]?.cost ?? 20;
  const cost = isHeroTowerType(wt.type)
    ? getHeroUpgradeCost(base, lvl)
    : getStructureUpgradeCost(base, lvl);
  if (goldReserve < cost) return;
  goldReserve -= cost;
  wt.level = lvl + 1;
  _campaignState.goldReserve = goldReserve;
  _campaignState.campaignProgress = progress;
  try { persistCampaign(); } catch {}
  sfxUpgrade(wt.type);
}

function upgradeFieldHeroAtWarCamp(defenderId) {
  upgradeFieldTowerAtWarCamp({ defenderId });
}

function captureBattleFieldStat(tower) {
  if (!tower) return;
  const entry = {
    defenderId:   tower.defenderId ?? null,
    type:         tower.type,
    name:         tower.name ?? TOWER_DEFS[tower.type]?.label ?? tower.type,
    killCount:    tower.killCount ?? 0,
    damageDealt:  tower.damageDealt ?? 0,
    _careerLevel: tower._careerLevel ?? 0,
    _rankIndex:   tower._rankIndex ?? null,
    col:          tower.col,
    row:          tower.row,
  };
  const idx = entry.defenderId
    ? _battleFieldStats.findIndex(s => s.defenderId === entry.defenderId)
    : _battleFieldStats.findIndex(s => s.type === entry.type && s.col === entry.col && s.row === entry.row);
  if (idx >= 0) _battleFieldStats[idx] = entry;
  else _battleFieldStats.push(entry);
}

function battleMvpScore(entry) {
  return (entry.damageDealt || 0) + (entry.killCount || 0) * 32;
}

function getBattleFieldStatsPool() {
  if (_battleFieldStats.length > 0) return _battleFieldStats;
  return towers.map(t => ({
    defenderId:   t.defenderId ?? null,
    type:         t.type,
    name:         t.name ?? TOWER_DEFS[t.type]?.label ?? t.type,
    killCount:    t.killCount ?? 0,
    damageDealt:  t.damageDealt ?? 0,
    _careerLevel: t._careerLevel ?? 0,
    _rankIndex:   t._rankIndex ?? null,
  }));
}

function getBattleHeroStats() {
  return getBattleFieldStatsPool().filter(s => isHeroTowerType(s.type));
}

function pickBattleMvp() {
  const pool = getBattleFieldStatsPool();
  if (!pool.length) return null;
  return pool.reduce((best, e) => battleMvpScore(e) > battleMvpScore(best) ? e : best, pool[0]);
}

function killHeroInCombat(tower) {
  captureBattleFieldStat(tower);
  markNodeCasualty(_nodeCasualties, tower.defenderId);
  dmgFloaters.push({
    x: tower.x, y: tower.y - 14,
    val: tower.name ? `${tower.name} FALLEN` : 'FALLEN',
    life: 120, maxLife: 120, color: '#ff4040', large: true, suffix: '', raw: true,
  });
  screenShake = Math.max(screenShake, 4);
  spawnParticles(tower.x, tower.y, '#ff3030', 14);
  const def = _roster?.find(tower.defenderId);
  if (def) def.deployed = false;
  const fp = tower.footprint;
  for (let dc = 0; dc < fp.w; dc++) {
    for (let dr = 0; dr < fp.h; dr++) {
      grid.setCell(tower.col + dc, tower.row + dr, CELL.EMPTY);
    }
  }
  towers = towers.filter(t => t !== tower);
  if (selectedTower === tower) selectedTower = null;
  _synergyDirty = true;
  checkAssaultEndConditions();
}

function hasLivingWarbandOnField() {
  return towers.some(t => isHeroTowerType(t.type));
}

function hasLivingStructuresOnField() {
  return towers.some(t => !isHeroTowerType(t.type));
}

function isAssaultFieldWiped() {
  return _campaignNodeMode && isPathlessMode()
    && !hasLivingWarbandOnField() && !hasLivingStructuresOnField();
}

function plunderGoldAtFortress(amount, label = 'PLUNDERED') {
  if (amount <= 0 || gold <= 0) return 0;
  const stolen = Math.min(gold, amount);
  gold -= stolen;
  goldStolen += stolen;
  hoardPulse = Math.max(hoardPulse, 40);
  const gx = GOAL.col * CELL_SIZE + CELL_SIZE / 2;
  const gy = GOAL.row * CELL_SIZE + 8;
  dmgFloaters.push({
    x: gx, y: gy, val: `-${stolen}g ${label}`, life: 90, maxLife: 90,
    color: '#ff9040', large: false, suffix: '', vy: 0.5, raw: true,
  });
  spawnParticles(gx, gy, '#ff9040', 10);
  return stolen;
}

function finishCampaignNodeDefeat(reason = 'ramparts') {
  if (!_campaignNodeMode) return;

  const aliveRaiders = enemies.filter(e => e.alive && !e.reached);
  const raid = computeAssaultDefeatGoldRaid(gold, aliveRaiders);
  if (raid > 0) plunderGoldAtFortress(raid, 'SACKED');

  const progress = ensureCampaignProgress();
  let field = serializeFieldState(towers, wallData, gold);
  if (_assaultDeploySnapshot) {
    field = mergeFallenHeroesIntoFieldState(field, _assaultDeploySnapshot);
    field = attachDeploySnapshot(field, _assaultDeploySnapshot);
  }
  const run = getMapRun(progress, _campaignMapIndex);
  if (run) run.fieldState = field;
  _campaignState.campaignProgress = progress;

  _lastAssaultCasualtyCount = _nodeCasualties.size;
  clearNodeCasualties(_nodeCasualties);
  _assaultDeploySnapshot = null;
  _pendingNextAssaultNode = null;
  try { persistCampaign(); } catch {}

  recordBattleResult('defeat', { skipDebrief: true });
  _campaignNodeMode = false;
  _returnToNodeMapAfterDebrief = true;
  _battleResult = 'defeat';
  _lastDefeatReason = reason;
  _debriefTimer = 0;
  gameOver = true;
  gamePhase = 'debrief';
  sfxGameOver();
}

function checkAssaultEndConditions() {
  if (!_campaignNodeMode || gamePhase !== 'playing' || gameOver) return;
  if (!isPathlessMode() || waveState !== 'active') return;
  if (!isAssaultFieldWiped()) return;

  const aliveEnemies = enemies.filter(e => e.alive && !e.reached);
  if (aliveEnemies.length === 0) return;

  finishCampaignNodeDefeat('field_wiped');
}

function getAssaultTargetPriority(enemy) {
  return buildAssaultTargetPriority(getEnemyTargetPriority(enemy), {
    pathless: isPathlessMode(),
    gateBreached: _fortressGateBreached,
    wallData,
  });
}

function pickTargetForPriority(kind, enemy, goalPos) {
  let best = null, bestD = Infinity;

  if (kind === 'goal') return goalPos;

  if (kind === 'gates') {
    for (const [key, w] of Object.entries(wallData)) {
      if (!isGateWallTarget(w, _fortressGateBreached)) continue;
      const [c, r] = key.split('_').map(Number);
      const pos = grid.cellCenter(c, r);
      const d = (pos.x - enemy.x) ** 2 + (pos.y - enemy.y) ** 2;
      if (d < bestD) { bestD = d; best = pos; }
    }
    return best;
  }

  if (kind === 'warband') {
    for (const t of towers) {
      if (!isHeroTowerType(t.type)) continue;
      if (isNodeCasualty(_nodeCasualties, t.defenderId)) continue;
      if ((t.combatHp ?? 1) <= 0) continue;
      const d = (t.x - enemy.x) ** 2 + (t.y - enemy.y) ** 2;
      if (d < bestD) { bestD = d; best = { x: t.x, y: t.y }; }
    }
    return best;
  }

  if (kind === 'structures') {
    for (const t of towers) {
      if (isHeroTowerType(t.type)) continue;
      const d = (t.x - enemy.x) ** 2 + (t.y - enemy.y) ** 2;
      if (d < bestD) { bestD = d; best = { x: t.x, y: t.y }; }
    }
    if (best) return best;
    for (const [key, w] of Object.entries(wallData)) {
      if (!isStructureWallTarget(w)) continue;
      const [c, r] = key.split('_').map(Number);
      const pos = grid.cellCenter(c, r);
      const d = (pos.x - enemy.x) ** 2 + (pos.y - enemy.y) ** 2;
      if (d < bestD) { bestD = d; best = pos; }
    }
    return best;
  }

  return null;
}

function pickEnemyTarget(enemy) {
  const goalPos = grid.cellCenter(GOAL.col, GOAL.row);
  for (const kind of getAssaultTargetPriority(enemy)) {
    const t = pickTargetForPriority(kind, enemy, goalPos);
    if (t) return t;
  }
  return goalPos;
}

function findEnemyMeleeTarget(enemy) {
  const range = enemy.radius + 14;
  const rangeSq = range * range;

  for (const kind of getAssaultTargetPriority(enemy)) {
    if (kind === 'gates') {
      let best = null, bestD = rangeSq;
      for (const [key, w] of Object.entries(wallData)) {
        if (!isGateWallTarget(w, _fortressGateBreached)) continue;
        const [c, r] = key.split('_').map(Number);
        const pos = grid.cellCenter(c, r);
        const d = (pos.x - enemy.x) ** 2 + (pos.y - enemy.y) ** 2;
        if (d <= bestD) {
          bestD = d;
          best = { key, c, r, w };
        }
      }
      if (best) return { kind: 'wall', wall: best };
    }
    if (kind === 'warband') {
      let best = null, bestD = rangeSq;
      for (const t of towers) {
        if (!isHeroTowerType(t.type)) continue;
        if (isNodeCasualty(_nodeCasualties, t.defenderId)) continue;
        if ((t.combatHp ?? 1) <= 0) continue;
        const d = (t.x - enemy.x) ** 2 + (t.y - enemy.y) ** 2;
        if (d <= bestD) { bestD = d; best = t; }
      }
      if (best) return { kind: 'warband', tower: best };
    }
    if (kind === 'structures') {
      let best = null, bestD = rangeSq;
      for (const t of towers) {
        if (isHeroTowerType(t.type)) continue;
        const d = (t.x - enemy.x) ** 2 + (t.y - enemy.y) ** 2;
        if (d <= bestD) { bestD = d; best = t; }
      }
      if (best) return { kind: 'structure', tower: best };
      for (const [key, w] of Object.entries(wallData)) {
        if (!isStructureWallTarget(w)) continue;
        const [c, r] = key.split('_').map(Number);
        const pos = grid.cellCenter(c, r);
        const d = (pos.x - enemy.x) ** 2 + (pos.y - enemy.y) ** 2;
        if (d <= bestD) {
          bestD = d;
          best = { key, c, r, w };
        }
      }
      if (best) return { kind: 'wall', wall: best };
    }
  }
  return null;
}

function updateWarbandMovement() {
  if (gameOver || waveState !== 'active') return;
  const fieldW = COLS * CELL_SIZE;
  const fieldH = ROWS * CELL_SIZE;
  for (const t of towers) {
    if (!isHeroTowerType(t.type)) continue;
    if (isNodeCasualty(_nodeCasualties, t.defenderId)) continue;
    if ((t.combatHp ?? 1) <= 0) continue;
    if (t.disabledTimer > 0) continue;
    updateHeroMovement(t, enemies, fieldW, fieldH, {
      warband: towers,
      isCasualty: (id) => isNodeCasualty(_nodeCasualties, id),
      cellSize: CELL_SIZE,
    });
  }
}

function updateEnemyPathlessTarget(enemy) {
  if (!enemy.alive || enemy.reached) return;
  const target = pickEnemyTarget(enemy);
  enemy.path = [{ x: enemy.x, y: enemy.y }, { x: target.x, y: target.y }];
  enemy.pathIndex = 0;
}

function processEnemyMeleeAttacks() {
  if (!isPathlessMode()) return;
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.reached || enemy.stunTimer > 0) continue;
    if ((enemy.meleeTimer ?? 0) > 0) { enemy.meleeTimer--; continue; }
    const dmg = enemy.isBoss ? 28 : Math.max(8, Math.round(12 + enemy.maxHp * 0.02));
    const target = findEnemyMeleeTarget(enemy);
    if (!target) continue;

    if (target.kind === 'warband') {
      const t = target.tower;
      if (t.combatHp == null) initHeroCombatHp(t);
      t.combatHp -= dmg;
      t.combatHitFlash = 12;
      enemy.meleeTimer = 28;
      enemy.hitFlash = 6;
      enemy.hitFlashMax = 6;
      showAssaultDamageFloater(t.x, t.y, dmg, 'hero');
      screenShake = Math.max(screenShake, 4);
      if (t.combatHp <= 0) killHeroInCombat(t);
      continue;
    }

    if (target.kind === 'structure') {
      const t = target.tower;
      if (t.structureHp == null) {
        t.structureHp    = getStructureCombatHp(t.type, t.level ?? 1);
        t.structureMaxHp = t.structureHp;
      }
      t.structureHp -= dmg;
      enemy.meleeTimer = 32;
      showAssaultDamageFloater(t.x, t.y, dmg, 'structure');
      screenShake = Math.max(screenShake, 3);
      if (t.structureHp <= 0) removeTower(t);
      continue;
    }

    if (target.kind === 'wall') {
      const { c, r, w } = target.wall;
      const wasGate = w.isGate;
      w.hp = Math.max(0, (w.hp ?? WALL_BASE_HP) - dmg);
      w.damageFlash = 16;
      enemy.meleeTimer = 32;
      const pos = grid.cellCenter(c, r);
      showAssaultDamageFloater(pos.x, pos.y, dmg, wasGate ? 'gate' : 'wall');
      screenShake = Math.max(screenShake, wasGate ? 5 : 3);
      if (wasGate && w.hp > 0 && w.hp < (w.maxHp ?? GATE_HP) * 0.5) {
        _gateBreachBannerTimer = Math.max(_gateBreachBannerTimer, 40);
      }
      if (w.hp <= 0) {
        if (wasGate) {
          _fortressGateBreached = true;
          _gateBreachBannerTimer = 150;
          try { sfxPortalOpens(); } catch {}
        }
        grid.setCell(c, r, CELL.EMPTY);
        delete wallData[`${c}_${r}`];
        wallFrostDirty = true;
      }
    }
  }
}

// Count how many of a given rune type are currently equipped on towers
function runeEquippedCount(id)   { return towers.filter(t => t.rune === id).length; }
function _generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function runeUnequippedCount(id) { return Math.max(0, (runeInventory[id] ?? 0) - runeEquippedCount(id)); }

// Kill milestone floater — fires once per defender per milestone per session
const _KILL_MILESTONES = [50, 100, 200, 500];
function _checkKillMilestone(tower) {
  if (!tower?.defenderId) return;
  const def = _roster?.find(tower.defenderId);
  const totalKills = (def?.careerKills ?? 0) + tower.killCount;
  for (const m of _KILL_MILESTONES) {
    const key = `${tower.defenderId}_${m}`;
    if (totalKills >= m && !_defKillMilestones.has(key)) {
      _defKillMilestones.add(key);
      dmgFloaters.push({
        x: tower.x, y: tower.y - 22,
        val: `☠ ${m}K!`, life: 180, maxLife: 180,
        color: '#ffd060', large: true, suffix: '', vy: -0.35, raw: true,
      });
      sfxKillMilestone();
    }
  }
}

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
  for (const _es of _extraSpawns) {
    _es.path = grid.findPath(_es.col, _es.row, GOAL.col, GOAL.row) ?? _es.path;
  }
  pathDirty      = true;
  _synergyDirty  = true;
  rerouteActiveEnemies();
  wallFrostDirty = true;
  if (!isHeroTowerType(tower.type)) checkAssaultEndConditions();
  if (isFortressPrepPhase()) persistCampaignFieldLayout();
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
  { label: 'SKYFELL SWARM',  desc: 'Flying assault',    bonus: { type: 'myling', count: 6 } },
  { label: 'TITAN MARCH',    desc: 'Giants approach',   bonus: { type: 'jotunn', count: 3 } },
  { label: 'BLOOD FRENZY',   desc: 'All-out assault',  speedMult: 1.20 },
  { label: 'WRAITH RUSH',    desc: 'Wraiths unleashed', bonus: { type: 'myling', count: 8 } },
  { label: 'IRON HORDE',     desc: 'Mass draugr',       bonus: { type: 'draugr', count: 15 } },
  { label: 'RIVER CURSE',    desc: 'Fossegrim heal aura', bonus: { type: 'fossegrim', count: 2 } },
  { label: 'VALKYRIE STORM', desc: '+25% speed',        speedMult: 1.25 },
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
let goldStolen    = 0;   // gold plundered by enemies that breached the hoard

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

  // Wave-done expanding ring — gold pulse at fortress when last enemy falls
  if (_waveDoneRingFx && _waveDoneRingFx.alpha > 0) {
    const _wrf = _waveDoneRingFx;
    ctx.save();
    ctx.strokeStyle = `rgba(255,220,80,${_wrf.alpha})`;
    ctx.lineWidth   = 3;
    ctx.shadowColor = `rgba(240,200,60,${_wrf.alpha * 0.85})`;
    ctx.shadowBlur  = 14;
    ctx.beginPath();
    ctx.arc(_wrf.x, _wrf.y, _wrf.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${_wrf.alpha * 0.35})`;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(_wrf.x, _wrf.y, _wrf.r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    _wrf.r     += 2.4;
    _wrf.alpha -= 0.020;
    if (_wrf.alpha <= 0) _waveDoneRingFx = null;
  }

  // Final-kill white ring at enemy death location (FENRIR-23)
  let _fkr = _finalKillRings.length;
  while (_fkr--) {
    const ring = _finalKillRings[_fkr];
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${ring.alpha})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = `rgba(255,255,255,${ring.alpha * 0.7})`;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ring.r += 3.2;
    ring.alpha -= 0.028;
    if (ring.alpha <= 0) {
      _finalKillRings[_fkr] = _finalKillRings[_finalKillRings.length - 1];
      _finalKillRings.length--;
    }
  }
}

function drawGoldCoins() {
  const hx = hoardScreenX();
  const hy = hoardScreenY();
  for (const c of goldCoins) {
    const t  = c.t;
    // quadratic bezier: start → control point (arc apex) → hoard
    const dx = hx - c.sx, dy = hy - c.sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const mx = (c.sx + hx) / 2;
    const my = Math.min(c.sy, hy) - Math.min(120, dist * 0.30);
    const bx = (1-t)*(1-t)*c.sx + 2*(1-t)*t*mx + t*t*hx;
    const by = (1-t)*(1-t)*c.sy + 2*(1-t)*t*my + t*t*hy;
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
    fossegrims: n >= 43 ? Math.min(Math.floor((n - 42) * 0.25), 3) : 0,
  };
}

function buildWave(num) {
  if (BOSS_WAVES.has(num)) {
    // Boss wave: herald squad themed per boss, then the boss enters last
    let heraldTypes;
    if (num === 10)  heraldTypes = [...Array(6).fill(ENEMY_TYPES.DRAUGR), ...Array(2).fill(ENEMY_TYPES.MYLING)];
    else if (num === 25) heraldTypes = [...Array(5).fill(ENEMY_TYPES.DRAUGR), ...Array(3).fill(ENEMY_TYPES.WARG), ...Array(2).fill(ENEMY_TYPES.JOTUNN)];
    else if (num === 50) heraldTypes = [...Array(4).fill(ENEMY_TYPES.MARA), ...Array(2).fill(ENEMY_TYPES.MYLING), ...Array(2).fill(ENEMY_TYPES.WARG)];
    else if (num === 75) heraldTypes = [...Array(3).fill(ENEMY_TYPES.MYLING), ...Array(2).fill(ENEMY_TYPES.JOTUNN), ...Array(4).fill(ENEMY_TYPES.WARG)];
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
  if (num === 43) return [ENEMY_TYPES.FOSSEGRIM, ...Array(6).fill(ENEMY_TYPES.DRAUGR)]; // fossegrim introduction

  // Rest waves — 2 easier waves after each boss (1st = very light, 2nd = moderate)
  if (num === 11 || num === 26 || num === 51 || num === 76 || num === 101) {
    const { draugr: rd, mylings: rm, jotunn: rj, maras: ra, wargs: rw, einherjars: re, fossegrims: rf } = waveComposition(Math.min(num - 5, MAX_WAVES));
    const rest = [...Array(rd).fill(ENEMY_TYPES.DRAUGR), ...Array(rm).fill(ENEMY_TYPES.MYLING), ...Array(rj).fill(ENEMY_TYPES.JOTUNN), ...Array(ra).fill(ENEMY_TYPES.MARA), ...Array(rw).fill(ENEMY_TYPES.WARG), ...Array(re).fill(ENEMY_TYPES.EINHERJAR), ...Array(rf ?? 0).fill(ENEMY_TYPES.FOSSEGRIM)];
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    return rest;
  }
  if (num === 27 || num === 52 || num === 77) {
    const { draugr: rd, mylings: rm, jotunn: rj, maras: ra, wargs: rw, einherjars: re, fossegrims: rf } = waveComposition(Math.min(num - 3, MAX_WAVES));
    const rest = [...Array(rd).fill(ENEMY_TYPES.DRAUGR), ...Array(rm).fill(ENEMY_TYPES.MYLING), ...Array(rj).fill(ENEMY_TYPES.JOTUNN), ...Array(ra).fill(ENEMY_TYPES.MARA), ...Array(rw).fill(ENEMY_TYPES.WARG), ...Array(re).fill(ENEMY_TYPES.EINHERJAR), ...Array(rf ?? 0).fill(ENEMY_TYPES.FOSSEGRIM)];
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    return rest;
  }

  // Endless waves (102+): rotating flavored compositions
  if (endlessMode && num > 101) {
    const epoch  = num - 102;
    const flavor = epoch % ENDLESS_FLAVOR_EVENTS.length;
    const scale  = 1 + Math.floor(epoch / 5) * 0.12;  // +12% enemies per 5-wave epoch
    let q;
    if      (flavor === 0) q = [...Array(Math.round(28*scale)).fill(ENEMY_TYPES.MYLING),  ...Array(Math.round(18*scale)).fill(ENEMY_TYPES.DRAUGR)];
    else if (flavor === 1) q = [...Array(Math.round(8*scale)).fill(ENEMY_TYPES.JOTUNN),   ...Array(Math.round(14*scale)).fill(ENEMY_TYPES.DRAUGR), ...Array(Math.round(4*scale)).fill(ENEMY_TYPES.MARA)];
    else if (flavor === 2) q = [...Array(Math.round(16*scale)).fill(ENEMY_TYPES.DRAUGR),  ...Array(Math.round(12*scale)).fill(ENEMY_TYPES.MYLING), ...Array(Math.round(5*scale)).fill(ENEMY_TYPES.JOTUNN), ...Array(Math.round(6*scale)).fill(ENEMY_TYPES.MARA)];
    else if (flavor === 3) q = [...Array(Math.round(14*scale)).fill(ENEMY_TYPES.MARA),    ...Array(Math.round(20*scale)).fill(ENEMY_TYPES.MYLING)];
    else if (flavor === 4) q = [...Array(Math.round(60*scale)).fill(ENEMY_TYPES.DRAUGR),  ...Array(Math.round(6*scale)).fill(ENEMY_TYPES.JOTUNN)];
    else if (flavor === 5) q = [...Array(Math.round(4*scale)).fill(ENEMY_TYPES.FOSSEGRIM), ...Array(Math.round(20*scale)).fill(ENEMY_TYPES.DRAUGR)];
    else                   q = [...Array(Math.round(24*scale)).fill(ENEMY_TYPES.DRAUGR),  ...Array(Math.round(10*scale)).fill(ENEMY_TYPES.WARG), ...Array(Math.round(4*scale)).fill(ENEMY_TYPES.MYLING)];
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
    return q;
  }

  const { draugr, mylings, jotunn, maras, wargs, einherjars, fossegrims } = waveComposition(num);
  const queue = [
    ...Array(draugr).fill(ENEMY_TYPES.DRAUGR),
    ...Array(mylings).fill(ENEMY_TYPES.MYLING),
    ...Array(jotunn).fill(ENEMY_TYPES.JOTUNN),
    ...Array(maras).fill(ENEMY_TYPES.MARA),
    ...Array(wargs).fill(ENEMY_TYPES.WARG),
    ...Array(einherjars).fill(ENEMY_TYPES.EINHERJAR),
    ...Array(fossegrims ?? 0).fill(ENEMY_TYPES.FOSSEGRIM),
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
  if (_campaignNodeMode && _marchSuppliesShown > 0 && waveNumber === 1) {
    chapterBannerText = `MARCH SUPPLIES +${_marchSuppliesShown}g`;
    chapterBannerTimer = 200;
    _marchSuppliesShown = 0;
  }
  let _equivWave = waveNumber;
  if (_campaignNodeMode && _nodeWavePlan) {
    const waveSpec = _nodeWavePlan.waves[_nodeWaveIndex];
    if (waveSpec) _equivWave = difficultyToEquivWave(waveSpec.difficulty, waveSpec.waveInNode);
  }
  const _bands   = getWaveBands(_equivWave);
  waveHpScale    = _bands.hp;
  waveSpeedScale = _bands.speed;
  if (_campaignNodeMode && isFirstSagaMap(_campaignMapIndex) && isFirstSagaAssaultNode(_campaignNodeIndex)) {
    const waveSpec = _nodeWavePlan?.waves?.[_nodeWaveIndex];
    const sagaBands = getFirstSagaWaveBands(_campaignNodeIndex, waveSpec?.waveInNode ?? 1);
    waveHpScale    = sagaBands.hp;
    waveSpeedScale = sagaBands.speed;
  }
  if (_campaignNodeMode && _nodeWavePlan && _nodeWavePlan.waves.length > 1) {
    const waveSpec = _nodeWavePlan.waves[_nodeWaveIndex];
    const assault = getAssaultInfo(_campaignMapIndex, _campaignNodeIndex);
    if (waveSpec?.isBoss) {
      chapterBannerText  = '☠ BOSS WAVE';
      chapterBannerTimer = 220;
    } else if (assault) {
      chapterBannerText  = `${assault.codename.toUpperCase()} · WAVE ${waveSpec.waveInNode}/${_nodeWavePlan.waves.length}`;
      chapterBannerTimer = waveSpec.waveInNode > 1 ? 200 : 140;
    }
  }
  waveRangeMult  = 1;
  currentWaveEvent = _campaignNodeMode ? null : (WAVE_EVENTS[waveNumber] ?? null);
  if (endlessMode && waveNumber > 101) {
    const epoch = waveNumber - 102;
    currentWaveEvent = ENDLESS_FLAVOR_EVENTS[epoch % ENDLESS_FLAVOR_EVENTS.length];
  }
  if (currentWaveEvent) {
    if (currentWaveEvent.hpMult)    waveHpScale    = Math.round(waveHpScale    * currentWaveEvent.hpMult    * 100) / 100;
    if (currentWaveEvent.speedMult) waveSpeedScale = Math.round(waveSpeedScale * currentWaveEvent.speedMult * 100) / 100;
    if (currentWaveEvent.rangeMult) waveRangeMult  = currentWaveEvent.rangeMult;
    if (currentWaveEvent.special === 'upgrade') {
      if (_campaignNodeMode) {
        const bonus = 30;
        gold       += bonus;
        goldEarned += bonus;
        const bx = GOAL.col * CELL_SIZE + CELL_SIZE / 2;
        const by = GOAL.row * CELL_SIZE - 12;
        dmgFloaters.push({ x: bx, y: by, val: bonus, life: 100, maxLife: 100, color: '#80f0ff', large: false, suffix: 'g RUNE LEGACY' });
      } else if (towers.some(t => !t.maxed)) {
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
  // Multi-portal activation: open new gates at wave thresholds (W11/W21/W41/W71)
  for (const _es of _extraSpawns) {
    if (!_es.active && _es.activateWave && waveNumber === _es.activateWave) {
      _es.active = true;
      sfxPortalOpens();
      screenShake = Math.max(screenShake, 14);
      chapterBannerText  = `⚠ ${_es.dir} GATE OPENS — NEW THREAT APPROACHES`;
      chapterBannerTimer = 300;
      dmgFloaters.push({
        x: _es.col * CELL_SIZE + CELL_SIZE / 2, y: _es.row * CELL_SIZE,
        val: `⚠ GATE OPENS`, life: 120, maxLife: 120,
        color: '#ff6040', large: true, suffix: '', vy: -0.3, raw: true,
      });
    }
  }

  spawnQueue  = _campaignNodeMode && _nodeWavePlan
    ? buildCampaignNodeSpawnQueue(_nodeWavePlan.waves[_nodeWaveIndex], _campaignMapIndex, _campaignNodeIndex)
    : buildWave(waveNumber);
  if (!_campaignNodeMode && currentWaveEvent?.bonus) {
    const bonusType = ENEMY_TYPES[currentWaveEvent.bonus.type.toUpperCase()] ?? currentWaveEvent.bonus.type;
    for (let i = 0; i < currentWaveEvent.bonus.count; i++) spawnQueue.push(bonusType);
    for (let i = spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spawnQueue[i], spawnQueue[j]] = [spawnQueue[j], spawnQueue[i]];
    }
  }
  waveTotal   = spawnQueue.length;
  spawnTimer  = 0;
  waveActiveFrames = 0;
  snapWarbandToDeploy(towers, CELL_SIZE);
  waveState   = 'active';
  chainKillDone  = new Set();
  waveSlainCount = 0;
  waveGoldStart  = goldEarned;
  waveStartTick  = performance.now();
  if (waveNumber === 1) pathChevronsTimer = Math.max(pathChevronsTimer, 480);

  // Enemy intro banner — fire at wave start so player reads it before combat, not during
  {
    const _INTRO_TYPES = {
      [ENEMY_TYPES.WARG]:      { label: '⚡ NEW: WARG',      hint: 'Fast wolf pack — use splash or slowing towers to handle them', category: 'beast'  },
      [ENEMY_TYPES.EINHERJAR]: { label: '⚔ NEW: EINHERJAR', hint: 'Armored Viking — very tough, slow. Outlast with sustained DPS or wall it', category: 'undead' },
      [ENEMY_TYPES.MYLING]:    { label: '★ NEW: MYLING',     hint: 'Spectral flier — ignores walls; use ranged defenders', category: 'spirit' },
      [ENEMY_TYPES.JOTUNN]:    { label: '★ NEW: JÖTUNN',     hint: 'Earth giant — massive HP but very slow; early upgrade focus', category: 'giant'  },
      [ENEMY_TYPES.MARA]:      { label: '★ NEW: MARA',       hint: 'Nightmare spirit — moderate HP; high threat at mid waves', category: 'spirit' },
    };
    const waveTypes = new Set(spawnQueue.map(e => e.__herald ? e.type : e).filter(t => typeof t === 'string'));
    _enemyIntroQueue = [];
    for (const [t, info] of Object.entries(_INTRO_TYPES)) {
      if (waveTypes.has(t) && !_enemyIntroSeen.has(t)) {
        _enemyIntroSeen.add(t);
        _enemyIntroQueue.push({ label: info.label, hint: info.hint, category: info.category });
      }
    }
    // Boss first-encounter banners
    const _BOSS_INTROS = {
      10:  { label: '☠ DRAUGEN-JARL RISES',     hint: 'Chieftain of the Dead — heavy HP, spawns minions. Focus fire.',        category: 'boss' },
      25:  { label: '☠ JÖTUNHELM WALKER COMES', hint: 'Mountain giant — colossal HP, leaves shockwave. Siege damage preferred.', category: 'boss' },
      50:  { label: '☠ FENRIR UNCHAINED',        hint: 'The Great Wolf — speed surges at each phase. AoE towers essential.',    category: 'boss' },
      75:  { label: '☠ HATI & SKÖLL DESCEND',   hint: 'Twin hunters — split and converge. Two-front defense required.',        category: 'boss' },
      100: { label: '☠ SURTR, LORD OF FIRE',     hint: 'The world-ender. All defenses to maximum. The north must hold.',       category: 'boss' },
    };
    if (BOSS_WAVES.has(waveNumber) && _BOSS_INTROS[waveNumber]) {
      const _bKey = `boss_${waveNumber}`;
      if (!_enemyIntroSeen.has(_bKey)) {
        _enemyIntroSeen.add(_bKey);
        _enemyIntroQueue.unshift(_BOSS_INTROS[waveNumber]); // boss banner shows FIRST
      }
    }

    if (_enemyIntroQueue.length > 0) {
      const _first = _enemyIntroQueue.shift();
      _enemyIntroBanner = { label: _first.label, hint: _first.hint, timer: 210, maxTimer: 210, category: _first.category };
      sfxEnemyIntro();
    }
  }
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

  // Chapter milestone banners (skirmish only)
  if (!isCampaignCombat()) {
    if (waveNumber ===  1) { chapterBannerTimer = 240; chapterBannerText = 'CHAPTER 1: THE NORTHERN MARCH';  sfxChapterBanner(); }
    if (waveNumber === 26) { chapterBannerTimer = 210; chapterBannerText = 'CHAPTER 2: THE CORRUPTED MARCH'; sfxChapterBanner(); }
    if (waveNumber === 51) { chapterBannerTimer = 210; chapterBannerText = 'CHAPTER 3: THE IRON WINTER';     sfxChapterBanner(); }
    if (waveNumber === 76) { chapterBannerTimer = 210; chapterBannerText = 'CHAPTER 4: RAGNARÖK';            sfxChapterBanner(); }
  }

  // Endless mode: flavored wave events + milestone banners every 25 waves
  if (endlessMode) {
    if (waveNumber === 101) { sfxEndlessStart(); }
    if (waveNumber > 100 && (waveNumber - 100) % 25 === 0) {
      const depth  = Math.floor((waveNumber - 100) / 25);
      const names  = ['TITAN REALM', 'RAGNARÖK ETERNAL', 'BEYOND THE VEIL', 'JÖRMUNGANDR WAKES'];
      chapterBannerTimer = 240;
      chapterBannerText  = `∞ WAVE ${waveNumber}: ${names[(depth - 1) % names.length]}`;
      sfxEndlessMilestone();
    } else if (endlessMode && waveNumber > 100 && (waveNumber - 100) % 5 === 0) {
      const _tier = Math.floor((waveNumber - 100) / 5);
      _depthBannerTimer = 180;
      _depthBannerTier  = _tier;
    }
  }

  sfxWaveStart();
  spawnParticles(GRID_LEFT + SPAWN.col * CELL_SIZE + CELL_SIZE / 2, GRID_TOP + SPAWN.row * CELL_SIZE + CELL_SIZE / 2, '#c89040', 12);
}

function updateWave() {
  if (gameOver) return;

  if (portalFlash > 0) portalFlash--;

  if (waveState === 'countdown' || waveState === 'break') {
    const _nextBoss = _campaignNodeMode && _nodeWavePlan
      ? (_nodeWavePlan.waves[_nodeWaveIndex + 1]?.isBoss ?? false)
      : BOSS_WAVES.has(waveNumber + 1);
    const nextIsBoss = _nextBoss;
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
    const baseSpawnGap  = (_campaignNodeMode && isFirstSagaMap(_campaignMapIndex) && isFirstSagaAssaultNode(_campaignNodeIndex))
      ? getFirstSagaSpawnGap(_campaignNodeIndex, _nodeWavePlan?.waves?.[_nodeWaveIndex]?.waveInNode ?? 1)
      : (waveNumber <= 10 ? 16 : SPAWN_FRAMES);
    const spawnInterval = waveActiveFrames > 5400 * gameSpeed ? Math.ceil(baseSpawnGap * 0.5) : baseSpawnGap;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      const next = spawnQueue.shift();
      if (next && next.__nodeBoss) {
        spawnNodeBoss(next.mapIndex);
      } else if (next && next.__boss) {
        spawnBoss(next.waveNum);
      } else if (next && next.__herald) {
        const e = spawnEnemy(next.type, waveHpScale);
        if (e) e.isHerald = true;
      } else if (next && typeof next === 'object' && next.type) {
        const scale = (next.hpScale ?? 1) * waveHpScale;
        const enemy = spawnEnemy(next.type, scale);
        if (enemy && next.speedScale != null && next.speedScale !== 1) {
          enemy.baseSpeed *= next.speedScale;
          enemy.speed *= next.speedScale;
        }
      } else {
        spawnEnemy(next, waveHpScale);
      }
    }
  } else if (enemies.length === 0) {
    if (_campaignNodeMode && isAssaultFieldWiped()) {
      finishCampaignNodeDefeat('field_wiped');
      return;
    }
    // Wave-done ring FX — centered on goal fortress
    _waveDoneRingFx = { x: GOAL.col * CELL_SIZE + CELL_SIZE / 2, y: GOAL.row * CELL_SIZE + CELL_SIZE / 2, r: 0, alpha: 0.9 };
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
      _starsEarnedThisBattle++;
      if (stars === 1 && !_campaignNodeMode && _runeForgeHintTimer <= 0) _runeForgeHintTimer = 360;
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
    snapWarbandToDeploy(towers, CELL_SIZE);

    // --- Last Stand detection: single defender held the wave with ramparts at 1-2 ---
    if (towers.length === 1 && lives <= 2 && !_chronLastStand) {
      const solo = towers[0];
      if (solo && (solo.killCount || 0) > 0) {
        _chronLastStand = {
          defenderName: solo.name ?? TOWER_DEFS[solo.type]?.label ?? solo.type,
          defenderId:   solo.defenderId ?? null,
          survived:     true,   // wave ended without defeat = survived
          ramparts:     lives,
        };
      }
    }

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
    if (_campaignNodeMode && _nodeWavePlan) {
      const wavesInNode = _nodeWavePlan.waves.length;
      if (_nodeWaveIndex < wavesInNode - 1) {
        refreshSagaHeroesBetweenWaves();
        _nodeWaveIndex++;
      } else {
        finishCampaignNodeVictory();
        return;
      }
    } else if (waveNumber >= MAX_WAVES && !endlessMode) {
      unlockAchievement('wave100');
      highScores = saveHighScore({ waves: waveNumber, slain, goldEarned, cleared: true, date: new Date().toLocaleDateString('en-GB') });
      recordBattleResult('victory');
    }
    // End-of-wave wear damage — walls adjacent to the enemy path take attrition damage
    {
      const _damaged = new Set();
      const _allPaths = [currentPath, ..._extraSpawns.map(es => es.path)].filter(Boolean);
      for (const _path of _allPaths) {
        for (const { col: pc, row: pr } of _path) {
          for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const _wk = `${pc+dc}_${pr+dr}`;
            if (wallData[_wk] && !_damaged.has(_wk)) {
              _damaged.add(_wk);
              wallData[_wk].hp = Math.max(0, wallData[_wk].hp - WALL_WAVE_DAMAGE);
              if (wallData[_wk].hp === 0) {
                grid.setCell(pc+dc, pr+dr, CELL.EMPTY);
                delete wallData[_wk];
                wallFrostDirty = true;
                currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row) ?? currentPath;
                for (const _es of _extraSpawns) _es.path = grid.findPath(_es.col, _es.row, GOAL.col, GOAL.row) ?? _es.path;
              }
            }
          }
        }
      }
    }
    // Temporary reinforce walls: decrement wave counter, remove expired
    {
      for (const _wk of Object.keys(wallData)) {
        const _wd = wallData[_wk];
        if (!_wd.temporary) continue;
        _wd.wavesLeft--;
        if (_wd.wavesLeft <= 0) {
          const [_rc, _rr] = _wk.split('_').map(Number);
          grid.setCell(_rc, _rr, CELL.EMPTY);
          delete wallData[_wk];
          wallFrostDirty = true;
          currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row) ?? currentPath;
          for (const _es of _extraSpawns) _es.path = grid.findPath(_es.col, _es.row, GOAL.col, GOAL.row) ?? _es.path;
        }
      }
    }
    // Mine outposts: generate gold per wave
    for (const t of towers) {
      const _gpw = scalePassiveByLevel(TOWER_DEFS[t.type]?.goldPerWave ?? 0, t.level ?? 1);
      if (_gpw > 0) {
        gold += _gpw;
        goldEarned += _gpw;
        t.goldGenerated = (t.goldGenerated ?? 0) + _gpw;
        dmgFloaters.push({ x: t.x, y: t.y - 10, val: `+${_gpw}`, life: 80, maxLife: 80, color: '#d0a020', large: false, suffix: 'g' });
      }
      // Trait goldPerWave bonus (lucky, merciful, warmhearted, star_seeker, saga_bound, quartermasters_eye)
      if (isHeroTowerType(t.type) && t.defenderId && _roster) {
        const _def = _roster.find(t.defenderId);
        if (_def) {
          const _tgpw = getTraitModifiers(_def, buildHeroModifierCtx(t)).goldPerWave;
          if (_tgpw > 0) {
            gold += _tgpw;
            goldEarned += _tgpw;
            t.goldGenerated = (t.goldGenerated ?? 0) + _tgpw;
          }
        }
      }
    }
    // Quartermaster fortress role — +3g per deployed QM per wave
    {
      const _qm = countDeployedRoleBonus(towers, _roster, 'quartermaster');
      if (_qm > 0) {
        const _qg = _qm * 3;
        gold += _qg;
        goldEarned += _qg;
      }
    }
    // Rune Shrine outposts: generate 1 star every starPerWaves waves
    for (const t of towers) {
      const _spw = TOWER_DEFS[t.type]?.starPerWaves ?? 0;
      if (_spw > 0) {
        t._waveTicks = (t._waveTicks ?? 0) + 1;
        let _threshold = _spw;
        for (const h of towers) {
          if (!isHeroTowerType(h.type) || !h.defenderId) continue;
          const hd = _roster?.find(h.defenderId);
          if (hd?.fortressRole !== 'rune_keeper') continue;
          if (Math.max(Math.abs(h.col - t.col), Math.abs(h.row - t.row)) <= 2) {
            _threshold = Math.max(2, _threshold - 1);
            break;
          }
        }
        if (t._waveTicks >= _threshold) {
          t._waveTicks = 0;
          stars++;
          _starsEarnedThisBattle++;
          if (_campaignState) _campaignState.stars = stars;
          dmgFloaters.push({ x: t.x, y: t.y - 10, val: '+1', life: 80, maxLife: 80, color: '#c0a0ff', large: false, suffix: '★' });
        }
      }
    }
    // Barracks outposts: grant XP to all deployed defenders this wave
    {
      let _totalBarracksXP = 0;
      for (const t of towers) {
        const _xpw = scalePassiveByLevel(TOWER_DEFS[t.type]?.xpPerWave ?? 0, t.level ?? 1);
        if (_xpw > 0) _totalBarracksXP += _xpw;
      }
      if (_totalBarracksXP > 0) {
        for (const t of towers) {
          if (TOWER_DEFS[t.type]?.passive) continue;
          const _def = _roster?.find(t.defenderId);
          if (_def) _def.xp = (_def.xp ?? 0) + _totalBarracksXP;
        }
      }
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

    // Dark tundra base — lifted midtones so buildable ground reads against UI chrome
    tc.fillStyle = '#1c3014';
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
      lm.strokeStyle = 'rgba(80,140,200,0.58)'; lm.lineWidth = 0.7;
      lm.beginPath();
      lm.moveTo(0, -sh * 0.32); lm.lineTo(0, sh * 0.28);
      lm.moveTo(-sw * 0.32, -sh * 0.08); lm.lineTo(sw * 0.32, -sh * 0.08);
      lm.moveTo(-sw * 0.30, -sh * 0.24); lm.lineTo(sw * 0.30, sh * 0.06);
      lm.moveTo(sw * 0.30, -sh * 0.24); lm.lineTo(-sw * 0.30, sh * 0.06);
      lm.stroke();
      // Rune glow halo
      lm.shadowColor = 'rgba(80,140,200,0.55)'; lm.shadowBlur = 5;
      lm.strokeStyle = 'rgba(80,140,200,0.28)'; lm.lineWidth = 1.5;
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
      lm.fillStyle = '#1e1006';
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
      // Spilled cargo — fur bales (brown) and ingot (gold)
      const _cargoColors = ['#7a5830', '#8a6238', '#c89828'];
      for (const [[ax, ay], ci] of [[[cs * 0.70, cs * 0.22],0],[[cs * 0.88, cs * 0.16],2],[[cs * 0.80, cs * 0.32],1]]) {
        lm.fillStyle = _cargoColors[ci];
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
        lm.beginPath(); lm.moveTo(rx2, ry2); lm.lineTo(rx2 + (rng() - 0.5) * 2, ry2 - rl); lm.stroke();
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
  // Prefer filling viewport height so the taller grid uses the screen
  gameScale = window.innerHeight / BASE_H;
  if (BASE_W * gameScale > window.innerWidth) {
    gameScale = window.innerWidth / BASE_W;
  }
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
  const s = effectiveGridZoom();
  const maxPanX = Math.max(0, COLS * CELL_SIZE * s - playfieldWidth());
  const maxPanY = Math.max(0, ROWS * CELL_SIZE * s - playfieldHeight());
  gridPanX = Math.max(-maxPanX, Math.min(maxPanX * 0.5, gridPanX));
  gridPanY = Math.max(-maxPanY, Math.min(maxPanY * 0.5, gridPanY));
}

// Convert outer-game coords (post-gameScale) into grid-local coords (0-based; 0,0 = top-left of grid).
function outerToGridLocal(ox, oy) {
  const s = effectiveGridZoom();
  const cx = COLS * CELL_SIZE * 0.5;
  const cy = ROWS * CELL_SIZE * 0.5;
  const gx = ox - playfieldLeft() - gridPanX - playfieldShiftX();
  const gy = oy - GRID_TOP - gridPanY - playfieldShiftY();
  return {
    x: (gx - cx) / s + cx,
    y: (gy - cy) / s + cy,
  };
}

// Draws a fantasy panel: dark fill + gold border + inner line + corner gem diamonds.
// fillStyle / borderAlpha let callers control selected vs idle appearance.
function leftDockPanelHeight() {
  return useAssaultFieldDock() ? combatPanelFullH() : GRID_BOTTOM - GRID_TOP;
}

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
  if (_leftDockTab !== 'structures' || gamePhase !== 'playing') {
    _buildBtnsCache = [];
    return _buildBtnsCache;
  }

  const px   = FRAME_THICK;
  const py   = GRID_TOP;
  const pw   = LEFT_DOCK_W;
  const ph   = leftDockPanelHeight();
  const lm   = _structureListLayout(px, py, pw, ph);
  const btns = [];

  for (let i = 0; i < lm.items.length; i++) {
    const item  = lm.items[i];
    const cardX = px + lm.padX;
    const cardY = lm.contentTop + i * (lm.cardH + lm.gap) - _structureScrollY;
    if (cardY + lm.cardH < lm.contentTop || cardY > lm.contentTop + lm.contentH) continue;
    btns.push({
      ...item,
      cost: item.id === 'gate' ? GATE_COST : item.cost,
      x: cardX, y: cardY, width: lm.cardW, height: lm.cardH, panelId: 'towers',
    });
  }
  _buildBtnsCache = btns;
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
  if (gameOver) return;
  if (!isPathlessMode() && !currentPath) return;

  // Multi-portal: randomly pick from active spawn points
  const _activeExtras = _extraSpawns.filter(es => es.active && es.path);
  let _spawnCol = SPAWN.col, _spawnRow = SPAWN.row, _spawnPath = currentPath;
  if (_activeExtras.length > 0) {
    const _all = [{ col: SPAWN.col, row: SPAWN.row, path: currentPath }, ..._activeExtras];
    const _pick = _all[Math.floor(Math.random() * _all.length)];
    _spawnCol = _pick.col; _spawnRow = _pick.row; _spawnPath = _pick.path;
  }

  let path;
  if (ENEMY_DEFS[type].flying) {
    path = [grid.cellCenter(_spawnCol, _spawnRow), grid.cellCenter(GOAL.col, GOAL.row)];
  } else {
    path = _spawnPath.map(({ col, row }) => grid.cellCenter(col, row));
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
  if (type === ENEMY_TYPES.EINHERJAR && !newEnemy.isBoss) {
    newEnemy.reward += Math.min(18, Math.floor(waveNumber / 10) * 3);
  }
  if (newEnemy.flying && mylingWarningTimer === 0) mylingWarningTimer = 210;
  if (type === ENEMY_TYPES.JOTUNN      && !newEnemy.isBoss && jotunnWarningTimer    === 0) jotunnWarningTimer    = 210;
  if (type === ENEMY_TYPES.FOSSEGRIM   && !newEnemy.isBoss && fossegrimWarningTimer === 0) fossegrimWarningTimer = 240;

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

  // Einherjar hit flash: steel-blue to match armor palette
  if (type === ENEMY_TYPES.EINHERJAR) newEnemy.hitFlashColor = '128,144,184';

  // CURSED SHIELDS event: each enemy absorbs its first hit
  if (currentWaveEvent?.special === 'cursedShields') newEnemy.shieldedFirstHit = true;

  enemies.push(newEnemy);
  return newEnemy;
}

function estimateWaveHp(waveNum) {
  const comp  = waveComposition(Math.max(1, waveNum));
  const scale = getWaveBands(waveNum).hp;
  return Math.round((comp.draugr * 130 + comp.mylings * 110 + comp.jotunn * 700 + comp.maras * 180 + (comp.wargs ?? 0) * 95 + (comp.einherjars ?? 0) * 460 + (comp.fossegrims ?? 0) * 380) * scale);
}

function spawnBoss(waveNum) {
  if (gameOver) return;
  if (!isPathlessMode() && !currentPath) return;
  const cfg  = BOSS_CONFIGS[waveNum];
  const path = currentPath.map(({ col, row }) => grid.cellCenter(col, row));

  screenShake      = Math.max(screenShake, 22);
  portalFlash      = 48;
  portalFlashColor = 'red';
  _bossEntryVignette = 50;
  sfxBossEntry();

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

function spawnNodeBoss(mapIndex) {
  if (gameOver) return;
  const cfg  = getNodeBossConfig(mapIndex);
  const path = isPathlessMode()
    ? [grid.cellCenter(SPAWN.col, SPAWN.row), grid.cellCenter(GOAL.col, GOAL.row)]
    : currentPath.map(({ col, row }) => grid.cellCenter(col, row));

  screenShake      = Math.max(screenShake, 22);
  portalFlash      = 48;
  portalFlashColor = 'red';
  _bossEntryVignette = 50;
  sfxBossEntry();

  const boss     = new Enemy(path, ENEMY_TYPES.JOTUNN, 1);
  boss.hp        = cfg.hp;
  boss.maxHp     = cfg.hp;
  boss.radius    = 14;
  boss.reward    = cfg.reward;
  boss.isBoss    = true;
  boss.bossName  = cfg.name;
  boss.waveNum   = null;
  boss.stunTimer = 55;
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

// Placement zone: max Chebyshev distance from GOAL allowed for towers/walls on multiPortal maps
const FORTRESS_ZONE_RADIUS = 10;

function isInFortressZone(col, row) {
  if (isPathlessMode() || _currentBattlePreset?.multiPortal) {
    return Math.max(Math.abs(col - GOAL.col), Math.abs(row - GOAL.row)) <= FORTRESS_ZONE_RADIUS;
  }
  return true;
}

function hasFortressRing() {
  return !!(_currentBattlePreset?.pathless || _currentBattlePreset?.multiPortal);
}

/** Cardinal gate slots in the fortress wall ring (one cell per opening). */
function getFortressGateSlots() {
  if (!hasFortressRing()) return [];
  const R = FORTRESS_RING_R;
  return [
    { col: GOAL.col,     row: GOAL.row - R },
    { col: GOAL.col,     row: GOAL.row + R },
    { col: GOAL.col - R, row: GOAL.row     },
    { col: GOAL.col + R, row: GOAL.row     },
  ];
}

function isFortressGateSlot(col, row) {
  return getFortressGateSlots().some(g => g.col === col && g.row === row);
}

function tryPlaceAt(col, row, mode, towerType) {
  // Check star gate for locked towers
  const gate = TOWER_STAR_GATES[towerType];
  if (mode === CELL.TOWER && gate && stars < gate) return false;

  if (mode === CELL.WALL) return false;

  if (_campaignNodeMode && !canLayoutCampaignField()) return false;

  const _isHeroType = HERO_BUILD_ITEMS.some(h => h.id === towerType);
  const _isStructure = mode === CELL.TOWER && !_isHeroType;
  const _isGate = mode === CELL.GATE;

  if (_isGate && !isFortressGateSlot(col, row)) {
    pathBlockFlash = { col, row, timer: 70, type: 'zone' };
    return false;
  }

  // Structures/siege near fortress; heroes place anywhere on campaign maps
  if (!_isHeroType && !_isGate && !isInFortressZone(col, row)) {
    pathBlockFlash = { col, row, timer: 70, type: 'zone' };
    return false;
  }

  if (_campaignNodeMode) {
    if (_isHeroType && !canPlaceHero(towers)) {
      _uiToast = { text: `FIELD FULL — ${MAX_FIELD_HEROES}/${MAX_FIELD_HEROES} heroes deployed`, timer: 100, color: UI_COLORS.warband };
      return false;
    }
    if (_isStructure && !canPlaceStructure(towers)) {
      _uiToast = { text: `FIELD FULL — ${MAX_FIELD_STRUCTURES}/${MAX_FIELD_STRUCTURES} structures deployed`, timer: 100, color: UI_COLORS.fortress };
      return false;
    }
  }

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

  const _barracksDiscount = _isHeroType
    ? towers.reduce((s, t) => s + (TOWER_DEFS[t.type]?.recruitCostReduce ?? 0), 0) : 0;
  const cost = _isGate
    ? GATE_COST
    : Math.max(5, TOWER_DEFS[towerType].cost - _barracksDiscount);
  // Deploying a roster hero during campaign assault prep is free — they are your warband, not new hires
  const _isBenchDeploy = !isFortressPrepPhase() && (_campaignNodeMode && canModifyWarbandDeployment()) && _isHeroType;
  const _effectiveCost = _isBenchDeploy ? 0 : cost;
  if (gold < _effectiveCost) return false;

  // Mark all footprint cells
  for (let dc = 0; dc < fp.w; dc++) {
    for (let dr = 0; dr < fp.h; dr++) {
      grid.setCell(col + dc, row + dr, mode);
    }
  }
  if (!isPathlessMode()) {
    const newPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
    let _extraPathsOk = true;
    const _newExtraPaths = [];
    if (newPath) {
      for (const _es of _extraSpawns) {
        const _ep = grid.findPath(_es.col, _es.row, GOAL.col, GOAL.row);
        if (!_ep) { _extraPathsOk = false; break; }
        _newExtraPaths.push(_ep);
      }
    }
    if (!newPath || !_extraPathsOk) {
      for (let dc = 0; dc < fp.w; dc++) {
        for (let dr = 0; dr < fp.h; dr++) {
          grid.setCell(col + dc, row + dr, CELL.EMPTY);
        }
      }
      pathBlockFlash = { col, row, timer: 70 };
      return false;
    }
    currentPath = newPath;
    for (let i = 0; i < _extraSpawns.length; i++) {
      if (_newExtraPaths[i]) _extraSpawns[i].path = _newExtraPaths[i];
    }
    pathDirty = true;
    rerouteActiveEnemies();
  }
  goldSpent += _effectiveCost;
  gold      -= _effectiveCost;
  wallFrostDirty = true;

  if (mode === CELL.GATE) {
    sfxPlace('wall');
    wallData[`${col}_${row}`] = { isGate: true, level: 0, hp: GATE_HP, maxHp: GATE_HP };
    const adjTW = [[col-1,row],[col+1,row],[col,row-1],[col,row+1]];
    for (const [ac, ar] of adjTW) {
      const bt = towers.find(t => t.col === ac && t.row === ar && t.type === TOWER_TYPES.BERSERK);
      if (bt) bt.synergyRingTimer = 30;
    }
  }

  if (mode === CELL.TOWER) {
    const _buildItem = TOWER_BUILD_ITEMS.find(i => i.id === towerType);
    const _heroItem  = HERO_BUILD_ITEMS.find(i => i.id === towerType);
    if (_buildItem?.category === 'siege')      sfxPlace('siege');
    else if (_buildItem?.category === 'outpost') sfxPlace('outpost');
    else                                       sfxPlace('tower');
    // Center of footprint in world coords
    const cx = (col + fp.w / 2) * CELL_SIZE;
    const cy = (row + fp.h / 2) * CELL_SIZE;
    const t = new Tower(cx, cy, col, row, towerType);
    let def;
    if (_isBenchDeploy && _placingDefenderId) {
      def = _roster.find(_placingDefenderId);
      if (!def || def.deployed || def.type !== towerType) {
        for (let dc = 0; dc < fp.w; dc++) {
          for (let dr = 0; dr < fp.h; dr++) grid.setCell(col + dc, row + dr, CELL.EMPTY);
        }
        return false;
      }
      def.deployed = true;
      t.defenderId = def.defenderId;
      t.name = def.name;
    } else {
      def = _roster.link(towerType, t.defenderId, t.name);
      t.defenderId = def.defenderId;
      t.name = def.name;
    }
    const rawEq         = getItemBonuses(def.equipment);
    const hasEquip      = def.equipment.some(Boolean);
    const armoryMult    = _fortressBonuses.equipDmMult ?? 1;
    const eqBonuses     = hasEquip && armoryMult !== 1
      ? { dm: rawEq.dm * armoryMult, rm: rawEq.rm, cm: rawEq.cm }
      : rawEq;
    const talentBonuses = getTalentBonuses(def.talents);
    const legacyBonus   = def.legacyBonus ?? null;
    const hasBonus = def.careerLevel > 0 || hasEquip || def.talents.length > 0 || !!legacyBonus;
    if (_chokeCells.has(`${col}_${row}`)) t.onHighGround = true;
    if (hasBonus) t.applyCareerData(def.defenderId, def.name, def.careerLevel, eqBonuses, talentBonuses, legacyBonus);
    else { t.defenderId = def.defenderId; t.name = def.name; }
    if (isHeroTowerType(towerType)) initHeroCombatHp(t);
    towers.push(t);
    const _sg = TOWER_STAR_GATES[towerType];
    if (_sg && stars >= _sg && !_starDeployFanfare.has(towerType)) {
      _starDeployFanfare.add(towerType);
      sfxChapterBanner();
    }
    // Barracks placement changes hero deploy cost — flush build button cache
    if (towerType === TOWER_TYPES.BARRACKS) _buildBtnsCache = null;
    _synergyDirty = true;
    _hintSeen.firstPlacement = true;  // dismiss first-placement hint on any tower placed
    if (_isHeroType) _onboardingStep = advanceOnboarding(_onboardingStep, 'placedHero');
    // Synergy ring: Berserker placed next to a wall
    if (towerType === TOWER_TYPES.BERSERK) {
      const adjBW = [[col-1,row],[col+1,row],[col,row-1],[col,row+1]];
      if (adjBW.some(([ac,ar]) => {
        const c = grid.getCell(ac, ar);
        return c === CELL.WALL || c === CELL.GATE;
      })) {
        t.synergyRingTimer = 30;
      }
    }
  }
  if (mode === CELL.TOWER) { firstTowerPlaced = true; pathChevronsTimer = 0; }
  if (mode === CELL.GATE)  {
    _hintSeen.firstPlacement = true;
    _structuresTabPulse = 0;
    if (_onboardingStep === ONBOARDING.DEPLOY) {
      _onboardingStep = advanceOnboarding(_onboardingStep, 'placedGate');
    }
  }
  if (isFortressPrepPhase()) persistCampaignFieldLayout();
  _placingDefenderId = null;
  return true;
}

// Move a hero tower to a new cell. Returns true on success, false if blocked.
function moveHeroTo(tower, newCol, newRow) {
  // Must be a 1×1 hero (no multi-cell heroes)
  const cell = grid.getCell(newCol, newRow);
  if (cell === null || cell !== CELL.EMPTY) {
    pathBlockFlash = { col: newCol, row: newRow, timer: 70, type: 'occupied' };
    return false;
  }
  if (!isHeroTowerType(tower.type) && !isInFortressZone(newCol, newRow)) {
    pathBlockFlash = { col: newCol, row: newRow, timer: 70, type: 'zone' };
    return false;
  }
  // Temporarily free old cell and test new placement
  grid.setCell(tower.col, tower.row, CELL.EMPTY);
  grid.setCell(newCol, newRow, CELL.TOWER);
  if (!isPathlessMode()) {
    const newPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
    let extraOk = true;
    const newExtraPaths = [];
    if (newPath) {
      for (const es of _extraSpawns) {
        const ep = grid.findPath(es.col, es.row, GOAL.col, GOAL.row);
        if (!ep) { extraOk = false; break; }
        newExtraPaths.push(ep);
      }
    }
    if (!newPath || !extraOk) {
      grid.setCell(newCol, newRow, CELL.EMPTY);
      grid.setCell(tower.col, tower.row, CELL.TOWER);
      pathBlockFlash = { col: newCol, row: newRow, timer: 70 };
      return false;
    }
    currentPath = newPath;
    for (let i = 0; i < _extraSpawns.length; i++) {
      if (newExtraPaths[i]) _extraSpawns[i].path = newExtraPaths[i];
    }
    pathDirty = true;
    rerouteActiveEnemies();
  }
  // Apply — update tower position and grid
  tower.col = newCol;
  tower.row = newRow;
  tower.x   = newCol * CELL_SIZE + CELL_SIZE / 2;
  tower.y   = newRow * CELL_SIZE + CELL_SIZE / 2;
  wallFrostDirty = true;
  _synergyDirty = true;
  sfxPlace('tower');
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
    return; // fortress ring walls are fixed — cannot sell
  }
  if (cell === CELL.GATE) {
    const wallKey = `w_${col}_${row}`;
    if (pendingSell && pendingSell.key === wallKey) {
      wallFrostDirty = true;
      const _refund = Math.floor(GATE_COST * 0.5);
      gold += _refund;
      dmgFloaters.push({ x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE, val: `+${_refund}g`, life: 60, maxLife: 60, color: '#e8c040', suffix: ' SOLD', vy: -0.4 });
      delete wallData[`${col}_${row}`];
      grid.setCell(col, row, CELL.EMPTY);
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

function upgradeWall(col, row) {
  const key = `${col}_${row}`;
  const wd = wallData[key];
  if (!wd || wd.level >= WALL_MAX_LEVEL) return false;
  const cost = WALL_UPGRADE_COST[wd.level];
  if (gold < cost) return false;
  gold -= cost;
  const prevMaxHp = wd.maxHp;
  wd.level++;
  const newMaxHp  = WALL_HP_BY_LEVEL[wd.level];
  const hpRatio   = wd.hp / prevMaxHp;
  wd.maxHp = newMaxHp;
  // Heal proportionally + the HP bonus from the upgrade itself
  wd.hp = Math.min(Math.round(newMaxHp * hpRatio) + (newMaxHp - prevMaxHp), newMaxHp);
  sfxPlace('wall');
  return true;
}

function repairWall(col, row) {
  const key = `${col}_${row}`;
  const wd = wallData[key];
  if (!wd || wd.hp >= wd.maxHp) return false;
  const cost = Math.max(1, Math.ceil((wd.maxHp - wd.hp) / wd.maxHp * _effectiveWallCost));
  if (gold < cost) return false;
  gold -= cost;
  wd.hp = wd.maxHp;
  sfxPlace('wall');
  return true;
}

canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  if (gamePhase === 'heroNamingCeremony') {
    if (e.key === 'Escape') {
      _heroNamingDraft = '';
      return;
    }
    if (e.key === 'Enter') {
      completeHeroNamingCeremony();
      return;
    }
    if (e.key === 'Backspace') {
      _heroNamingDraft = _heroNamingDraft.slice(0, -1);
      return;
    }
    if (e.key.length === 1 && _heroNamingDraft.length < 16) {
      _heroNamingDraft += e.key;
    }
    return;
  }
  // Rename intercept — consume all input while renaming a defender
  if (gamePhase === 'settlementCeremony' && _settlementCeremonyStep === 4) {
    if (e.key === 'Escape') {
      _settlementNameDraft = '';
      return;
    }
    if (e.key === 'Enter') {
      if (validateSettlementName(_settlementNameDraft)) {
        _settlementCeremonyStep = 5;
      }
      return;
    }
    if (e.key === 'Backspace') {
      _settlementNameDraft = _settlementNameDraft.slice(0, -1);
      return;
    }
    if (e.key.length === 1 && _settlementNameDraft.length < 16) {
      _settlementNameDraft += e.key;
    }
    return;
  }
  if (_renameState) {
    e.preventDefault();
    if (e.key === 'Escape') {
      _renameState = null;
      return;
    }
    if (e.key === 'Enter') {
      const def = _roster?.find(_renameState.defenderId);
      if (def && validateHeroName(_renameState.draft)) {
        applyHeroNaming(_campaignState, _roster, def.defenderId, _renameState.draft);
        try { persistCampaign(); } catch {}
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

  // Debrief — space/enter to advance after gate
  if (gamePhase === 'campaignSelect') {
    const maxPage = Math.ceil(CAMPAIGN_MAP_COUNT / CAMPAIGN_MAPS_PER_PAGE) - 1;
    if (e.key === 'ArrowLeft') { _campaignMapPage = Math.max(0, _campaignMapPage - 1); return; }
    if (e.key === 'ArrowRight') { _campaignMapPage = Math.min(maxPage, _campaignMapPage + 1); return; }
  }

  if (gamePhase === 'debrief') {
    if ((e.key === ' ' || e.key === 'Enter') && _debriefTimer >= 60) {
      e.preventDefault();
      if (_returnToNodeMapAfterDebrief) {
        _returnToNodeMapAfterDebrief = false;
        gameOver = false;
        victory = false;
        enterCampaignWarCamp();
      } else {
        _betweenFadeIn = _battleResult === 'defeat' ? 0 : 30;
        gamePhase = 'betweenBattles';
      }
    }
    return;
  }

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
    if (gamePhase === 'slotSelect' && _slotDeleteConfirm != null) {
      _slotDeleteConfirm = null;
      return;
    }
    if (_showDefenderBio)    { _showDefenderBio    = null;  return; }
    if (_retirementCeremony) { _retirementCeremony = null;  return; }
    if (_showChronicle)      { _showChronicle = false; _chronicleDefFilter = null; _navActiveId = 'battle'; return; }
    if (_renameState)        { _renameState  = null;  return; }
    if (_heroMoveMode)  { _heroMoveMode  = null;  return; }
    if (showRunePicker) { showRunePicker = false; runePickerTower = null; _itemRunePickMode = false; return; }
    if (showRuneMenu)   { showRuneMenu  = false; return; }
    if (selectedTower)  { selectedTower = null; _heroMoveMode = null; return; }
    if (pendingSell)       { pendingSell   = null;  return; }
    return;
  }

  if (gameOver) return;

  // Upgrade / repair selected gate (disabled — gates are fixed tier)
  if (pendingSell && !getTowerAtCell(pendingSell.col, pendingSell.row)) {
    const _wd = wallData[`${pendingSell.col}_${pendingSell.row}`];
    if (_wd?.isGate && key === 'r' && _wd.hp < _wd.maxHp) {
      const cost = Math.max(1, Math.ceil((_wd.maxHp - _wd.hp) / _wd.maxHp * GATE_COST));
      if (gold >= cost) {
        gold -= cost;
        _wd.hp = _wd.maxHp;
        sfxPlace('wall');
        pendingSell = null;
      }
      return;
    }
  }

  if (isFortressPrepPhase() && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    requestHornLaunch();
    return;
  }

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

  if (key === 'r' && waveState !== 'active' && stars > 0 && !_campaignNodeMode) {
    showRuneMenu   = !showRuneMenu;
    showRunePicker = false; runePickerTower = null;
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
    if (!canUpgradeHeroNow()) return;
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
      else if (item.mode === CELL.GATE) selectedGateType = item.id;
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

  // Command Center nav — checked before any phase-specific handler
  if (e.button === 0) {
    for (const tb of _leftDockTabBtns) {
      if (mouseX >= tb.x && mouseX <= tb.x + tb.w &&
          mouseY >= tb.y && mouseY <= tb.y + tb.h) {
        _leftDockTab = tb.id;
        _buildBtnsCache = null;
        if (tb.id === 'structures') {
          _structureScrollY = 0;
          _structuresTabPulse = 0;
        }
        return;
      }
    }
    for (const tb of _rightNavTabBtns) {
      if (mouseX >= tb.x && mouseX <= tb.x + tb.w &&
          mouseY >= tb.y && mouseY <= tb.y + tb.h) {
        _handleNavClick(tb.id);
        return;
      }
    }
    for (const _nb of _navBtns) {
      if (mouseX >= _nb.x && mouseX <= _nb.x + _nb.w &&
          mouseY >= _nb.y && mouseY <= _nb.y + _nb.h) {
        _handleNavClick(_nb.id);
        return;
      }
    }
  }

  // Meta bar — SAVES button (all campaign phases)
  if (e.button === 0) {
    for (const btn of _metaBarBtns) {
      if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
          mouseY >= btn.y && mouseY <= btn.y + btn.h) {
        if (btn.action === 'saves') returnToSlotSelect();
        return;
      }
    }
  }

  if (gamePhase === 'slotSelect') {
    if (e.button === 0) {
      if (_slotDeleteConfirm != null) {
        for (const btn of _slotConfirmBtns) {
          if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
              mouseY >= btn.y && mouseY <= btn.y + btn.h) {
            if (btn.action === 'confirmDelete') {
              deleteSlot(_slotDeleteConfirm);
              _slotsMeta = loadSlotsMeta();
              _slotDeleteConfirm = null;
            } else {
              _slotDeleteConfirm = null;
            }
            return;
          }
        }
        return;
      }
      for (const btn of _slotSelectBtns) {
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          if (btn.action === 'delete') {
            _slotDeleteConfirm = btn.slotIndex;
          } else if (btn.action === 'select') {
            activateSlot(btn.slotIndex);
          }
          return;
        }
      }
    }
    return;
  }

  // Map select phase — first click selects, second click on same starts game
  if (gamePhase === 'campaignSelect') {
    if (e.button === 0) {
      for (const btn of _campaignSelectBtns) {
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          if (btn.action === 'prevPage') _campaignMapPage = Math.max(0, _campaignMapPage - 1);
          else if (btn.action === 'nextPage') {
            const maxPage = Math.ceil(CAMPAIGN_MAP_COUNT / CAMPAIGN_MAPS_PER_PAGE) - 1;
            _campaignMapPage = Math.min(maxPage, _campaignMapPage + 1);
          } else if (btn.action === 'skirmish') {
            _hintSeen.skirmishDiscovery = true;
            _skirmishDiscoveryTimer = 0;
            if (_campaignState) {
              _campaignState.uiHints = { ...(_campaignState.uiHints ?? {}), skirmishDiscovery: true };
              try { persistCampaign(); } catch {}
            }
            _campaignRegionActive = false;
            _mapAutoStartEnabled = true;
            gamePhase = 'mapSelect';
            mapAutoTimerStart = performance.now();
          } else if (btn.action === 'openMap') {
            _campaignMapIndex = btn.mapIndex;
            _campaignRegionActive = true;
            _commandMapView = 'overview';
            _selectedFrontId = null;
            if (btn.mapIndex === 0 && !_hintSeen.commandMap) {
              _commandMapHintTimer = 480;
              _hintSeen.commandMap = true;
              if (_campaignState) {
                _campaignState.uiHints = { ...(_campaignState.uiHints ?? {}), commandMap: true };
                try { persistCampaign(); } catch {}
              }
            }
            if (btn.mapIndex === 0 && (battlesCompleted === 0 || !(ensureCampaignProgress().mapRuns[0]?.nodesCleared?.length))) {
              _onboardingStep = ONBOARDING.COMMAND_MAP;
            }
            gamePhase = 'nodeMap';
          }
          return;
        }
      }
    }
    return;
  }

  if (gamePhase === 'nodeMap') {
    if (e.button === 0) {
      for (const btn of _nodeMapBtns) {
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          if (btn.action === 'back') gamePhase = 'campaignSelect';
          else if (btn.action === 'warCamp') {
            const _wcProgress = ensureCampaignProgress();
            _pendingNextAssaultNode = getNextAvailableAssault(_wcProgress, _campaignMapIndex, null)?.nodeIndex ?? null;
            enterCampaignWarCamp();
          } else if (btn.action === 'skirmish') {
            _hintSeen.skirmishDiscovery = true;
            _skirmishDiscoveryTimer = 0;
            if (_campaignState) {
              _campaignState.uiHints = { ...(_campaignState.uiHints ?? {}), skirmishDiscovery: true };
              try { persistCampaign(); } catch {}
            }
            _campaignRegionActive = false;
            _mapAutoStartEnabled  = false;
            gamePhase = 'mapSelect';
          } else if (btn.action === 'openFront') {
            _onboardingStep = advanceOnboarding(_onboardingStep, 'openFront');
            _commandMapView = 'front';
            _selectedFrontId = btn.frontId;
          } else if (btn.action === 'closeFront') {
            _commandMapView = 'overview';
            _selectedFrontId = null;
          } else if (btn.action === 'attack') {
            _onboardingStep = advanceOnboarding(_onboardingStep, 'startAssault');
            enterFieldPrep(_campaignMapIndex, btn.nodeIndex);
          } else if (btn.action === 'settlement') {
            beginSettlementCeremony();
          } else if (btn.action === 'prepareField') {
            enterFieldPrep(_campaignMapIndex, btn.nodeIndex ?? null);
          }
          return;
        }
      }
    }
    return;
  }

  if (gamePhase === 'mapSelect') {
    if (e.button === 0) {
      for (const btn of mapSelectBtns) {
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          if (selectedMapIdx === btn.idx) {
            initGame(PRESET_MAPS[btn.idx]);
            _mapAutoStartEnabled = false;
            mapAutoTimerStart = 0;
          } else if (_mapAutoStartEnabled) {
            selectedMapIdx = btn.idx;
            mapAutoTimerStart = performance.now();
          } else {
            selectedMapIdx = btn.idx;
          }
          return;
        }
      }
    }
    return;
  }

  // Post-battle debrief — buttons after 2s gate (campaign assault flow)
  if (gamePhase === 'debrief') {
    if (e.button === 0 && _debriefTimer >= 60) {
      if (_returnToNodeMapAfterDebrief) {
        for (const btn of _debriefBtns) {
          if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
              mouseY >= btn.y && mouseY <= btn.y + btn.h) {
            _returnToNodeMapAfterDebrief = false;
            gameOver = false;
            victory = false;
            if (_pendingSettlementCeremony && isFirstSagaMap(_campaignMapIndex)) {
              beginSettlementCeremony();
              return;
            }
            routeAfterCampaignDebrief(btn);
            return;
          }
        }
      } else {
        _betweenFadeIn = _battleResult === 'defeat' ? 0 : 30;
        gamePhase = 'betweenBattles';
      }
    }
    return;
  }

  if (gamePhase === 'settlementCeremony') {
    if (e.button === 0) {
      for (const btn of _settlementCeremonyBtns) {
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          if (btn.action === 'pickRecruit') {
            _settlementRecruitType = btn.recruitType;
            return;
          }
          if (btn.action === 'advance') {
            advanceSettlementCeremonyStep();
          }
          return;
        }
      }
    }
    return;
  }

  if (gamePhase === 'heroNamingCeremony') {
    if (e.button === 0) {
      for (const btn of _heroNamingBtns) {
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          if (btn.action === 'confirm') {
            completeHeroNamingCeremony();
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
      // Campaign victory overlay — dismiss on click
      if (_campaignVictoryScreen) { _campaignVictoryScreen = false; return; }
      // Skip fade-in on any click
      if (_betweenFadeIn > 0) { _betweenFadeIn = 0; return; }
      // Bio/ceremony/chronicle overlays intercept all clicks while open
      if (_showDefenderBio) {
        const _bio = _showDefenderBio;
        if (_bio.bioText && _bio.revealChars < _bio.bioText.length) {
          _bio.revealChars = _bio.bioText.length; // skip to end
        } else {
          _showDefenderBio = null; // close
        }
        return;
      }
      if (_showChronicle) {
        for (const _cb of _chronicleBtns) {
          if (mouseX >= _cb.x && mouseX <= _cb.x + _cb.w &&
              mouseY >= _cb.y && mouseY <= _cb.y + _cb.h) {
            if (_cb.action === 'filterDef') {
              _chronicleDefFilter = _chronicleDefFilter === _cb.defenderId ? null : _cb.defenderId;
              _chronicleScrollY = 0;
              if (_campaignState) {
                _campaignState.uiHints = { ...(_campaignState.uiHints ?? {}), chronicleDefFilter: _chronicleDefFilter };
                try { persistCampaign(); } catch {}
              }
            } else if (_cb.action === 'filterBattle') {
              _chronicleBattleFilter = _chronicleBattleFilter === _cb.battleFilter ? null : _cb.battleFilter;
              _chronicleScrollY = 0;
              if (_campaignState) {
                _campaignState.uiHints = { ...(_campaignState.uiHints ?? {}), chronicleBattleFilter: _chronicleBattleFilter };
                try { persistCampaign(); } catch {}
              }
            }
            return;
          }
        }
        _showChronicle = false; _chronicleDefFilter = null; _chronicleBattleFilter = null; _navActiveId = 'battle'; return;
      }
      if (_retirementCeremony) { /* handled by _betweenBtns retirement actions below */ }

      // Named campaign event card — intercepts all clicks when visible
      if (_pendingCampaignEvent && _betweenFadeIn <= 0 && _eventCardAnim > 12) {
        for (const evBtn of _pendingEventBtns) {
          if (mouseX >= evBtn.x && mouseX <= evBtn.x + evBtn.w &&
              mouseY >= evBtn.y && mouseY <= evBtn.y + evBtn.h) {
            if (evBtn.choice === 'PASS') { _pendingCampaignEvent = null; return; }
            if (evBtn.canAfford) applyCampaignEventChoice(_pendingCampaignEvent.id, evBtn.choice);
            return;
          }
        }
        return; // click on card backdrop = no-op
      }

      for (const btn of _betweenBtns) {
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w &&
            mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          if (!['pendingDismiss', 'confirmDismiss'].includes(btn.action)) _pendingDismiss = null;
          if (!['startRename'].includes(btn.action)) _renameState = null;
          if (btn.action === 'fightAgain') {
            _betweenSubtab = 'recruit';
            if (isCampaignWarCamp()) {
              gamePhase = 'nodeMap';
            } else {
              initBattle(_currentBattlePreset);
            }
          } else if (btn.action === 'commandMap') {
            _commandMapView = _lastClearedFrontId ? 'front' : 'overview';
            _selectedFrontId = _lastClearedFrontId;
            gamePhase = 'nodeMap';
          } else if (btn.action === 'nextAssault') {
            enterFieldPrep(_campaignMapIndex, btn.nodeIndex);
          } else if (btn.action === 'retryAssault') {
            enterFieldPrep(_campaignMapIndex, _campaignNodeIndex);
          } else if (btn.action === 'prepareField') {
            enterFieldPrep(_campaignMapIndex, btn.nodeIndex ?? _pendingNextAssaultNode ?? null);
          } else if (btn.action === 'mapSelect') {
            gamePhase = 'campaignSelect';
            _betweenSubtab = 'recruit';
          } else if (btn.action === 'buyRune') {
            if (stars >= btn.cost && (runeInventory[btn.runeId] ?? 0) < (RUNE_DEFS.find(r => r.id === btn.runeId)?.maxOwned ?? 0)) {
              stars -= btn.cost;
              runeInventory[btn.runeId] = (runeInventory[btn.runeId] ?? 0) + 1;
              _campaignState.stars = stars;
              _campaignState.runeInventory = { ...runeInventory };
              try { persistCampaign(); } catch {}
              sfxRune();
            }
          } else if (btn.action === 'warChestDonate') {
            const cost = getWarChestCost(false);
            if (goldReserve >= cost) {
              goldReserve -= cost;
              _campaignState.goldReserve = goldReserve;
              try { persistCampaign(); } catch {}
              _eventOutcomeToast = { text: 'War Chest filled — warband stands ready', timer: 110, color: UI_COLORS.fortress };
              sfxUpgrade('barracks');
            }
          } else if (btn.action === 'warChestElite') {
            const cost = getWarChestCost(true);
            if (goldReserve >= cost) {
              goldReserve -= cost;
              _campaignState.goldReserve = goldReserve;
              try { persistCampaign(); } catch {}
              stars = Math.min(999, stars + 1);
              _campaignState.stars = stars;
              _eventOutcomeToast = { text: 'Grand War Chest — +1 ✦ star tribute', timer: 120, color: UI_COLORS.gold };
              sfxUpgrade('runeshrine');
            }
          } else if (btn.action === 'upgradeFieldHero') {
            upgradeFieldHeroAtWarCamp(btn.defenderId);
          } else if (btn.action === 'upgradeFieldStructure') {
            upgradeFieldTowerAtWarCamp({ col: btn.col, row: btn.row });
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
              // Add to Hall of Fallen if they had enough service
              const _dRank = getRank(dismissDef);
              if (['veteran','champion','ironguard','legend'].includes(_dRank.id) || (dismissDef.titles?.length ?? 0) > 0) {
                if (!_campaignState.hallOfFallen) _campaignState.hallOfFallen = [];
                _campaignState.hallOfFallen.push({
                  name:         dismissDef.name,
                  type:         dismissDef.type,
                  rankLabel:    _dRank.label,
                  battlesPlayed: dismissDef.battlesPlayed,
                  careerKills:  dismissDef.careerKills,
                  titles:       dismissDef.titles?.slice() ?? [],
                  scars:        dismissDef.scars?.slice() ?? [],
                  trait:        dismissDef.trait ?? null,
                  epitaph:      generateEpitaph(dismissDef),
                  at:           battlesCompleted,
                  reason:       'dismissed',
                });
              }
              // Bond grief — surviving bonded defender earns a scar
              const _bonds = _campaignState.bonds ?? [];
              for (const _bond of _bonds) {
                if (_bond.defenderIds.includes(btn.defenderId)) {
                  const _survivorId = _bond.defenderIds.find(id => id !== btn.defenderId);
                  const _survivor   = _roster.find(_survivorId);
                  if (_survivor && !_survivor.scars?.includes('bond_grief')) {
                    if (!_survivor.scars) _survivor.scars = [];
                    _survivor.scars.push('bond_grief');
                    sfxBondGrief();
                    _promotionQueue.push({
                      defenderName: _survivor.name,
                      rankLabel:    'BOND GRIEF',
                      text:         `${_survivor.name} has lost a bonded shield-brother. They carry the Bond Grief.`,
                      type:         'scar',
                    });
                  }
                }
              }
              _campaignState.bonds = _bonds.filter(b => !b.defenderIds.includes(btn.defenderId));
            }
            _roster.dismiss(btn.defenderId);
            _pendingDismiss = null;
            _campaignState.defenders = _roster.toJSON();
            _campaignState.equipmentInventory = _equipmentInventory.slice();
            try { persistCampaign(); } catch {}
            sfxDismiss();
          } else if (btn.action === 'retireWithHonor') {
            const _retDef = _roster.find(btn.defenderId);
            if (_retDef) {
              for (const itemId of _retDef.equipment) {
                if (itemId) _equipmentInventory.push(itemId);
              }
              if (!_campaignState.hallOfHonored) _campaignState.hallOfHonored = [];
              const _clsLbl = TOWER_DEFS[_retDef.type]?.label ?? _retDef.type;
              _campaignState.hallOfHonored.push({
                name:          _retDef.name,
                type:          _retDef.type,
                rankLabel:     getRank(_retDef).label,
                battlesPlayed: _retDef.battlesPlayed,
                careerKills:   _retDef.careerKills,
                titles:        _retDef.titles?.slice() ?? [],
                scars:         _retDef.scars?.slice() ?? [],
                trait:         _retDef.trait ?? null,
                epitaph:       generateEpitaph(_retDef),
                legacyNote:    `Legacy lives on in the next ${_clsLbl}`,
                at:            battlesCompleted,
                reason:        'retired',
              });
              // Legacy bonus — stacks per class (array), capped at 3
              if (!_campaignState.legacyBonuses) _campaignState.legacyBonuses = {};
              if (!Array.isArray(_campaignState.legacyBonuses[_retDef.type])) {
                // Migrate old scalar value to array
                const _old = _campaignState.legacyBonuses[_retDef.type];
                _campaignState.legacyBonuses[_retDef.type] = _old ? [_old] : [];
              }
              if (_campaignState.legacyBonuses[_retDef.type].length < 3) {
                const _lStat = ['hydda', 'blondie', 'isjatten'].includes(_retDef.type)
                  ? { stat: 'cm', value: 0.93 }
                  : _retDef.type === 'piltorn'
                  ? { stat: 'rm', value: 1.08 }
                  : { stat: 'dm', value: 1.08 };
                _campaignState.legacyBonuses[_retDef.type].push({
                  fromName: _retDef.name, fromRank: getRank(_retDef).label,
                  stat: _lStat.stat, value: _lStat.value,
                });
              }
              // Bond cleanup
              const _retBonds = _campaignState.bonds ?? [];
              for (const _bond of _retBonds) {
                if (_bond.defenderIds.includes(_retDef.defenderId)) {
                  const _survivorId = _bond.defenderIds.find(id => id !== _retDef.defenderId);
                  const _survivor   = _roster.find(_survivorId);
                  if (_survivor && !_survivor.scars?.includes('bond_grief')) {
                    if (!_survivor.scars) _survivor.scars = [];
                    _survivor.scars.push('bond_grief');
                  }
                }
              }
              _campaignState.bonds = _retBonds.filter(b => !b.defenderIds.includes(_retDef.defenderId));
            }
            _roster.dismiss(btn.defenderId);
            _retirementCeremony = null;
            _pendingDismiss = null;
            _campaignState.defenders = _roster.toJSON();
            _campaignState.equipmentInventory = _equipmentInventory.slice();
            try { persistCampaign(); } catch {}
            sfxDismiss();
          } else if (btn.action === 'cancelRetirement') {
            _retirementCeremony = null;
          } else if (btn.action === 'ackPromotion') {
            _promotionQueue.shift();
            _promoBannerTimer = 0;
          } else if (btn.action === 'openBio') {
            _showDefenderBio = { defenderId: btn.defenderId, bioText: null, revealChars: 0, bioLines: null };
            sfxRune();
          } else if (btn.action === 'openRetire') {
            const retDef = _roster?.find(btn.defenderId);
            if (retDef) { _retirementCeremony = retDef; _retireCeremonyFade = 30; sfxRetireCeremony(); }
          } else if (btn.action === 'startRename') {
            const def = _roster?.find(btn.defenderId);
            if (def && def.careerLevel >= 1) _renameState = { defenderId: def.defenderId, draft: def.name };
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
                  sfxEquipItem();
                  _equipFlash = {
                    defenderId: def.defenderId,
                    timer: 72,
                    color: nextId ? (RARITY_COLOR[ITEM_DEFS[nextId]?.rarity] ?? '#c0a0ff') : '#88aa88',
                    itemName: nextId ? (ITEM_DEFS[nextId]?.name ?? null) : null,
                  };
                  spawnEquipSparkles(_equipFlash.color);
                  _campaignState.defenders = _roster.toJSON();
                  _campaignState.equipmentInventory = _equipmentInventory.slice();
                  try { persistCampaign(); } catch {}
                }
              }
            }
          } else if (btn.action === 'cycleFortressRole') {
            const def = _roster.find(btn.defenderId);
            if (def) {
              def.fortressRole = cycleFortressRole(def.fortressRole ?? getDefaultFortressRole(def.type));
              _campaignState.defenders = _roster.toJSON();
              try { persistCampaign(); } catch {}
            }
          } else if (btn.action === 'applyPreset') {
            applySquadPreset(btn.presetId, _roster.defenders);
            _campaignState.squadPreset = btn.presetId;
            _campaignState.defenders = _roster.toJSON();
            try { persistCampaign(); } catch {}
          } else if (btn.action === 'recruit') {
            const _rg = canRecruitInCampaignWarCamp();
            if (!_rg.ok) {
              _uiToast = { text: _rg.reason, timer: 140, color: UI_COLORS.gold };
            } else if (goldReserve >= _effectiveRecruitCost && _recruitType) {
              const id   = _generateId();
              const name = getDefenderName(_recruitType);
              const def  = new Defender({ defenderId: id, name, type: _recruitType });
              def.trait  = getRandomTrait(_recruitType);
              def.fortressRole = getDefaultFortressRole(_recruitType);
              // Apply legacy bonus if one exists for this class (pop oldest from array)
              const _legArr = (_campaignState.legacyBonuses ?? {})[_recruitType];
              def.legacyBonus = Array.isArray(_legArr) ? (_legArr.shift() ?? null) : (_legArr ?? null);
              if (Array.isArray(_legArr) && _legArr.length === 0) delete (_campaignState.legacyBonuses ?? {})[_recruitType];
              _roster.defenders.push(def);
              goldReserve -= _effectiveRecruitCost;
              _campaignState.goldReserve = goldReserve;
              _campaignState.defenders   = _roster.toJSON();
              try { persistCampaign(); } catch {}
              sfxRecruit(_recruitType);
            }
          } else if (btn.action === 'switchTab') {
            _warCampTab = btn.tab;
            _betweenSubtab = btn.tab;
            _rosterScrollOffset = 0;
            if (_warCampTabPulse === btn.tab) {
              _warCampTabPulse = null;
              if (btn.tab === 'recruit') {
                _hintSeen.recruitTab = true;
                if (_campaignState) {
                  _campaignState.uiHints = { ...(_campaignState.uiHints ?? {}), recruitTab: true };
                }
              }
              if (btn.tab === 'fortress') {
                _hintSeen.fortressTab = true;
                if (_campaignState) {
                  _campaignState.uiHints = { ...(_campaignState.uiHints ?? {}), fortressTab: true };
                }
              }
              try { persistCampaign(); } catch {}
            }
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
                try { persistCampaign(); } catch {}
                sfxFortressUpgrade();
              }
            }
          } else if (btn.action === 'openChronicle') {
            _showChronicle = true;
            // Preserve scroll position — player should return to where they were
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
        else                             { gamePhase = 'mapSelect'; _mapAutoStartEnabled = true; mapAutoTimerStart = performance.now(); selectedMapIdx = 0; }
      }
      if (!showTopList && toplistBtn &&
          mouseX >= toplistBtn.x && mouseX <= toplistBtn.x + toplistBtn.w &&
          mouseY >= toplistBtn.y && mouseY <= toplistBtn.y + toplistBtn.h) {
        showTopList = true;
      }
    }
    return;
  }

  // Rune cartridge buy / close (inline panel — does not block other UI)
  if (e.button === 0 && showRuneMenu) {
    for (const rb of runeMenuBtns) {
      if (mouseX >= rb.x && mouseX <= rb.x + rb.w &&
          mouseY >= rb.y && mouseY <= rb.y + rb.h) {
        if (rb.close) {
          showRuneMenu = false;
          return;
        }
        const def   = RUNE_DEFS[rb.idx];
        const owned = runeInventory[def.id] ?? 0;
        if (owned < def.maxOwned && stars >= def.cost) {
          stars -= def.cost;
          runeInventory[def.id] = owned + 1;
          sfxRune();
        }
        return;
      }
    }
  }

  // Fortress Commander prep — schematic hotspots + context panel
  if (e.button === 0 && isFortressPrepPhase() && _prepShell) {
    const pf = getCommanderPlayfield();
    let action = handlePrepShellPointer(_prepShell, mouseX, mouseY, pf, null, 'click');
    if (!action && _prepShell.hornHoverZone) {
      const hz = _prepShell.hornHoverZone;
      if (mouseX >= hz.x && mouseX <= hz.x + hz.w && mouseY >= hz.y && mouseY <= hz.y + hz.h) {
        action = { type: 'horn' };
      }
    }
    processPrepShellClick(action);
    return;
  }

  // Warband roster panel — deploy / select field defenders
  if (e.button === 0 && gamePhase === 'playing') {
    for (const rb of _rosterPanelBtns) {
      if (mouseX >= rb.x && mouseX <= rb.x + rb.w &&
          mouseY >= rb.y && mouseY <= rb.y + rb.h) {
        const fieldRef = rb.fieldTower ?? (typeof rb.deployed === 'object' ? rb.deployed : null);
        if (fieldRef) {
          if (fieldRef !== selectedTower) _heroMoveMode = null;
          selectedTower = fieldRef;
        } else if (!canLayoutCampaignField()) {
          return;
        } else {
          buildMode         = CELL.TOWER;
          selectedTowerType = rb.id;
          selectedTower     = null;
          dragItem          = rb;
          dragX             = mouseX;
          dragY             = mouseY;
          dragStartX        = mouseX;
          dragStartY        = mouseY;
          _placingDefenderId = rb.defenderId ?? null;
        }
        return;
      }
    }
  }

  // Build-mode button row — left-click starts a drag
  if (e.button === 0) {
    const btn = getBuildButtonAt(mouseX, mouseY);
    if (btn) {
      if (_campaignNodeMode && !canLayoutCampaignField()) return;
      _leftDockTab = 'structures';
      _buildBtnsCache = null;
      _structureScrollY = 0;
      buildMode = btn.mode;
      if (btn.mode === CELL.TOWER) selectedTowerType = btn.id;
      if (btn.mode === CELL.GATE) selectedGateType = btn.id;
      if (btn.mode === CELL.WALL) return;
      selectedTower = null;
      dragItem = btn;
      dragX    = mouseX;
      dragY    = mouseY;
      dragStartX = mouseX;
      dragStartY = mouseY;
      _placingDefenderId = null;
      return;
    }
  }

  // Rune picker overlay clicks
  if (e.button === 0 && showRunePicker && runePickerTower) {
    for (const rb of runePickerBtns) {
      if (mouseX >= rb.x && mouseX <= rb.x + rb.w && mouseY >= rb.y && mouseY <= rb.y + rb.h) {
        const tower = runePickerTower;
        if (_itemRunePickMode) {
          if (rb.remove) {
            runeInventory[tower.itemRune] = (runeInventory[tower.itemRune] ?? 1) + 1;
            tower.clearItemRune();
          } else if (rb.equip) {
            if (tower.itemRune) runeInventory[tower.itemRune] = (runeInventory[tower.itemRune] ?? 1) + 1;
            runeInventory[rb.def.id] = Math.max(0, (runeInventory[rb.def.id] ?? 0) - 1);
            tower.setItemRune(rb.def.id);
          }
        } else {
          if (rb.remove) {
            runeInventory[tower.rune] = (runeInventory[tower.rune] ?? 1) + 1;
            tower.clearRune();
          } else if (rb.equip) {
            if (tower.rune) runeInventory[tower.rune] = (runeInventory[tower.rune] ?? 1) + 1;
            runeInventory[rb.def.id] = Math.max(0, (runeInventory[rb.def.id] ?? 0) - 1);
            tower.setRune(rb.def.id);
          }
        }
        showRunePicker = false; runePickerTower = null; _itemRunePickMode = false;
        return;
      }
    }
    showRunePicker = false; runePickerTower = null;
    return;
  }

  // Tower panel buttons (when a tower is selected)
  if (e.button === 0 && selectedTower) {
    if (panelMoveBtn &&
        mouseX >= panelMoveBtn.x && mouseX <= panelMoveBtn.x + panelMoveBtn.w &&
        mouseY >= panelMoveBtn.y && mouseY <= panelMoveBtn.y + panelMoveBtn.h) {
      _heroMoveMode = (_heroMoveMode === selectedTower) ? null : selectedTower;
      return;
    }
    if (panelRuneBtn &&
        mouseX >= panelRuneBtn.x && mouseX <= panelRuneBtn.x + panelRuneBtn.w &&
        mouseY >= panelRuneBtn.y && mouseY <= panelRuneBtn.y + panelRuneBtn.h) {
      if (showRunePicker && runePickerTower === selectedTower && !_itemRunePickMode) {
        showRunePicker = false; runePickerTower = null;
      } else {
        showRunePicker = true; runePickerTower = selectedTower;
        _itemRunePickMode = false;
        showRuneMenu   = false;
      }
      return;
    }
    if (panelItemRuneBtn &&
        mouseX >= panelItemRuneBtn.x && mouseX <= panelItemRuneBtn.x + panelItemRuneBtn.w &&
        mouseY >= panelItemRuneBtn.y && mouseY <= panelItemRuneBtn.y + panelItemRuneBtn.h) {
      if (showRunePicker && runePickerTower === selectedTower && _itemRunePickMode) {
        showRunePicker = false; runePickerTower = null; _itemRunePickMode = false;
      } else {
        showRunePicker = true; runePickerTower = selectedTower;
        _itemRunePickMode = true;
        showRuneMenu   = false;
      }
      return;
    }
    if (panelUpgradeBtn &&
        mouseX >= panelUpgradeBtn.x && mouseX <= panelUpgradeBtn.x + panelUpgradeBtn.w &&
        mouseY >= panelUpgradeBtn.y && mouseY <= panelUpgradeBtn.y + panelUpgradeBtn.h) {
      if (!canUpgradeHeroNow()) return;
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
      if (!canModifyWarbandDeployment()) return;
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

  // Auto-next toggle removed — campaign auto-advances waves 2+

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
      _hintSeen.runeForge = true;
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

  // Hero move mode: clicking a cell relocates the selected hero
  if (_heroMoveMode && e.button === 0) {
    if (cell !== null && cell !== CELL.SPAWN && cell !== CELL.GOAL) {
      moveHeroTo(_heroMoveMode, col, row);
    }
    _heroMoveMode = null;
    return;
  }

  if (cell === null || cell === CELL.SPAWN || cell === CELL.GOAL) {
    selectedTower = null;
    return;
  }

  if (e.button !== 0) return;

  // Left-click on placed tower: select it (or consume Ancestral Aid free upgrade)
  if (cell === CELL.TOWER) {
    const clickedT = getTowerAtCell(col, row);
    if (ancestralAidActive && clickedT && !_campaignNodeMode) {
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
    if (clickedT !== selectedTower) _heroMoveMode = null;
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

  // Command Center nav hover
  let _navFound = false;
  for (let _ni = 0; _ni < _navBtns.length; _ni++) {
    const _nb = _navBtns[_ni];
    if (dragX >= _nb.x && dragX <= _nb.x + _nb.w && dragY >= _nb.y && dragY <= _nb.y + _nb.h) {
      _navHover = _ni; _navFound = true; break;
    }
  }
  if (!_navFound) _navHover = -1;

  if (isFortressPrepPhase() && _prepShell) {
    const pf = getCommanderPlayfield();
    handlePrepShellPointer(_prepShell, dragX, dragY, pf, null, 'move');
    const hz = _prepShell.hornHoverZone;
    if (hz) {
      _prepShell.hornHover = dragX >= hz.x && dragX <= hz.x + hz.w
        && dragY >= hz.y && dragY <= hz.y + hz.h;
    }
  }
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
  if (!dragItem || gameOver) { dragItem = null; _placingDefenderId = null; return; }
  const rect   = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left - panX) / gameScale;
  const mouseY = (e.clientY - rect.top  - panY) / gameScale;
  const overUi = (mouseX < FRAME_THICK + LEFT_DOCK_W && mouseY >= GRID_TOP && mouseY < GRID_BOTTOM)
    || (mouseX >= combatRightPanelX() && mouseY >= GRID_TOP);
  const dragDist = Math.hypot(mouseX - dragStartX, mouseY - dragStartY);
  if (overUi || dragDist < 10) {
    dragItem = null;
    _placingDefenderId = null;
    return;
  }
  const { x: gridX, y: gridY } = outerToGridLocal(mouseX, mouseY);
  const { col, row } = grid.pixelToCell(gridX, gridY);
  tryPlaceAt(col, row, dragItem.mode, dragItem.id);
  dragItem = null;
  _placingDefenderId = null;
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

  // Chronicle overlay consumes wheel for scrolling
  if (_showChronicle) {
    _chronicleScrollY = Math.max(0, _chronicleScrollY + e.deltaY * 0.5);
    return;
  }

  const rect    = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  const outerX  = (screenX - panX) / gameScale;
  const outerY  = (screenY - panY) / gameScale;

  // Structures dock scroll
  if (gamePhase === 'playing' && _leftDockTab === 'structures' &&
      outerX >= FRAME_THICK && outerX <= FRAME_THICK + LEFT_DOCK_W &&
      outerY >= GRID_TOP && outerY <= GRID_TOP + leftDockPanelHeight()) {
    const lm = _structureListLayout(FRAME_THICK, GRID_TOP, LEFT_DOCK_W, leftDockPanelHeight());
    _structureScrollY = Math.max(0, Math.min(lm.maxScroll, _structureScrollY + e.deltaY * 0.45));
    _buildBtnsCache = null;
    return;
  }

  // Only zoom when cursor is over the grid
  const inGrid = outerX >= playfieldLeft() && outerX <= playfieldLeft() + playfieldWidth() &&
                 outerY >= GRID_TOP  && outerY <= GRID_TOP  + playfieldHeight();
  if (!inGrid) return;

  const delta   = e.deltaY > 0 ? -0.15 : 0.15;
  const newZoom = Math.max(1.0, Math.min(4.0, gridZoom + delta));
  if (newZoom === gridZoom) return;

  // Zoom centered on cursor position within grid
  const localX = outerX - playfieldLeft() - gridPanX;
  const localY = outerY - GRID_TOP - gridPanY;
  const s = effectiveGridZoom();
  const cx = COLS * CELL_SIZE * 0.5;
  const cy = ROWS * CELL_SIZE * 0.5;
  const gridLocalX = (localX - cx) / s + cx;
  const gridLocalY = (localY - cy) / s + cy;
  const newS = newZoom * playfieldScale();
  gridZoom = newZoom;
  gridPanX = localX - (gridLocalX - cx) * newS - cx;
  gridPanY = localY - (gridLocalY - cy) * newS - cy;
  clampGridPan();
}, { passive: false });

function clampRightPanelScale() {
  rightPanelScale = Math.max(0.92, Math.min(1.08, rightPanelScale));
}

// ── update ────────────────────────────────────────────────────────────────────

function update() {
  if (gameOver || gamePhase !== 'playing' || isPaused) return;
  if (isFortressPrepPhase()) return;

  // Treasury stage advancement pulse
  {
    const _curStage = getHoardStage(gold).level;
    if (_curStage > _lastTreasuryStage) {
      _lastTreasuryStage = _curStage;
      hoardPulse = Math.max(hoardPulse, 90);
    }
  }

  // Campaign node: waves 2+ auto-start after a short breather
  const _campaignAutoNext = isCampaignCombat() && _nodeWavePlan && _nodeWaveIndex > 0
    && (waveState === 'break');
  const _sagaWaveBreak = (_campaignNodeMode && isFirstSagaMap(_campaignMapIndex) && isFirstSagaAssaultNode(_campaignNodeIndex))
    ? getFirstSagaWaveBreakFrames(_campaignNodeIndex)
    : 60;
  if (_campaignAutoNext && waveTimer > _sagaWaveBreak) {
    startNextWave();
  } else if (autoNextWave && waveTimer > 60 && (waveState === 'break' || waveState === 'countdown')) {
    startNextWave();
  }

  if (flawlessTimer > 0) flawlessTimer--;

  if (pendingSell) {
    pendingSell.timer--;
    if (pendingSell.timer <= 0) pendingSell = null;
  }
  if (mylingWarningTimer    > 0) mylingWarningTimer--;
  if (maraEmpWarningTimer   > 0) maraEmpWarningTimer--;
  if (jotunnWarningTimer    > 0) jotunnWarningTimer--;
  if (fossegrimWarningTimer > 0) fossegrimWarningTimer--;
  if (_firstChampionTooltipTimer > 0) _firstChampionTooltipTimer--;

  // ── Fossegrim heal aura ───────────────────────────────────────────────────────
  for (const fg of enemies) {
    if (fg.type !== ENEMY_TYPES.FOSSEGRIM || !fg.alive || fg.reached) continue;
    if (fg.healPulseVis > 0) fg.healPulseVis--;
    if (fg.healTimer > 0) { fg.healTimer--; continue; }
    const aura = ENEMY_DEFS.fossegrim.healAura;
    let healed = false;
    for (const en of enemies) {
      if (!en.alive || en.reached || en === fg) continue;
      const dx = en.x - fg.x, dy = en.y - fg.y;
      if (dx * dx + dy * dy <= aura.radius * aura.radius) {
        en.hp = Math.min(en.maxHp, en.hp + aura.amount);
        healed = true;
      }
    }
    if (healed) fg.healPulseVis = 22;
    fg.healTimer = aura.cooldownFrames;
  }

  updateWave();

  // ── Synergy detection — only recomputed when towers change ───────────────────
  if (_synergyDirty) {
    _synergyDirty = false;
    // Snapshot previous synergy state before clearing, to detect new synergy formations
    const _prevSynSnap = new Map(towers.map(t => [t, t._synergy]));
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
    // Detect newly formed synergies and play SFX once per formation
    let _newSynergyFormed = false;
    for (const t of towers) {
      if (t._synergy && !_prevSynSnap.get(t)) { _newSynergyFormed = true; break; }
    }
    if (_newSynergyFormed) sfxSynergy();
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

  // Cache alive enemies once per tick — reused in tower.update(), splash, nova, chain
  const _aliveEnemies = enemies.filter(e => e.alive && !e.reached);

  // Targeting line timers — tick down before towers fire so the fire frame shows full duration
  for (const t of towers) {
    if (t.targetLineTimer > 0) t.targetLineTimer--;
  }

  updateWarbandMovement();

  // ── Tower updates ─────────────────────────────────────────────────────────────
  for (const tower of towers) {
    // Apply synergy stat boosts temporarily around update()
    const _origRange    = tower.range;
    const _origSplash   = tower.splashDamage;
    const _origFireRate = tower.fireRate;
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
    if (isHeroTowerType(tower.type) && tower.defenderId) {
      const def = _roster?.find(tower.defenderId);
      if (def) {
        const ctx = buildHeroModifierCtx(tower, !!tower._currentTarget?.isBoss);
        const trait = getTraitModifiers(def, ctx);
        const roleMult = getFortressRoleDamageMult(def, tower.col, tower.row, ctx);
        const bossMult = tower._currentTarget?.isBoss ? trait.bossDmgMult : 1;
        tower._synergyDmgBoost *= trait.dmgMult * roleMult * bossMult;
        if (trait.rangeMult !== 1) tower.range    = Math.round(tower.range    * trait.rangeMult);
        if (trait.cdMult    !== 1) tower.fireRate = Math.max(4, Math.round(tower.fireRate * trait.cdMult));
      }
    }

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
    tower.fireRate     = _origFireRate;

    if (!tr) continue;
    if (tr.type === 'heal') {
      const healCount = tr.count ?? 1;
      if (isPathlessMode()) {
        const heals = pickWarbandHealTargets(tower, towers, healCount, {
          isCasualty: (id) => isNodeCasualty(_nodeCasualties, id),
        });
        for (const { target, amount } of heals) {
          target.combatHp = Math.min(target.combatMaxHp, target.combatHp + amount);
          tower.healDone = (tower.healDone ?? 0) + amount;
          sfxHeal();
          dmgFloaters.push({
            x: target.x, y: target.y - 12,
            val: `+${amount}`, life: 70, maxLife: 70,
            color: '#60d8a0', large: false, suffix: 'hp',
          });
        }
        if (heals.length > 0) {
          spawnParticles(tower.x, tower.y, '#60d8a0', 10 * heals.length);
        } else {
          tower.fireFlash = 0;
        }
        // Tidecall: Healer also slows nearest enemy within 100px on heal
        if (tower._synergy === 'tidecall' && heals.length > 0) {
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
      } else {
        for (let h = 0; h < healCount && lives < STARTING_LIVES; h++) {
          lives++;
          sfxHeal();
        }
        if (healCount > 0) spawnParticles(tower.x, tower.y, '#60d8a0', 10 * healCount);
        if (lives >= STARTING_LIVES) tower.fireFlash = 0;
      }
    } else if (tr.type === 'nova') {
      sfxNova();
      novaRings.push({ x: tr.x, y: tr.y, r: 0, maxR: tr.r, life: 26, maxLife: 26 });
      if (tr.killed > 0) {
        tower.killCount    += tr.killed;
        slain              += tr.killed;
        waveSlainCount     += tr.killed;
        _checkKillMilestone(tower);
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
            spawnGoldCoins(gridScreenX(e.x), gridScreenY(e.y), e.reward);
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
      if (b.source) {
        b.source.killCount++;
        b.source.goldGenerated = (b.source.goldGenerated || 0) + reward + valBonus;
        // Kill milestone check — compare career kills + battle kills against thresholds
        _checkKillMilestone(b.source);
      }
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
      const _fJitter = dmgFloaters.some(f => Math.abs(f.x - killX) < 10 && Math.abs(f.y - (killY - 8)) < 10) ? (Math.random() - 0.5) * 10 : 0;
      dmgFloaters.push({ x: killX, y: killY - 8 + _fJitter, val: valBonus > 0 ? `${reward + valBonus} ★` : reward + valBonus, life: isCrit ? 70 : 52, maxLife: isCrit ? 70 : 52, color: isCrit ? '#ff8820' : valBonus > 0 ? '#ffb020' : (reward + valBonus) >= 20 ? '#ff9040' : '#ffcc44', large: isCrit });
      if (killBoss) {
        if (b.target && b.canPierce && b.alive) { /* boss killed mid-pierce — handled at deathTimer */ }
        else if (b.target?.isBoss) onBossKilled(b.target, b.source);
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
        spawnGoldCoins(gridScreenX(killX), gridScreenY(killY), reward, coinSpeed);
        // Last-enemy burst: gold particle shower at kill location when wave is cleared
        if (spawnQueue.length === 0 && enemies.filter(e => e.alive).length === 0) {
          spawnParticles(killX, killY, '#f5d030', 22);
          spawnParticles(killX, killY, '#ffffff', 8);
          impactFlashes.push({ x: killX, y: killY, maxR: 36, life: 1, color: '#f5d030' });
          _finalKillRings.push({ x: killX, y: killY, r: 4, alpha: 1.0 });
        }
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
              if (b.source) {
                b.source.killCount++;
                b.source.goldGenerated = (b.source.goldGenerated || 0) + _splashVal;
                _checkKillMilestone(b.source);
              }
              if (splashKills === 1) sfxDie(enemy.isBoss, enemy.type);  // only play once per splash cluster
              if (b.source) b.source.damageDealt += b.splashDamage;
              dmgFloaters.push({ x: enemy.x, y: enemy.y - 8, val: _splashVal, life: 52, maxLife: 52, color: _splashVal >= 20 ? '#ff9040' : '#ffcc44' });
              if (enemy.isBoss) {
                onBossKilled(enemy, b.source);
              } else {
                spawnParticles(enemy.x, enemy.y, enemy.highlightColor, 5);
                spawnGoldCoins(gridScreenX(enemy.x), gridScreenY(enemy.y), enemy.reward);
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

  // FROST MARCH trail: apply slow to enemies on frost cells; expire old cells
  if (currentWaveEvent?.special === 'frostMarch') {
    const _tick = Date.now();
    for (const [_fk, _exp] of _frostTrailCells) { if (_tick > _exp) _frostTrailCells.delete(_fk); }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    if (isPathlessMode()) updateEnemyPathlessTarget(enemies[i]);
    enemies[i].update();
    // FROST MARCH: enemy leaves a slow trail; enemies on trail get slowed
    if (currentWaveEvent?.special === 'frostMarch' && enemies[i].alive && !enemies[i].reached) {
      const _fc = grid.pixelToCell(enemies[i].x, enemies[i].y);
      if (_fc) _frostTrailCells.set(`${_fc.col}_${_fc.row}`, Date.now() + 5000);
      const _myCell = `${grid.pixelToCell(enemies[i].x, enemies[i].y)?.col}_${grid.pixelToCell(enemies[i].x, enemies[i].y)?.row}`;
      if (_frostTrailCells.has(_myCell)) {
        enemies[i].slowTimer  = Math.max(enemies[i].slowTimer ?? 0, 18);
        enemies[i].slowFactor = Math.min(enemies[i].slowFactor ?? 1, 0.70);
      }
    }
    if (!enemies[i].alive) {
      // Keep in array while death fade is playing, remove when timer expires
      if (enemies[i].deathTimer <= 0) {
        enemies[i] = enemies[enemies.length - 1]; enemies.length--;
      }
      continue;
    }
    if (enemies[i].reached) {
      const enemy = enemies[i];
      const stolen = plunderGoldAtFortress(getEnemyGoldSteal(enemy, gold));
      lives--;
      _chronBreached = true;
      sfxLifeLost();
      waveLeak   = true;
      screenShake  = 16;
      lifeLostTimer = 90;
      if (stolen <= 0) hoardPulse = Math.max(hoardPulse, 24);
      dmgFloaters.push({ x: GOAL.col * CELL_SIZE + CELL_SIZE / 2, y: GOAL.row * CELL_SIZE - 10, val: '♥ -1 LIFE!', life: 80, maxLife: 80, color: '#ff4040', large: true, suffix: '', vy: 0.6, raw: true });
      enemies[i] = enemies[enemies.length - 1]; enemies.length--;
      if (lives <= 0) {
        if (_campaignNodeMode) {
          finishCampaignNodeDefeat('ramparts');
        } else {
          gameOver   = true;
          sfxGameOver();
          promptNameAndSave({ waves: waveNumber, slain, goldEarned, date: new Date().toLocaleDateString('en-GB') });
          recordBattleResult('defeat');
        }
      }
    }
  }

  processEnemyMeleeAttacks();
  checkAssaultEndConditions();

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
      if (grid.getCell(ac, ar) === CELL.WALL || grid.getCell(ac, ar) === CELL.GATE) {
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
  mkPath(); pc.strokeStyle = 'rgba(0,0,0,0.45)';    pc.lineWidth = cs * 0.92; pc.stroke();
  mkPath(); pc.strokeStyle = 'rgba(34,26,14,0.95)';  pc.lineWidth = cs * 0.72; pc.stroke();
  mkPath(); pc.strokeStyle = 'rgba(58,46,28,0.88)'; pc.lineWidth = cs * 0.54; pc.stroke();
  mkPath(); pc.strokeStyle = 'rgba(78,62,40,0.65)'; pc.lineWidth = cs * 0.36; pc.stroke();

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
  // Worn center stripe + faint outer glow — path lane readable at wave 1
  mkPath(); pc.strokeStyle = 'rgba(96,78,50,0.55)';  pc.lineWidth = cs * 0.20; pc.stroke();
  mkPath(); pc.strokeStyle = 'rgba(140,112,72,0.28)'; pc.lineWidth = cs * 0.09; pc.stroke();
  mkPath(); pc.strokeStyle = 'rgba(50,38,24,0.10)';   pc.lineWidth = cs * 0.95; pc.stroke();
}

function getHoardStage(g) {
  if (g >= 5000) return { level: 5, label: 'HOARD V',  name: 'LEGENDARY' };
  if (g >= 1000) return { level: 4, label: 'HOARD IV', name: 'WEALTHY' };
  if (g >= 500)  return { level: 3, label: 'HOARD III', name: 'PROSPEROUS' };
  if (g >= 100)  return { level: 2, label: 'HOARD II', name: 'TREASURY' };
  return { level: 1, label: 'HOARD I', name: 'SPARSE' };
}

function formatWaveEnemyComp(comp) {
  const parts = [];
  if (comp.draugr > 0)      parts.push(`${comp.draugr} Draugr`);
  if (comp.mylings > 0)     parts.push(`${comp.mylings} Myling`);
  if (comp.jotunn > 0)      parts.push(`${comp.jotunn} Jötunn`);
  if (comp.maras > 0)       parts.push(`${comp.maras} Mara`);
  if ((comp.wargs ?? 0) > 0)      parts.push(`${comp.wargs} Warg`);
  if ((comp.einherjars ?? 0) > 0) parts.push(`${comp.einherjars} Einherjar`);
  return parts.join(', ');
}

/** Signature glow RGB — tower instance, class key, or raw "r,g,b" string. */
function defenderGlowRgb(source) {
  if (!source) return '255,190,80';
  if (typeof source === 'string') {
    if (/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(source)) return source;
    return TOWER_DEFS[source]?.glowRgb ?? '255,190,80';
  }
  return source.glowRgb ?? TOWER_DEFS[source.type]?.glowRgb ?? '255,190,80';
}

/** Draw defender name in class glow color (field + cards). */
function drawDefenderName(text, x, y, source, alpha = 1) {
  applyDefenderNameStyle(source, alpha);
  ctx.fillText(text, x, y);
  clearDefenderNameStyle();
}

/** Radial pool behind portrait — matches field tower light pools. */
function drawDefenderPortraitGlow(cx, cy, glowRgb, coreRadius, strength = 1) {
  const rgb   = defenderGlowRgb(glowRgb);
  const poolR = coreRadius * 2.8;
  const g     = ctx.createRadialGradient(cx, cy + 1, 0, cx, cy + 1, poolR);
  g.addColorStop(0,    `rgba(${rgb},${0.20 * strength})`);
  g.addColorStop(0.50, `rgba(${rgb},${0.08 * strength})`);
  g.addColorStop(1,    'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, poolR, 0, Math.PI * 2);
  ctx.fill();
}

/** Name text style — matches field nameplate pills. */
function applyDefenderNameStyle(glowRgb, alpha = 1) {
  const rgb = defenderGlowRgb(glowRgb);
  ctx.fillStyle   = `rgba(${rgb},${alpha})`;
  ctx.shadowColor = `rgba(${rgb},0.70)`;
  ctx.shadowBlur  = 4;
}

function clearDefenderNameStyle() {
  ctx.shadowBlur = 0;
}

function formatBattleStat(n) {
  const v = Math.round(n || 0);
  if (v >= 10000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

/** Small portrait + glow — sidebar list and dossier. */
function drawMiniDefenderPortrait(cx, cy, towerType, r, strength = 1) {
  const rgb = defenderGlowRgb(towerType);
  drawDefenderPortraitGlow(cx, cy, towerType, r, strength);
  const key = DEFENDER_SPRITE_KEYS[towerType];
  const sp  = key ? SPRITES[key] : null;
  if (sp?.img?.complete && sp.img.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = strength;
    const sz = r * 2.15;
    ctx.drawImage(sp.img, 0, 0, sp.frameW, sp.frameH, cx - sz / 2, cy - sz / 2, sz, sz);
    ctx.restore();
  } else {
    ctx.fillStyle = `rgba(${rgb},${0.35 * strength})`;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = `rgba(${rgb},${0.80 * strength})`;
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
}

/** Rampart segment bars — lives readout as filled/empty pixel bars. */
function drawRampartHearts(x, y, current, max, filledColor) {
  const segW = 6, segH = 5, segGap = 1;
  for (let i = 0; i < max; i++) {
    const sx = x + i * (segW + segGap);
    const full = i < current;
    ctx.fillStyle = full ? filledColor : 'rgba(40,28,22,0.65)';
    ctx.globalAlpha = full ? 0.90 : 0.40;
    ctx.beginPath(); ctx.roundRect(sx, y - segH, segW, segH, 1); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Small role/class pill — mockup build-bar chips. */
function drawRoleChip(x, y, text, glowRgb, { alpha = 1, align = 'left' } = {}) {
  const rgb = defenderGlowRgb(glowRgb);
  ctx.font = '5.5px monospace';
  const chipW = ctx.measureText(text).width + 6;
  const chipX = align === 'right' ? x - chipW : x;
  ctx.fillStyle = `rgba(${rgb},${0.24 * alpha})`;
  ctx.beginPath(); ctx.roundRect(chipX, y - 7, chipW, 9, 2); ctx.fill();
  ctx.fillStyle = `rgba(${rgb},${0.88 * alpha})`;
  ctx.textAlign = 'left';
  ctx.fillText(text, chipX + 3, y);
  return chipW;
}

/** Structure / tower portrait for build bar — sprite or procedural glyph. */
function drawStructurePortrait(cx, cy, itemId, size, affordable) {
  const def = TOWER_DEFS[itemId];
  const rgb = def?.glowRgb ?? '100,100,100';
  const sprKey = DEFENDER_SPRITE_KEYS[itemId];
  const sp     = sprKey ? SPRITES[sprKey] : null;
  drawDefenderPortraitGlow(cx, cy, rgb, size * 0.22, affordable ? 1 : 0.38);
  if (sp?.img?.complete && sp.img.naturalWidth > 0) {
    ctx.save();
    if (!affordable) ctx.globalAlpha = 0.45;
    ctx.drawImage(sp.img, 0, 0, sp.frameW, sp.frameH, cx - size / 2, cy - size / 2, size, size);
    ctx.restore();
    return;
  }
  const glyphs = {
    gate: null,
  };
  if (itemId === 'gate') {
    ctx.save();
    if (!affordable) ctx.globalAlpha = 0.42;
    const shR = size * 0.38;
    ctx.fillStyle = '#3a2410';
    ctx.fillRect(cx - shR, cy - shR * 0.85, shR * 2, shR * 1.7);
    ctx.strokeStyle = 'rgba(200,160,80,0.75)'; ctx.lineWidth = 1;
    ctx.strokeRect(cx - shR + 0.5, cy - shR * 0.85 + 0.5, shR * 2 - 1, shR * 1.7 - 1);
    ctx.strokeStyle = 'rgba(220,180,100,0.65)';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * shR * 0.45, cy - shR * 0.5);
      ctx.lineTo(cx + i * shR * 0.45, cy + shR * 0.55);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  if (itemId === 'wall' || itemId === 'reinforce') {
    ctx.save();
    if (!affordable) ctx.globalAlpha = 0.42;
    const shR = size * 0.38;
    const fill = itemId === 'reinforce' ? '#b89018' : '#b01808';
    ctx.fillStyle = '#3a2410';
    ctx.beginPath(); ctx.arc(cx, cy, shR + 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(cx, cy, shR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,180,0.35)';
    ctx.beginPath(); ctx.arc(cx - shR * 0.2, cy - shR * 0.25, shR * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(220,170,60,0.55)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx, cy, shR, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    return;
  }
  drawProceduralStructureIcon(ctx, cx, cy, itemId, size, affordable);
}

/** Mockup-style threat intel card on the battlefield during active waves. */
function drawThreatIntelCard() {
  if (gamePhase !== 'playing' || gameOver || waveState !== 'active') return;

  const dispW   = waveNumber;
  const isBossW = BOSS_WAVES.has(dispW);
  const tRatio  = endlessMode ? 1.0 : Math.min(1, dispW / MAX_WAVES);
  const tColor  = isBossW ? '#ff3820' : tRatio > 0.8 ? '#ff6020' : tRatio > 0.5 ? '#e8c040' : '#50d870';
  const onField = enemies.filter(e => e.alive && !e.reached).length;
  const dossierUp = selectedTower && HERO_BUILD_ITEMS.some(h => h.id === selectedTower.type);
  const cardX   = assaultPlayfieldWide()
    ? FRAME_THICK + LEFT_DOCK_W + 6
    : playfieldLeft() + 6;
  const cardY   = dossierUp ? GRID_BOTTOM - 88 : GRID_TOP + 6;
  const cardW   = 118;
  const cardH   = isBossW ? 40 : (shouldPrioritizeFortressGates(isPathlessMode(), _fortressGateBreached, wallData) ? 44 : 34);
  const _glass  = assaultUiGlass();

  ctx.save();
  ctx.fillStyle = isBossW ? `rgba(28,6,6,${0.72 * _glass})` : `rgba(6,10,6,${0.70 * _glass})`;
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 4); ctx.fill();
  ctx.fillStyle = tColor; ctx.globalAlpha = 0.85;
  ctx.fillRect(cardX, cardY, 3, cardH);
  ctx.globalAlpha = 1;

  ctx.font = 'bold 6.5px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = tColor;
  ctx.fillText(isBossW ? '☠ THREAT ACTIVE' : '☠ THREAT', cardX + 8, cardY + 11);

  ctx.font = 'bold 8px monospace';
  if (isBossW) {
    ctx.fillStyle = '#ff8060';
    ctx.fillText(BOSS_CONFIGS[dispW]?.name ?? 'BOSS', cardX + 8, cardY + 24);
  } else {
    const comp    = waveComposition(dispW);
    const compStr = formatWaveEnemyComp(comp);
    ctx.fillStyle = 'rgba(210,195,160,0.88)';
    ctx.fillText(`${onField} on field`, cardX + 8, cardY + 22);
    if (compStr.length <= 16) {
      ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.65)';
      ctx.fillText(compStr, cardX + 8, cardY + 31);
    }
    if (shouldPrioritizeFortressGates(isPathlessMode(), _fortressGateBreached, wallData)) {
      ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(200,160,80,0.75)';
      ctx.fillText('▣ PORT objective', cardX + 8, cardY + (compStr.length <= 16 ? 40 : 31));
    }
  }
  ctx.restore();
}

/** Norse treasure chest with coin spill — scales with hoard stage. */
function drawTreasuryChest(cx, cy, scale, stage = 1, glowing = false) {
  const s = scale;
  ctx.save();
  if (glowing) { ctx.shadowColor = 'rgba(240,190,40,0.60)'; ctx.shadowBlur = 12; }

  // Coin pile shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(cx, cy + 14 * s, 16 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();

  const bodyC = stage >= 4 ? '#6a4a18' : stage >= 2 ? '#523610' : '#3e2810';
  const lidC  = stage >= 4 ? '#8a6020' : '#684818';

  // Chest body
  ctx.fillStyle = bodyC;
  ctx.beginPath(); ctx.roundRect(cx - 15 * s, cy - 6 * s, 30 * s, 16 * s, [2, 2, 4, 4]); ctx.fill();
  ctx.strokeStyle = 'rgba(180,130,40,0.55)'; ctx.lineWidth = 0.8; ctx.stroke();

  // Lid
  ctx.fillStyle = lidC;
  ctx.beginPath(); ctx.roundRect(cx - 16 * s, cy - 14 * s, 32 * s, 10 * s, [4, 4, 1, 1]); ctx.fill();
  ctx.strokeStyle = 'rgba(220,170,60,0.50)'; ctx.stroke();

  // Gold band + lock
  ctx.fillStyle = 'rgba(230,185,50,0.80)';
  ctx.fillRect(cx - 16 * s, cy - 2 * s, 32 * s, 3 * s);
  ctx.fillStyle = '#f0d040';
  ctx.beginPath(); ctx.arc(cx, cy - 1 * s, 2.8 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a6010';
  ctx.fillRect(cx - 1.2 * s, cy + 1 * s, 2.4 * s, 4 * s);

  // Coin spill — more coins at higher hoard stages
  const nCoins = Math.min(7, 2 + stage);
  for (let i = 0; i < nCoins; i++) {
    const ox = (i - (nCoins - 1) / 2) * 5.5 * s + Math.sin(i * 2.1) * 2 * s;
    const oy = 9 * s - (i % 3) * 2 * s;
    const bright = 0.72 + (i / nCoins) * 0.28;
    ctx.fillStyle = `rgb(${Math.floor(200 * bright)},${Math.floor(148 * bright)},28)`;
    ctx.beginPath(); ctx.ellipse(cx + ox, cy + oy, 5 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill();
    if (i === nCoins - 1) {
      ctx.strokeStyle = 'rgba(255,220,80,0.50)'; ctx.lineWidth = 0.6; ctx.stroke();
    }
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

/** Mockup-style defender row in the right panel. */
function drawDefenderSidebarRow(x, y, w, rightX, tower, { isMvp = false, isFieldSelected = false, maxScore = 0 } = {}) {
  const CARD_H = 32;
  const rgb    = defenderGlowRgb(tower);
  const tName  = tower.name ?? TOWER_DEFS[tower.type]?.label ?? tower.type;
  const classLbl = TOWER_DEFS[tower.type]?.label ?? tower.type;
  const tLvl   = tower._careerLevel > 0 ? ` ${ROMAN[tower._careerLevel] ?? tower._careerLevel}` : '';
  const def    = _roster?.find(tower.defenderId);
  const dmg    = tower.damageDealt || 0;
  const kills  = tower.killCount || 0;

  ctx.fillStyle = isFieldSelected ? `rgba(${rgb},0.18)` : isMvp ? `rgba(${rgb},0.12)` : 'rgba(0,0,0,0.34)';
  ctx.beginPath(); ctx.roundRect(x, y, w, CARD_H, 4); ctx.fill();
  ctx.strokeStyle = isFieldSelected ? `rgba(${rgb},0.90)` : isMvp ? `rgba(${rgb},0.50)` : `rgba(${rgb},0.22)`;
  ctx.lineWidth = isFieldSelected ? 1.4 : 0.7;
  ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, CARD_H - 1, 4); ctx.stroke();

  // Rank-colored left stripe
  const _sRank = def ? getRank(def) : null;
  ctx.fillStyle = _sRank?.color ?? `rgba(${rgb},0.70)`; ctx.globalAlpha = 0.60;
  ctx.beginPath(); ctx.roundRect(x, y, 3, CARD_H, [4,0,0,4]); ctx.fill();
  ctx.globalAlpha = 1;

  const avX = x + 15;
  const avY = y + CARD_H / 2;
  drawMiniDefenderPortrait(avX, avY, tower.type, 11);

  ctx.textAlign = 'left';
  ctx.font = 'bold 8px monospace';
  drawDefenderName(
    tName.length > 10 ? tName.slice(0, 9) + '…' : tName,
    x + 30, y + 12, tower, 1,
  );
  ctx.font = '6.5px monospace';
  ctx.fillStyle = `rgba(${rgb},0.55)`;
  ctx.fillText(`${classLbl}${tLvl}`, x + 30, y + 22);
  const roleLbl = ABILITY_LABELS[tower.type];
  if (roleLbl) drawRoleChip(x + 30, y + 29, roleLbl, tower.type, { alpha: 0.85 });

  // Battle contribution chip
  ctx.font = 'bold 7px monospace'; ctx.textAlign = 'right';
  if (tower.type === 'hydda') {
    ctx.fillStyle = '#70e8a0';
    const healed = tower.healDone ?? 0;
    ctx.fillText(healed > 0 ? `♥ +${healed} HP` : '♥ HEAL', rightX, y + 13);
  } else if (dmg > 0 || kills > 0) {
    ctx.fillStyle = kills > 0 ? '#90e8a0' : `rgba(${rgb},0.75)`;
    ctx.fillText(`⚔${formatBattleStat(dmg)}`, rightX, y + 13);
    if (kills > 0) {
      ctx.font = '6.5px monospace';
      ctx.fillStyle = 'rgba(160,200,160,0.65)';
      ctx.fillText(`☠${kills}`, rightX, y + 24);
    }
  } else if (def?.careerKills > 0) {
    ctx.fillStyle = 'rgba(170,150,120,0.55)';
    ctx.fillText(`${def.careerKills}✦`, rightX, y + 13);
  }

  const _pt = def ? getPrimaryTitle(def) : null;
  if (_pt) {
    ctx.font = '6px monospace';
    ctx.fillStyle = 'rgba(160,130,200,0.55)';
    ctx.fillText(`✦${_pt.label}`, rightX, y + CARD_H - 6);
  }

  // Contribution bar along bottom edge (only during combat with data)
  if (maxScore > 0 && (dmg > 0 || kills > 0)) {
    const score = dmg + kills * 32;
    const frac  = Math.min(1, score / maxScore);
    const bx = x + 2, by = y + CARD_H - 3, bw = w - 4;
    ctx.fillStyle = `rgba(${rgb},0.18)`;
    ctx.fillRect(bx, by, bw, 2);
    ctx.fillStyle = `rgba(${rgb},${isMvp ? 0.85 : 0.55})`;
    ctx.fillRect(bx, by, Math.max(2, Math.round(bw * frac)), 2);
  }
  ctx.textAlign = 'left';
  return CARD_H + 3;
}

/** Kolbeinn-style dossier when a field defender is selected. */
function drawDefenderDossier() {
  if (!selectedTower || gameOver || gamePhase !== 'playing') return;
  if (!HERO_BUILD_ITEMS.some(h => h.id === selectedTower.type)) return;

  const t      = selectedTower;
  const def    = _roster?.find(t.defenderId);
  const rgb    = defenderGlowRgb(t);
  const panelW = playfieldWidth() - 4;
  const panelH = 76;
  const panelX = playfieldLeft() + 2;
  _dossierSlideT = Math.min(1, _dossierSlideT + 0.22);
  const panelY = GRID_BOTTOM - panelH - 3 + (1 - _dossierSlideT) * 20;
  const _glass = assaultUiGlass();

  ctx.save();
  ctx.globalAlpha = 0.55 + _dossierSlideT * 0.45;
  drawFantasyPanel(panelX, panelY, panelW, panelH, `rgba(6,3,14,${0.52 * _glass})`, 0.55 * _glass, 7);
  ctx.fillStyle = `rgba(${rgb},0.12)`;
  ctx.fillRect(panelX, panelY, 4, panelH);
  const _dg = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY);
  _dg.addColorStop(0, `rgba(${rgb},0.08)`);
  _dg.addColorStop(0.35, 'rgba(0,0,0,0)');
  ctx.fillStyle = _dg;
  ctx.fillRect(panelX, panelY, panelW, panelH);

  const avX = panelX + 28;
  const avY = panelY + panelH / 2 + 2;
  drawMiniDefenderPortrait(avX, avY, t.type, 22);

  const col1 = panelX + 54;
  const col2 = panelX + Math.floor(panelW * 0.36);
  const col3 = panelX + Math.floor(panelW * 0.58);
  const col4 = panelX + Math.floor(panelW * 0.78);

  ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(150,130,90,0.55)';
  ctx.fillText('HERO', col1, panelY + 11);
  ctx.fillText('TRAIT / ROLE', col2, panelY + 11);
  ctx.fillText('BATTLE', col3, panelY + 11);
  ctx.fillText('GEAR', col4, panelY + 11);

  const tName = t.name ?? TOWER_DEFS[t.type]?.label ?? t.type;
  ctx.font = 'bold 11px monospace';
  drawDefenderName(tName, col1, panelY + 24, t, 1);

  const rank = def ? getRank(def) : null;
  const title = def ? getPrimaryTitle(def) : null;
  ctx.font = '7px monospace'; ctx.fillStyle = `rgba(${rgb},0.70)`;
  const subParts = [
    TOWER_DEFS[t.type]?.label ?? t.type,
    t._careerLevel > 0 ? `Lv ${ROMAN[t._careerLevel] ?? t._careerLevel}` : null,
    rank && rank.id !== 'greenhorn' ? rank.label : null,
  ].filter(Boolean);
  ctx.fillText(subParts.join(' · '), col1, panelY + 35);
  if (title) {
    ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(200,170,100,0.65)';
    ctx.fillText(title.label.toUpperCase(), col1, panelY + 45);
  }
  const roleLbl = ABILITY_LABELS[t.type];
  if (roleLbl) drawRoleChip(col1, panelY + 54, roleLbl, t.type, { alpha: 0.9 });

  const traitLbl = def?.trait ? (TRAIT_DEFS[def.trait]?.label ?? def.trait) : '—';
  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(180,200,170,0.80)';
  ctx.fillText(traitLbl.length > 16 ? traitLbl.slice(0, 15) + '…' : traitLbl, col2, panelY + 24);
  const frId = def?.fortressRole ?? getDefaultFortressRole(t.type);
  const frDef = FORTRESS_ROLES[frId];
  const inZone = def && isRoleInZone(frId, t.col, t.row, {
    portalCells: getPortalCells(SPAWN, _extraSpawns),
    wallData, goal: GOAL, towers,
  });
  ctx.font = '6px monospace';
  ctx.fillStyle = inZone ? (frDef?.color ?? '#90c070') : 'rgba(140,120,90,0.45)';
  ctx.fillText(`${frDef?.label ?? frId}${inZone ? ' ✓' : ' (out of zone)'}`, col2, panelY + 35);
  if (def?.scars?.length) {
    ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(200,120,90,0.60)';
    ctx.fillText(`${def.scars.length} scar${def.scars.length > 1 ? 's' : ''}`, col2, panelY + 45);
  }
  if (def) {
    ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(140,160,130,0.55)';
    ctx.fillText(`${def.battlesPlayed ?? 0} battles`, col2, panelY + 54);
    ctx.fillText(`${def.careerKills ?? 0} kills`, col2, panelY + 63);
  }

  ctx.font = 'bold 9px monospace';
  if (t.type === 'hydda') {
    ctx.fillStyle = '#70e8a0';
    ctx.fillText('SUPPORT', col3, panelY + 24);
    ctx.font = 'bold 10px monospace';
    const healed = t.healDone ?? 0;
    ctx.fillText(healed > 0 ? `+${healed} HP` : '—', col3, panelY + 36);
    ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(140,180,140,0.60)';
    ctx.fillText('warband healed', col3, panelY + 46);
  } else {
    ctx.fillStyle = '#90d0a0';
    ctx.fillText(`⚔ ${formatBattleStat(t.damageDealt || 0)}`, col3, panelY + 24);
    ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(140,180,140,0.65)';
    ctx.fillText(`☠ ${t.killCount || 0} kills  ·  Lv ${t.level}`, col3, panelY + 36);
    const ready = (t.fireCooldown ?? 0) <= (t.fireRate ?? 1) * 0.05;
    ctx.fillText(ready ? '● Ready' : '◌ Cooldown', col3, panelY + 46);
  }

  const slots = ['weapon', 'armor'];
  let gx = col4;
  for (const slot of slots) {
    const itemId = def?.equipment?.[slot];
    const iDef   = itemId ? ITEM_DEFS[itemId] : null;
    const slotW  = 24;
    const slotY  = panelY + 16;
    ctx.fillStyle = 'rgba(0,0,0,0.50)';
    ctx.beginPath(); ctx.roundRect(gx, slotY, slotW, 26, 3); ctx.fill();
    if (iDef) {
      ctx.strokeStyle = RARITY_COLOR[iDef.rarity] ?? '#aaa';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(gx + 0.5, slotY + 0.5, slotW - 1, 25);
      ctx.font = '6px monospace'; ctx.fillStyle = RARITY_COLOR[iDef.rarity] ?? '#ccc';
      ctx.fillText(iDef.name.slice(0, 6), gx + 2, slotY + 14);
      ctx.font = '5px monospace'; ctx.fillStyle = 'rgba(180,160,120,0.50)';
      ctx.fillText(slot.toUpperCase(), gx + 2, slotY + 23);
    } else {
      ctx.font = '10px monospace'; ctx.fillStyle = 'rgba(80,70,60,0.45)';
      ctx.fillText(slot === 'weapon' ? '⚔' : '🛡', gx + 8, slotY + 18);
    }
    gx += slotW + 5;
  }

  ctx.restore();
}

// Draw extra portal paths as dashed stone roads (lighter than primary path)
function drawExtraPortalPaths() {
  if (_extraSpawns.length === 0) return;
  const t = performance.now() * 0.001;
  ctx.save();

  // WEST GATE label on main SPAWN portal
  {
    const _pulse = 0.5 + Math.sin(t * 2.5) * 0.5;
    const _wpx = SPAWN.col * CELL_SIZE + CELL_SIZE / 2;
    const _wpy = SPAWN.row * CELL_SIZE + CELL_SIZE / 2;
    const _wlx = _wpx + CELL_SIZE * 2.0, _wly = _wpy - CELL_SIZE * 1.5;
    ctx.save();
    ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const _ww = ctx.measureText('WEST GATE').width + 6;
    ctx.fillStyle = 'rgba(0,0,0,0.70)';
    ctx.beginPath(); ctx.roundRect(_wlx - _ww / 2, _wly - 5, _ww, 10, 2); ctx.fill();
    ctx.fillStyle = `rgba(220,170,255,0.85)`;
    ctx.fillText('WEST GATE', _wlx, _wly);
    if (waveState === 'active' && spawnQueue.length > 0) {
      const _si = waveNumber <= 10 ? 16 : SPAWN_FRAMES;
      const _cd = Math.max(0, Math.ceil((_si - spawnTimer) / 30));
      ctx.font = '5px monospace';
      ctx.fillStyle = `rgba(255,200,100,${0.7 + _pulse * 0.2})`;
      ctx.fillText(`${_cd}s ☠`, _wlx, _wly + 8);
    }
    ctx.restore();
  }

  for (const es of _extraSpawns) {
    if (!es.path || es.path.length < 2) continue;
    const pulse = 0.5 + Math.sin(t * 2.5 + (es.col + es.row) * 0.4) * 0.5;
    const alpha = es.active ? (0.45 + pulse * 0.15) : (0.12 + pulse * 0.06);

    // Dashed path line
    const pts = es.path.map(({ col, row }) => grid.cellCenter(col, row));
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = es.active ? 'rgba(200,140,60,0.9)' : 'rgba(120,80,40,0.7)';
    ctx.lineWidth   = es.active ? 4 : 2;
    ctx.setLineDash(es.active ? [5, 3] : [3, 5]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Portal indicator at the extra spawn cell
    const px = es.col * CELL_SIZE + CELL_SIZE / 2;
    const py = es.row * CELL_SIZE + CELL_SIZE / 2;
    ctx.globalAlpha = es.active ? (0.7 + pulse * 0.3) : (0.18 + pulse * 0.08);
    ctx.shadowColor = es.active ? `rgba(160,80,255,${0.8 + pulse * 0.2})` : 'rgba(80,40,120,0.5)';
    ctx.shadowBlur  = es.active ? 14 * pulse : 4;
    ctx.strokeStyle = es.active ? `rgba(200,120,255,${0.7 + pulse * 0.3})` : 'rgba(100,60,140,0.4)';
    ctx.lineWidth   = es.active ? 1.5 : 0.8;
    ctx.beginPath();
    ctx.arc(px, py, CELL_SIZE * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Portal name label
    const _pName = es.name ?? es.dir;
    const _labelAlpha = es.active ? 0.85 : 0.45;
    const _bgAlpha    = es.active ? 0.70 : 0.38;
    // Position label offset based on direction
    const _lOffX = (es.dir === 'EAST') ? -CELL_SIZE * 0.5 : (es.dir === 'NW') ? CELL_SIZE * 0.5 : 0;
    const _lOffY = (es.dir === 'NORTH') ? CELL_SIZE * 2.2 : (es.dir === 'SOUTH') ? -CELL_SIZE * 1.4 : (es.dir === 'EAST') ? -CELL_SIZE * 1.8 : (es.dir === 'NW') ? CELL_SIZE * 1.4 : -CELL_SIZE * 1.5;
    const _lx = px + _lOffX, _ly = py + _lOffY;
    ctx.save();
    ctx.font = `bold 6px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const _tw = ctx.measureText(_pName).width + 6;
    ctx.fillStyle = `rgba(0,0,0,${_bgAlpha})`;
    ctx.beginPath(); ctx.roundRect(_lx - _tw / 2, _ly - 5, _tw, 10, 2); ctx.fill();
    ctx.fillStyle = es.active ? `rgba(220,170,255,${_labelAlpha})` : `rgba(140,100,180,${_labelAlpha})`;
    ctx.fillText(_pName, _lx, _ly);
    // Status line: countdown if active, wave number if dormant
    ctx.font = '5px monospace';
    if (es.active && waveState === 'active' && spawnQueue.length > 0) {
      const _si = waveNumber <= 10 ? 16 : SPAWN_FRAMES;
      const _cd = Math.max(0, Math.ceil((_si - spawnTimer) / 30));
      ctx.fillStyle = `rgba(255,200,100,${_labelAlpha})`;
      ctx.fillText(`${_cd}s ☠`, _lx, _ly + 8);
    } else if (!es.active) {
      ctx.fillStyle = `rgba(160,120,220,${_labelAlpha * 0.8})`;
      ctx.fillText(`opens W${es.activateWave}`, _lx, _ly + 8);
    }
    ctx.restore();
  }
  ctx.restore();
}

// Draw glowing gate markers at the 4 cardinal gaps in the fortress ring
function drawRingGateMarkers() {
  if (!hasFortressRing()) return;
  const cs = CELL_SIZE;
  const _R = FORTRESS_RING_R;
  const _t = performance.now() * 0.001;
  const _pulse = 0.45 + Math.sin(_t * 1.8) * 0.35;

  // Gate center (grid-local coords) for each cardinal gap
  const _gates = [
    { x: (GOAL.col - _R) * cs + cs / 2, y: GOAL.row * cs + cs / 2, orient: 'EW' },
    { x: (GOAL.col + _R) * cs + cs / 2, y: GOAL.row * cs + cs / 2, orient: 'EW' },
    { x: GOAL.col * cs + cs / 2, y: (GOAL.row - _R) * cs + cs / 2, orient: 'NS' },
    { x: GOAL.col * cs + cs / 2, y: (GOAL.row + _R) * cs + cs / 2, orient: 'NS' },
  ];

  ctx.save();
  for (const g of _gates) {
    ctx.save();
    const _glowAlpha = 0.55 + _pulse * 0.35;
    const _glowColor = `rgba(255,210,80,${_glowAlpha})`;

    // Short post lines extending from ring walls into the gap
    ctx.strokeStyle = `rgba(190,145,55,0.55)`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    if (g.orient === 'EW') {
      ctx.beginPath(); ctx.moveTo(g.x, g.y - cs * 1.45); ctx.lineTo(g.x, g.y - cs * 0.42); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(g.x, g.y + cs * 0.42); ctx.lineTo(g.x, g.y + cs * 1.45); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(g.x - cs * 1.45, g.y); ctx.lineTo(g.x - cs * 0.42, g.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(g.x + cs * 0.42, g.y); ctx.lineTo(g.x + cs * 1.45, g.y); ctx.stroke();
    }

    // Glowing lantern at gate center
    ctx.shadowColor = _glowColor;
    ctx.shadowBlur = 4 + _pulse * 9;
    ctx.fillStyle = _glowColor;
    ctx.beginPath(); ctx.arc(g.x, g.y, cs * 0.20, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }
  ctx.restore();
}

/** Highlight empty fortress gate slots during deploy prep. */
function drawGateSlotHints() {
  if (_campaignNodeMode || !hasFortressRing() || !canModifyWarbandDeployment() || gamePhase !== 'playing') return;
  const cs = CELL_SIZE;
  const pulse = 0.35 + Math.sin(performance.now() * 0.006) * 0.25;
  ctx.save();
  for (const g of getFortressGateSlots()) {
    if (grid.getCell(g.col, g.row) !== CELL.EMPTY) continue;
    const vx = gridScreenX(g.col * cs);
    const vy = gridScreenY(g.row * cs);
    const vs = gridScreenCell(cs);
    ctx.fillStyle = `rgba(200,160,80,${pulse * 0.22})`;
    ctx.fillRect(vx, vy, vs, vs);
    ctx.strokeStyle = `rgba(220,190,100,${pulse * 0.75})`;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(vx + 0.5, vy + 0.5, vs - 1, vs - 1);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawPath() {
  if (isPathlessMode()) return;
  if (!currentPath || currentPath.length < 2) return;

  const t  = performance.now() * 0.001;
  const cs = CELL_SIZE;

  // Build world-space polyline with cumulative distances — cached, rebuild only on path change
  if (pathDirty || _pathPts.length === 0) {
    _pathPts  = currentPath.map(({ col, row }) => grid.cellCenter(col, row));
    // Build adjacent cell cache for path contrast overlay
    const _pathSet = new Set(currentPath.map(({ col, row }) => `${col}_${row}`));
    _pathAdjacentCells = [];
    for (const { col, row } of currentPath) {
      for (const [nc, nr] of [[col-1,row],[col+1,row],[col,row-1],[col,row+1]]) {
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        const _adjKey = `${nc}_${nr}`;
        if (!_pathSet.has(_adjKey) && grid.getCell(nc, nr) === CELL.EMPTY) {
          _pathAdjacentCells.push({ x: nc * CELL_SIZE, y: nr * CELL_SIZE });
        }
      }
    }
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

      // flame — radial glow halo + solid ellipse (no shadowBlur for perf)
      const flameX  = ox + Math.sin(t * 7 + c.idx) * 0.4;
      const flameY  = oy - fh * 0.4;
      const glowR   = fh * 2.2;
      const _fGrad  = ctx.createRadialGradient(flameX, flameY, 0, flameX, flameY, glowR);
      _fGrad.addColorStop(0,   `rgba(255,180,60,${0.40 * flicker})`);
      _fGrad.addColorStop(0.5, `rgba(255,100,20,${0.18 * flicker})`);
      _fGrad.addColorStop(1,   'rgba(255,80,0,0)');
      ctx.fillStyle = _fGrad;
      ctx.beginPath(); ctx.arc(flameX, flameY, glowR, 0, Math.PI * 2); ctx.fill();
      // Core flame ellipse
      ctx.fillStyle = `rgba(255,155,45,${0.80 * flicker})`;
      ctx.beginPath(); ctx.ellipse(flameX, flameY, fw, fh, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,235,110,${0.50 * flicker})`;
      ctx.beginPath(); ctx.ellipse(ox, oy - fh * 0.15, fw * 0.45, fh * 0.38, 0, 0, Math.PI * 2); ctx.fill();

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
function drawFortressZoneRing() {
  if (_campaignNodeMode || !isPathlessMode() || gamePhase !== 'playing' || !canModifyWarbandDeployment()) return;
  const cs   = CELL_SIZE;
  const R    = FORTRESS_ZONE_RADIUS;
  const half = gridScreenCell(R * cs);
  const gx   = GOAL.col * cs + cs / 2;
  const gy   = GOAL.row * cs + cs / 2;
  const cx   = gridScreenX(gx);
  const cy   = gridScreenY(gy);
  ctx.save();
  ctx.beginPath();
  ctx.rect(playfieldLeft(), GRID_TOP, playfieldWidth(), playfieldHeight());
  ctx.clip();

  // Subtle green tint on empty cells inside the fortress zone — shows where structures go
  const cellPx = gridScreenCell(cs);
  ctx.fillStyle = 'rgba(60,160,80,0.09)';
  for (let dc = -R; dc <= R; dc++) {
    for (let dr = -R; dr <= R; dr++) {
      const c = GOAL.col + dc, r = GOAL.row + dr;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
      if (grid.getCell(c, r) !== CELL.EMPTY) continue;
      ctx.fillRect(gridScreenX(c * cs), gridScreenY(r * cs), cellPx, cellPx);
    }
  }

  const _pulse = 0.22 + Math.sin(performance.now() * 0.005) * 0.12;
  ctx.strokeStyle = `rgba(90,170,80,${_pulse + 0.1})`;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(cx - half, cy - half, half * 2, half * 2);
  ctx.setLineDash([]);
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = `rgba(120,200,100,${_pulse + 0.25})`;
  ctx.textAlign = 'center';
  ctx.fillText('FORTRESS ZONE — place structures here', cx, cy - half - 5);
  ctx.restore();
}

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

// ── Command Center — nav actions ──────────────────────────────────────────────
function _handleNavClick(id) {
  if (gamePhase === 'betweenBattles' && (id === 'warband' || id === 'recruit' || id === 'fortress')) {
    _warCampTab = id;
    _betweenSubtab = id;
    _rosterScrollOffset = 0;
    if (_warCampTabPulse === id) {
      _warCampTabPulse = null;
      if (id === 'recruit') {
        _hintSeen.recruitTab = true;
        if (_campaignState) {
          _campaignState.uiHints = { ...(_campaignState.uiHints ?? {}), recruitTab: true };
          try { persistCampaign(); } catch {}
        }
      }
      if (id === 'fortress') {
        _hintSeen.fortressTab = true;
        if (_campaignState) {
          _campaignState.uiHints = { ...(_campaignState.uiHints ?? {}), fortressTab: true };
          try { persistCampaign(); } catch {}
        }
      }
    }
    return;
  }
  _navActiveId = id;
  if (isCampaignAssaultBattle() && id !== 'battle') return;
  _panelDirty  = true;
  if (id === 'chronicle') {
    if ((_campaignState?.chronicle?.battles?.length ?? 0) > 0) _showChronicle = true;
    return;
  }
  if (id === 'battle') {
    _showChronicle   = false;
    _showDefenderBio = null;
    return;
  }
  if (id === 'warband' && gamePhase === 'playing') {
    _showChronicle = false;
    return;
  }
  _showChronicle = false;
}

// Context-sensitive nav items:
//   combat  → BATTLE / WAR BAND / FORTRESS  (warband overlay on right panel)
//   outside → full 5-item set including CHRONICLE and HALL
const _COMBAT_NAV = [
  { id: 'battle',   icon: '⚔',  label: 'BATTLE'   },
  { id: 'warband',  icon: '🛡',  label: 'WAR BAND' },
  { id: 'fortress', icon: '🏰',  label: 'FORTRESS' },
];

// Legacy — nav tabs now live in drawRightPanel / drawBetweenBattles
function drawCommandNav() {}

function drawBtAmbientParticles() {
  if (!_btParticles) {
    _btParticles = Array.from({ length: 30 }, () => ({
      x: Math.random() * BASE_W,
      y: Math.random() * BASE_H * 0.6,
      dx: (Math.random() - 0.5) * 0.35,
      dy: 0.28 + Math.random() * 0.28,
      ember: Math.random() < 0.18,
      a: 0.28 + Math.random() * 0.25,
    }));
  }
  ctx.save();
  ctx.globalAlpha = 0.85;
  for (const p of _btParticles) {
    p.x += p.dx;
    p.y += p.dy;
    if (p.y > BASE_H + 4) { p.y = -2; p.x = Math.random() * BASE_W; }
    if (p.x < 0) p.x = BASE_W;
    if (p.x > BASE_W) p.x = 0;
    ctx.fillStyle = p.ember ? `rgba(240,128,64,${p.a})` : `rgba(200,224,248,${p.a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.ember ? 1.6 : 1.1, 0, Math.PI * 2);
    ctx.fill();
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
  ctx.fillStyle = UI_COLORS.iron;
  ctx.fill('evenodd');

  // ── Outer hard edge ───────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(4,2,0,0.95)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // ── Outer thin gold accent ────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(212,175,55,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  // ── Inner gold trim — the primary ornamental line ─────────────────────────
  ctx.shadowColor = 'rgba(212,175,55,0.65)';
  ctx.shadowBlur  = Math.min(10, thick * 0.45);
  ctx.strokeStyle = UI_COLORS.gold;
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
    ctx.strokeStyle = UI_COLORS.gold; ctx.fillStyle = UI_COLORS.gold; ctx.lineWidth = 0.9;
    const kStep = Math.max(22, Math.round(thick * 1.35));
    const kSize = Math.max(2.5, thick * 0.22);
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
    const gH = thick * 0.55, gW = thick * 0.38;
    for (const [cx, cy] of [
      [thick / 2, thick / 2], [W - thick / 2, thick / 2],
      [thick / 2, H - thick / 2], [W - thick / 2, H - thick / 2]
    ]) {
      ctx.shadowColor = 'rgba(220,150,30,0.8)';
      ctx.shadowBlur  = Math.min(8, thick * 0.4);
      ctx.fillStyle   = '#c8901a';
      ctx.beginPath();
      ctx.moveTo(cx, cy - gH); ctx.lineTo(cx + gW, cy);
      ctx.lineTo(cx, cy + gH); ctx.lineTo(cx - gW, cy);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  ctx.restore();
}

// ── Combat overlay: WAR BAND tab ─────────────────────────────────────────────
function drawCombatWarbandOverlay(px, py, pw, ph) {
  const sX = px + 6, sW = pw - 12, dVX = px + pw - 8, ROW = 9;
  let ly = py + 8;

  ctx.save();
  ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#8090d8'; ctx.textAlign = 'left';
  ctx.fillText('🛡 WAR BAND — DEPLOYED', sX, ly + 8); ly += 14;
  ctx.strokeStyle = 'rgba(80,90,200,0.30)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(sX, ly); ctx.lineTo(sX + sW, ly); ctx.stroke(); ly += 4;

  const scored = towers.map(t => ({
    t, score: (t.damageDealt||0) + (t.killCount||0)*32,
  })).sort((a,b) => b.score - a.score);
  const maxScore = scored.length ? scored[0].score : 0;

  for (const { t } of scored) {
    if (ly + 35 > py + ph) break;
    ly += drawDefenderSidebarRow(sX, ly, sW, dVX, t, {
      isMvp: false, isFieldSelected: selectedTower?.defenderId === t.defenderId, maxScore,
    });
  }

  // Roster not deployed
  const _undeployed = _roster ? _roster.defenders.filter(d => !towers.some(t => t.defenderId === d.defenderId)) : [];
  if (_undeployed.length > 0 && ly + 18 < py + ph) {
    ly += 4;
    ctx.font = 'bold 7.5px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.55)'; ctx.textAlign = 'left';
    ctx.fillText('⊙ RESERVE', sX, ly + 7); ly += 12;
    for (const d of _undeployed.slice(0, 4)) {
      if (ly + 10 > py + ph) break;
      const rgb = defenderGlowRgb(d.type);
      ctx.font = '7px monospace'; ctx.fillStyle = `rgba(${rgb},0.45)`;
      ctx.fillText(`${d.name.slice(0, 13)}  ${TOWER_DEFS[d.type]?.label ?? ''}`, sX + 4, ly + 8);
      ly += 10;
    }
  }
  ctx.restore();
}

// ── Combat overlay: HALL tab ──────────────────────────────────────────────────
function drawCombatHallOverlay(px, py, pw, ph) {
  const sX = px + 6, sW = pw - 12, ROW = 10;
  let ly = py + 8;
  ctx.save();

  const fallen  = _campaignState?.hallOfFallen  ?? [];
  const honored = _campaignState?.hallOfHonored ?? [];

  ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#a05050'; ctx.textAlign = 'left';
  ctx.fillText('⚱ HALL OF FALLEN', sX, ly + 8); ly += 14;
  if (fallen.length === 0) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(140,110,90,0.45)';
    ctx.fillText('None fallen yet.', sX + 4, ly + 7); ly += 10;
  } else {
    for (const f of fallen.slice(0, 5)) {
      if (ly + ROW > py + ph - 40) break;
      ctx.font = 'bold 7px monospace'; ctx.fillStyle = 'rgba(180,120,100,0.70)';
      ctx.fillText(f.name ?? '?', sX + 4, ly + 7);
      ctx.font = '6.5px monospace'; ctx.fillStyle = 'rgba(150,100,80,0.45)'; ctx.textAlign = 'right';
      ctx.fillText(f.rankLabel ?? '', px + pw - 8, ly + 7);
      ctx.textAlign = 'left'; ly += ROW;
    }
  }
  ly += 6;
  ctx.strokeStyle = 'rgba(80,170,100,0.25)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(sX, ly); ctx.lineTo(sX + sW, ly); ctx.stroke(); ly += 4;

  ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#80a870';
  ctx.fillText('✦ HALL OF HONORED', sX, ly + 8); ly += 14;
  if (honored.length === 0) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(120,150,100,0.45)';
    ctx.fillText('No retirements yet.', sX + 4, ly + 7);
  } else {
    for (const h of honored.slice(0, 4)) {
      if (ly + ROW > py + ph) break;
      ctx.font = 'bold 7px monospace'; ctx.fillStyle = 'rgba(120,180,120,0.70)';
      ctx.fillText(h.name ?? '?', sX + 4, ly + 7);
      if (h.legacyNote) {
        ctx.font = '6.5px monospace'; ctx.fillStyle = '#a8d080'; ctx.textAlign = 'right';
        ctx.fillText(h.legacyNote.slice(0, 18), px + pw - 8, ly + 7);
        ctx.textAlign = 'left';
      }
      ly += ROW;
    }
  }
  ctx.restore();
}

// ── Combat overlay: FORTRESS tab ─────────────────────────────────────────────
function drawCombatFortressOverlay(px, py, pw, ph) {
  const sX = px + 6, sW = pw - 12, dVX = px + pw - 8, ROW = 9;
  let ly = py + 8;
  ctx.save();

  ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#5882c8'; ctx.textAlign = 'left';
  ctx.fillText('🏰 FORTRESS STATUS', sX, ly + 8); ly += 14;
  ctx.strokeStyle = 'rgba(60,80,160,0.30)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(sX, ly); ctx.lineTo(sX + sW, ly); ctx.stroke(); ly += 5;

  // Lives / wall summary
  const livC = lives <= 2 ? '#ff3030' : lives <= 4 ? '#ff7040' : '#50e870';
  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(180,155,105,0.60)';
  ctx.fillText('Ramparts:', sX, ly + ROW - 2);
  ctx.font = 'bold 7.5px monospace'; ctx.fillStyle = livC; ctx.textAlign = 'right';
  ctx.fillText(`${lives}/${STARTING_LIVES}`, dVX, ly + ROW - 2);
  ctx.textAlign = 'left'; ly += ROW;

  const _wallEntries = Object.values(wallData);
  if (_wallEntries.length > 0) {
    const _maxLvl  = Math.max(..._wallEntries.map(w => w.level));
    const _damaged = _wallEntries.filter(w => w.hp < w.maxHp).length;
    const _tempCnt = _wallEntries.filter(w => w.temporary).length;
    const _wLvlStr = ['', 'I','II','III','IV'][_maxLvl] ?? '';
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(180,155,105,0.60)'; ctx.textAlign = 'left';
    ctx.fillText(`Walls (${_wLvlStr || 'Base'}):`, sX, ly + ROW - 2);
    ctx.font = 'bold 7.5px monospace'; ctx.textAlign = 'right';
    ctx.fillStyle = _damaged > 0 ? '#e8c040' : '#70c870';
    ctx.fillText(_damaged > 0 ? `${_damaged} damaged` : 'intact', dVX, ly + ROW - 2);
    ctx.textAlign = 'left'; ly += ROW;
    if (_tempCnt > 0) {
      ctx.font = '7px monospace'; ctx.fillStyle = '#f0c050';
      ctx.fillText(`⟳ ${_tempCnt} reinforce wall${_tempCnt !== 1 ? 's' : ''}`, sX, ly + ROW - 2);
      ly += ROW;
    }
  }
  ly += 5;

  // Fortress upgrades
  const upgrades = _campaignState?.fortressUpgrades ?? {};
  const _upgradeRows = [
    { key: 'barracks',   label: 'Barracks',   icon: '⚑' },
    { key: 'armory',     label: 'Armory',      icon: '⚔' },
    { key: 'watchtower', label: 'Watch Tower', icon: '◈' },
    { key: 'wallworks',  label: 'Wallworks',   icon: '▣' },
  ];
  ctx.strokeStyle = 'rgba(60,80,160,0.20)'; ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(sX, ly); ctx.lineTo(sX + sW, ly); ctx.stroke(); ly += 4;
  ctx.font = 'bold 7.5px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.70)';
  ctx.fillText('UPGRADES', sX, ly + 7); ly += 10;
  for (const { key, label, icon } of _upgradeRows) {
    if (ly + ROW > py + ph) break;
    const lvl = upgrades[key] ?? 0;
    const lvlStr = lvl === 0 ? '—' : ['I','II','III'][lvl - 1] ?? `${lvl}`;
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.55)'; ctx.textAlign = 'left';
    ctx.fillText(`${icon} ${label}`, sX, ly + ROW - 2);
    ctx.font = 'bold 7.5px monospace'; ctx.textAlign = 'right';
    ctx.fillStyle = lvl > 0 ? '#90c870' : 'rgba(120,100,70,0.45)';
    ctx.fillText(lvlStr, dVX, ly + ROW - 2);
    ctx.textAlign = 'left'; ly += ROW;
  }
  const _allUpgZero = _upgradeRows.every(({ key }) => !(upgrades[key] ?? 0));
  if (_allUpgZero && ly + 12 < py + ph) {
    ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.48)';
    ctx.fillText('Upgrade nodes between battles → FORTRESS tab', sX, ly + 8);
    ly += 12;
  }

  // Reserve gold
  if (ly + ROW + 4 < py + ph) {
    ly += 5;
    const gr = _campaignState?.goldReserve ?? 0;
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(180,155,105,0.60)'; ctx.textAlign = 'left';
    ctx.fillText('Reserve:', sX, ly + ROW - 2);
    ctx.font = 'bold 7.5px monospace'; ctx.textAlign = 'right';
    ctx.fillStyle = '#e8c040';
    ctx.fillText(`◆${gr}g`, dVX, ly + ROW - 2);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawRightPanel() {
  const px = combatRightPanelX();
  const pw = combatRightPanelW();
  speedBtns = [];
  runeForgeBtn = null;
  if (pw < 60) return;

  const fullH    = combatPanelFullH();
  if (isFortressPrepPhase()) {
    if (!_prepShell) _prepShell = createPrepShellState();
    drawCommanderContextPanel(ctx, px, GRID_TOP, pw, fullH, _prepShell, getPrepShellPanelCtx());
    return;
  }

  const panelBot = GRID_TOP + fullH;
  const _glass   = assaultUiGlass();
  const _assaultTransparent = assaultPlayfieldWide();
  const _campaignHudOnly = isCampaignAssaultBattle();
  if (_campaignHudOnly) _navActiveId = 'battle';
  if (!_assaultTransparent) {
    drawFantasyPanel(px, GRID_TOP, pw, fullH, `rgba(10,6,20,${0.72 * _glass})`, 0.65 * _glass);
  }

  let tabH = 0;
  let innerY = GRID_TOP + 4;
  let innerH = fullH - 8;
  if (!_campaignHudOnly) {
    const _navTabs = gamePhase === 'playing' ? _COMBAT_NAV : NAV_ITEMS;
    tabH = drawHorizTabs(px + 4, GRID_TOP + 4, pw - 8, _navTabs, _navActiveId, _rightNavTabBtns, { transparent: _assaultTransparent });
    innerY = GRID_TOP + 4 + tabH + 4;
    innerH = fullH - tabH - 12;

    // Route combat non-battle tabs to their overlays
    if (gamePhase === 'playing' && _navActiveId !== 'battle') {
      if (_navActiveId === 'warband')  { drawCombatWarbandOverlay(px, innerY, pw, innerH); return; }
      if (_navActiveId === 'hall')     { drawCombatHallOverlay(px, innerY, pw, innerH);     return; }
      if (_navActiveId === 'fortress') { drawCombatFortressOverlay(px, innerY, pw, innerH); return; }
    }
  } else {
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = UI_COLORS.threat;
    ctx.fillText('⚔ ASSAULT', px + 6, GRID_TOP + 14);
    ctx.strokeStyle = 'rgba(80,90,200,0.28)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(px + 6, GRID_TOP + 18);
    ctx.lineTo(px + pw - 6, GRID_TOP + 18);
    ctx.stroke();
    innerY = GRID_TOP + 22;
    innerH = fullH - 26;
  }

  // Wave-announcement merged into INCOMING section below
  let ly = innerY + 4;

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

  // Section header — assault: text + rule (matches left warband panel); else boxed header
  function _hdr(color, icon, label, rightTxt, rightColor) {
    if (_assaultTransparent) {
      ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left';
      ctx.fillStyle = color;
      ctx.fillText(`${icon} ${label}`, sX, ly + 8);
      if (rightTxt) {
        ctx.font = '6px monospace'; ctx.textAlign = 'right';
        ctx.fillStyle = rightColor ?? 'rgba(180,150,80,0.80)';
        ctx.fillText(rightTxt, dVX, ly + 8);
      }
      ctx.textAlign = 'left';
      ly += 12;
      ctx.strokeStyle = 'rgba(80,90,200,0.28)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(sX, ly); ctx.lineTo(sX + sW, ly); ctx.stroke();
      ly += 4;
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.roundRect(sX, ly, sW, HDR, [3,3,0,0]); ctx.fill();
    ctx.fillStyle = color; ctx.globalAlpha = 0.82;
    ctx.fillRect(sX, ly, 4, HDR);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(icon, sX + 9, ly + HDR - 2);
    ctx.font = 'bold 7.5px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = color; ctx.globalAlpha = 0.88;
    ctx.fillText(label, sX + 18, ly + HDR - 2);
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
    ctx.font = '7px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(180,155,105,0.60)';
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
    ctx.font = '7px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(180,155,105,0.60)';
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
    if (filled > 0) { ctx.shadowColor = color; ctx.shadowBlur = 2; }
    for (let i = 0; i < total; i++) {
      const sx      = bX + i * (sw + 2);
      const isFull  = i < filled;
      const isWarn  = i >= total - 2;
      ctx.fillStyle   = isFull ? (isWarn ? warnColor : color) : 'rgba(50,40,28,0.55)';
      ctx.globalAlpha = isFull ? 0.90 : 0.40;
      ctx.beginPath(); ctx.roundRect(sx, ly, sw, 6, 1); ctx.fill();
    }
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
    ly += 8;
  }

  // ══ ACTIVE COMBAT: INCOMING · FORTRESS · TREASURY · CAMPAIGN · DEFENDER STATS ══
  if (waveState === 'active') {
    const dispW     = isCampaignCombat() && _nodeWavePlan
      ? (_nodeWaveIndex + 1)
      : waveNumber;
    const tRatio    = isCampaignCombat() && _nodeWavePlan
      ? (_nodeWavePlan.waves.length > 0 ? dispW / _nodeWavePlan.waves.length : 0)
      : (endlessMode ? 1.0 : Math.min(1, waveNumber / MAX_WAVES));
    const isBossW   = isCampaignCombat() && _nodeWavePlan
      ? (_nodeWavePlan.waves[_nodeWaveIndex]?.isBoss ?? false)
      : BOSS_WAVES.has(waveNumber);
    const tColor    = isBossW ? UI_COLORS.threat : tRatio > 0.8 ? UI_COLORS.threat : tRatio > 0.5 ? UI_COLORS.gold : UI_COLORS.fortress;
    const onField   = enemies.filter(e => e.alive && !e.reached).length;
    const rem       = spawnQueue.length + onField;

    // ── INCOMING ─────────────────────────────────────────────────────────────
    {
      _hdr(tColor, '☠', 'INCOMING', isBossW ? 'BOSS' : `W${dispW}`, tColor);
      _segBar(Math.ceil(tRatio * 10), 10, tColor, UI_COLORS.threat);
      if (isBossW) {
        const bName = isCampaignCombat()
          ? (_nodeWavePlan?.waves[_nodeWaveIndex]?.bossName ?? 'BOSS')
          : (BOSS_CONFIGS[waveNumber]?.name ?? 'BOSS');
        _row('Threat:', `☠ ${bName}`, UI_COLORS.threat);
      } else {
        const comp = isCampaignCombat() ? {} : waveComposition(waveNumber);
        const compStr = isCampaignCombat()
          ? `${rem} remaining`
          : (formatWaveEnemyComp(comp).length > 20 ? `${onField} on field` : `${onField} · ${formatWaveEnemyComp(comp)}`);
        _row('Enemies:', compStr, tColor);
      }
      if (currentWaveEvent) {
        _row('Event:', `⚡ ${currentWaveEvent.label}`, UI_COLORS.gold);
      }
      ly += GAP;
    }

    // ── FORTRESS ─────────────────────────────────────────────────────────────
    {
      const livC  = lives <= 2 ? UI_COLORS.threat : lives <= 4 ? '#ff7040' : UI_COLORS.fortress;
      const flash = lifeLostTimer > 0 ? Math.min(1, lifeLostTimer / 20) * (lifeLostTimer > 60 ? 1 : lifeLostTimer / 60) : 0;
      const effC  = flash > 0 ? '#ff1818' : livC;
      const stat  = lives <= 2 ? 'CRITICAL' : lives <= 4 ? 'BREACHED' : lives < STARTING_LIVES ? 'DAMAGED' : 'SECURE';
      const statC = lives <= 2 ? UI_COLORS.threat : lives <= 4 ? '#ff7040' : lives < STARTING_LIVES ? UI_COLORS.gold : UI_COLORS.fortress;

      if (flash > 0) { ctx.shadowColor = effC; ctx.shadowBlur = 8; }
      _hdr(UI_COLORS.warband, '⚑', 'FORTRESS', stat, statC);
      ctx.shadowBlur = 0;

      ctx.font = '7px monospace'; ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(232,215,181,0.55)';
      ctx.fillText('Ramparts:', dLX, ly + ROW - 2);
      drawRampartHearts(dLX + 52, ly + ROW - 2, lives, STARTING_LIVES, effC);
      ctx.font = 'bold 7.5px monospace'; ctx.textAlign = 'right';
      ctx.fillStyle = effC;
      ctx.fillText(`${lives}/${STARTING_LIVES}`, dVX, ly + ROW - 2);
      ctx.textAlign = 'left';
      ly += ROW;
      _bar(lives / STARTING_LIVES, effC);

      const _wDmg = Object.values(wallData).filter(w => w.hp < w.maxHp).length;
      const _wTotal = Object.keys(wallData).length;
      if (_wTotal > 0) {
        _row('Walls:', _wDmg > 0 ? `${_wDmg} damaged` : 'intact', _wDmg > 0 ? UI_COLORS.gold : UI_COLORS.fortress);
      }
      ly += GAP;
    }

    // ── TREASURY ───────────────────────────────────────────────────────────────
    {
      const hG     = gold;
      const hColor = hG >= 1000 ? UI_COLORS.gold : hG >= 100 ? '#c89828' : '#786040';
      _hdr(UI_COLORS.gold, '◆', 'TREASURY', `${Math.floor(gold)}g`, hColor);
      _row('Battle gold:', `◆ ${Math.floor(gold)}g`, hColor);
      if (goldReserve > 0) _row('Reserve:', `◈ ${goldReserve}g`, 'rgba(232,215,181,0.65)');
      const hFrac = hG >= 5000 ? 1.0 : hG >= 1000 ? 0.80 : hG >= 500 ? 0.60 : hG >= 100 ? 0.35 : Math.min(0.20, hG / 100);
      _bar(hFrac, hColor);
      ly += GAP;
    }

    // ── CAMPAIGN ─────────────────────────────────────────────────────────────
    {
      _hdr(UI_COLORS.magic, '✦', 'CAMPAIGN', `✦ ${stars}`, UI_COLORS.gold);
      if (isCampaignCombat() && _nodeWavePlan) {
        const nodeTotal = _nodeWavePlan.waves.length;
        const progress  = nodeTotal > 0 ? dispW / nodeTotal : 0;
        const assaultInfo = getAssaultInfo(_campaignMapIndex, _campaignNodeIndex);
        if (assaultInfo) {
          _row('Assault:', assaultInfo.codename, UI_COLORS.parchment);
        }
        _row('Battle:', `${dispW} / ${nodeTotal}`, UI_COLORS.parchment);
        _bar(progress, progress < 0.5 ? UI_COLORS.fortress : progress < 0.8 ? UI_COLORS.gold : UI_COLORS.threat);
      } else if (!isCampaignCombat()) {
        const progress = endlessMode ? 1.0 : Math.min(1, waveNumber / MAX_WAVES);
        _row('Wave:', endlessMode ? `${waveNumber} / ∞` : `${waveNumber} / ${MAX_WAVES}`, UI_COLORS.parchment);
        _bar(progress, progress < 0.5 ? UI_COLORS.fortress : progress < 0.8 ? UI_COLORS.gold : UI_COLORS.threat);
      }
      ly += GAP;
    }

    // ── DEFENDER STATS (aggregate — roster on left panel) ────────────────────
    {
      const heroes = towers.filter(t => isHeroTowerType(t.type));
      const totalDmg = heroes.reduce((s, t) => s + (t.damageDealt ?? 0), 0);
      const totalKills = heroes.reduce((s, t) => s + (t.killCount ?? 0), 0);
      const wounded = heroes.filter(t => getHeroHpFrac(t) < 0.98).length;
      const healed = heroes.reduce((s, t) => s + (t.healDone ?? 0), 0);
      const mvpT = heroes.reduce((best, t) => {
        const sc = (t.damageDealt ?? 0) + (t.killCount ?? 0) * 32;
        return !best || sc > best.sc ? { t, sc } : best;
      }, null);

      _hdr(UI_COLORS.warband, '⚔', 'DEFENDER STATS', `${heroes.length} field`, UI_COLORS.parchment);
      _row('Damage:', totalDmg > 0 ? formatBattleStat(totalDmg) : '—', UI_COLORS.gold);
      _row('Kills:', String(totalKills), UI_COLORS.threat);
      if (healed > 0) _row('Healed:', `♥ ${healed}`, UI_COLORS.fortress);
      if (wounded > 0) _row('Wounded:', String(wounded), UI_COLORS.threat);
      if (mvpT && mvpT.sc > 0) {
        const mName = mvpT.t.name ?? TOWER_DEFS[mvpT.t.type]?.label ?? '';
        _row('MVP:', mName.length > 14 ? `${mName.slice(0, 13)}…` : mName, UI_COLORS.gold);
      }
    }

    ctx.restore();
    return;
  }

  // ══ BREAK/COUNTDOWN: INCOMING + FORTRESS + DEFENDERS + TREASURY + CAMPAIGN ══

  // ── 1. INCOMING (next wave preview) ─────────────────────────────────────────
  {
    const nextW       = isCampaignCombat() && _nodeWavePlan
      ? (_nodeWaveIndex + (waveState === 'countdown' ? 1 : 0) + 1)
      : waveNumber + 1;
    const isBoss      = isCampaignCombat() && _nodeWavePlan
      ? (_nodeWavePlan.waves[Math.min(_nodeWaveIndex + 1, _nodeWavePlan.waves.length - 1)]?.isBoss ?? false)
      : BOSS_WAVES.has(nextW);
    const isClear     = waveState === 'break';
    const accentColor = isBoss ? UI_COLORS.threat : isClear ? UI_COLORS.fortress : UI_COLORS.gold;
    const threatRatio = isCampaignCombat() && _nodeWavePlan
      ? (nextW / Math.max(1, _nodeWavePlan.waves.length))
      : (endlessMode ? 1.0 : Math.min(1, nextW / MAX_WAVES));

    _hdr(accentColor, '☠', 'INCOMING', isClear ? `W${waveNumber} CLEAR` : `W${nextW}`, accentColor);
    if (isClear) {
      const flawless = flawlessTimer > 0;
      _row('Last wave:', flawless ? '★ FLAWLESS' : 'CLEARED', flawless ? UI_COLORS.gold : UI_COLORS.fortress);
    } else if (isBoss) {
      const bName = isCampaignCombat()
        ? (_nodeWavePlan?.waves[_nodeWaveIndex]?.bossName ?? 'BOSS WAVE')
        : (BOSS_CONFIGS[nextW]?.name ?? 'BOSS');
      _row('Next:', `☠ ${bName}`, UI_COLORS.threat);
    } else {
      const comp = isCampaignCombat() ? null : waveComposition(nextW);
      const compStr = comp ? formatWaveEnemyComp(comp) : 'Assault wave';
      _row('Composition:', compStr.length > 22 ? 'Mixed host' : compStr, accentColor);
    }
    _bar(threatRatio, accentColor);
    ly += GAP;
  }

  // ══ legacy break sections continue ═══════════════════════════════════════════
  {
    const livC  = lives <= 2 ? '#ff3030' : lives <= 4 ? '#ff7040' : '#50e870';
    const flash = lifeLostTimer > 0 ? Math.min(1, lifeLostTimer / 20) * (lifeLostTimer > 60 ? 1 : lifeLostTimer / 60) : 0;
    const effC  = flash > 0 ? '#ff1818' : livC;
    const stat  = lives <= 2 ? 'CRITICAL' : lives <= 4 ? 'BREACHED' : lives < STARTING_LIVES ? 'DAMAGED' : 'SECURE';
    const statC = lives <= 2 ? '#ff3030' : lives <= 4 ? '#ff7040' : lives < STARTING_LIVES ? '#e8c040' : '#50e870';

    if (flash > 0) { ctx.shadowColor = effC; ctx.shadowBlur = 8; }
    ctx.globalAlpha = flash > 0 ? 0.85 + flash * 0.15 : 1;
    _hdr('#5882c8', '⚑', 'FORTRESS', stat, statC);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;

    ctx.font = '7px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(180,155,105,0.60)';
    ctx.fillText('Ramparts:', dLX, ly + ROW - 2);
    drawRampartHearts(dLX + 52, ly + ROW - 2, lives, STARTING_LIVES, effC);
    ctx.font = 'bold 7.5px monospace'; ctx.textAlign = 'right';
    ctx.fillStyle = effC;
    ctx.fillText(`${lives}/${STARTING_LIVES}`, dVX, ly + ROW - 2);
    ctx.textAlign = 'left';
    ly += ROW;
    _bar(lives / STARTING_LIVES, effC);
    _row('Deployed:', `${towers.length} unit${towers.length !== 1 ? 's' : ''}`, '#90a8c8');

    // Wall status row
    const _wallEntries = Object.values(wallData);
    if (_wallEntries.length > 0) {
      const _maxLvl   = Math.max(..._wallEntries.map(w => w.level));
      const _damaged  = _wallEntries.filter(w => w.hp < w.maxHp).length;
      const _lvlNames = ['', 'I', 'II', 'III', 'IV'];
      const _wLvlStr  = _maxLvl > 0 ? `Lv ${_lvlNames[_maxLvl]}` : 'Base';
      const _wallRightTxt = _damaged > 0 ? `${_damaged} damaged` : 'intact';
      const _wallRightC   = _damaged > 0 ? '#e8c040' : '#70c870';
      _row(`Walls (${_wLvlStr}):`, _wallRightTxt, _wallRightC);
    }

    // Selected gate info (pendingSell on a gate)
    if (pendingSell && !getTowerAtCell(pendingSell.col, pendingSell.row)) {
      const _swd = wallData[`${pendingSell.col}_${pendingSell.row}`];
      if (_swd?.isGate) {
        const _hpPct = Math.round(_swd.hp / _swd.maxHp * 100);
        const _hpC   = _hpPct > 60 ? '#70c870' : _hpPct > 25 ? '#e8c040' : '#e84040';
        _row('  Gate:', `${_hpPct}% HP`, _hpC);
      }
    }
    ly += GAP;
  }

  // ── 3. DEFENDERS / stats (aggregate when field dock is active) ───────────────
  {
    const defC  = UI_COLORS.warband;
    const heroes = towers.filter(t => isHeroTowerType(t.type));

    if (useAssaultFieldDock()) {
      const totalDmg = heroes.reduce((s, t) => s + (t.damageDealt ?? 0), 0);
      const totalKills = heroes.reduce((s, t) => s + (t.killCount ?? 0), 0);
      _hdr(defC, '⚔', 'DEFENDER STATS', `${heroes.length} field`, UI_COLORS.parchment);
      _row('Damage:', totalDmg > 0 ? formatBattleStat(totalDmg) : '—', UI_COLORS.gold);
      _row('Kills:', String(totalKills), UI_COLORS.threat);
      _row('Siege:', `${towers.filter(t => !isHeroTowerType(t.type)).length} placed`, UI_COLORS.gold);
      if (heroes.length === 0) {
        ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(232,215,181,0.40)';
        ctx.fillText('Deploy from bar below', sX + 4, ly + 8);
        ly += 10;
      }
    } else {
      const scored = towers.map(t => ({
        t,
        score: (t.damageDealt || 0) + (t.killCount || 0) * 32 + (t.goldGenerated || 0) * 1.5,
      })).sort((a, b) => b.score - a.score);
      const mvpT     = scored.length ? scored[0].t : null;
      const mvpLabel = mvpT?.mvpTimer > 0 ? (mvpT.name ?? TOWER_DEFS[mvpT.type]?.label) : null;
      const _defRightTxt = mvpLabel ? `MVP: ${mvpLabel}` : `${towers.length} DEPLOYED`;
      _hdr(defC, '⚔', 'DEFENDERS', _defRightTxt, mvpLabel ? '#ffd040' : 'rgba(160,140,120,0.75)');

      if (towers.length === 0) {
        _row('No defenders', 'deployed', 'rgba(140,120,90,0.50)');
        ly += 2;
        ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(120,100,60,0.40)'; ctx.textAlign = 'left';
        ctx.fillText('Deploy from warband panel ←', sX + 2, ly + 8);
        ly += 12;
        ctx.textAlign = 'left';
      } else {
        const show = Math.min(scored.length, 4);
        const _maxScore = scored.length > 0 ? scored[0].score : 0;
        for (let i = 0; i < show; i++) {
          const { t } = scored[i];
          ly += drawDefenderSidebarRow(sX, ly, sW, dVX, t, {
            isMvp: i === 0 && mvpT?.mvpTimer > 0,
            isFieldSelected: selectedTower != null && selectedTower.defenderId === t.defenderId,
            maxScore: _maxScore,
          });
        }
      }
    }
    ly += GAP;
  }

  // ── 4. TREASURY ──────────────────────────────────────────────────────────────
  {
    const hG      = gold;
    const hoard   = getHoardStage(hG);
    const hColor  = hG >= 5000 ? '#ffd040' : hG >= 1000 ? '#f0a030' : hG >= 500 ? '#c08020' : hG >= 100 ? '#c89828' : '#786040';
    const pulse   = hoardPulse > 0;
    const lastInc = goldEarned - waveGoldStart;
    const incEst  = lastWaveTimeSec > 0 ? Math.ceil(lastInc / Math.max(1, lastWaveTimeSec)) : 0;
    const inFight = waveState === 'active';

    const _stageBadge = ['', '⬥ HOARD I', '⬥ HOARD II', '⬥ HOARD III', '⬥ VAULT', '⬛ DRAGON HOARD'][hoard.level] ?? '';
    _hdr('#c89828', '◆', 'TREASURY', `${_stageBadge}`, hColor);

    if (!inFight) {
      ctx.font = '6px monospace'; ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(180,155,105,0.55)';
      ctx.fillText('Gold:', dLX, ly + 10);
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'right';
      ctx.fillStyle = pulse ? '#fff8a0' : '#f0c840';
      if (pulse) { ctx.shadowColor = '#ffffa0'; ctx.shadowBlur = 8; }
      ctx.fillText(`${Math.floor(_displayGold)}g`, dVX, ly + 10);
      ctx.shadowBlur = 0; ctx.textAlign = 'left';
      ly += 12;
    } else {
      _row('Gold:', `${Math.floor(gold)}g`, hColor);
    }

    if (incEst > 0) _row('Gold / sec:', `${incEst}g`, '#c89828');

    const hFrac = hG >= 5000 ? 1.0 : hG >= 1000 ? 0.80 : hG >= 500 ? 0.60 : hG >= 100 ? 0.35 : Math.min(0.20, hG / 100);
    _bar(hFrac, hColor);

    // Treasury chest — inline, scales with hoard stage
    drawTreasuryChest(px + pw * 0.5, ly + 18, Math.min(0.62, pw / 280), hoard.level, pulse);

    ly += 30;
    ly += GAP;
  }

  // ── 5. CAMPAIGN — hidden during active combat (top HUD covers wave info) ────────
  if (waveState !== 'active') {
    const dispW    = waveState === 'countdown' ? waveNumber + 1 : waveNumber;
    const campC    = 'rgba(130,130,195,0.90)';

    _hdr(campC, '✦', 'CAMPAIGN', `✦ ${stars}`, 'rgba(230,200,80,0.80)');
    if (isCampaignCombat() && _nodeWavePlan) {
      const nodeTotal = _nodeWavePlan.waves.length;
      const progress  = nodeTotal > 0 ? dispW / nodeTotal : 0;
      const bColor    = progress < 0.5 ? '#60c840' : progress < 0.8 ? '#e8c040' : '#e84040';
      _row('Assault Waves:', `${dispW} / ${nodeTotal}`, 'rgba(210,195,160,0.90)');
      _bar(progress, bColor);
    } else if (!isCampaignCombat()) {
      const progress = endlessMode ? 1.0 : Math.min(1, dispW / MAX_WAVES);
      const bColor   = progress < 0.5 ? '#60c840' : progress < 0.8 ? '#e8c040' : '#e84040';
      _row('Wave Progress:', endlessMode ? `${dispW} / ∞` : `${dispW} / ${MAX_WAVES}`, 'rgba(210,195,160,0.90)');
      _bar(progress, bColor);
      _row('Chieftains Slain:', `${bossesDefeated} / ${BOSS_WAVES.size}`,
        bossesDefeated >= BOSS_WAVES.size ? '#ffd040' : 'rgba(200,180,130,0.80)');
      {
        const pipW = Math.floor((bW - (BOSS_WAVES.size - 1) * 2) / BOSS_WAVES.size);
        for (let _bi = 0; _bi < BOSS_WAVES.size; _bi++) {
          const _px = bX + _bi * (pipW + 2);
          const _done = _bi < bossesDefeated;
          ctx.fillStyle = _done ? '#ffd040' : 'rgba(60,50,30,0.50)';
          ctx.globalAlpha = _done ? 0.88 : 0.40;
          ctx.beginPath(); ctx.roundRect(_px, ly, pipW, 3, 1); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ly += 5;
      }
    }
    if (goldReserve > 0) _row('Reserve:', `◈ ${goldReserve}g`, 'rgba(190,170,100,0.70)');
    {
      const fb = _fortressBonuses;
      const fParts = [];
      if ((fb.startingGoldBonus   ?? 0) > 0) fParts.push({ t: `+${fb.startingGoldBonus}g`, c: 'rgba(100,200,100,0.75)' });
      if ((fb.recruitCostReduction ?? 0) > 0) fParts.push({ t: `−${fb.recruitCostReduction}g recruit`, c: 'rgba(96,180,236,0.75)' });
      if ((fb.wallCostReduction   ?? 0) > 0) fParts.push({ t: `−${fb.wallCostReduction}g wall`, c: 'rgba(96,180,236,0.75)' });
      if ((fb.equipDmMult         ?? 1) > 1) fParts.push({ t: `+${Math.round((fb.equipDmMult - 1) * 100)}%eq`, c: 'rgba(100,200,100,0.75)' });
      if (fParts.length > 0) {
        ctx.fillStyle = 'rgba(80,140,80,0.10)';
        ctx.fillRect(sX, ly, sW, ROW - 1);
        const joined = fParts.map(p => p.t).join(' · ');
        _row('Fortress:', joined, 'rgba(140,200,140,0.80)');
      }
    }
    ly += GAP;
  }

  // ── BOTTOM DOCK (break/countdown): march begins — hidden during combat ────────
  const DOCK_MARCH_H = 36;
  const dockMarchY   = panelBot - DOCK_MARCH_H - 4;

  runeForgeBtn = null;
  if (!gameOver && waveState !== 'active') {
    const dockX = px + 6;
    const dockW = pw - 12;
    const bX = dockX, bY = dockMarchY, bW = dockW, bH = DOCK_MARCH_H;
    ctx.shadowColor = 'rgba(169,50,38,0.55)'; ctx.shadowBlur = 8;
    drawFantasyPanel(bX, bY, bW, bH, 'rgba(140,18,18,0.97)', 0.88, 5);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center'; ctx.font = 'bold 10px monospace';
    ctx.fillStyle = UI_COLORS.parchment; ctx.shadowColor = 'rgba(255,100,80,0.6)'; ctx.shadowBlur = 6;
    ctx.fillText('MARCH BEGINS', bX + bW / 2, bY + 15);
    ctx.font = '7px monospace'; ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,200,180,0.65)';
    ctx.fillText('Space', bX + bW / 2, bY + 27);
    ctx.textAlign = 'left';
    nextWaveBtn = { x: bX, y: bY, w: bW, h: bH };
  } else if (!gameOver) {
    autoNextBtn = null;
    nextWaveBtn = null;
  } else {
    nextWaveBtn = null;
  }

  // Rune Carver — skirmish only; in campaign, rune management is in War Camp
  if (!gameOver && waveState !== 'active' && stars > 0 && !isCampaignCombat() && !_campaignNodeMode) {
    const cartridgeH = 14 + Math.ceil(RUNE_DEFS.length / 2) * 20 + 8;
    if (showRuneMenu) {
      const cartridgeY = Math.max(innerY + 4, dockMarchY - cartridgeH - 4);
      drawRuneCartridge(px + 4, cartridgeY, pw - 8, cartridgeH);
    } else {
      const chipH = 14, chipW = pw - 12;
      const chipY = dockMarchY - chipH - 3;
      const chipX = px + 6;
      drawFantasyPanel(chipX, chipY, chipW, chipH, 'rgba(36,18,58,0.88)', 0.55, 3);
      ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#c8a8ff';
      ctx.fillText('✦ RUNE CARVER  [R]', chipX + chipW / 2, chipY + 10);
      ctx.textAlign = 'left';
      runeForgeBtn = { x: chipX, y: chipY, w: chipW, h: chipH };
    }
  }

  ctx.restore();
}

function drawPostPrepPanel(px, py, pw, ph) {
  _postPrepBtns = [];
  const pad = 8;
  const contentTop = py + DOCK_TAB_H + 12;
  const rowH = 22;
  let ly = contentTop;

  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText(_postPickerPostId ? 'PICK DEFENDER' : 'DEFENSIVE POSTS', px + pad, ly);
  ly += 14;

  const assault = _pendingAssaultNode != null
    ? getAssaultInfo(_campaignMapIndex, _pendingAssaultNode) : null;
  const primaryGate = getPrimaryGateForFront(assault?.frontId ?? 'west');

  if (_postPickerPostId) {
    const available = (_roster?.defenders ?? []).filter(d => !isNodeCasualty(_nodeCasualties, d.defenderId));
    for (const def of available) {
      if (ly + rowH > py + ph - 8) break;
      const cardX = px + pad;
      const cardW = pw - pad * 2;
      const assignedElsewhere = HERO_POST_IDS.some(
        pid => pid !== _postPickerPostId && _postAssignments[pid]?.defenderId === def.defenderId,
      );
      drawFantasyPanel(cardX, ly, cardW, rowH - 2,
        assignedElsewhere ? 'rgba(28,16,16,0.85)' : 'rgba(14,20,36,0.92)', 0.55, 4);
      ctx.font = '7.5px monospace';
      ctx.fillStyle = assignedElsewhere ? 'rgba(160,120,100,0.55)' : '#e8d7b5';
      const label = def.name || getDefenderName(def.type);
      ctx.fillText(label, cardX + 6, ly + 14);
      if (!assignedElsewhere) {
        _postPrepBtns.push({ x: cardX, y: ly, w: cardW, h: rowH - 2, action: 'assignDefender', defenderId: def.defenderId });
      }
      ly += rowH;
    }
    return;
  }

  for (const postId of HERO_POST_IDS) {
    if (ly + rowH > py + ph - 8) break;
    const defn = POST_DEFS[postId];
    const cell = resolvePostCell(postId, GOAL, FORTRESS_RING_R);
    const assignedId = _postAssignments[postId]?.defenderId;
    const def = assignedId ? _roster?.find(assignedId) : null;
    const isPrimary = postId === primaryGate;
    const cardX = px + pad;
    const cardW = pw - pad * 2;
    drawFantasyPanel(cardX, ly, cardW, rowH - 2,
      isPrimary ? 'rgba(20,28,12,0.95)' : 'rgba(12,10,24,0.90)', isPrimary ? 0.7 : 0.5, 4);
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = isPrimary ? '#a8e060' : 'rgba(180,160,120,0.75)';
    ctx.fillText(defn?.label ?? postId, cardX + 6, ly + 10);
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = def ? '#e8d7b5' : 'rgba(140,120,90,0.50)';
    ctx.fillText(def ? (def.name || getDefenderName(def.type)) : '— assign —', cardX + cardW - 6, ly + 14);
    ctx.textAlign = 'left';
    _postPrepBtns.push({ x: cardX, y: ly, w: cardW, h: rowH - 2, action: 'pickPost', postId });
    if (assignedId) {
      _postPrepBtns.push({ x: cardX + cardW - 18, y: ly + 2, w: 14, h: rowH - 6, action: 'clearPost', postId });
    }
    ly += rowH;
  }
}

function drawPostMarkers() {
  if (!isFortressPrepPhase()) return;
  const assault = _pendingAssaultNode != null
    ? getAssaultInfo(_campaignMapIndex, _pendingAssaultNode) : null;
  const primaryGate = getPrimaryGateForFront(assault?.frontId ?? 'west');
  ctx.save();
  for (const postId of HERO_POST_IDS) {
    const cell = resolvePostCell(postId, GOAL, FORTRESS_RING_R);
    const pos = grid.cellCenter(cell.col, cell.row);
    const sx = gridScreenX(pos.x);
    const sy = gridScreenY(pos.y);
    const assignedId = _postAssignments[postId]?.defenderId;
    const isPrimary = postId === primaryGate;
    const r = CELL_SIZE * 0.42;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = assignedId
      ? (isPrimary ? 'rgba(120,200,80,0.55)' : 'rgba(80,140,220,0.45)')
      : (isPrimary ? 'rgba(200,160,40,0.35)' : 'rgba(100,90,140,0.25)');
    ctx.fill();
    ctx.strokeStyle = isPrimary ? '#c0e060' : 'rgba(180,160,220,0.55)';
    ctx.lineWidth = isPrimary ? 2 : 1;
    ctx.stroke();
    if (assignedId) {
      const def = _roster?.find(assignedId);
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0e8d0';
      const initials = (def?.name ?? '?').slice(0, 2).toUpperCase();
      ctx.fillText(initials, sx, sy + 2);
    }
  }
  ctx.restore();
}

function drawFieldPrepPanel(px, pw, fullH) {
  _fieldPrepBtns = [];
  drawFantasyPanel(px, GRID_TOP, pw, fullH, 'rgba(10,6,20,0.92)', 0.72, 6);
  const cx = px + pw / 2;
  let ly = GRID_TOP + 16;
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px monospace'; ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText('FORTRESS PREP', cx, ly);
  ly += 16;
  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(232,215,181,0.60)';
  const heroes = countAssignedHeroes(_postAssignments);
  ctx.fillText(`${heroes} heroes assigned to posts`, cx, ly);
  ly += 14;
  const assault = _pendingAssaultNode != null
    ? getAssaultInfo(_campaignMapIndex, _pendingAssaultNode) : null;
  if (assault) {
    ctx.fillStyle = 'rgba(180,150,90,0.65)';
    ctx.fillText(`${assault.codename} · ${assault.tierLabel}`, cx, ly);
  } else {
    ctx.fillStyle = 'rgba(200,140,100,0.55)';
    ctx.fillText('Pick assault on command map', cx, ly);
  }
  ly += 20;
  const btnW = pw - 16, btnH = 36;
  const btnX = px + 8;
  const canLaunch = _pendingAssaultNode != null && heroes > 0;
  drawFantasyPanel(btnX, ly, btnW, btnH,
    canLaunch ? 'rgba(8,28,8,0.95)' : 'rgba(28,16,16,0.85)', 0.7, 6);
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = canLaunch ? '#88ee66' : 'rgba(200,120,100,0.55)';
  ctx.fillText('BEGIN ASSAULT', cx, ly + 22);
  if (canLaunch) _fieldPrepBtns.push({ x: btnX, y: ly, w: btnW, h: btnH, action: 'launchAssault' });
  ly += btnH + 10;
  const secH = 26;
  drawFantasyPanel(btnX, ly, btnW, secH, 'rgba(12,8,4,0.85)', 0.6, 4);
  ctx.font = '8px monospace'; ctx.fillStyle = '#c0a060';
  ctx.fillText('◀ WAR CAMP', cx, ly + 17);
  _fieldPrepBtns.push({ x: btnX, y: ly, w: btnW, h: secH, action: 'warCamp' });
  ly += secH + 6;
  drawFantasyPanel(btnX, ly, btnW, secH, 'rgba(12,8,4,0.85)', 0.6, 4);
  ctx.fillText('COMMAND MAP', cx, ly + 17);
  _fieldPrepBtns.push({ x: btnX, y: ly, w: btnW, h: secH, action: 'commandMap' });
  ly += secH + 10;
  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.50)';
  ctx.fillText('Assign posts on the left · recruit in War Camp', cx, ly);
}

function drawSpeedTriangles(cx, cy, n, color, size = 5) {
  const gap = 3.5, total = n * size + (n - 1) * gap;
  let tx = cx - total / 2;
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    let ox = tx, oy = cy;
    if (n === 4) {
      const col = i % 2, rr = Math.floor(i / 2), g2 = 3, t2 = 2 * size + g2;
      ox = cx - t2 / 2 + col * (size + g2); oy = cy + (rr === 0 ? -3.5 : 3.5);
    }
    ctx.beginPath();
    ctx.moveTo(ox, oy - size * 0.6); ctx.lineTo(ox + size, oy); ctx.lineTo(ox, oy + size * 0.6);
    ctx.closePath(); ctx.fill();
    if (n !== 4) tx += size + gap;
  }
}

/** Inline rune shop — embedded in the right panel between waves. */
function drawRuneCartridge(rx, ry, rw, rh) {
  runeMenuBtns = [];
  const _now = performance.now();

  drawFantasyPanel(rx, ry, rw, rh, 'rgba(12,6,28,0.98)', 0.72, 5);

  // Header strip
  ctx.fillStyle = 'rgba(36,18,58,0.95)';
  ctx.beginPath(); ctx.roundRect(rx, ry, rw, 14, [5, 5, 0, 0]); ctx.fill();
  ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = '#c8a8ff';
  ctx.fillText('RUNE CARVER', rx + 6, ry + 10);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f0d040';
  ctx.fillText(`✦ ${stars}`, rx + rw - 18, ry + 10);
  // Close toggle
  const clX = rx + rw - 14, clY = ry + 2, clW = 12, clH = 11;
  ctx.fillStyle = 'rgba(60,30,50,0.7)';
  ctx.beginPath(); ctx.roundRect(clX, clY, clW, clH, 2); ctx.fill();
  ctx.font = 'bold 8px monospace'; ctx.fillStyle = 'rgba(200,140,180,0.75)'; ctx.textAlign = 'center';
  ctx.fillText('×', clX + clW / 2, clY + 9);
  runeMenuBtns.push({ x: clX, y: clY, w: clW, h: clH, close: true });
  ctx.textAlign = 'left';

  const ICON_KEYS = { ironEdge: 'runeIronEdge', swiftStrike: 'runeSwiftStrike', frostRune: 'runeFrost', battleHymn: 'runeBattleHymn', valhalla: 'runeValhalla' };
  const cols = 2;
  const cellW = Math.floor((rw - 8) / cols);
  const cellH = 20;
  const gridY = ry + 16;

  RUNE_DEFS.forEach((def, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx  = rx + 4 + col * cellW;
    const cy  = gridY + row * cellH;
    const owned    = runeInventory[def.id] ?? 0;
    const equipped = runeEquippedCount(def.id);
    const maxed    = owned >= def.maxOwned;
    const canBuy   = !maxed && stars >= def.cost;

    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent';
    ctx.fillRect(cx, cy, cellW - 2, cellH - 1);

    const iconKey = ICON_KEYS[def.id];
    const sp      = SPRITES[iconKey];
    const ix = cx + 10, iy = cy + cellH / 2;
    if (sp?.img?.complete) {
      ctx.save();
      ctx.globalAlpha = owned > 0 ? 1 : 0.4;
      ctx.drawImage(sp.img, ix - 7, iy - 7, 14, 14);
      ctx.restore();
    } else {
      ctx.fillStyle = owned > 0 ? def.color : 'rgba(60,45,30,0.5)';
      ctx.beginPath(); ctx.arc(ix, iy, 5, 0, Math.PI * 2); ctx.fill();
    }

    ctx.font = 'bold 6.5px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = owned > 0 ? '#e0c890' : 'rgba(140,110,70,0.55)';
    const shortLbl = def.label.split(' ')[0];
    ctx.fillText(shortLbl, cx + 18, cy + 8);

    // Owned pips
    for (let p = 0; p < def.maxOwned; p++) {
      const px2 = cx + 18 + p * 7;
      ctx.beginPath(); ctx.arc(px2, cy + 15, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p < owned ? def.color : 'rgba(40,28,18,0.6)';
      ctx.fill();
      if (p < equipped) {
        ctx.beginPath(); ctx.arc(px2, cy + 15, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
      }
    }

    // Buy chip
    const bw = 28, bh = 13;
    const bx = cx + cellW - bw - 6;
    const by = cy + (cellH - bh) / 2;
    if (!maxed) {
      const pulse = canBuy ? 0.7 + Math.sin(_now * 0.006 + i) * 0.3 : 0;
      drawFantasyPanel(bx, by, bw, bh,
        canBuy ? `rgba(14,36,8,${0.85 + pulse * 0.15})` : 'rgba(18,10,30,0.9)',
        canBuy ? 0.65 : 0.2, 3);
      ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = canBuy ? '#88ee60' : 'rgba(140,100,180,0.45)';
      ctx.fillText(`✦${def.cost}`, bx + bw / 2, by + 9);
      runeMenuBtns.push({ x: bx, y: by, w: bw, h: bh, idx: i });
    } else {
      ctx.font = '6px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(100,80,50,0.45)';
      ctx.fillText('FULL', bx + bw / 2, cy + 12);
    }
    ctx.textAlign = 'left';
  });

  ctx.font = '6px monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(100,80,55,0.50)';
  ctx.fillText('equip on tower panel  ·  R to close', rx + rw / 2, ry + rh - 3);
  ctx.textAlign = 'left';
}

function _metaBarChips() {
  const chips = [];
  if (stars > 0) {
    chips.push({ w: 44, icon: '✦', value: String(stars), label: 'STARS', accent: UI_COLORS.gold, pulse: 0.9 });
  }
  if (goldReserve > 0) {
    chips.push({ w: 48, icon: '◈', value: `${goldReserve}g`, label: 'RESERVE', accent: UI_COLORS.parchment, pulse: 0.75 });
  }
  if (gamePhase === 'fortressPrep') {
    const prepMeta = _prepFieldMeta ?? loadPrepFieldMeta(null);
    const showWood = prepMeta.wood > 0
      || (_pendingAssaultNode != null && _pendingAssaultNode >= FIRST_SAGA_A3_NODE);
    if (showWood) {
      chips.push({
        w: 42,
        icon: '▣',
        value: String(prepMeta.wood),
        label: 'WOOD',
        accent: '#a08050',
        pulse: 0.7,
      });
    }
  }
  return chips;
}

function drawCampaignMetaBar(center) {
  _metaBarBtns = [];
  let subtitle = 'CAMPAIGN';
  if (gamePhase === 'nodeMap') {
    subtitle = getCampaignMapMeta(_campaignMapIndex)?.name ?? 'COMMAND MAP';
  } else if (gamePhase === 'fortressPrep') {
    const assault = _pendingAssaultNode != null
      ? getAssaultInfo(_campaignMapIndex, _pendingAssaultNode) : null;
    subtitle = assault
      ? `${assault.codename} · WEST · prepare the fortress`
      : 'Fortress Prep — click the stronghold';
  } else if (gamePhase === 'betweenBattles') {
    subtitle = isCampaignWarCamp()
      ? (_warCampTabPulse === 'recruit'
        ? 'War Camp — hire defenders in RECRUIT tab'
        : _warCampTabPulse === 'fortress'
          ? 'War Camp — fortress buildings in FORTRESS tab'
          : (_warCampWelcomeTimer > 0
            ? 'War Camp — tabs: Warband · Recruit · Fortress'
            : 'War Camp'))
      : 'Between battles';
  } else if (gamePhase === 'debrief') {
    subtitle = 'AFTER ACTION';
  } else if (gamePhase === 'mapSelect') {
    subtitle = 'SKIRMISH MODE';
  } else if (gamePhase === 'campaignSelect') {
    subtitle = '100 REGIONS';
  }
  const _center = (gamePhase === 'campaignSelect' || gamePhase === 'betweenBattles') ? null : center;
  const chips = _metaBarChips();
  drawMetaTopBar(ctx, BASE_W, FRAME_THICK, { subtitle, center: _center, chips });

  if (gamePhase !== 'slotSelect' && _activeSlotIndex != null) {
    let chipRight = BASE_W - FRAME_THICK - 6;
    for (let i = chips.length - 1; i >= 0; i--) chipRight -= chips[i].w + 4;
    const btnW = 42, btnH = META_TOP_BAR_COMPACT_H - 6;
    const bx = chipRight - btnW - 6;
    const by = FRAME_THICK + 3;
    drawFantasyPanel(bx, by, btnW, btnH, 'rgba(18,10,4,0.95)', 0.55, 4);
    ctx.font = 'bold 6.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c0a060';
    ctx.fillText('SAVES', bx + btnW / 2, by + btnH / 2 + 2);
    _metaBarBtns.push({ x: bx, y: by, w: btnW, h: btnH, action: 'saves' });
  }
}

function drawUiToast() {
  if (!_uiToast || _uiToast.timer <= 0) return;
  _uiToast.timer--;
  const alpha = Math.min(1, _uiToast.timer / 25);
  const cx = gridScreenX(COLS * CELL_SIZE / 2);
  const cy = GRID_TOP + 18;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(_uiToast.text).width;
  ctx.fillStyle = 'rgba(6,3,14,0.92)';
  ctx.beginPath(); ctx.roundRect(cx - tw / 2 - 12, cy - 12, tw + 24, 22, 4); ctx.fill();
  ctx.fillStyle = _uiToast.color ?? UI_COLORS.gold;
  ctx.fillText(_uiToast.text, cx, cy + 3);
  ctx.restore();
  if (_uiToast.timer <= 0) _uiToast = null;
}

function drawMapUnlockCelebration() {
  if (!_mapUnlockFx || _mapUnlockFx.timer <= 0) return;
  _mapUnlockFx.timer--;
  const alpha = Math.min(1, _mapUnlockFx.timer / 40);
  const W = BASE_W, H = BASE_H;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(4,2,10,0.72)';
  ctx.fillRect(0, H * 0.35, W, 80);
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.shadowColor = 'rgba(212,175,55,0.8)';
  ctx.shadowBlur = 12;
  ctx.fillText('NEW REGION UNLOCKED', W / 2, H * 0.35 + 32);
  ctx.font = '11px monospace';
  ctx.fillStyle = UI_COLORS.parchment;
  ctx.shadowBlur = 4;
  ctx.fillText(_mapUnlockFx.name, W / 2, H * 0.35 + 52);
  ctx.shadowBlur = 0;
  ctx.restore();
  if (_mapUnlockFx.timer <= 0) _mapUnlockFx = null;
}

function drawRegionClearFanfare() {
  if (!_regionClearFx || _regionClearFx.timer <= 0) return;
  _regionClearFx.timer--;
  const alpha = Math.min(1, _regionClearFx.timer / 50);
  const W = BASE_W;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = UI_COLORS.fortress;
  ctx.fillText(`✓ ${_regionClearFx.name} SECURED`, W / 2, META_SCREEN_TOP + 56);
  ctx.font = '8px monospace';
  ctx.fillStyle = UI_COLORS.parchment;
  ctx.fillText('All fronts cleared — choose your next region', W / 2, META_SCREEN_TOP + 72);
  ctx.restore();
  if (_regionClearFx.timer <= 0) _regionClearFx = null;
}

function drawCommandMapHint() {
  if (_commandMapHintTimer <= 0 || gamePhase !== 'nodeMap') return;
  if (_onboardingStep === ONBOARDING.COMMAND_MAP) return;
  if (_onboardingStep >= ONBOARDING.PICK_FRONT && _onboardingStep <= ONBOARDING.LAUNCH) return;
  if (_commandMapView === 'front') return;
  _commandMapHintTimer--;
  const alpha = Math.min(1, _commandMapHintTimer / 60);
  const W = BASE_W;
  const hy = META_SCREEN_TOP + 2;
  const hh = 18;
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(6,12,6,0.82)';
  ctx.beginPath(); ctx.roundRect(56, hy, W - 112, hh, 4); ctx.fill();
  ctx.font = '7px monospace';
  ctx.fillStyle = '#a0e090';
  ctx.fillText('Pick a front (N/E/S/W) → launch your first assault', W / 2, hy + 12);
  ctx.restore();
}

function drawOnboardingBanner() {
  if (_onboardingStep <= ONBOARDING.NONE || _onboardingStep >= ONBOARDING.DONE) return;
  if (gamePhase !== 'nodeMap' && gamePhase !== 'playing') return;
  if (gamePhase === 'playing' && !isFortressPrepPhase() && canModifyWarbandDeployment()) return;
  if (isFortressPrepPhase() && _onboardingStep !== ONBOARDING.DEPLOY) return;
  const hint = resolveOnboardingHint(_onboardingStep, {
    frontView: gamePhase === 'nodeMap' && _commandMapView === 'front',
  });
  if (!hint) return;
  const W = BASE_W;
  const cmdHintOffset = (gamePhase === 'nodeMap' && _commandMapHintTimer > 0) ? 22 : 0;
  const y = gamePhase === 'playing' ? GRID_TOP + 52 : META_SCREEN_TOP + 2 + cmdHintOffset;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(8,6,14,0.90)';
  ctx.beginPath(); ctx.roundRect(48, y - 10, W - 96, 28, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(212,175,55,0.45)'; ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText(hint.title, W / 2, y + 2);
  ctx.font = '6.5px monospace';
  ctx.fillStyle = UI_COLORS.parchment;
  ctx.fillText(hint.line, W / 2, y + 12);
  ctx.restore();
}

function drawEquipCeremony() {
  tickEquipCeremony();
  if (!_equipFlash || _equipFlash.timer <= 0) return;
  const def = _roster?.defenders?.find(d => d.defenderId === _equipFlash.defenderId);
  const prog = 1 - _equipFlash.timer / 72;
  if (_equipFlash.timer > 48) {
    const alpha = Math.min(0.24, (_equipFlash.timer - 48) / 16 * 0.24);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = _equipFlash.color;
    ctx.fillRect(GRID_LEFT, 12, BASE_W - GRID_LEFT - 4, BASE_H - 24);
    ctx.restore();
  }
  if (def) {
    const ringR = 28 + prog * 42;
    const ringA = Math.max(0, 1 - prog * 1.2) * 0.55;
    if (ringA > 0.02) {
      ctx.save();
      ctx.globalAlpha = ringA;
      ctx.strokeStyle = _equipFlash.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(BASE_W / 2, 122, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  for (const p of _equipSparkles) {
    const a = Math.min(1, p.life / 24);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5 + a, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (def && _equipFlash.timer > 24) {
    const alpha = Math.min(1, (_equipFlash.timer - 24) / 18);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = _equipFlash.color;
    ctx.shadowColor = _equipFlash.color;
    ctx.shadowBlur = 10;
    const _itemLabel = _equipFlash.itemName ? ` — ${_equipFlash.itemName}` : '';
    ctx.fillText(`⚔ ${def.name}${_itemLabel}`, BASE_W / 2, 118);
    ctx.font = '7px monospace';
    ctx.fillStyle = 'rgba(232,215,181,0.72)';
    ctx.fillText(_equipFlash.itemName ? 'EQUIPPED' : 'GEAR UPDATED', BASE_W / 2, 130);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawEventOutcomeToast() {
  if (!_eventOutcomeToast || _eventOutcomeToast.timer <= 0) return;
  _eventOutcomeToast.timer--;
  const alpha = Math.min(1, _eventOutcomeToast.timer / 20);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.font = 'bold 9px monospace';
  const tw = ctx.measureText(_eventOutcomeToast.text).width;
  const cx = BASE_W / 2, cy = 100;
  ctx.fillStyle = 'rgba(6,3,14,0.92)';
  ctx.beginPath(); ctx.roundRect(cx - tw / 2 - 14, cy - 14, tw + 28, 26, 5); ctx.fill();
  ctx.fillStyle = _eventOutcomeToast.color ?? UI_COLORS.gold;
  ctx.fillText(_eventOutcomeToast.text, cx, cy + 2);
  ctx.restore();
  if (_eventOutcomeToast.timer <= 0) _eventOutcomeToast = null;
}

function drawWarCampWelcome() {
  // Hint is shown in meta bar subtitle — no floating banner over panel content.
  if (_warCampWelcomeTimer > 0) _warCampWelcomeTimer--;
}

function drawAutoMoveHint() {
  if (_hintSeen.autoMove || !isPathlessMode() || gamePhase !== 'playing' || waveState !== 'active') return;
  if (waveNumber !== 1 || !_campaignNodeMode) return;
  _autoMoveHintFrames++;
  if (_autoMoveHintFrames > 360) { _hintSeen.autoMove = true; return; }
  const cx = playfieldLeft() + playfieldWidth() / 2;
  const by = GRID_BOTTOM - 28;
  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.textAlign = 'center';
  ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(6,3,14,0.90)';
  const txt = 'Heroes advance automatically · MOVE in panel to reposition';
  const tw = ctx.measureText(txt).width;
  ctx.beginPath(); ctx.roundRect(cx - tw / 2 - 10, by - 10, tw + 20, 18, 3); ctx.fill();
  ctx.fillStyle = 'rgba(160,200,140,0.85)';
  ctx.fillText(txt, cx, by + 2);
  ctx.restore();
  if (_heroMoveMode) _hintSeen.autoMove = true;
}

function drawGoldPoolsHint() {
  if (_goldPoolsHintTimer <= 0) return;
  _goldPoolsHintTimer--;
  const alpha = Math.min(1, _goldPoolsHintTimer / 40);
  const cx = BASE_W - FRAME_THICK - 120;
  const cy = FRAME_THICK + 52;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '6.5px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(6,3,14,0.92)';
  const txt = 'RESERVE → War Camp spending';
  const tw = ctx.measureText(txt).width;
  ctx.beginPath(); ctx.roundRect(cx - tw - 8, cy - 10, tw + 16, 18, 3); ctx.fill();
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText(txt, cx, cy + 2);
  ctx.restore();
}

function drawTopBar() {
  autoNextBtn = null;
  const FT  = FRAME_THICK;
  const ph  = GRID_TOP - FT - 1;
  if (ph < 4) return;

  ctx.save();
  drawWarRoomBarBg(ctx, FT, FT, BASE_W - FT * 2, ph, assaultUiGlass());

  const barMid = FT + Math.round(ph / 2);
  const cy     = barMid + 3;
  const line1Y = cy - 4;
  const line2Y = cy + 6;

  // ── LEFT: shield + title + front name + controls ────────────────────────────
  const shieldCx = FT + 14;
  drawTopBarShield(ctx, shieldCx, barMid, 7);
  let lx = FT + 28;
  const _frontSub = isCampaignCombat()
    ? (() => {
        const ai = getAssaultInfo(_campaignMapIndex, _campaignNodeIndex);
        return ai ? FRONT_LABELS[ai.frontId] ?? _currentMapName : _currentMapName;
      })()
    : (_currentMapName || 'SKIRMISH');
  drawTopBarTextBlock(ctx, lx, line1Y, 'NORTHERN SHIELD', _frontSub, {
    line1Color: UI_COLORS.gold,
    line2Color: 'rgba(232,215,181,0.55)',
  });
  ctx.font = 'bold 8px monospace';
  const _t1w = ctx.measureText('NORTHERN SHIELD').width;
  ctx.font = '6.5px monospace';
  lx += Math.max(_t1w, ctx.measureText(_frontSub).width) + 10;

  // ── CONTROL PILLS: speed × auto | mute ──────────────────────────────────────
  ctx.font = 'bold 9px monospace';
  const _btnH = 14, _btnY = barMid - _btnH / 2;

  // Speed pill
  {
    const _spStr = `×${gameSpeed}`;
    const _spTW  = ctx.measureText(_spStr).width;
    const _spBW  = _spTW + 10;
    ctx.fillStyle = gameSpeed >= 4 ? 'rgba(169,50,38,0.92)' : gameSpeed >= 2 ? 'rgba(212,175,55,0.85)' : 'rgba(46,125,50,0.80)';
    ctx.beginPath(); ctx.roundRect(lx, _btnY, _spBW, _btnH, 3); ctx.fill();
    ctx.strokeStyle = gameSpeed >= 4 ? UI_COLORS.threat : gameSpeed >= 2 ? UI_COLORS.gold : UI_COLORS.fortress;
    ctx.lineWidth   = 0.8; ctx.stroke();
    ctx.fillStyle   = gameSpeed >= 4 ? '#ffb080' : gameSpeed >= 2 ? UI_COLORS.parchment : '#90d070';
    if (gameSpeed >= 2) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 3; }
    ctx.textAlign = 'center';
    ctx.fillText(_spStr, lx + _spBW / 2, barMid + 3);
    ctx.shadowBlur = 0;
    speedBtns.push({ x: lx, y: _btnY, w: _spBW, h: _btnH });
    lx += _spBW + 3;
  }

  // Mute dot
  ctx.font = '8px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = isMuted ? UI_COLORS.threat : 'rgba(232,215,181,0.40)';
  ctx.fillText(isMuted ? '◈MUTE' : '◈SFX', lx, cy);

  // ── CENTER: War Room assault / wave + battle status ─────────────────────────
  const midX        = Math.round(BASE_W / 2);
  const displayWave = waveState === 'countdown' ? waveNumber + 1 : waveNumber;
  const _roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  if (isCampaignCombat() && _nodeWavePlan) {
    const dispIdx   = waveState === 'countdown' ? _nodeWaveIndex + 1 : _nodeWaveIndex + 1;
    const nodeTotal = _nodeWavePlan.waves.length;
    const assaultInfo = getAssaultInfo(_campaignMapIndex, _campaignNodeIndex);
    const assaultLine = assaultInfo
      ? assaultInfo.tierLabel.toUpperCase()
      : `ASSAULT ${_roman[dispIdx - 1] ?? dispIdx}`;
    const codename = assaultInfo
      ? assaultInfo.codename.toUpperCase()
      : `WAVE ${dispIdx} / ${nodeTotal}`;
    const battleNum = _roman[dispIdx - 1] ?? String(dispIdx);
    const isBossW   = _nodeWavePlan.waves[_nodeWaveIndex]?.isBoss ?? false;

    const centerLeftX = midX - 72;
    drawTopBarTextBlock(ctx, centerLeftX, line1Y, assaultLine, codename, {
      line1Color: isBossW ? UI_COLORS.threat : UI_COLORS.threat,
      line2Color: UI_COLORS.parchment,
      align: 'center',
    });

    // compass divider
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(212,175,55,0.45)';
    ctx.fillText('◎', midX, barMid + 2);

    const centerRightX = midX + 72;
    const statusLine = waveState === 'active'
      ? 'DEFEND THE FORTRESS'
      : waveState === 'break' && _nodeWaveIndex > 0
        ? 'NEXT WAVE INCOMING'
        : 'READY FOR BATTLE';
    const statusColor = waveState === 'active' ? UI_COLORS.parchment : UI_COLORS.fortress;
    drawTopBarTextBlock(ctx, centerRightX, line1Y, `BATTLE ${battleNum}`, statusLine, {
      line1Color: UI_COLORS.warband,
      line2Color: statusColor,
      align: 'center',
    });
  } else if (!isCampaignCombat()) {
    const wLabel  = endlessMode ? `WAVE ${displayWave} / ∞` : `WAVE ${displayWave} / ${MAX_WAVES}`;
    const wThreat = endlessMode ? 1.0 : displayWave / MAX_WAVES;
    const wIsBoss = BOSS_WAVES.has(displayWave);
    const wColor  = wIsBoss ? UI_COLORS.threat : wThreat > 0.5 ? UI_COLORS.gold : UI_COLORS.parchment;

    drawTopBarTextBlock(ctx, midX - 50, line1Y, wLabel, endlessMode ? 'ENDLESS ASSAULT' : 'ENEMY ADVANCE', {
      line1Color: wColor,
      line2Color: 'rgba(232,215,181,0.55)',
      align: 'center',
    });

    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(212,175,55,0.45)';
    ctx.fillText('◎', midX + 42, barMid + 2);

    const skStatus = waveState === 'active' ? 'UNDER ATTACK' : 'READY FOR BATTLE';
    drawTopBarTextBlock(ctx, midX + 72, line1Y, `BATTLE ${displayWave}`, skStatus, {
      line1Color: UI_COLORS.warband,
      line2Color: waveState === 'active' ? UI_COLORS.threat : UI_COLORS.fortress,
      align: 'center',
    });
  }

  // Upcoming portal milestone hint (when multiPortal map and within 3 waves of next gate)
  if (!isCampaignCombat() && !endlessMode && _extraSpawns.length > 0) {
    const _nextPortal = _extraSpawns.find(es => !es.active && es.activateWave > displayWave && es.activateWave <= displayWave + 3);
    if (_nextPortal) {
      const _milestonePulse = 0.55 + Math.sin(performance.now() * 0.006) * 0.25;
      ctx.font      = '7px monospace';
      ctx.fillStyle = `rgba(255,140,60,${_milestonePulse})`;
      ctx.fillText(`▲ W${_nextPortal.activateWave}: ${_nextPortal.dir} GATE OPENS`, midX, cy - 14);
    }
  }

  // Boss approach hint — during break, when within 5 waves of next boss (skirmish only)
  if (waveState === 'break' && !isCampaignCombat() && !endlessMode) {
    const _nbWave = [...BOSS_WAVES].filter(w => w > displayWave).sort((a, b) => a - b)[0] ?? null;
    if (_nbWave && _nbWave - displayWave <= 5) {
      const _bossIn = _nbWave - displayWave;
      const _bPulse = 0.55 + Math.sin(performance.now() * 0.005) * 0.25;
      ctx.font      = '7px monospace';
      ctx.fillStyle = `rgba(240,100,60,${_bPulse})`;
      ctx.fillText(`☠ ${BOSS_CONFIGS[_nbWave]?.name ?? 'BOSS'}  IN  ${_bossIn}`, midX, cy - 14);
    }
  }

  // Active wave event chip — shown below wave label during combat
  if (waveState === 'active' && currentWaveEvent) {
    const _evPulse = 0.55 + Math.sin(performance.now() * 0.004) * 0.25;
    // Build modifier suffix for clarity
    const _evMods = [];
    if (currentWaveEvent.hpMult)    _evMods.push(`+${Math.round((currentWaveEvent.hpMult - 1) * 100)}% HP`);
    if (currentWaveEvent.speedMult && currentWaveEvent.speedMult < 1) _evMods.push(`−${Math.round((1 - currentWaveEvent.speedMult) * 100)}% SPD`);
    if (currentWaveEvent.speedMult && currentWaveEvent.speedMult > 1) _evMods.push(`+${Math.round((currentWaveEvent.speedMult - 1) * 100)}% SPD`);
    if (currentWaveEvent.bonus?.count) _evMods.push(`+${currentWaveEvent.bonus.count} ${currentWaveEvent.bonus.type ?? ''}`);
    const _evSuffix = _evMods.length ? `  ${_evMods.join(', ')}` : '';
    ctx.font      = '7px monospace';
    ctx.fillStyle = `rgba(255,200,80,${_evPulse})`;
    ctx.fillText(`⚑ ${currentWaveEvent.label}${_evSuffix}`, midX, cy - 14);
  }

  // Alive enemy count — "◈ N left" when ≤5 remain during active wave
  if (waveState === 'active') {
    const _aliveCount = enemies.filter(e => e.alive && !e.reached).length;
    if (_aliveCount > 0 && _aliveCount <= 5) {
      const _cntPulse = 0.60 + 0.40 * Math.abs(Math.sin(performance.now() * 0.008));
      ctx.font = '7px monospace';
      ctx.fillStyle = `rgba(255,120,60,${_cntPulse})`;
      ctx.fillText(`◈ ${_aliveCount} left`, midX, cy + 12);
    }
  }

  // Chapter preview — within 3 waves of next chapter, show "→ CHAPTER N in N" (skirmish only)
  if (!isCampaignCombat() && !endlessMode && waveState === 'break') {
    const _chapterWaves = [26, 51, 76];
    const _nextChapW = _chapterWaves.find(w => w > displayWave && w <= displayWave + 3);
    if (_nextChapW) {
      const _chNum = _chapterWaves.indexOf(_nextChapW) + 2;
      const _chIn  = _nextChapW - displayWave;
      const _chPulse = 0.50 + Math.sin(performance.now() * 0.004) * 0.25;
      ctx.font      = '7px monospace';
      ctx.fillStyle = `rgba(200,160,80,${_chPulse})`;
      ctx.fillText(`→ CHAPTER ${_chNum} in ${_chIn}`, midX, cy - 14);
    }
  }

  // Endless depth tier label — shown below wave counter in endless mode
  if (endlessMode && waveNumber > 100) {
    const _depthTierNames = ['TITAN REALM', 'RAGNARÖK ETERNAL', 'BEYOND THE VEIL', 'JÖRMUNGANDR WAKES'];
    const _depthIdx = Math.max(0, Math.floor((waveNumber - 101) / 25));
    const _tierName = _depthTierNames[_depthIdx % _depthTierNames.length];
    ctx.font      = '7px monospace';
    ctx.fillStyle = 'rgba(200,160,255,0.50)';
    ctx.fillText(`∞ ${_tierName}`, midX, cy - 14);
  }

  // Campaign assault deploy / lock hints
  if (_campaignNodeMode && waveState !== 'active') {
    ctx.font = '7px monospace';
    if (canModifyWarbandDeployment() && !isCampaignAssaultBattle()) {
      ctx.fillStyle = 'rgba(120,200,120,0.78)';
      ctx.fillText('Deploy warband — start wave when ready', midX, cy - 14);
    } else if (waveState === 'break') {
      ctx.fillStyle = 'rgba(200,140,80,0.72)';
      ctx.fillText('Assault underway — upgrade in War Camp after', midX, cy - 14);
    }
  }

  // Campaign composition warning during wave break
  if (isCampaignCombat() && waveState === 'break' && _nodeWavePlan) {
    const _pc = _currentBattlePreset?.campaignPortalCount ?? 1;
    const _isBossW = _nodeWavePlan.waves[_nodeWaveIndex]?.isBoss ?? false;
    const _wb = analyzeWarband(_roster?.defenders ?? []);
    const _warns = getCompositionWarnings(_wb, _pc, _nodeWavePlan.waves.length, _isBossW);
    if (_warns.length > 0) {
      ctx.font = '7px monospace';
      ctx.fillStyle = 'rgba(220,160,60,0.78)';
      ctx.fillText(`⚠ ${_warns[0]}`, midX, cy - 14);
    }
  }

  // Phase / enemy count line (below center blocks)
  ctx.textAlign = 'center';
  if (waveState !== 'active') {
    const readyPulse = 0.7 + Math.sin(performance.now() * 0.005) * 0.3;
    ctx.font = '6px monospace';
    const _campAuto = isCampaignCombat() && _nodeWaveIndex > 0 && waveState === 'break';
    if (_campAuto) {
      const _secsLeft = Math.max(1, Math.ceil((60 - waveTimer) / 30));
      ctx.fillStyle = `rgba(46,125,50,${readyPulse})`;
      ctx.fillText(waveTimer >= 60 ? '— STARTING —' : `NEXT WAVE ${_secsLeft}s`, midX, line2Y + 8);
    } else if (!isCampaignCombat() || waveState === 'countdown') {
      ctx.fillStyle = `rgba(46,125,50,${readyPulse})`;
      ctx.fillText('— READY —', midX, line2Y + 8);
    }
  } else {
    const rem = spawnQueue.length + enemies.filter(e => e.alive).length;
    const remPulse = rem > 0 && rem <= 4 ? 0.75 + Math.sin(performance.now() * 0.008) * 0.25 : 1;
    ctx.font = rem <= 4 && rem > 0 ? 'bold 6.5px monospace' : '6px monospace';
    if (rem === 1) {
      ctx.fillStyle = `rgba(169,50,38,${remPulse})`;
      ctx.fillText('☠ LAST ENEMY', midX, line2Y + 8);
    } else {
      ctx.fillStyle = rem === 0 ? UI_COLORS.fortress : rem <= 4 ? `rgba(46,125,50,${remPulse})` : 'rgba(232,215,181,0.45)';
      ctx.fillText(`◈ ${rem} / ${waveTotal}`, midX, line2Y + 8);
    }
  }

  // ── RIGHT: War Room stat chips + help ───────────────────────────────────────
  const chipH = ph - 6;
  const chipY = FT + 3;
  let chipRight = BASE_W - FT - 6;

  // Help hint
  ctx.font = '8px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = showHelp ? UI_COLORS.gold : 'rgba(232,215,181,0.35)';
  ctx.fillText('[?]', chipRight, barMid + 3);
  chipRight -= 16;

  if (showHelp) {
    try {
      const sc = getSpriteScale();
      const pillW = 68, pillH = chipH;
      const pillX = chipRight - pillW;
      ctx.fillStyle = 'rgba(43,47,54,0.92)';
      ctx.beginPath(); ctx.roundRect(pillX, chipY, pillW, pillH, 3); ctx.fill();
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = UI_COLORS.parchment;
      ctx.fillText(`Scale ${sc.toFixed(2)}`, pillX + pillW / 2, barMid + 3);
      chipRight = pillX - 5;
    } catch (err) { /* ignore */ }
  }

  const livesDangerPulse = lives <= 3 ? 0.65 + Math.sin(performance.now() * 0.007) * 0.35 : 1;
  const livesLostFlash   = lifeLostTimer > 0 ? Math.min(1, lifeLostTimer / 20) * (lifeLostTimer > 60 ? 1 : lifeLostTimer / 60) : 0;
  const livesPulse = livesLostFlash > 0 ? 1 : livesDangerPulse;
  const livesAccent = livesLostFlash > 0 ? '#ff2020' : lives <= 3 ? UI_COLORS.threat : lives <= 7 ? UI_COLORS.gold : UI_COLORS.fortress;

  const chips = [
    { w: 52, icon: lives <= 3 ? '!' : '⚑', value: `${lives}/${STARTING_LIVES}`, label: 'RAMPARTS', accent: livesAccent, pulse: livesPulse },
    { w: 50, icon: '◆', value: `${Math.floor(_displayGold)}g`, label: 'GOLD', accent: hoardPulse > 0 ? '#fff0a0' : UI_COLORS.gold, pulse: hoardPulse > 0 ? 1 : 0.85 },
  ];
  if (goldReserve > 0) {
    chips.push({ w: 44, icon: '◈', value: `${goldReserve}g`, label: 'RESERVE', accent: UI_COLORS.parchment, pulse: 0.7 });
    if (!_hintSeen.goldPools && battlesCompleted <= 1) {
      _goldPoolsHintTimer = 200;
      _hintSeen.goldPools = true;
    }
  }
  if (stars > 0 || waveState !== 'active') {
    chips.push({ w: 44, icon: '✦', value: String(stars), label: 'STARS', accent: UI_COLORS.gold, pulse: 0.9 });
  }
  chips.push({ w: 48, icon: '⚔', value: String(slain), label: 'KILLS', accent: UI_COLORS.threat, pulse: 0.8 });

  for (let i = chips.length - 1; i >= 0; i--) {
    const c = chips[i];
    chipRight -= c.w;
    drawTopStatChip(ctx, chipRight, chipY, c.w, chipH, c);
    chipRight -= 3;
  }

  ctx.restore();
}

/** True when left dock shows deployed field overview (not recruitment list). */
function useAssaultFieldDock() {
  if (_campaignNodeMode) return false;
  return !isFortressPrepPhase() && gamePhase === 'playing' && (isCampaignCombat() || waveState === 'active') && !canModifyWarbandDeployment();
}

function useFieldLayoutDock() {
  if (isCampaignAssaultBattle()) return false;
  return isFortressPrepPhase() || (gamePhase === 'playing' && canLayoutCampaignField());
}

/** Roster bench in left dock — drag heroes to the field (field prep / layout). */
function drawFieldLayoutBench(px, py, pw, ph) {
  if (!_roster) return;
  const contentTop = py + DOCK_TAB_H + 10;
  const padX = 5;
  const cardW = pw - 2 * padX;
  const gap = 4;
  const cardH = 34;
  let ly = contentTop;

  const heroes = towers.filter(t => isHeroTowerType(t.type)).length;
  ctx.font = 'bold 8px monospace'; ctx.fillStyle = UI_COLORS.warband; ctx.textAlign = 'left';
  ctx.fillText('⚔ WARBAND', px + padX, ly);
  ctx.font = '6px monospace'; ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(232,215,181,0.55)';
  ctx.fillText(`${heroes}/${MAX_FIELD_HEROES}`, px + pw - padX, ly);
  ctx.textAlign = 'left';
  ly += 10;
  ctx.font = '6.5px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.50)';
  ctx.fillText('Drag to field · STRUCTURES tab for gates', px + padX, ly + 6);
  ly += 14;

  const benchDefs = _roster.defenders.filter(d =>
    !isNodeCasualty(_nodeCasualties, d.defenderId)
    && !towers.some(t => t.defenderId === d.defenderId)
  );

  if (benchDefs.length === 0) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(232,215,181,0.42)';
    ctx.fillText('All heroes deployed', px + padX, ly + 10);
    return;
  }

  for (const item of benchDefs) {
    if (ly + cardH > py + ph - 6) break;
    const heroItem = HERO_BUILD_ITEMS.find(h => h.id === item.type);
    if (!heroItem) continue;
    const cardX = px + padX;
    const cardY = ly;
    const rgb = TOWER_DEFS[item.type]?.glowRgb ?? '74,111,165';
    const sel = !selectedTower && selectedTowerType === item.type && buildMode === CELL.TOWER
      && _placingDefenderId === item.defenderId;
    drawFantasyPanel(cardX, cardY, cardW, cardH,
      sel ? `rgba(${rgb},0.28)` : 'rgba(16,8,30,0.94)', sel ? 0.75 : 0.35, 4);
    drawMiniDefenderPortrait(cardX + 16, cardY + cardH / 2, item.type, 10);
    ctx.font = 'bold 7.5px monospace'; ctx.fillStyle = '#d8c8a8';
    ctx.fillText((item.name ?? heroItem.label).slice(0, 14), cardX + 30, cardY + cardH / 2 + 3);
    ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(100,200,130,0.75)';
    ctx.textAlign = 'right';
    ctx.fillText('FREE', cardX + cardW - 5, cardY + cardH / 2 + 3);
    ctx.textAlign = 'left';
    _rosterPanelBtns.push({
      ...heroItem,
      cost: 0,
      mode: CELL.TOWER,
      x: cardX, y: cardY, w: cardW, h: cardH,
      width: cardW, height: cardH,
      deployed: false,
      defenderId: item.defenderId,
    });
    ly += cardH + gap;
  }
}

/** Deploy bench overlay — prep phase only, top strip so bottom playfield stays clear. */
function drawAssaultWarbandOverlay(topInset = 0) {
  if (!useAssaultFieldDock()) return;
  const px     = FRAME_THICK;
  const py     = GRID_TOP + topInset;
  const pw     = LEFT_DOCK_W;
  const ph     = combatPanelFullH() - topInset;
  const sX     = px + 6;
  const sW     = pw - 12;
  const dVX    = px + pw - 8;

  ctx.save();
  // No panel fill or border — transparent overlay on playfield

  let ly = py + 10;
  const heroes = towers.filter(t => isHeroTowerType(t.type));
  ctx.font = 'bold 8px monospace'; ctx.fillStyle = UI_COLORS.warband; ctx.textAlign = 'left';
  ctx.fillText('⚔ WARBAND', sX, ly + 8);
  ctx.font = '6px monospace'; ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(232,215,181,0.55)';
  ctx.fillText(`${heroes.length}/${MAX_FIELD_HEROES}`, dVX, ly + 8);
  ctx.textAlign = 'left';
  ly += 12;
  ctx.font = '6.5px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.50)';
  ctx.fillText('DEPLOYED', sX, ly + 6);
  ly += 8;
  ctx.strokeStyle = 'rgba(80,90,200,0.28)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(sX, ly); ctx.lineTo(sX + sW, ly); ctx.stroke();
  ly += 5;

  const scored = towers
    .filter(t => isHeroTowerType(t.type))
    .map(t => ({ t, score: (t.damageDealt || 0) + (t.killCount || 0) * 32 }))
    .sort((a, b) => b.score - a.score);
  const maxScore = scored.length ? scored[0].score : 0;

  if (scored.length === 0) {
    if (canModifyWarbandDeployment()) {
      const pulse = 0.55 + Math.sin(performance.now() * 0.004) * 0.30;
      ctx.font = 'bold 9px monospace'; ctx.fillStyle = `rgba(212,175,55,${pulse})`;
      ctx.fillText('⬆ DRAG HERO', sX + 2, ly + 10);
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(200,180,140,0.55)';
      ctx.fillText('from left panel', sX + 2, ly + 21);
      ctx.fillText('to the field', sX + 2, ly + 31);
      ly += 36;
    } else {
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(232,215,181,0.40)';
      ctx.fillText('No heroes fielded', sX + 2, ly + 10);
      ly += 14;
    }
  } else {
    for (const { t } of scored) {
      if (ly + 35 > py + ph - 8) break;
      const rowY = ly;
      ly += drawDefenderSidebarRow(sX, ly, sW, dVX, t, {
        isMvp: false,
        isFieldSelected: selectedTower?.defenderId === t.defenderId,
        maxScore: waveState === 'active' ? maxScore : 0,
      });
      _rosterPanelBtns.push({
        x: sX, y: rowY, w: sW, h: 34,
        deployed: t,
      });
    }
  }

  const structs = towers.filter(t => !isHeroTowerType(t.type)).length;
  if (structs > 0 && ly + 14 < py + ph) {
    ly += 4;
    ctx.font = '6.5px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.48)';
    ctx.fillText(`Siege: ${structs}/${MAX_FIELD_STRUCTURES}`, sX, ly + 7);
    ly += 10;
  }

  if (canModifyWarbandDeployment() && _roster) {
    const bench = _roster.defenders.filter(d =>
      !isNodeCasualty(_nodeCasualties, d.defenderId)
      && !towers.some(t => t.defenderId === d.defenderId)
    );
    if (bench.length > 0 && ly + 16 < py + ph) {
      ly += 2;
      ctx.font = 'bold 7px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.52)';
      ctx.fillText('⊙ RESERVE', sX, ly + 7); ly += 11;
      for (const d of bench.slice(0, 3)) {
        if (ly + 10 > py + ph - 4) break;
        const rgb = defenderGlowRgb(d.type);
        ctx.font = '7px monospace'; ctx.fillStyle = `rgba(${rgb},0.50)`;
        ctx.fillText(`${d.name.slice(0, 12)}`, sX + 2, ly + 8);
        ly += 10;
      }
      if (bench.length > 3) {
        ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.40)';
        ctx.fillText(`+${bench.length - 3} more`, sX + 2, ly + 7);
      }
    }
  }

  ctx.restore();
}

/** Deploy bench overlay — prep phase only, top strip so bottom playfield stays clear. */
function drawAssaultDeployOverlay() {
  const barH = 70;
  const barW = Math.min(480, playfieldWidth() - 20);
  const barX = playfieldLeft() + (playfieldWidth() - barW) / 2;
  let barY = GRID_TOP + 5;
  if (_tutorialBannerTimer > 0) barY = GRID_TOP + 38;
  const _glass = assaultUiGlass();

  ctx.save();
  ctx.fillStyle = `rgba(6,3,14,${0.62 * _glass})`;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 6);
  ctx.fill();
  ctx.strokeStyle = `rgba(212,175,55,${0.45 * _glass})`;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText('DEPLOY WARBAND', barX + 12, barY + 15);
  ctx.font = '8px monospace';
  ctx.fillStyle = 'rgba(232,215,181,0.65)';
  const heroes = towers.filter(t => isHeroTowerType(t.type)).length;
  const structs = towers.filter(t => !isHeroTowerType(t.type)).length;
  ctx.fillText(`${heroes}/${MAX_FIELD_HEROES} heroes · ${structs}/${MAX_FIELD_STRUCTURES} siege`, barX + 148, barY + 15);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(200,170,120,0.60)';
  ctx.fillText('Drag hero to field', barX + barW - 12, barY + 15);
  ctx.textAlign = 'left';

  const benchDefs = _roster.defenders.filter(d =>
    !isNodeCasualty(_nodeCasualties, d.defenderId)
    && !towers.some(t => t.defenderId === d.defenderId)
  );

  if (benchDefs.length === 0 && towers.filter(t => isHeroTowerType(t.type)).length === 0) {
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(232,215,181,0.45)';
    ctx.fillText('No heroes available', barX + 12, barY + 50);
  }

  let bx = barX + 12;
  const by = barY + 22;
  const slot = 38;
  for (const item of benchDefs.slice(0, 8)) {
    const heroItem = HERO_BUILD_ITEMS.find(h => h.id === item.type);
    if (!heroItem) continue;
    const sel = !selectedTower && selectedTowerType === item.type && buildMode === CELL.TOWER;
    const rgb = TOWER_DEFS[item.type]?.glowRgb ?? '74,111,165';
    ctx.fillStyle = sel ? `rgba(${rgb},0.40)` : 'rgba(28,32,38,0.92)';
    ctx.beginPath();
    ctx.roundRect(bx, by, slot, slot, 4);
    ctx.fill();
    ctx.strokeStyle = sel ? `rgba(${rgb},0.80)` : `rgba(${rgb},0.30)`;
    ctx.lineWidth = sel ? 1.5 : 0.8;
    ctx.beginPath();
    ctx.roundRect(bx, by, slot, slot, 4);
    ctx.stroke();
    drawMiniDefenderPortrait(bx + slot / 2, by + slot / 2 - 3, item.type, 11);
    ctx.font = '7px monospace';
    ctx.fillStyle = 'rgba(220,200,160,0.72)';
    ctx.textAlign = 'center';
    ctx.fillText((item.name ?? item.type).slice(0, 6), bx + slot / 2, by + slot - 3);
    ctx.textAlign = 'left';
    _rosterPanelBtns.push({
      ...heroItem,
      cost: 0,
      mode: CELL.TOWER,
      x: bx, y: by, w: slot, h: slot,
      width: slot, height: slot,
      deployed: false,
      defenderId: item.defenderId,
    });
    bx += slot + 4;
  }
  if (benchDefs.length > 8) {
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(232,215,181,0.50)';
    ctx.fillText(`+${benchDefs.length - 8}`, bx + 2, by + slot / 2 + 4);
  }
  ctx.font = '8px monospace';
  ctx.fillStyle = 'rgba(100,200,130,0.75)';
  ctx.fillText('Siege & gates: STRUCTURES tab (left panel)', barX + 12, barY + barH - 6);
  ctx.restore();
}

// ── Left dock — skirmish warband/structures; field prep uses opaque bench dock ───
function drawLeftDock() {
  if (isFortressPrepPhase()) return;
  if (isCampaignAssaultBattle()) return;
  if (gamePhase !== 'playing' && gamePhase !== 'fortressPrep') return;

  _rosterPanelBtns = [];

  if (useFieldLayoutDock()) {
    const px = FRAME_THICK;
    const py = GRID_TOP;
    const pw = LEFT_DOCK_W;
    const ph = leftDockPanelHeight();

    drawFantasyPanel(px, py, pw, ph, 'rgba(10,6,22,0.98)');
    drawHorizTabs(px + 4, py + 4, pw - 8, _LEFT_DOCK_TABS, _leftDockTab, _leftDockTabBtns, {
      pulseId: _structuresTabPulse > 0 && _leftDockTab !== 'structures' ? 'structures' : null,
    });
    if (_leftDockTab === 'structures') {
      drawStructuresDockContent(px, py, pw, ph);
    } else if (isFortressPrepPhase()) {
      drawPostPrepPanel(px, py, pw, ph);
    } else {
      drawFieldLayoutBench(px, py, pw, ph);
    }
    return;
  }

  if (useAssaultFieldDock()) {
    const px = FRAME_THICK;
    const py = GRID_TOP;
    const pw = LEFT_DOCK_W;
    const ph = leftDockPanelHeight();
    drawAssaultWarbandOverlay();
    return;
  }

  const px = FRAME_THICK;
  const py = GRID_TOP;
  const pw = LEFT_DOCK_W;
  const ph = GRID_BOTTOM - GRID_TOP;

  drawFantasyPanel(px, py, pw, ph, 'rgba(10,6,22,0.98)');
  if (_rosterHighlightTimer > 0) {
    _rosterHighlightTimer--;
    const pulse = 0.35 + 0.25 * Math.abs(Math.sin(performance.now() * 0.018));
    ctx.save();
    ctx.strokeStyle = `rgba(240,190,60,${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    ctx.restore();
  }

  drawHorizTabs(px + 4, py + 4, pw - 8, _LEFT_DOCK_TABS, _leftDockTab, _leftDockTabBtns, {
    pulseId: _structuresTabPulse > 0 && _leftDockTab !== 'structures' ? 'structures' : null,
  });

  if (_leftDockTab === 'structures') {
    drawStructuresDockContent(px, py, pw, ph);
    return;
  }

  const contentTop = py + DOCK_TAB_H + 10;
  const contentH   = ph - DOCK_TAB_H - 14;
  const deployedHeroes = towers.filter(t => isHeroTowerType(t.type)).length;
  ctx.font = '6px monospace'; ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(140,120,180,0.70)';
  ctx.fillText(`${deployedHeroes}/${MAX_FIELD_HEROES} field`, px + pw - 6, contentTop - 2);
  ctx.textAlign = 'left';

  const nH      = HERO_BUILD_ITEMS.length;
  const padX    = 5;
  const gap     = 3;
  const cardW   = pw - 2 * padX;
  const cardH   = Math.floor((contentH - (nH - 1) * gap) / nH);
  const startY  = contentTop;
  const now     = performance.now() * 0.001;
  const barDisc = towers.reduce((s, t) => s + (TOWER_DEFS[t.type]?.recruitCostReduce ?? 0), 0);

  for (let i = 0; i < nH; i++) {
    const item       = HERO_BUILD_ITEMS[i];
    const cardX      = px + padX;
    const cardY      = startY + i * (cardH + gap);
    const deployed   = towers.find(t => t.type === item.id);
    const rosterDef  = _roster?.defenders.find(d => d.type === item.id);
    const cost       = Math.max(5, item.cost - barDisc);
    const affordable = gold >= cost;
    const isSelected = !deployed && selectedTowerType === item.id && buildMode === CELL.TOWER;
    const isFieldSel = deployed && selectedTower?.defenderId === deployed.defenderId;
    const glowRgb    = TOWER_DEFS[item.id]?.glowRgb ?? '160,120,200';
    const isVeteran  = (rosterDef?.careerLevel ?? 0) >= 5;

    const bgColor = deployed
      ? (isFieldSel ? `rgba(${glowRgb},0.26)` : `rgba(${glowRgb},0.14)`)
      : isSelected ? `rgba(${glowRgb},0.20)` : affordable ? 'rgba(16,8,30,0.94)' : 'rgba(10,5,18,0.88)';
    drawFantasyPanel(cardX, cardY, cardW, cardH, bgColor, (deployed || isSelected) ? 0.78 : 0.32, 5);

    // Class accent — thick left stripe (mockup)
    ctx.fillStyle = `rgba(${glowRgb},${isFieldSel || isSelected ? 0.95 : 0.65})`;
    ctx.beginPath(); ctx.roundRect(cardX, cardY, 3, cardH, [4, 0, 0, 4]); ctx.fill();

    if (isFieldSel || isSelected) {
      ctx.strokeStyle = `rgba(${glowRgb},0.95)`; ctx.lineWidth = 1.5;
      ctx.shadowColor = `rgba(${glowRgb},0.45)`; ctx.shadowBlur = isSelected ? 8 : 4;
      ctx.beginPath(); ctx.roundRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2, 4); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (isVeteran) {
      ctx.strokeStyle = 'rgba(240,190,40,0.55)'; ctx.lineWidth = 0.8;
      ctx.strokeRect(cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1);
    }

    // Hotkey badge — top-left like mockup
    ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = isSelected ? '#f0d040' : 'rgba(200,160,80,0.75)';
    ctx.fillText(`[${item.key}]`, cardX + 6, cardY + 10);

    const avX = cardX + 18;
    const avY = cardY + cardH / 2 + 2;
    const ringR = Math.min(cardH * 0.30, 11);
    if (!deployed) ctx.globalAlpha = affordable ? 0.82 : 0.38;
    drawMiniDefenderPortrait(avX, avY, item.id, ringR);
    ctx.globalAlpha = 1;

    if (deployed) {
      const cdFrac = Math.min(1, (deployed.fireCooldown ?? 0) / Math.max(1, deployed.fireRate ?? 1));
      ctx.strokeStyle = `rgba(${glowRgb},0.20)`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(avX, avY, ringR + 2, 0, Math.PI * 2); ctx.stroke();
      if (cdFrac > 0.05) {
        ctx.strokeStyle = `rgba(${glowRgb},0.60)`;
        ctx.beginPath();
        ctx.arc(avX, avY, ringR + 2, -Math.PI / 2, -Math.PI / 2 + cdFrac * Math.PI * 2);
        ctx.stroke();
      } else {
        const pulse = 0.55 + 0.45 * Math.abs(Math.sin(now * 5));
        ctx.strokeStyle = `rgba(${glowRgb},${pulse})`;
        ctx.beginPath(); ctx.arc(avX, avY, ringR + 2, 0, Math.PI * 2); ctx.stroke();
      }
    }

    const textX = cardX + 34;
    const label = (rosterDef?.name && deployed) ? rosterDef.name : item.label;
    ctx.font = 'bold 7.5px monospace'; ctx.textAlign = 'left';
    if (deployed) {
      drawDefenderName(label.length > 10 ? label.slice(0, 9) + '…' : label, textX, cardY + cardH / 2 - 4, item.id, 1);
    } else {
      ctx.fillStyle = affordable ? '#d8c8a8' : '#3a3020';
      ctx.fillText(label.length > 10 ? label.slice(0, 9) + '…' : label, textX, cardY + cardH / 2 - 4);
    }

    const roleLbl = ABILITY_LABELS[item.id];
    if (roleLbl) drawRoleChip(textX, cardY + cardH / 2 + 6, roleLbl, item.id, { alpha: affordable ? 1 : 0.45 });

    if (deployed) {
      const _bond = (_campaignState?.bonds ?? []).find(b => b.defenderIds.includes(deployed.defenderId));
      if (_bond) {
        ctx.font = 'bold 7px monospace'; ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(220,180,60,0.75)';
        ctx.fillText('∞', cardX + cardW - 5, cardY + cardH - 3);
      }
    }

    // Star-gate lock (e.g. Ice Giant needs 5 ★)
    const _starGate = TOWER_STAR_GATES[item.id];
    if (_starGate && stars < _starGate && !deployed) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 5); ctx.fill();
      ctx.textAlign = 'center'; ctx.font = '7px monospace'; ctx.fillStyle = '#f0d040';
      ctx.fillText(`✦ ${stars}/${_starGate}`, cardX + cardW / 2, cardY + cardH / 2 + 2);
      ctx.textAlign = 'left';
    }

    ctx.font = '6px monospace'; ctx.textAlign = 'right';
    if (deployed) {
      const dmg = deployed.damageDealt ?? 0;
      ctx.fillStyle = `rgba(${glowRgb},0.75)`;
      ctx.fillText(dmg > 0 ? `⚔${formatBattleStat(dmg)}` : 'FIELD', cardX + cardW - 5, cardY + cardH / 2 - 2);
    } else {
      ctx.fillStyle = affordable ? '#a08050' : '#e84040';
      ctx.fillText(`${cost}g`, cardX + cardW - 5, cardY + cardH / 2 - 2);
    }

    // Bottom class glow strip
    ctx.fillStyle = `rgba(${glowRgb},${deployed ? 0.75 : affordable ? 0.45 : 0.15})`;
    ctx.beginPath(); ctx.roundRect(cardX + 4, cardY + cardH - 3, cardW - 8, 2, [0, 0, 2, 2]); ctx.fill();

    _rosterPanelBtns.push({
      ...item,
      cost,
      mode: CELL.TOWER,
      x: cardX, y: cardY, w: cardW, h: cardH,
      width: cardW, height: cardH,
      deployed,
    });
  }

  if (!firstTowerPlaced && waveNumber <= 1 && !gameOver && _rosterPanelBtns.length > 0) {
    const hint = _rosterPanelBtns[0];
    const pulse = 0.55 + Math.sin(performance.now() * 0.006) * 0.45;
    const ax = hint.x + hint.w + 5;
    const ay = hint.y + hint.h / 2;
    ctx.save();
    ctx.fillStyle   = `rgba(255,230,80,${pulse * 0.90})`;
    ctx.shadowColor = `rgba(220,180,20,${pulse})`;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + 8, ay - 5);
    ctx.lineTo(ax + 8, ay + 5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawStructuresDockContent(px, py, pw, ph) {
  const lm      = _structureListLayout(px, py, pw, ph);
  const limited = lm.items.length < TOWER_BUILD_ITEMS.length;
  ctx.font = '6px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = limited ? 'rgba(240,200,80,0.65)' : 'rgba(100,200,100,0.55)';
  ctx.fillText(limited ? '▣ Place PORT at wall openings first' : `${lm.items.length} structures`, px + 8, py + DOCK_TAB_H + 10);

  ctx.save();
  ctx.beginPath();
  ctx.rect(px, lm.contentTop, pw, lm.contentH);
  ctx.clip();

  for (let i = 0; i < lm.items.length; i++) {
    const item  = lm.items[i];
    const cardX = px + lm.padX;
    const cardY = lm.contentTop + i * (lm.cardH + lm.gap) - _structureScrollY;
    if (cardY + lm.cardH < lm.contentTop || cardY > lm.contentTop + lm.contentH) continue;
    const isBuildSel = item.mode === CELL.GATE
      ? (buildMode === CELL.GATE && selectedGateType === item.id)
      : (buildMode === CELL.TOWER && selectedTowerType === item.id);
    _drawStructureDockCard(item, cardX, cardY, lm.cardW, lm.cardH, isBuildSel);
  }
  ctx.restore();

  if (lm.maxScroll > 0) {
    const trackH = lm.contentH;
    const thumbH = Math.max(18, trackH * (lm.contentH / lm.totalH));
    const thumbY = lm.contentTop + (_structureScrollY / lm.maxScroll) * (trackH - thumbH);
    ctx.fillStyle = 'rgba(60,45,28,0.40)';
    ctx.fillRect(px + pw - 5, lm.contentTop, 3, trackH);
    ctx.fillStyle = 'rgba(200,160,80,0.60)';
    ctx.fillRect(px + pw - 5, thumbY, 3, thumbH);
  }
}

// Legacy no-op — structures live in left dock
function drawBuildModeBar() {}

function drawBottomBuildBar() {
  drawDefenderDossier();
  drawBuildModeBar();
}

function drawHud() {
  if (gamePhase === 'playing') drawDefenderDossier();

  if (!gameOver) return;

  const { width, height } = getViewSize();
  const cx = gridScreenX(COLS * CELL_SIZE / 2);
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
    if (goldStolen > 0) {
      ctx.font      = '12px monospace';
      ctx.fillStyle = '#ff9040';
      ctx.fillText(`Gold plundered: -${goldStolen}g`, cx, cy + 38);
    }
    const livesLost = STARTING_LIVES - lives;
    const _lifeY = goldStolen > 0 ? cy + 54 : cy + 38;
    if (livesLost > 0) {
      ctx.font      = '12px monospace';
      ctx.fillStyle = livesLost >= STARTING_LIVES ? '#ff6060' : '#ff9080';
      ctx.fillText(`Lives lost: ${livesLost} / ${STARTING_LIVES}`, cx, _lifeY);
    }
    if (stars > 0) {
      ctx.font      = '12px monospace';
      ctx.fillStyle = '#f0d040';
      ctx.shadowColor = 'rgba(240,190,20,0.6)'; ctx.shadowBlur = 6;
      ctx.fillText(`✦ ${stars} campaign stars total`, cx, _lifeY + 16);
      ctx.shadowBlur = 0;
    }
    if (bestWave.wave > 0) {
      ctx.font      = '11px monospace';
      ctx.fillStyle = 'rgba(160,200,255,0.80)';
      const _bestY = stars > 0 ? _lifeY + 32 : _lifeY + 16;
      ctx.fillText(`Best wave: W${bestWave.wave} — ${bestWave.slain} slain, +${bestWave.gold}g`, cx, _bestY);
    }
    // Next run motivation — show locked tower goals
    {
      const goalY = (stars > 0 || bestWave.wave > 0) ? _lifeY + 48 : _lifeY + 16;
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
  const dossierActive = gamePhase === 'playing' && tower.defenderId
    && HERO_BUILD_ITEMS.some(h => h.id === tower.type) && selectedTower === tower;
  const tb = tower._talentBonuses;
  const hasTalents = !dossierActive && !!(tb && (
    (tb.dm ?? 1) !== 1 || (tb.rm ?? 1) !== 1 ||
    (tb.cm ?? 1) !== 1 || (tb.slowMult ?? 1) !== 1
  ));
  const talentExtraH = hasTalents ? 13 : 0;
  const defForPanel = _roster?.find(tower.defenderId);
  const hasItems    = !!defForPanel && !dossierActive;
  const itemsExtraH = hasItems ? 14 : 0;
  const hasItemRune = hasItems && defForPanel.equipment.some(iid => iid && ITEM_DEFS[iid]?.runeSlot);
  const itemRuneH   = hasItemRune ? 28 : 0;
  const isHero      = !!tower.defenderId;
  const heroMoveH   = isHero ? 28 : 0;
  const identitySkipH = dossierActive ? 20 : 0;
  const panelH = (tower.maxed ? 146 : 160) + talentExtraH + itemsExtraH + itemRuneH + heroMoveH - identitySkipH;
  panelRuneBtn     = null;
  panelItemRuneBtn = null;
  panelMoveBtn     = null;
  const { width, height } = getViewSize();

  let px = gridScreenX(tower.x) - panelW / 2;
  let py = gridScreenY(tower.y) - panelH - gridScreenCell(CELL_SIZE) - 4;
  px = Math.max(playfieldLeft() + 4, Math.min(px, width - combatRightPanelW() - panelW - 4));
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

  // Defender identity — shown in dossier when hero selected; skip duplicate here
  if (tower.name && !dossierActive) {
    const careerRoman = tower._careerLevel > 0 ? `  [${ROMAN[tower._careerLevel] ?? tower._careerLevel}]` : '';
    ctx.textAlign = 'left';
    ctx.font      = '10px monospace';
    drawDefenderName(tower.name + careerRoman, px + 10, py + 28, tower, 0.92);
    const _defPanel = _roster?.find(tower.defenderId);
    if (_defPanel) {
      const _rankPanel = getRank(_defPanel);
      ctx.font = '7px monospace'; ctx.fillStyle = _rankPanel.color ?? 'rgba(160,140,100,0.50)';
      ctx.fillText(`${_rankPanel.label}  Lv${_defPanel.careerLevel}`, px + 10, py + 38);
      // Active talents list
      if (_defPanel.talents?.length > 0) {
        const _tNames = _defPanel.talents.map(id => TALENT_DEFS[id]?.name ?? id).join(' · ');
        ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(240,200,60,0.55)';
        ctx.fillText(`✦ ${_tNames}`, px + 10, py + 47);
      }
    }
  }

  // Stats — offset up when dossier carries identity block
  const statY = dossierActive ? 30 : 44;
  ctx.textAlign = 'left';
  ctx.font      = '11px monospace';
  ctx.fillStyle = '#8aaccc';
  if (tower.type === 'hydda') {
    const allies = getHyddaHealCount(tower.level);
    const hp = getHyddaHealAmount(tower.level);
    const stat = isPathlessMode()
      ? `HEALS ${allies} ally · ${hp} HP every ${Math.round(tower.fireRate / 30)}s`
      : `HEALS ${allies} life every ${Math.round(tower.fireRate / 30)}s`;
    ctx.fillText(stat, px + 10, statY);
  } else if (tower.type === 'blondie') {
    const slowPct = Math.round((1 - (def.slowFactor ?? 0.4)) * 100);
    const durSec  = Math.round((def.slowDuration ?? 60) / 30);
    ctx.fillText(`${slowPct}% SLOW · ${durSec}s · RNG ${tower.range}`, px + 10, statY);
  } else if (tower.type === 'isjatten') {
    ctx.fillText(`DMG ${tower.damage}  RNG ${tower.range}  AoE`, px + 10, statY);
  } else {
    const dps = tower.fireRate > 0 ? Math.round(tower.damage * 30 / tower.fireRate) : 0;
    ctx.fillText(`DMG ${tower.damage}  RNG ${tower.range}  DPS ~${dps}`, px + 10, statY);
  }

  if (!tower.maxed) {
    const n       = tower.level;
    const nextDmg = Math.round(tower.baseDamage * (1 + n * 0.25));
    const nextRng = Math.round(tower.baseRange  * (1 + n * 0.08));
    const nextFR  = Math.max(4, Math.round(tower.baseFireRate * (1 - n * 0.05)));
    ctx.font      = '9px monospace';
    ctx.fillStyle = 'rgba(120,200,120,0.65)';
    ctx.fillText(`▸ Lv${n + 1}: DMG ${nextDmg}  RNG ${nextRng}  SPD ${nextFR}`, px + 10, statY + 11);
  }

  // Kill stats + damage dealt / synergy (right side)
  const killRow = tower.maxed ? (statY + 13) : (statY + 26);
  ctx.font      = '10px monospace';
  ctx.fillStyle = '#80aa70';
  ctx.fillText(`☠ ${tower.killCount ?? 0} kills`, px + 10, killRow);
  if (tower.onHighGround) {
    ctx.font = '7px monospace'; ctx.fillStyle = '#e0b030';
    ctx.fillText('◆ HIGH GROUND +15%RNG', px + 10, killRow + 9);
  }
  ctx.textAlign = 'right';
  if (tower._synergy) {
    const synLabels = { eagleEye: 'Eagle Eye +15%rng', siegeFury: 'Siege Fury +20%spl', winterGrip: "Winter's Grip +15%dmg", shieldWall: 'Shield Wall +10%dmg', tidecall: 'Tidecall +15%spl', runeChain: 'Rune Chain +15%dmg +1pierce' };
    const synColors = { eagleEye: '#88aaee', siegeFury: '#e87030', winterGrip: '#60c8f0', shieldWall: '#e0a040', tidecall: '#40b8e0', runeChain: '#c080f0' };
    ctx.fillStyle = synColors[tower._synergy];
    ctx.fillText(`⬡ ${synLabels[tower._synergy]}`, px + panelW - 10, killRow);
  } else if ((tower.damageDealt ?? 0) > 0) {
    const _defPanelD = _roster?.find(tower.defenderId);
    const _careerDmg = _defPanelD?.careerDamage ?? 0;
    ctx.fillStyle = '#c07050';
    const _dmgLabel = _careerDmg > 0 ? `⚔ ${tower.damageDealt}  (${Math.round(_careerDmg / 1000)}k career)` : `⚔ ${tower.damageDealt}`;
    ctx.fillText(_dmgLabel, px + panelW - 10, killRow);
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

  const canUpgrade = canUpgradeHeroNow() && !tower.maxed && gold >= tower.upgradeCost;
  drawFantasyPanel(upgX, btnY, upgW, btnH,
    tower.maxed ? 'rgba(10,8,20,0.97)' : canUpgrade ? 'rgba(8,24,8,0.97)' : 'rgba(60,20,20,0.97)',
    canUpgrade ? 0.65 : tower.maxed ? 0.18 : 0.55, 4);

  ctx.textAlign = 'center';
  if (tower.maxed) {
    ctx.fillStyle = 'rgba(130,110,60,0.75)';
    ctx.font      = '10px monospace';
    ctx.fillText('MAXED', upgX + upgW / 2, btnY + 18);
  } else if (!canUpgradeHeroNow() && _campaignNodeMode) {
    ctx.font      = '8px monospace';
    ctx.fillStyle = 'rgba(140,120,80,0.65)';
    ctx.fillText('WAR CAMP', upgX + upgW / 2, btnY + 12);
    ctx.fillText('to upgrade', upgX + upgW / 2, btnY + 23);
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

  // ── MOVE button (heroes only) ────────────────────────────────────────────────
  if (isHero) {
    const moveBtnY = btnY + btnH + 4;
    const moveBtnW = panelW - 16;
    const isMoving = _heroMoveMode === tower;
    drawFantasyPanel(px + 8, moveBtnY, moveBtnW, 22,
      isMoving ? 'rgba(15,35,80,0.97)' : 'rgba(8,18,40,0.95)',
      isMoving ? 0.85 : 0.45, 4);
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = isMoving ? '#80c0ff' : '#5080b0';
    ctx.fillText(isMoving ? '↖ CLICK A CELL TO PLACE' : '↖ MOVE', px + 8 + moveBtnW / 2, moveBtnY + 14);
    panelMoveBtn = { x: px + 8, y: moveBtnY, w: moveBtnW, h: 22, tower };
  }

  // ── Rune slot ───────────────────────────────────────────────────────────────
  const runeSecY = btnY + btnH + 4 + heroMoveH;
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

  // ── Item rune slot — shown when an equipped epic/legendary item has a socket ──
  if (hasItemRune) {
    const _itemRuneSecY = (hasItems ? (runeSecY + (tower.rune ? 30 : 20) + 14) : (runeSecY + (tower.rune ? 30 : 20)));
    ctx.strokeStyle = 'rgba(160,100,220,0.20)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(px + 8, _itemRuneSecY); ctx.lineTo(px + panelW - 8, _itemRuneSecY); ctx.stroke();
    const _itemRuneDef = tower.itemRune ? RUNE_DEFS.find(d => d.id === tower.itemRune) : null;
    ctx.font = '9px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(160,120,220,0.65)';
    ctx.fillText('ITEM RUNE', px + 10, _itemRuneSecY + 13);
    if (_itemRuneDef) {
      ctx.fillStyle = _itemRuneDef.color;
      ctx.beginPath(); ctx.arc(px + 52, _itemRuneSecY + 9, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = _itemRuneDef.color;
      ctx.fillText(_itemRuneDef.label.slice(0, 12), px + 60, _itemRuneSecY + 13);
    } else {
      ctx.fillStyle = 'rgba(100,80,140,0.55)'; ctx.textAlign = 'left';
      ctx.fillText('— empty —', px + 52, _itemRuneSecY + 13);
    }
    if (waveState !== 'active') {
      const hasFreeRune = RUNE_DEFS.some(d => runeUnequippedCount(d.id) > 0);
      const irbW = 46, irbH = 18, irbX = px + panelW - 8 - irbW, irbY = _itemRuneSecY + 2;
      drawFantasyPanel(irbX, irbY, irbW, irbH,
        (_itemRuneDef || hasFreeRune) ? 'rgba(20,10,40,0.95)' : 'rgba(14,10,6,0.95)',
        (_itemRuneDef || hasFreeRune) ? 0.50 : 0.15, 3);
      ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = (_itemRuneDef || hasFreeRune) ? '#b080ff' : '#40305a';
      ctx.fillText(_itemRuneDef ? 'CHANGE' : 'SOCKET', irbX + irbW / 2, irbY + irbH / 2 + 2.5);
      panelItemRuneBtn = { x: irbX, y: irbY, w: irbW, h: irbH, tower };
    }
  }

  ctx.restore();

  panelUpgradeBtn = (canUpgradeHeroNow() && !tower.maxed)
    ? { x: upgX, y: btnY, w: upgW, h: btnH }
    : null;
  panelSellBtn    = canModifyWarbandDeployment()
    ? { x: sellX, y: btnY, w: sellW, h: btnH }
    : null;
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
  sfxBossPhase50();
  _bossPhaseDesc = { text: 'PHASE II: +28% SPEED', timer: 60 };
  // All bosses: speed surge + particles + screen event
  boss.baseSpeed   *= 1.28;
  boss.slowTimer    = 0;
  boss.slowFactor   = 1;
  screenShake       = Math.max(screenShake, 12);
  spawnParticles(boss.x, boss.y, boss.highlightColor, 35);
  spawnParticles(boss.x, boss.y, '#f5d030', 15);

  const cfg = BOSS_CONFIGS[boss.waveNum];
  if (cfg?.phase50SlowImmune) boss.slowImmune = true;

  if (boss.waveNum === 10) {
    // Draugen-Jarl: spawns 3 Draugr at 50%
    boss.stunTimer = 22;
    for (let i = 0; i < 3; i++) spawnEnemy(ENEMY_TYPES.DRAUGR, waveHpScale * 0.80);
    bossRings.push({ x: boss.x, y: boss.y, r: boss.radius, maxR: boss.radius * 5, life: 32, maxLife: 32, color: '#8040c0' });
    const cx = COLS * CELL_SIZE / 2;
    const cy = ROWS * CELL_SIZE / 2;
    dmgFloaters.push({ x: cx, y: cy, val: 'DRAUGR SUMMONED', life: 90, maxLife: 90, color: '#b060e0', large: true, suffix: '' });
  } else if (boss.waveNum === 25) {
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
  sfxBossPhase25();
  _bossPhaseDesc = { text: 'PHASE III: DEATH SHRIEK', timer: 60 };
  screenShake = Math.max(screenShake, 22);
  _bossPhase25Flash = 18;
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

function onBossKilled(boss, killerTower = null) {
  bossesDefeated++;
  stars         += 3;
  _starsEarnedThisBattle += 3;
  // Log to chronicle
  _chronBossKills.push({
    boss:       boss.bossName ?? '',
    killerName: killerTower?.name   ?? null,
    killerId:   killerTower?.defenderId ?? null,
  });
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
      gridScreenX(boss.x + ox),
      gridScreenY(boss.y + oy),
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
    _lastBossLootItemId = itemId;
    sfxLootDrop();
  }

  // One-time Rune Forge hint after first boss kill
  if (_runeForgeHintTimer === 0) _runeForgeHintTimer = 360;
}

function drawBossDefeat() {
  if (bossDefeatTimer <= 0) return;
  const alpha    = bossDefeatTimer > 30 ? 1 : bossDefeatTimer / 30;
  const cy       = GRID_TOP + ROWS * CELL_SIZE * 0.38;
  const cx       = gridScreenX(COLS * CELL_SIZE / 2);
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
  if (_campaignNodeMode) return;
  if (_runeForgeHintTimer <= 0) return;
  _runeForgeHintTimer--;
  if (waveState === 'active') return;  // only show during break
  const alpha = _runeForgeHintTimer > 40 ? Math.min(1, (360 - _runeForgeHintTimer) / 30) : _runeForgeHintTimer / 40;
  const tw = 240, th = 36;
  const tx = gridScreenX(COLS * CELL_SIZE / 2) - tw / 2;
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
  ctx.fillText(`✦ ${stars} RUNES — press [R] or tap RUNE CARVER (right panel)`, tx + tw / 2, ty + 15);
  ctx.shadowBlur  = 0;
  ctx.font        = '9px monospace';
  ctx.fillStyle   = 'rgba(200,160,240,0.65)';
  ctx.fillText('Forge between waves, equip on defenders', tx + tw / 2, ty + 27);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawLastStandBanner() {
  if (gameOver || towers.length !== 1 || lives > 2) return;
  const solo = towers[0];
  if (!solo) return;
  const def  = solo.defenderId ? _roster?.find(solo.defenderId) : null;
  const trait = def?.trait ? (TRAIT_DEFS[def.trait]?.label ?? def.trait) : null;
  const name  = solo.name ?? TOWER_DEFS[solo.type]?.label ?? solo.type;
  const now   = performance.now();
  const pulse = 0.72 + 0.28 * Math.sin(now / 340);
  const bw = 180, bh = 22;
  const cx  = playfieldLeft() + playfieldWidth() / 2;
  const bx  = cx - bw / 2, by = GRID_BOTTOM - bh - 8;
  ctx.save();
  ctx.globalAlpha = pulse * 0.75;
  ctx.fillStyle = 'rgba(80,10,10,0.48)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(220,60,40,0.70)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#ff8060';
  ctx.shadowColor = '#ff4020'; ctx.shadowBlur = 6;
  ctx.fillText(`⚔  LONE STAND — ${name}`, cx, by + 12);
  ctx.shadowBlur = 0;
  if (trait) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(220,160,130,0.75)';
    ctx.fillText(trait, cx, by + 23);
  }
  ctx.restore();
}

function drawBossWarning() {
  if (bossWarnAlpha <= 0.01 || gameOver) return;
  const { width, height } = getViewSize();
  const cx      = gridScreenX(COLS * CELL_SIZE / 2);

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
  const _bossHasPhase = bossCfg?.phase50SlowImmune || bossCfg?.phase75 || bossCfg?.phase25;
  const bannerH = bossCfg?.hint ? (_bossHasPhase ? 56 : 46) : (_bossHasPhase ? 44 : 34);
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
  if (_bossHasPhase) {
    const _pBits = [];
    if (bossCfg?.phase75)            _pBits.push('75%');
    if (bossCfg?.phase50SlowImmune)  _pBits.push('50%');
    if (bossCfg?.phase25)            _pBits.push('25%');
    ctx.font      = '7px monospace';
    ctx.fillStyle = 'rgba(255,160,80,0.45)';
    ctx.shadowBlur = 0;
    ctx.fillText(`⚔ Phase II at ${_pBits.join(' / ')} HP`, cx, bannerY + (bossCfg?.hint ? 50 : 38));
  }
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawWaveAnnouncement() {
  // Incoming preview is drawn inside drawRightPanel().
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
      const fy    = gridScreenY(f.y);
      const fx    = gridScreenX(f.x);
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
  const barX    = playfieldLeft() + 10;
  const barY    = GRID_TOP  + 6;
  const barW    = playfieldWidth() - 20;
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
  // Phase threshold percentage labels
  ctx.textAlign = 'center';
  ctx.font = '5px monospace';
  if (ratio <= 0.50 && cfg?.phase75) {
    ctx.fillStyle = 'rgba(240,190,30,0.60)';
    ctx.fillText('75%', barX + barW * 0.75, barY - 3);
  }
  if (ratio > 0.50) {
    ctx.fillStyle = 'rgba(200,140,20,0.55)';
    ctx.fillText('50%', barX + barW * 0.5, barY - 3);
  }
  ctx.fillStyle = ratio <= 0.30 ? 'rgba(255,255,200,0.75)' : 'rgba(255,80,40,0.55)';
  ctx.fillText('25%', barX + barW * 0.25, barY - 3);

  // Phase state strip — colored segments below HP bar showing current/past phases
  {
    const _pStripY = barY + barH + 1;
    const _pStripH = 4;
    // Phase I: always grey (start)
    ctx.fillStyle = 'rgba(120,120,120,0.30)';
    ctx.fillRect(barX, _pStripY, barW, _pStripH);
    // Phase II: purple at 50%
    if (boss.phase50Done) {
      ctx.fillStyle = 'rgba(180,80,220,0.55)';
      ctx.fillRect(barX, _pStripY, barW * 0.5, _pStripH);
      ctx.font = '5px monospace'; ctx.fillStyle = 'rgba(255,180,255,0.80)'; ctx.textAlign = 'left';
      ctx.fillText('PHASE II', barX + 3, _pStripY + 3.5);
    }
    // Phase III: red at 25%
    if (boss.phase25Done) {
      const _iiPulse = 0.65 + 0.35 * Math.abs(Math.sin(performance.now() * 0.008));
      ctx.fillStyle = `rgba(255,40,40,${_iiPulse})`;
      ctx.fillRect(barX, _pStripY, barW * 0.25, _pStripH);
      ctx.font = '5px monospace'; ctx.fillStyle = `rgba(255,220,200,${_iiPulse})`; ctx.textAlign = 'left';
      ctx.fillText('PHASE III', barX + 3, _pStripY + 3.5);
    }
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
  // Phase label is now rendered in the phase strip below the HP bar
  // Phase description — 2s auto-display on phase transition
  if (_bossPhaseDesc && _bossPhaseDesc.timer > 0) {
    _bossPhaseDesc.timer--;
    const _pda = Math.min(1, _bossPhaseDesc.timer > 12 ? (_bossPhaseDesc.timer / 60) * 1.6 : _bossPhaseDesc.timer / 12);
    ctx.font = '8px monospace'; ctx.fillStyle = `rgba(204,102,255,${_pda})`; ctx.textAlign = 'left';
    ctx.fillText(_bossPhaseDesc.text, barX + 2, barY + barH + 14);
    if (_bossPhaseDesc.timer <= 0) _bossPhaseDesc = null;
  }
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
  const bw = 200, bh = 32;
  const bx = playfieldLeft() + (playfieldWidth() - bw) / 2;
  const by = GRID_BOTTOM - bh - 8;
  ctx.save();
  ctx.globalAlpha = alpha * 0.85;
  drawFantasyPanel(bx, by, bw, bh, 'rgba(4,2,14,0.55)', 0.50, 6);
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
  if (!_enemyIntroBanner || _enemyIntroBanner.timer <= 0) {
    // Advance queue if more banners are waiting
    if (_enemyIntroQueue.length > 0) {
      const _next = _enemyIntroQueue.shift();
      _enemyIntroBanner = { label: _next.label, hint: _next.hint, timer: 210, maxTimer: 210, category: _next.category };
      sfxEnemyIntro();
    }
    return;
  }
  _enemyIntroBanner.timer--;
  const { timer, maxTimer, label, hint, category } = _enemyIntroBanner;
  // Fade in over 10 frames, fade out over last 40 frames
  const fadeIn  = Math.min(1, (maxTimer - timer) / 10);
  const fadeOut = timer < 40 ? timer / 40 : 1;
  const alpha   = fadeIn * fadeOut;
  // Slide in from top: offset decreases from -12 to 0 in first 10 frames
  const slideY  = -(1 - fadeIn) * 12;
  const bw = 240, bh = 36;
  const gridCenterX = gridScreenX(COLS * CELL_SIZE / 2);
  const bx = gridCenterX - bw / 2;
  const by = GRID_TOP + 6 + slideY;
  // Category-based color accent
  const _catColors = {
    beast:   { border: 'rgba(180,200,60,0.65)',  accent: 'rgba(180,200,60,0.80)',  text: '#c8e060' },
    undead:  { border: 'rgba(160,160,180,0.60)', accent: 'rgba(140,140,160,0.75)', text: '#c0c0d8' },
    spirit:  { border: 'rgba(160,80,220,0.65)',  accent: 'rgba(140,60,200,0.80)',  text: '#c080ff' },
    giant:   { border: 'rgba(160,110,60,0.65)',  accent: 'rgba(140,90,40,0.80)',   text: '#d0a060' },
    boss:    { border: 'rgba(220,60,40,0.70)',   accent: 'rgba(200,40,20,0.85)',   text: '#ff8060' },
    default: { border: 'rgba(60,120,200,0.60)',  accent: 'rgba(60,120,200,0.75)',  text: '#80b8ff' },
  };
  const _cc = _catColors[category ?? 'default'] ?? _catColors.default;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(4,8,22,0.97)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
  ctx.strokeStyle = _cc.border; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.stroke();
  ctx.fillStyle = _cc.accent;
  ctx.fillRect(bx, by, 3, bh);
  ctx.textAlign = 'center';
  const _categoryGlyph = { beast: '⚡', undead: '⚔', spirit: '☁', giant: '⛰', boss: '☠', default: '◈' };
  const _glyph = _categoryGlyph[category ?? 'default'] ?? _categoryGlyph.default;
  ctx.font = 'bold 9px monospace'; ctx.fillStyle = _cc.text;
  ctx.shadowColor = _cc.text; ctx.shadowBlur = 5;
  ctx.fillText(`${_glyph} ${label}`, gridCenterX, by + 14);
  ctx.shadowBlur = 0;
  ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(140,170,220,0.72)';
  ctx.fillText(hint, gridCenterX, by + 27);
  ctx.restore();
}

function drawFlawlessNotif() {
  if (flawlessTimer <= 0) return;
  const alpha = Math.min(1, flawlessTimer / 30) * (flawlessTimer < 60 ? flawlessTimer / 60 : 1);
  const t     = 1 - flawlessTimer / 180;
  const hasBossBar = enemies.some(e => e.isBoss && e.alive && !e.reached);
  const cy    = (hasBossBar ? GRID_TOP + 50 : GRID_TOP + 28) + t * 8;
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
  const _assault = isPathlessMode();
  const shortcuts = [
    ['SPC',         'Launch next wave'],
    ['P',           'Pause'],
    ['M',           'Mute sound'],
    ['R',           'Rune Carver — buy runes between waves'],
    ['F',           'Cycle speed ×1 → ×2 → ×4'],
    ['G',           'Toggle grid lines'],
    ['Z',           'Reset zoom'],
    ['U',           'Upgrade selected tower'],
    ['X',           'Sell tower (press twice)'],
    ['Scroll',      'Zoom in / out'],
    ['Mid-drag',    'Pan grid'],
    ['↑↓←→',       'Pan grid'],
    ['1-9',         _assault ? 'Select hero / structure hotkey' : 'Select tower / wall hotkey'],
    ['Esc',         'Deselect / close'],
    ['? / H',       'This cheatsheet'],
  ];
  if (_assault) {
    shortcuts.push(['—', 'Heroes auto-move · Hydda heals wounded allies']);
    shortcuts.push(['MOVE', 'Manual reposition (selected hero panel)']);
  } else {
    shortcuts.push(['—', 'Build maze walls — path must stay open']);
  }
  if (_assault) {
    shortcuts.push(['—', 'Enemies target PORT until one gate falls']);
    shortcuts.push(['—', 'Fallen heroes return with full HP on new assault']);
  } else if (gamePhase === 'campaignSelect' || gamePhase === 'mapSelect' || gamePhase === 'slotSelect') {
    shortcuts.push(['—', 'Skirmish = classic 100-wave maze TD (no campaign progress)']);
    shortcuts.push(['—', 'Campaign = regional assaults with persistent warband']);
  }
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
  ctx.font        = '10px monospace';
  ctx.fillStyle   = '#a08060';
  const _phaseLbl = {
    playing: isPathlessMode() ? 'Assault' : 'Skirmish',
    betweenBattles: 'War Camp',
    fortressPrep: 'Fortress Prep',
    debrief: 'Debrief',
    nodeMap: 'Command Map',
    campaignSelect: 'Region Select',
    mapSelect: 'Skirmish Select',
    slotSelect: 'Save Slots',
  }[gamePhase] ?? gamePhase;
  ctx.fillText(_phaseLbl, width / 2, height / 2 + 4);
  ctx.font        = '13px monospace';
  ctx.fillStyle   = '#806050';
  ctx.fillText('Press P to continue', width / 2, height / 2 + 22);
  ctx.restore();
}

function drawRunePicker() {
  runePickerBtns = [];
  if (!showRunePicker || !runePickerTower) return;
  const tower = runePickerTower;

  // Position picker near the tower panel — anchored to left-center of screen
  const pw = 190, ph = 24 + RUNE_DEFS.length * 34 + 28;
  let ppx = gridScreenX(tower.x) - pw / 2;
  let ppy = gridScreenY(tower.y) - ph - gridScreenCell(CELL_SIZE) - 8;
  ppx = Math.max(playfieldLeft() + 4, Math.min(ppx, BASE_W - combatRightPanelW() - pw - 4));
  ppy = Math.max(GRID_TOP + 4, Math.min(ppy, BASE_H - ph - 8));

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  drawFantasyPanel(ppx, ppy, pw, ph, 'rgba(8,4,18,0.98)', 0.9, 8);

  const _pickerTitle = _itemRunePickMode ? 'ITEM RUNE SLOT' : 'EQUIP RUNE';
  const _titleColor  = _itemRunePickMode ? '#b080ff' : '#c8a0ff';
  const _titleGlow   = _itemRunePickMode ? 'rgba(140,80,255,0.5)' : 'rgba(180,100,255,0.5)';
  ctx.textAlign = 'center'; ctx.font = 'bold 10px monospace';
  ctx.fillStyle = _titleColor; ctx.shadowColor = _titleGlow; ctx.shadowBlur = 8;
  ctx.fillText(_pickerTitle, ppx + pw / 2, ppy + 17);
  ctx.shadowBlur = 0;
  if (_itemRunePickMode) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(160,130,220,0.55)';
    ctx.fillText('(weaker bonus, stacks with tower rune)', ppx + pw / 2, ppy + 25);
  }

  let ry = _itemRunePickMode ? ppy + 32 : ppy + 26;
  const rowH = 34, bw = 48, bh = 22;

  for (const def of RUNE_DEFS) {
    const owned    = runeInventory[def.id] ?? 0;
    const equipped = runeEquippedCount(def.id);
    const isOnThis = _itemRunePickMode ? tower.itemRune === def.id : tower.rune === def.id;
    const free     = owned - equipped + (isOnThis ? 1 : 0);
    const canEquip = free > 0;

    if (owned === 0) { ry += rowH; continue; }

    if (isOnThis) {
      ctx.fillStyle = 'rgba(160,120,255,0.08)';
      ctx.fillRect(ppx + 4, ry, pw - 8, rowH - 2);
    }

    ctx.fillStyle = def.color;
    ctx.beginPath(); ctx.arc(ppx + 16, ry + rowH / 2 - 1, 6, 0, Math.PI * 2); ctx.fill();

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

  // REMOVE button if tower has a rune (in the relevant slot)
  const _activeRune = _itemRunePickMode ? tower.itemRune : tower.rune;
  if (_activeRune) {
    const rbx = ppx + pw / 2 - 36, rby = ppy + ph - 26, rbw = 72, rbh = 20;
    drawFantasyPanel(rbx, rby, rbw, rbh, 'rgba(30,6,6,0.97)', 0.65, 3);
    ctx.textAlign = 'center'; ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#ee6666';
    ctx.fillText('REMOVE RUNE', rbx + rbw / 2, rby + rbh / 2 + 3);
    runePickerBtns.push({ x: rbx, y: rby, w: rbw, h: rbh, remove: true });
  }
}

// ── Chronicle overlay — scrollable full-screen battle log ────────────────────

function _buildChronicleOC(filteredBattles, hallHonored, hallFallen, bonds, uniqueDefs, CW) {
  const LINE_H = 9, HEADER_H = 14, ENTRY_GAP = 10, BOND_H = 26;
  const xc = _chronicleOCCtx;

  // Measure total height first using cached prose
  let totalH = 0;
  xc.font = '8px monospace';
  for (const battle of filteredBattles) {
    let proseLines = _chronicleProseCache.get(battle.battleNumber);
    if (!proseLines) {
      proseLines = battle.prose ? wrapText(xc, battle.prose, CW - 12) : [];
      _chronicleProseCache.set(battle.battleNumber, proseLines);
    }
    totalH += HEADER_H + proseLines.length * LINE_H + ENTRY_GAP;
  }
  if (filteredBattles.length === 0 && _chronicleDefFilter) totalH += 60;
  if (bonds.length > 0 && !_chronicleDefFilter) totalH += 28 + bonds.length * BOND_H;
  if (hallHonored.length > 0) totalH += 28 + hallHonored.length * 36;
  if (hallFallen.length > 0)  totalH += 28 + hallFallen.length  * 36;
  totalH = Math.max(totalH, 10);

  if (_chronicleOC.width !== CW || _chronicleOC.height !== totalH) {
    _chronicleOC.width  = CW;
    _chronicleOC.height = totalH;
  } else {
    xc.clearRect(0, 0, CW, totalH);
  }

  let y = 0;

  for (const battle of filteredBattles) {
    xc.font = '8px monospace';
    const proseLines  = _chronicleProseCache.get(battle.battleNumber) ?? [];
    const entryH      = HEADER_H + proseLines.length * LINE_H + ENTRY_GAP;
    const resultLabel = battle.result === 'victory' ? 'VICTORY' : 'DEFEAT';
    const resultColor = battle.result === 'victory' ? '#60ee80' : '#e05030';
    const mapLabel    = battle.mapName ?? 'UNKNOWN';
    const waveLabel   = battle.waveCount ?? battle.waves;
    const hdrPrefix   = `BATTLE ${battle.battleNumber}  ·  ${mapLabel}${waveLabel ? `  ·  ${waveLabel}W` : ''}  ·  `;

    xc.textAlign = 'left';
    xc.font = 'bold 8px monospace';
    xc.fillStyle = 'rgba(200,175,115,0.65)';
    xc.fillText(hdrPrefix, 4, y + 10);
    xc.fillStyle = resultColor;
    xc.fillText(resultLabel, 4 + xc.measureText(hdrPrefix).width, y + 10);

    xc.strokeStyle = 'rgba(120,100,60,0.18)'; xc.lineWidth = 0.5;
    xc.beginPath(); xc.moveTo(4, y + HEADER_H); xc.lineTo(CW - 4, y + HEADER_H); xc.stroke();

    xc.font = '8px monospace'; xc.fillStyle = 'rgba(190,165,115,0.75)';
    for (let li = 0; li < proseLines.length; li++) {
      xc.fillText(proseLines[li], 4, y + HEADER_H + (li + 1) * LINE_H + 2);
    }
    y += entryH;
  }

  if (filteredBattles.length === 0 && _chronicleDefFilter) {
    const emptyName = uniqueDefs.find(d => d.id === _chronicleDefFilter)?.name ?? 'this defender';
    xc.font = '8px monospace'; xc.fillStyle = 'rgba(140,120,80,0.45)'; xc.textAlign = 'center';
    xc.fillText(`No chronicle entries for ${emptyName}`, CW / 2, 40);
    xc.textAlign = 'left';
    y += 60;
  }

  if (bonds.length > 0 && !_chronicleDefFilter) {
    xc.strokeStyle = 'rgba(180,140,60,0.28)'; xc.lineWidth = 0.6;
    xc.beginPath(); xc.moveTo(4, y + 8); xc.lineTo(CW - 4, y + 8); xc.stroke();
    xc.font = 'bold 8px monospace'; xc.fillStyle = 'rgba(200,160,60,0.75)'; xc.textAlign = 'center';
    xc.fillText('BONDS OF BATTLE', CW / 2, y + 20); xc.textAlign = 'left';
    y += 28;
    for (const bond of bonds) {
      const bA = _roster?.find(bond.defenderIds[0]);
      const bB = _roster?.find(bond.defenderIds[1]);
      xc.font = 'bold 8px monospace'; xc.fillStyle = 'rgba(200,160,60,0.70)';
      xc.fillText(`∞ ${bond.name ?? 'Bond'}`, 4, y + 10);
      xc.font = '7px monospace'; xc.fillStyle = 'rgba(170,145,95,0.55)';
      xc.fillText(`${bA?.name ?? bond.defenderIds[0]}  &  ${bB?.name ?? bond.defenderIds[1]}`, 4, y + 19);
      if (bond.formed) {
        xc.fillStyle = 'rgba(140,120,75,0.40)';
        const battleCnt = bond.battleCount ? `  ·  ${bond.battleCount} battles together` : '';
        xc.fillText(`formed Battle ${bond.formed}${battleCnt}`, 130, y + 19);
      }
      y += BOND_H;
    }
  }

  function _drawHall(entries, headerColor, headerText, nameColor) {
    if (!entries.length) return;
    xc.strokeStyle = `${headerColor}44`; xc.lineWidth = 0.8;
    xc.beginPath(); xc.moveTo(4, y + 8); xc.lineTo(CW - 4, y + 8); xc.stroke();
    xc.font = 'bold 8px monospace'; xc.fillStyle = headerColor; xc.textAlign = 'center';
    xc.fillText(headerText, CW / 2, y + 20); xc.textAlign = 'left';
    y += 28;
    for (const entry of entries) {
      const titlesStr = entry.titles?.length
        ? entry.titles.slice(0, 2).map(id => TITLE_DEFS[id]?.label ?? id).join(' · ')
        : '';
      xc.font = 'bold 8px monospace'; xc.fillStyle = nameColor;
      xc.fillText(`${entry.name}  ·  ${entry.rankLabel}  ·  ${entry.battlesPlayed ?? 0} battles  ·  ${entry.careerKills ?? 0}K`, 4, y + 10);
      if (titlesStr) {
        xc.font = '7px monospace'; xc.fillStyle = 'rgba(180,160,100,0.50)';
        xc.fillText(`✦ ${titlesStr}`, 4, y + 21);
      }
      const eY = titlesStr ? 32 : 23;
      const note = entry.legacyNote || entry.epitaph;
      if (note) {
        xc.font = '7px monospace';
        xc.fillStyle = entry.legacyNote ? '#a8d080' : 'rgba(190,165,115,0.60)';
        xc.fillText(entry.legacyNote ? `⬧ ${note}` : `"${note}"`, 4, y + eY);
      }
      y += 36;
    }
  }

  _drawHall(hallHonored, '#80a870', 'HALL OF THE HONORED', '#c0a0ff');
  _drawHall(hallFallen,  '#a05050', 'HALL OF THE FALLEN',  '#c8b060');

  _chronicleOCH = y;
}

function drawChronicleOverlay() {
  const W = BASE_W, H = BASE_H;
  const PAD = 24;
  const CW  = W - PAD * 2;

  _chronicleBtns = [];
  ctx.save();

  ctx.fillStyle = 'rgba(4,2,12,0.96)';
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = 'rgba(200,170,80,0.95)';
  ctx.shadowColor = 'rgba(200,170,60,0.6)'; ctx.shadowBlur = 8;
  ctx.fillText('THE CHRONICLE', W / 2, PAD + 16);
  ctx.shadowBlur = 0;

  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.40)';
  ctx.fillText('CLICK OR ESC TO CLOSE  ·  SCROLL TO NAVIGATE', W / 2, H - 8);

  const battles   = _campaignState?.chronicle?.battles ?? [];
  const hallH     = _campaignState?.hallOfHonored ?? [];
  const hallF     = _campaignState?.hallOfFallen  ?? [];

  // Campaign stats summary line
  {
    const _nBattles  = battles.length;
    const _nBosses   = battles.reduce((s, b) => s + (b.bossKills?.length ?? 0), 0);
    const _nBonds    = (_campaignState?.bonds ?? []).length;
    const _nStars    = _campaignState?.stars ?? 0;
    const _bits = [];
    if (_nBattles)  _bits.push(`${_nBattles} battle${_nBattles !== 1 ? 's' : ''}`);
    if (_nBosses)   _bits.push(`${_nBosses} boss${_nBosses !== 1 ? 'es' : ''} slain`);
    if (_nBonds)    _bits.push(`⚭ ${_nBonds} bond${_nBonds !== 1 ? 's' : ''}`);
    _bits.push(`✦ ${_nStars}`);
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(160,135,80,0.55)';
    ctx.fillText(_bits.join('  ·  '), W / 2, PAD + 28);
  }

  // ── Defender filter chips ─────────────────────────────────────────────────
  const uniqueDefs = [];
  const _seenIds   = new Set();
  for (const b of battles) {
    for (const d of (b.defenders ?? [])) {
      if (d.defenderId && !_seenIds.has(d.defenderId)) {
        _seenIds.add(d.defenderId);
        uniqueDefs.push({ id: d.defenderId, name: d.name });
      }
    }
  }
  const CHIP_H = 14, CHIP_GAP = 3;
  let chipX = PAD;
  const chipY = PAD + 40;
  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.50)'; ctx.textAlign = 'left';
  ctx.fillText(uniqueDefs.length > 0 ? 'FILTER ▾' : 'FILTER:', PAD, chipY + 10);
  chipX = PAD + (uniqueDefs.length > 0 ? 52 : 42);
  // Build or reuse chip width cache (skip measureText every frame)
  if (!_chronicleChipCache || _chronicleChipCache.battleCount !== battles.length) {
    ctx.font = '7px monospace';
    const _chips = [{ id: null, lbl: 'ALL', w: ctx.measureText('ALL').width + 10 }];
    for (const def of uniqueDefs.slice(0, 8)) {
      const lbl = def.name.slice(0, 10);
      _chips.push({ id: def.id, lbl, w: ctx.measureText(lbl).width + 10 });
    }
    _chronicleChipCache = { battleCount: battles.length, chips: _chips };
  }
  // "ALL" chip
  {
    const { lbl, w: cw } = _chronicleChipCache.chips[0];
    const isActive = !_chronicleDefFilter;
    ctx.font = '7px monospace';
    ctx.fillStyle   = isActive ? 'rgba(200,170,60,0.25)' : 'rgba(30,20,10,0.5)';
    ctx.strokeStyle = isActive ? 'rgba(200,170,60,0.7)' : 'rgba(80,60,30,0.3)';
    ctx.lineWidth   = isActive ? 1 : 0.5;
    ctx.beginPath(); ctx.roundRect(chipX, chipY, cw, CHIP_H, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#e8c040' : 'rgba(140,120,70,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, chipX + cw / 2, chipY + 10);
    if (!isActive) {
      ctx.strokeStyle = 'rgba(140,120,70,0.30)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(chipX + 5, chipY + 11); ctx.lineTo(chipX + cw - 5, chipY + 11); ctx.stroke();
    }
    _chronicleBtns.push({ x: chipX, y: chipY, w: cw, h: CHIP_H, action: 'filterDef', defenderId: null });
    chipX += cw + CHIP_GAP;
  }
  for (const chipEntry of _chronicleChipCache.chips.slice(1)) {
    ctx.font = '7px monospace';
    const { id: defId, lbl, w: cw } = chipEntry;
    if (chipX + cw > W - PAD) break;
    const isActive = _chronicleDefFilter === defId;
    ctx.fillStyle   = isActive ? 'rgba(160,130,200,0.25)' : 'rgba(30,20,10,0.5)';
    ctx.strokeStyle = isActive ? 'rgba(160,130,200,0.7)'  : 'rgba(80,60,30,0.3)';
    ctx.lineWidth   = isActive ? 1 : 0.5;
    ctx.beginPath(); ctx.roundRect(chipX, chipY, cw, CHIP_H, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#c0a0ff' : 'rgba(140,120,70,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, chipX + cw / 2, chipY + 10);
    if (!isActive) {
      ctx.strokeStyle = 'rgba(140,120,70,0.30)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(chipX + 5, chipY + 11); ctx.lineTo(chipX + cw - 5, chipY + 11); ctx.stroke();
    }
    _chronicleBtns.push({ x: chipX, y: chipY, w: cw, h: CHIP_H, action: 'filterDef', defenderId: defId });
    chipX += cw + CHIP_GAP;
  }

  // Battle-type filter row (boss / all battles)
  const typeY = chipY + CHIP_H + 5;
  const typeChips = [
    { id: null, lbl: 'ALL B' },
    { id: 'boss', lbl: 'BOSS' },
  ];
  let typeX = PAD;
  ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(120,100,70,0.45)';
  ctx.textAlign = 'left';
  ctx.fillText('BATTLES:', PAD, typeY + 9);
  typeX = PAD + 44;
  for (const tc of typeChips) {
    const cw = ctx.measureText(tc.lbl).width + 10;
    const isActive = _chronicleBattleFilter === tc.id;
    ctx.fillStyle   = isActive ? 'rgba(200,120,60,0.25)' : 'rgba(30,20,10,0.5)';
    ctx.strokeStyle = isActive ? 'rgba(200,120,60,0.7)' : 'rgba(80,60,30,0.3)';
    ctx.lineWidth   = isActive ? 1 : 0.5;
    ctx.beginPath(); ctx.roundRect(typeX, typeY, cw, CHIP_H, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#e8a040' : 'rgba(140,120,70,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText(tc.lbl, typeX + cw / 2, typeY + 10);
    _chronicleBtns.push({ x: typeX, y: typeY, w: cw, h: CHIP_H, action: 'filterBattle', battleFilter: tc.id });
    typeX += cw + CHIP_GAP;
  }

  ctx.strokeStyle = 'rgba(180,140,60,0.25)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(PAD, typeY + CHIP_H + 4); ctx.lineTo(W - PAD, typeY + CHIP_H + 4); ctx.stroke();

  const listTop = typeY + CHIP_H + 10;
  const listH   = H - listTop - 18;

  // Filtered battle list for cache key + build call
  const filteredBattles = (() => {
    let list = _chronicleDefFilter
      ? [...battles].reverse().filter(b =>
          b.defenders?.some(d => d.defenderId === _chronicleDefFilter) ||
          b.mvpId === _chronicleDefFilter ||
          b.lastStand?.defenderId === _chronicleDefFilter ||
          b.bossKills?.some(bk => bk.killerId === _chronicleDefFilter))
      : [...battles].reverse();
    if (_chronicleBattleFilter === 'boss') {
      list = list.filter(b => (b.bossKills?.length ?? 0) > 0);
    }
    return list;
  })();

  // Invalidate prose line cache on new battle
  if (_chronicleProseCache.size > 0 && _chronicleProseCache.get('__battleCount') !== battles.length) {
    _chronicleProseCache.clear();
  }
  _chronicleProseCache.set('__battleCount', battles.length);

  const _campaignBonds = _campaignState?.bonds ?? [];

  // ── Offscreen canvas cache ────────────────────────────────────────────────
  const _ocKey = `${filteredBattles.length}_${_chronicleDefFilter ?? ''}_${_chronicleBattleFilter ?? ''}_${hallH.length}_${hallF.length}_${_campaignBonds.length}`;
  if (!_chronicleOC) {
    _chronicleOC    = document.createElement('canvas');
    _chronicleOCCtx = _chronicleOC.getContext('2d');
  }
  if (_ocKey !== _chronicleOCKey) {
    _chronicleOCKey = _ocKey;
    _buildChronicleOC(filteredBattles, hallH, hallF, _campaignBonds, uniqueDefs, CW);
  }

  // Clip and blit offscreen content at scroll offset
  ctx.save();
  ctx.beginPath(); ctx.rect(PAD, listTop, CW, listH); ctx.clip();
  if (_chronicleOCH > 0) ctx.drawImage(_chronicleOC, PAD, listTop - _chronicleScrollY);
  ctx.restore();

  _chronicleScrollY = Math.min(_chronicleScrollY, Math.max(0, _chronicleOCH - listH));
  ctx.restore();
}

// ── Defender biography overlay ────────────────────────────────────────────────
function drawDefenderBioOverlay(bioState) {
  const def = _roster?.find(bioState.defenderId);
  if (!def) { _showDefenderBio = null; return; }

  const W = BASE_W, H = BASE_H;
  const PAD = 28;
  const CW  = W - PAD * 2;

  ctx.save();
  ctx.fillStyle = 'rgba(4,2,12,0.96)';
  ctx.fillRect(0, 0, W, H);

  const rank  = getRank(def);
  const tDef  = TOWER_DEFS[def.type];
  const glow  = tDef?.glowRgb ?? '180,150,80';
  const clsLbl = tDef?.label ?? def.type;

  // Name + rank header
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = `rgba(${glow},0.95)`;
  ctx.shadowColor = `rgba(${glow},0.5)`; ctx.shadowBlur = 8;
  ctx.fillText(def.name, W / 2, PAD + 16);
  ctx.shadowBlur = 0;

  ctx.font = '9px monospace'; ctx.fillStyle = rank.color ?? 'rgba(200,170,80,0.70)';
  ctx.fillText(`${rank.label}  ·  ${clsLbl}  ·  ${def.battlesPlayed} battles  ·  ${def.careerKills}K`, W / 2, PAD + 30);

  // Next rank requirements
  const _rankIdx = VETERAN_RANKS.findIndex(r => r.id === rank.id);
  if (_rankIdx > 0) {
    const _nextRank = VETERAN_RANKS[_rankIdx - 1];
    const _gaps = [];
    if (def.careerLevel < _nextRank.minLevel) _gaps.push(`Lv${_nextRank.minLevel}`);
    if ((def.battlesPlayed ?? 0) < _nextRank.minBattles) _gaps.push(`${_nextRank.minBattles}B`);
    if ((def.careerKills ?? 0) < _nextRank.minKills) _gaps.push(`${_nextRank.minKills}K`);
    if ((def.titles?.length ?? 0) < _nextRank.minTitles) _gaps.push(`${_nextRank.minTitles} title${_nextRank.minTitles > 1 ? 's' : ''}`);
    if (_gaps.length > 0) {
      ctx.font = '7px monospace'; ctx.fillStyle = `rgba(${glow},0.35)`;
      ctx.fillText(`→ ${_nextRank.label}: needs ${_gaps.join(', ')}`, W / 2, PAD + 40);
    }
  }

  ctx.strokeStyle = 'rgba(180,140,60,0.30)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(PAD, PAD + 48); ctx.lineTo(W - PAD, PAD + 48); ctx.stroke();

  // Bio prose (cached — generateBio is expensive, only run once per open)
  if (!bioState.bioText) {
    const _chronWithBonds = _campaignState?.chronicle
      ? { ..._campaignState.chronicle, _bonds: _campaignState.bonds ?? [] }
      : null;
    bioState.bioText = generateBio(def, _chronWithBonds, clsLbl);
  }
  const bioText = bioState.bioText;
  if (bioState.revealChars === undefined) bioState.revealChars = 0;
  if (bioState.revealChars < bioText.length) bioState.revealChars = Math.min(bioText.length, bioState.revealChars + 8);
  const displayText = bioText.slice(0, bioState.revealChars);
  ctx.font = '8px monospace';
  // Cache wrapped lines after typewriter completes to skip per-frame wrapText
  if (bioState.revealChars >= bioText.length && !bioState.bioLines) {
    bioState.bioLines = wrapText(ctx, bioText, CW - 8);
  }
  const bioLines = bioState.bioLines ?? wrapText(ctx, displayText, CW - 8);
  let bioY = PAD + 62;
  ctx.fillStyle = 'rgba(190,165,115,0.80)'; ctx.textAlign = 'left';
  for (const line of bioLines) { ctx.fillText(line, PAD + 4, bioY); bioY += 11; }

  // Trait + scars
  bioY += 6;
  if (def.trait) {
    const td = TRAIT_DEFS[def.trait];
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(160,200,160,0.65)';
    ctx.fillText(`Trait: ${td?.label ?? def.trait}  —  ${td?.desc ?? ''}`, PAD + 4, bioY);
    bioY += 13;
  }
  if (def.scars?.length) {
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(200,140,80,0.65)';
    const scarStr = def.scars.map(s => SCAR_DEFS[s]?.label ?? s).join('  ·  ');
    ctx.fillText(`Scars: ${scarStr}`, PAD + 4, bioY);
    bioY += 13;
  }

  // Bonds — show bond name and partner name
  const defBonds = (_campaignState?.bonds ?? []).filter(b => b.defenderIds.includes(def.defenderId));
  if (defBonds.length) {
    for (const bond of defBonds) {
      const _partnerId = bond.defenderIds.find(id => id !== def.defenderId);
      const _partner   = _roster?.find(_partnerId);
      ctx.font = 'italic 8px monospace'; ctx.fillStyle = '#c0b080';
      ctx.fillText(`∞ ${bond.name ?? 'Bond'}${_partner ? `  with  ${_partner.name}` : ''}`, PAD + 4, bioY);
      ctx.font = '8px monospace';
      bioY += 13;
    }
  }

  // Legacy bonus
  if (def.legacyBonus) {
    const _lb = def.legacyBonus;
    const _lbStat = _lb.stat === 'dm' ? '+8% DMG' : _lb.stat === 'rm' ? '+8% RNG' : '−7% CD';
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(160,200,160,0.70)';
    ctx.fillText(`✦ ${_lb.fromName}'s Legacy: ${_lbStat}`, PAD + 4, bioY);
    bioY += 13;
  }

  // Titles
  if (def.titles?.length) {
    bioY += 4;
    ctx.strokeStyle = 'rgba(180,140,60,0.20)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(PAD, bioY); ctx.lineTo(W - PAD, bioY); ctx.stroke();
    bioY += 10;
    ctx.font = 'bold 7px monospace'; ctx.fillStyle = 'rgba(200,170,80,0.55)';
    ctx.fillText('TITLES', PAD + 4, bioY);
    bioY += 10;
    for (const titleId of def.titles) {
      const td = TITLE_DEFS[titleId];
      ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(200,165,90,0.75)';
      ctx.fillText(`✦ ${td?.label ?? titleId}`, PAD + 4, bioY);
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.45)';
      ctx.fillText(td?.desc ?? '', PAD + 140, bioY);
      bioY += 11;
    }
  }

  // Epitaph
  bioY += 8;
  const epitaph = generateEpitaph(def);
  ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(180,150,100,0.50)'; ctx.textAlign = 'center';
  ctx.fillText(`"${epitaph}"`, W / 2, bioY);

  // Footer
  const _bioRevealing = bioState.revealChars < bioText.length;
  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.50)';
  ctx.fillText(_bioRevealing ? '[click to reveal · ESC cancel]' : '[ESC to close]', W / 2, H - 8);

  ctx.restore();
}

// ── Retirement ceremony overlay ───────────────────────────────────────────────
function drawRetirementCeremony(def) {
  const W = BASE_W, H = BASE_H;
  const PW = 320, PH = 220;
  const px = (W - PW) / 2, py = (H - PH) / 2;

  const fadeAlpha = _retireCeremonyFade > 0
    ? Math.min(1, (30 - _retireCeremonyFade) / 18)
    : 1;
  if (_retireCeremonyFade > 0) _retireCeremonyFade--;
  const _secA = (delay) => Math.min(1, Math.max(0, (fadeAlpha * 30 - delay) / 14));

  ctx.save();
  ctx.globalAlpha = fadeAlpha;
  ctx.fillStyle = 'rgba(4,2,12,0.85)';
  ctx.fillRect(0, 0, W, H);

  drawFantasyPanel(px, py, PW, PH, 'rgba(10,6,24,0.99)', 0.9, 10);

  const rank   = getRank(def);
  const tDef   = TOWER_DEFS[def.type];
  const glow   = tDef?.glowRgb ?? '180,150,80';
  const clsLbl = tDef?.label ?? def.type;

  ctx.textAlign = 'center';
  ctx.save(); ctx.globalAlpha = _secA(0);
  ctx.font = 'bold 11px monospace'; ctx.fillStyle = `rgba(${glow},0.95)`;
  ctx.shadowColor = `rgba(${glow},0.5)`; ctx.shadowBlur = 6;
  ctx.fillText(def.name, W / 2, py + 22);
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.save(); ctx.globalAlpha = _secA(4);
  ctx.font = '8px monospace'; ctx.fillStyle = rank.color ?? 'rgba(200,170,80,0.70)';
  ctx.fillText(`${rank.label}  ·  ${clsLbl}  ·  ${def.battlesPlayed} battles`, W / 2, py + 36);
  ctx.restore();

  ctx.strokeStyle = 'rgba(180,140,60,0.30)'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(px + 12, py + 44); ctx.lineTo(px + PW - 12, py + 44); ctx.stroke();

  ctx.save(); ctx.globalAlpha = _secA(10);
  ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(190,165,115,0.75)';
  ctx.fillText(`After ${def.battlesPlayed} battles, ${def.name} has earned rest.`, W / 2, py + 58);
  ctx.restore();

  const epitaph = generateEpitaph(def);
  const eLines  = wrapText(ctx, `"${epitaph}"`, PW - 32);
  let ey = py + 72;
  ctx.save(); ctx.globalAlpha = _secA(16);
  ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(180,155,105,0.60)';
  for (const el of eLines) { ctx.fillText(el, W / 2, ey); ey += 10; }
  ctx.restore();

  // Legacy bonus note
  const _legacyArr = (_campaignState?.legacyBonuses ?? {})[def.type];
  const _legacyFull = Array.isArray(_legacyArr) && _legacyArr.length >= 3;
  if (_legacyFull) {
    ctx.save(); ctx.globalAlpha = _secA(24);
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(240,200,60,0.65)';
    ctx.shadowColor = 'rgba(220,180,40,0.4)'; ctx.shadowBlur = 4;
    ctx.fillText(`✦ LEGACY AT FULL STRENGTH — ${clsLbl} line endures`, W / 2, py + 140);
    ctx.shadowBlur = 0;
    ctx.restore();
  } else {
    ctx.save(); ctx.globalAlpha = _secA(24);
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(160,200,160,0.55)';
    ctx.fillText(`The next ${clsLbl} recruit carries ${def.name}'s tradition.`, W / 2, py + 140);
    ctx.restore();
  }

  // Buttons
  const btnW = 120, btnH = 28, btnGap = 14;
  const b1x = W / 2 - btnW - btnGap / 2, b2x = W / 2 + btnGap / 2;
  const btnY = py + PH - 44;

  // Bond grief warning (if retiring defender has a bond)
  const _retBond = (_campaignState?.bonds ?? []).find(b => b.defenderIds.includes(def.defenderId));
  if (_retBond) {
    const _retBondedId = _retBond.defenderIds.find(id => id !== def.defenderId);
    const _retBonded   = _roster?.find(_retBondedId);
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(220,80,60,0.65)'; ctx.textAlign = 'center';
    ctx.fillText(`⚠ ∞ ${_retBond.name ?? 'Bond'} severs — ${_retBonded?.name ?? '?'} carries grief`, b1x + btnW / 2, btnY - 22);
  }
  // "This is permanent." warning above confirm button
  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(220,80,60,0.75)'; ctx.textAlign = 'center';
  ctx.fillText('This is permanent.', b1x + btnW / 2, btnY - 5);
  ctx.textAlign = 'center';

  drawFantasyPanel(b1x, btnY, btnW, btnH, 'rgba(20,8,36,0.97)', 0.7, 6);
  ctx.font = 'bold 9px monospace'; ctx.fillStyle = 'rgba(180,140,220,0.85)';
  ctx.fillText('RETIRE WITH HONOR', b1x + btnW / 2, btnY + 19);
  _betweenBtns.push({ x: b1x, y: btnY, w: btnW, h: btnH, action: 'retireWithHonor', defenderId: def.defenderId });

  drawFantasyPanel(b2x, btnY, btnW, btnH, 'rgba(12,8,20,0.97)', 0.5, 6);
  ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.60)';
  ctx.fillText('CONTINUE SERVICE', b2x + btnW / 2, btnY + 19);
  _betweenBtns.push({ x: b2x, y: btnY, w: btnW, h: btnH, action: 'cancelRetirement' });

  ctx.restore();
}

// ── Between-battles summary screen ───────────────────────────────────────────

let _betweenBtns = [];  // hit areas: [{x,y,w,h,action}, ...]

function drawCampaignVictoryOverlay() {
  const W = BASE_W, H = BASE_H;
  ctx.fillStyle = 'rgba(4,2,12,0.97)';
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  ctx.textAlign = 'center';

  ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#ffe890';
  ctx.shadowColor = 'rgba(255,200,80,0.6)'; ctx.shadowBlur = 14;
  ctx.fillText('NORTHERN SHIELD STANDS', cx, cy - 60);
  ctx.shadowBlur = 0;

  ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(180,150,90,0.65)';
  ctx.fillText('All 100 waves repelled. Surtr falls. The shield holds.', cx, cy - 42);

  const _bb = battlesCompleted;
  const _bs = (_campaignState?.chronicle?.battles ?? []).flatMap(b => b.bossKills ?? []).length;
  const _bd = (_campaignState?.bonds ?? []).length;
  const _st = _campaignState?.stars ?? 0;

  ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(200,180,120,0.80)';
  ctx.fillText(`${_bb} battles  ·  ${_bs} chieftains slain  ·  ${_bd} bonds formed  ·  ★${_st}`, cx, cy - 22);

  if (_roster.defenders.length > 0) {
    const _mvpDef = _roster.defenders.reduce((a, b) => (a.careerKills ?? 0) >= (b.careerKills ?? 0) ? a : b);
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(200,175,100,0.70)';
    ctx.fillText(`Champion: ${_mvpDef.name}  ·  ${_mvpDef.careerKills} kills  ·  ${_mvpDef.battlesPlayed} battles`, cx, cy - 4);
  }

  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.45)';
  ctx.fillText('[click to continue]', cx, cy + 18);
}

// ── Post-battle debrief screen ────────────────────────────────────────────────

function drawCampaignAssaultDebrief(W, H, isVictory, fadeT) {
  const panW = 480, panH = 340;
  const panX = Math.round((W - panW) / 2);
  const panY = Math.round((H - panH) / 2) - 6;
  const slideY = panY + Math.round((1 - fadeT) * 24);
  const hx = panX + panW / 2;

  drawFantasyPanel(panX, slideY, panW, panH, 'rgba(8,4,18,0.99)');

  const nodeIndex = _campaignNodeIndex ?? 0;
  const assault = getAssaultInfo(_campaignMapIndex, nodeIndex);
  const field = _campaignMapIndex != null
    ? getMapRun(ensureCampaignProgress(), _campaignMapIndex).fieldState
    : null;
  const postAssignments = field?.postAssignments ?? _postAssignments ?? {};
  const gateHeroId = postAssignments.west_gate?.defenderId;
  const gateDef = gateHeroId ? _roster?.find(gateHeroId) : null;
  const secondDef = _roster?.defenders?.find(d => d.defenderId !== gateHeroId);
  const chronicleEntry = _campaignState?.chronicle?.battles?.at(-1);

  const prose = getSagaDebriefProse(nodeIndex, isVictory, {
    gateHeroName: gateDef?.name ?? pickBattleMvp()?.name,
    secondHeroName: secondDef?.name,
    chronicleProse: chronicleEntry?.prose,
  });
  const sagaTitle = getSagaDebriefTitle(nodeIndex);

  const damage = buildFortressDamageReport(wallData, field, {
    goal: GOAL,
    ringR: FORTRESS_RING_R,
    frontId: assault?.frontId ?? 'west',
    lives,
    breachFlag: _chronBreached || _lastDefeatReason === 'ramparts',
  });

  let hy = slideY + 22;
  const rColor = isVictory ? '#f0c840' : '#e04040';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(160,130,80,0.55)';
  ctx.fillText(sagaTitle.toUpperCase(), hx, hy);
  hy += 16;

  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = rColor;
  ctx.shadowColor = isVictory ? 'rgba(240,180,20,0.5)' : 'rgba(220,40,40,0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(isVictory ? '— VICTORY —' : '— DEFEATED —', hx, hy);
  ctx.shadowBlur = 0;
  hy += 14;

  if (assault) {
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(180,150,90,0.60)';
    ctx.fillText(`${assault.codename} · ${assault.tierLabel} · ${assault.frontId?.toUpperCase() ?? 'WEST'} FRONT`, hx, hy);
    hy += 14;
  }

  ctx.strokeStyle = 'rgba(140,110,60,0.28)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(panX + 24, hy);
  ctx.lineTo(panX + panW - 24, hy);
  ctx.stroke();
  hy += 12;

  ctx.font = '8.5px monospace';
  ctx.fillStyle = 'rgba(210,190,150,0.88)';
  ctx.textAlign = 'left';
  const proseX = panX + 28;
  const proseW = panW - 56;
  const proseLines = wrapText(ctx, `"${prose}"`, proseW);
  for (const line of proseLines.slice(0, 4)) {
    ctx.fillText(line, proseX, hy);
    hy += 13;
  }
  hy += 6;

  ctx.font = 'bold 7.5px monospace';
  ctx.fillStyle = 'rgba(160,130,80,0.55)';
  ctx.fillText('FORTRESS REPORT', proseX, hy);
  hy += 12;

  const toneColor = {
    hold: '#90c890',
    wounded: '#e8a060',
    critical: '#e06050',
    scar: '#d09060',
    mended: '#a0c8a0',
    resource: '#c0a060',
  };
  ctx.font = '7.5px monospace';
  for (const row of damage.lines.slice(0, 4)) {
    ctx.fillStyle = 'rgba(160,135,90,0.55)';
    ctx.fillText(row.label, proseX, hy);
    ctx.textAlign = 'right';
    ctx.fillStyle = toneColor[row.tone] ?? '#d8c89a';
    ctx.fillText(row.value, panX + panW - 28, hy);
    ctx.textAlign = 'left';
    hy += 12;
  }
  hy += 4;

  const compact = formatDebriefCompactStats({
    waveNumber,
    waveTotal: _nodeWavePlan?.waves?.length,
    slain,
    goldEarned,
    lives,
    maxLives: STARTING_LIVES,
    mvpName: pickBattleMvp()?.name,
  });
  ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(140,120,80,0.48)';
  ctx.textAlign = 'center';
  ctx.fillText(compact, hx, hy + 4);

  _debriefBtns = [];
  const _canContinue = _debriefTimer >= 60;
  const btnY = slideY + panH - 40;
  const btnH = 28;
  const btnW = 132;
  const gap = 10;
  const prepNode = isVictory ? _pendingNextAssaultNode : _campaignNodeIndex;
  const showPrep = prepNode != null;
  const btnCount = showPrep ? 3 : 2;
  const totalW = btnCount * btnW + (btnCount - 1) * gap;
  let btnX = hx - totalW / 2;

  if (_canContinue) {
    drawFantasyPanel(btnX, btnY, btnW, btnH, 'rgba(20,30,14,0.97)', 0.7, 6);
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#90c070';
    ctx.fillText('WAR CAMP', btnX + btnW / 2, btnY + 18);
    _debriefBtns.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'warCamp' });
    btnX += btnW + gap;

    if (showPrep) {
      drawFantasyPanel(btnX, btnY, btnW, btnH,
        isVictory ? 'rgba(28,40,16,0.97)' : 'rgba(40,16,16,0.97)', 0.75, 6);
      ctx.fillStyle = isVictory ? '#a8e070' : '#e08060';
      ctx.fillText('PREPARE FORTRESS', btnX + btnW / 2, btnY + 18);
      _debriefBtns.push({
        x: btnX, y: btnY, w: btnW, h: btnH,
        action: isVictory ? 'nextAssault' : 'retryAssault',
        nodeIndex: prepNode,
      });
      btnX += btnW + gap;
    }

    drawFantasyPanel(btnX, btnY, btnW, btnH, 'rgba(12,8,4,0.97)', 0.7, 6);
    ctx.fillStyle = '#c0a060';
    ctx.fillText('COMMAND MAP', btnX + btnW / 2, btnY + 18);
    _debriefBtns.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'commandMap' });
  } else {
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(140,120,80,0.45)';
    ctx.fillText('…', hx, btnY + 18);
  }
  ctx.textAlign = 'left';
}

function drawDebrief() {
  _debriefTimer++;
  // First frame: play level-up SFX if any defender leveled up this battle
  if (_debriefTimer === 1 && _battleXpData.some(d => d.newLevel > d.oldLevel)) {
    sfxTalentUnlock();
  }
  const W = BASE_W, H = BASE_H;
  const isVictory = _battleResult === 'victory';

  // Dark backdrop
  const _t   = Math.min(1, _debriefTimer / 20);
  ctx.save();
  ctx.globalAlpha = _t * 0.88;
  ctx.fillStyle   = 'rgba(4,2,8,1)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  const panW = 460, panH = 360;
  const panX = Math.round((W - panW) / 2);
  const panY = Math.round((H - panH) / 2) - 8;
  const slideY = panY + Math.round((1 - _t) * 24);

  ctx.globalAlpha = _t;
  if (_returnToNodeMapAfterDebrief) {
    drawCampaignAssaultDebrief(W, H, isVictory, _t);
    ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }
  drawFantasyPanel(panX, slideY, panW, panH, 'rgba(8,4,18,0.99)');

  // ── Result header ────────────────────────────────────────────────────────────
  const hx = panX + panW / 2;
  let hy = slideY + 28;
  const rColor = isVictory ? '#f0c840' : '#e04040';
  const rGlow  = isVictory ? 'rgba(240,180,20,0.6)' : 'rgba(220,40,40,0.6)';
  ctx.font        = 'bold 20px monospace';
  ctx.fillStyle   = rColor;
  ctx.shadowColor = rGlow;
  ctx.shadowBlur  = isVictory ? 14 : 10;
  ctx.textAlign   = 'center';
  ctx.fillText(isVictory ? '— VICTORY —' : '— DEFEATED —', hx, hy);
  ctx.shadowBlur  = 0;

  // Boss loot banner — prominent strip when a boss dropped equipment
  if (_lastBossLootItemId) {
    const _lootDef = ITEM_DEFS[_lastBossLootItemId];
    if (_lootDef) {
      hy += 10;
      const _rarColor = RARITY_COLOR[_lootDef.rarity] ?? '#e0c060';
      const _lootW = 280, _lootH = 22;
      const _lootX = hx - _lootW / 2;
      ctx.fillStyle = 'rgba(20,8,4,0.85)';
      ctx.beginPath(); ctx.roundRect(_lootX, hy - 14, _lootW, _lootH, 4); ctx.fill();
      ctx.strokeStyle = _rarColor; ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = 'bold 9px monospace'; ctx.fillStyle = _rarColor;
      ctx.shadowColor = _rarColor; ctx.shadowBlur = 8;
      ctx.fillText(`⚔ BOSS LOOT: ${_lootDef.name.toUpperCase()}`, hx, hy);
      ctx.shadowBlur = 0;
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(200,170,120,0.55)';
      ctx.fillText(`${_lootDef.desc ?? ''}  ·  Equip in War Camp`, hx, hy + 10);
      hy += 18;
    }
  }

  // Map name subtitle (+ founding battle flavor)
  hy += 16;
  ctx.font      = '9px monospace';
  ctx.fillStyle = 'rgba(160,130,80,0.50)';
  ctx.fillText(_currentMapName ?? 'MIDGARD', hx, hy);
  if (_returnToNodeMapAfterDebrief) {
    const _debAssault = getAssaultInfo(_campaignMapIndex, _campaignNodeIndex);
    if (_debAssault) {
      hy += 12;
      ctx.font = '8px monospace';
      ctx.fillStyle = 'rgba(180,150,90,0.65)';
      ctx.fillText(`${_debAssault.codename}  ·  ${_debAssault.tierLabel}`, hx, hy);
      if (isVictory && _campaignNodeIndex === 2) {
        hy += 11;
        ctx.fillStyle = 'rgba(200,150,100,0.72)';
        ctx.fillText('The gate cracked. Salvage crews gathered timber.', hx, hy);
      }
    }
    if (_lastAssaultCasualtyCount > 0 && isVictory) {
      hy += 11;
      ctx.fillStyle = 'rgba(200,140,100,0.70)';
      ctx.fillText(`${_lastAssaultCasualtyCount} fallen — rally at next assault`, hx, hy);
    }
    if (!isVictory && _lastDefeatReason === 'field_wiped') {
      hy += 11;
      ctx.fillStyle = 'rgba(255,100,60,0.80)';
      ctx.fillText('The line broke — all defenders fell', hx, hy);
      hy += 11;
      ctx.fillStyle = 'rgba(200,140,100,0.65)';
      ctx.fillText('Retry restores full HP at deploy slots', hx, hy);
    } else {
      if (_lastAssaultCasualtyCount > 0 && !isVictory) {
        hy += 11;
        ctx.fillStyle = 'rgba(200,140,100,0.65)';
        ctx.fillText(`${_lastAssaultCasualtyCount} fallen — full HP restored on retry`, hx, hy);
      }
      if (!isVictory && _lastDefeatReason === 'ramparts') {
        hy += 11;
        ctx.fillStyle = 'rgba(255,120,80,0.82)';
        ctx.fillText('Ramparts breached — treasury exposed', hx, hy);
      }
    }
    if (!isVictory && goldStolen > 0) {
      hy += 11;
      ctx.fillStyle = 'rgba(255,140,60,0.85)';
      ctx.fillText(`Treasury raided: −${goldStolen}g`, hx, hy);
    }
    if (_returnToNodeMapAfterDebrief && _campaignState) {
      const _fuDeb = getNextFortressUpgradeOffer(_campaignState.fortressUpgrades ?? {}, goldReserve);
      if (_fuDeb && goldReserve >= _fuDeb.cost) {
        hy += 11;
        ctx.font = '7px monospace';
        ctx.fillStyle = 'rgba(140,200,140,0.72)';
        ctx.fillText(`Fortress ready: ${_fuDeb.label} → L${_fuDeb.nextLevel} (${_fuDeb.cost}g reserve)`, hx, hy);
      }
    }
    if (isVictory && _pendingNextAssaultNode != null) {
      const _nextInfo = getAssaultInfo(_campaignMapIndex, _pendingNextAssaultNode);
      if (_nextInfo) {
        hy += 11;
        ctx.font = '7px monospace';
        ctx.fillStyle = 'rgba(160,200,140,0.70)';
        ctx.fillText(`Next: ${_nextInfo.codename} (${_nextInfo.tierLabel})`, hx, hy);
      }
    }
  }
  if (battlesCompleted === 0 && isVictory) {
    hy += 12;
    ctx.font      = '8px monospace';
    ctx.fillStyle = 'rgba(200,170,90,0.60)';
    ctx.fillText('Your warband stands for the first time. The north holds.', hx, hy);
  }

  // Separator
  hy += 10;
  {
    const _sg = ctx.createLinearGradient(panX + 20, 0, panX + panW - 20, 0);
    _sg.addColorStop(0, 'rgba(160,120,20,0)');
    _sg.addColorStop(0.5, `rgba(${isVictory ? '180,140,30' : '160,50,30'},0.50)`);
    _sg.addColorStop(1, 'rgba(160,120,20,0)');
    ctx.strokeStyle = _sg; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(panX + 20, hy); ctx.lineTo(panX + panW - 20, hy); ctx.stroke();
  }
  hy += 14;

  // ── Stats grid (two-column) ───────────────────────────────────────────────────
  const sLX = panX + 30, sRX = panX + panW / 2 + 20;
  const ROW = 22;

  const _drawStat = (label, value, x, y, valColor) => {
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(160,135,90,0.60)'; ctx.textAlign = 'left';
    ctx.fillText(label, x, y);
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = valColor ?? '#d8c89a'; ctx.textAlign = 'right';
    ctx.fillText(value, x + 190, y);
  };

  // Left column
  const _livesC = lives <= 0 ? '#e04040' : lives <= 3 ? '#ff8040' : '#60ee80';
  if (_returnToNodeMapAfterDebrief && _nodeWavePlan) {
    _drawStat('ASSAULT WAVES', `${waveNumber} / ${_nodeWavePlan.waves.length}`, sLX, hy,
              isVictory ? '#f0c840' : '#e8a060');
  } else {
    _drawStat('WAVES CLEARED', endlessMode ? `${waveNumber}` : `${waveNumber} / ${MAX_WAVES}`, sLX, hy,
              isVictory ? '#f0c840' : '#e8a060');
  }
  _drawStat('RAMPARTS HELD', `${Math.max(0, lives)} / ${STARTING_LIVES}`, sLX, hy + ROW, _livesC);
  _drawStat('GOLD CARRIED HOME', `◆ ${goldEarned}g`, sLX, hy + ROW * 2, '#e8c040');
  _drawStat(battlesCompleted === 0 ? 'RESERVE (+25% forward)' : 'RESERVE BONUS', `+${_reserveContrib}g`, sLX, hy + ROW * 3, '#c0a030');

  // Right column
  _drawStat('ENEMIES SLAIN', `${slain}`, sRX, hy, '#b0d0f0');
  _drawStat('BATTLES FOUGHT', `${battlesCompleted}`, sRX, hy + ROW, 'rgba(180,155,110,0.80)');
  _drawStat('PROMOTIONS', `${_promotionQueue.length}`, sRX, hy + ROW * 2,
            _promotionQueue.length > 0 ? '#a8e0c0' : 'rgba(160,135,90,0.50)');
  _drawStat('STARS', `✦ ${stars}${_starsEarnedThisBattle > 0 ? ` (+${_starsEarnedThisBattle})` : ''}`, sRX, hy + ROW * 3, '#f0d040');

  hy += ROW * 4 + 6;

  // Promotions list — names of defenders who ranked up
  if (_promotionQueue.length > 0) {
    const _rankPromos = _promotionQueue.filter(p => p.type === 'rank').slice(0, 3);
    if (_rankPromos.length > 0) {
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(140,200,140,0.55)'; ctx.textAlign = 'center';
      ctx.fillText(_rankPromos.map(p => `${p.defenderName} → ${p.rankLabel}`).join('  ·  '), hx, hy);
      hy += 11;
    }
  }

  // Wave event — show if one was active during this battle
  if (currentWaveEvent) {
    ctx.font = '7px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(200,140,60,0.55)';
    ctx.fillText(`⚑ ${currentWaveEvent.label}: ${currentWaveEvent.desc}`, hx, hy);
    hy += 12;
  }

  hy += 6;
  // ── MVP ──────────────────────────────────────────────────────────────────────
  const _mvpT = pickBattleMvp();

  {
    const sepG = ctx.createLinearGradient(panX + 20, 0, panX + panW - 20, 0);
    sepG.addColorStop(0,   'rgba(100,90,50,0)');
    sepG.addColorStop(0.5, 'rgba(120,100,40,0.35)');
    sepG.addColorStop(1,   'rgba(100,90,50,0)');
    ctx.strokeStyle = sepG; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(panX + 20, hy); ctx.lineTo(panX + panW - 20, hy); ctx.stroke();
    hy += 12;
  }

  ctx.font = 'bold 8.5px monospace'; ctx.fillStyle = 'rgba(160,135,90,0.60)'; ctx.textAlign = 'left';
  ctx.fillText('BATTLE MVP', panX + 30, hy);
  hy += 13;
  if (_mvpT) {
    const mvpRgb = defenderGlowRgb(_mvpT);
    const mvpDmg = Math.round(_mvpT.damageDealt ?? 0);
    const mvpKills = _mvpT.killCount ?? 0;
    const mvpPulse = _debriefTimer < 90 ? 0.85 + Math.sin(_debriefTimer * 0.14) * 0.15 : 1;
    ctx.font      = 'bold 11px monospace';
    ctx.fillStyle = `rgba(${mvpRgb},${(0.90 * mvpPulse).toFixed(2)})`;
    ctx.textAlign = 'left';
    ctx.fillText(_mvpT.name ?? TOWER_DEFS[_mvpT.type]?.label ?? _mvpT.type, panX + 30, hy);
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(180,155,110,0.65)';
    const _cls  = TOWER_DEFS[_mvpT.type]?.label ?? '';
    const _rank = (_mvpT._rankIndex != null) ? (VETERAN_RANKS?.[_mvpT._rankIndex]?.label ?? '') : '';
    ctx.fillText(`${_rank} ${_cls}  •  ${mvpDmg} dmg  •  ${mvpKills} kills`, panX + 30, hy + 13);
  } else {
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(140,115,75,0.45)';
    ctx.textAlign = 'left';
    ctx.fillText('No defenders deployed.', panX + 30, hy);
  }
  hy += 20;

  // ── Per-defender kill breakdown (compact list) ─────────────────────────────
  const _defKillList = getBattleHeroStats()
    .filter(s => (s.killCount ?? 0) > 0)
    .sort((a, b) => (b.killCount ?? 0) - (a.killCount ?? 0))
    .slice(0, 5);
  if (_defKillList.length > 1) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.45)'; ctx.textAlign = 'left';
    ctx.fillText('KILLS BY DEFENDER', panX + 30, hy);
    hy += 10;
    const _colW = Math.floor(panW / Math.min(_defKillList.length, 3));
    for (let _ki = 0; _ki < _defKillList.length; _ki++) {
      const _dt = _defKillList[_ki];
      const _dCol = _ki % 3;
      const _dRow = Math.floor(_ki / 3);
      const _dx = panX + 30 + _dCol * _colW;
      const _dy = hy + _dRow * 14;
      const _rgb = defenderGlowRgb(_dt);
      const _xpEntry = _battleXpData.find(x => x.defenderId === _dt.defenderId);
      const _promoted = _xpEntry && _xpEntry.newLevel > _xpEntry.oldLevel;
      ctx.font = '7px monospace'; ctx.fillStyle = `rgba(${_rgb},0.80)`; ctx.textAlign = 'left';
      ctx.fillText(`${_dt.name ?? TOWER_DEFS[_dt.type]?.label ?? '?'}  ${_dt.killCount}☠`, _dx, _dy);
      if (_promoted) {
        ctx.fillStyle = '#e8c040'; ctx.font = '6px monospace';
        ctx.fillText('★ PROMOTED', _dx, _dy + 8);
      }
    }
    hy += Math.ceil(_defKillList.length / 3) * 14 + 4;
  }

  // ── Continue buttons (campaign assault flow) ───────────────────────────────
  _debriefBtns = [];
  const _canContinue = _debriefTimer >= 60;
  const btnY = slideY + panH - 36;
  const btnH = 28;

  if (_returnToNodeMapAfterDebrief && _canContinue) {
    const assaultInfo = getAssaultInfo(_campaignMapIndex, _campaignNodeIndex);
    const nextNode = isVictory ? _pendingNextAssaultNode : null;
    const btnCount = (nextNode != null || !isVictory) ? 2 : 1;
    const btnW = 148;
    const gap = 12;
    const totalW = btnCount * btnW + (btnCount - 1) * gap;
    let btnX = hx - totalW / 2;

    if (nextNode != null) {
      drawFantasyPanel(btnX, btnY, btnW, btnH, 'rgba(28,40,16,0.97)', 0.75, 6);
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#a8e070';
      ctx.fillText('NEXT ASSAULT →', btnX + btnW / 2, btnY + 18);
      _debriefBtns.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'nextAssault', nodeIndex: nextNode });
      btnX += btnW + gap;
    } else if (!isVictory) {
      drawFantasyPanel(btnX, btnY, btnW, btnH, 'rgba(40,16,16,0.97)', 0.75, 6);
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#e08060';
      ctx.fillText('RETRY ASSAULT', btnX + btnW / 2, btnY + 18);
      _debriefBtns.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'retryAssault' });
      btnX += btnW + gap;
    }

    drawFantasyPanel(btnX, btnY, btnW, btnH, 'rgba(20,30,14,0.97)', 0.7, 6);
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = '#90c070';
    const campLabel = isVictory && assaultInfo
      ? `WAR CAMP (${assaultInfo.codename} ✓)`
      : 'WAR CAMP';
    ctx.fillText(campLabel, btnX + btnW / 2, btnY + 18);
    _debriefBtns.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'warCamp' });
  } else {
    const _cPulse = _canContinue ? 0.65 + Math.sin(performance.now() * 0.004) * 0.35 : 0;
    ctx.font      = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(200,170,80,${_cPulse})`;
    ctx.shadowColor = `rgba(220,180,40,${_cPulse * 0.6})`;
    ctx.shadowBlur  = _canContinue ? 4 : 0;
    ctx.fillText('— CLICK TO CONTINUE —', hx, slideY + panH - 18);
    ctx.shadowBlur = 0;
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Named Campaign Events ──────────────────────────────────────────────────

function _drawEventBtn(bx, by, bw, bh, choiceDef, canAfford) {
  ctx.save();
  ctx.globalAlpha *= (canAfford ? 1 : 0.42);
  ctx.fillStyle = canAfford ? 'rgba(30,20,8,0.97)' : 'rgba(18,12,5,0.8)';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 4);
  ctx.fill();
  ctx.strokeStyle = canAfford ? 'rgba(190,140,50,0.55)' : 'rgba(80,60,25,0.35)';
  ctx.lineWidth   = 0.8;
  ctx.stroke();
  // Label
  ctx.textAlign   = 'left';
  ctx.font        = 'bold 9px monospace';
  ctx.fillStyle   = canAfford ? '#e8c060' : '#705828';
  ctx.fillText(choiceDef.label, bx + 10, by + 14);
  // Cost badge
  ctx.textAlign   = 'right';
  ctx.fillStyle   = canAfford ? 'rgba(220,170,60,0.85)' : 'rgba(100,75,28,0.7)';
  ctx.fillText(choiceDef.costText, bx + bw - 8, by + 14);
  // Description (wrapped, max 2 lines)
  ctx.textAlign = 'left';
  ctx.font      = '8px monospace';
  ctx.fillStyle = canAfford ? 'rgba(190,170,130,0.75)' : 'rgba(110,90,55,0.5)';
  const descLines = wrapText(ctx, choiceDef.desc, bw - 20);
  let dy = by + 27;
  for (const line of descLines.slice(0, 2)) { ctx.fillText(line, bx + 10, dy); dy += 11; }
  ctx.restore();
}

function drawCampaignEventCard() {
  if (!_pendingCampaignEvent) return;
  _pendingEventBtns = [];
  _eventCardAnim++;
  const ev = _pendingCampaignEvent;
  const W = BASE_W, H = BASE_H;
  const FT = FRAME_THICK;

  // Dim the betweenBattles screen behind the card
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,10,0.68)';
  ctx.fillRect(FT, FT, W - FT * 2, H - FT * 2);

  // Slide-in + fade-in
  const slideOff = Math.max(0, (18 - _eventCardAnim) * 1.6);
  const fadeIn   = Math.min(1, _eventCardAnim / 14);
  ctx.globalAlpha = fadeIn;

  const cW = 444, cH = 310;
  const cX = Math.round((W - cW) / 2);
  const cY = Math.round((H - cH) / 2) + slideOff;

  drawFantasyPanel(cX, cY, cW, cH, 'rgba(4,2,16,0.99)', 0.90, 10);

  // ── Icon + header ──
  const centerX = cX + cW / 2;
  ctx.textAlign = 'center';
  ctx.font      = '20px monospace';
  ctx.fillStyle = 'rgba(200,160,60,0.90)';
  ctx.fillText(ev.icon, centerX, cY + 30);

  ctx.font        = 'bold 16px monospace';
  ctx.fillStyle   = '#e8c860';
  ctx.shadowColor = 'rgba(220,180,60,0.5)';
  ctx.shadowBlur  = 12;
  ctx.fillText(ev.title, centerX, cY + 52);
  ctx.shadowBlur  = 0;

  ctx.font      = '8px monospace';
  ctx.fillStyle = 'rgba(170,130,70,0.55)';
  ctx.fillText(ev.subtitle, centerX, cY + 65);

  // Separator
  ctx.strokeStyle = 'rgba(180,140,60,0.22)';
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  ctx.moveTo(cX + 20, cY + 74); ctx.lineTo(cX + cW - 20, cY + 74);
  ctx.stroke();

  // Flavor text
  ctx.font      = '8px monospace';
  ctx.fillStyle = 'rgba(200,180,140,0.68)';
  ctx.textAlign = 'left';
  const flavorLines = wrapText(ctx, ev.flavor, cW - 56);
  let fy = cY + 88;
  for (const line of flavorLines.slice(0, 4)) { ctx.fillText(line, cX + 28, fy); fy += 13; }

  // ── Choice buttons ──
  const btnY  = cY + cH - 68;
  const btnH  = 52;
  const btnW  = (cW - 52) / 2;
  const b1X   = cX + 18;
  const b2X   = b1X + btnW + 16;
  const cs    = _campaignState;
  const canA  = ev.canAffordA(cs);
  const canB  = ev.canAffordB(cs);

  _drawEventBtn(b1X, btnY, btnW, btnH, ev.choiceA, canA);
  _drawEventBtn(b2X, btnY, btnW, btnH, ev.choiceB, canB);

  // ── Effect preview line ──
  {
    const _n = _roster?.defenders?.length ?? 0;
    const _traitless = _roster?.defenders?.filter(d => !d.trait).length ?? 0;
    const _top3 = Math.min(_n, 3);
    let _preview = null;
    if (ev.id === 'blotet')       _preview = `A: all ${_n} defenders +25 XP  ·  B: top defender +20 XP`;
    else if (ev.id === 'smeden')  _preview = `A: top ${_top3} defenders +20 XP  ·  B: newest defender +15 XP`;
    else if (ev.id === 'volva')   _preview = _traitless > 0 ? `A: ${_traitless} traitless defender gets trait  ·  B: −8g` : `A: random defender gets trait  ·  B: −8g`;
    else if (ev.id === 'skalden') _preview = `A: top killer +60 XP  ·  B: no effect`;
    else if (ev.id === 'handelsman') _preview = `A: random equipment item  ·  B: no effect`;
    else if (ev.id === 'leidangr')   _preview = `A: recruit new defender  ·  B: recruit + −8g reserve`;
    else if (ev.id === 'utilegumadr')_preview = `A: recruit veteran (scarred)  ·  B: no effect`;
    else if (ev.id === 'runstenen')  _preview = `A: strongest defender unlocks talent  ·  B: +1 ✦`;
    if (_preview) {
      ctx.textAlign = 'center'; ctx.font = '7px monospace';
      ctx.fillStyle = 'rgba(160,140,80,0.50)';
      ctx.fillText(_preview, cX + cW / 2, cY + cH - 26);
    }
  }

  // — PASS hint — bottom center of card
  const _passY = cY + cH - 12;
  ctx.textAlign = 'center'; ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(120,100,60,0.40)';
  ctx.fillText('— PASS —  (ESC)', cX + cW / 2, _passY);
  const _passW = 60, _passH = 14;
  const _passX = cX + cW / 2 - _passW / 2;

  _pendingEventBtns = [
    { x: b1X, y: btnY, w: btnW, h: btnH, choice: 'A', canAfford: canA },
    { x: b2X, y: btnY, w: btnW, h: btnH, choice: 'B', canAfford: canB },
    { x: _passX, y: _passY - 10, w: _passW, h: _passH, choice: 'PASS', canAfford: true },
  ];

  ctx.restore();
}

function _applyEventXp(def, xp) {
  def.xp = (def.xp ?? 0) + xp;
  for (let lvl = CAREER_XP.length - 1; lvl >= 0; lvl--) {
    if (def.xp >= CAREER_XP[lvl]) { def.careerLevel = lvl; break; }
  }
}

function applyCampaignEventChoice(eventId, choice) {
  if (!_campaignState) return;
  const cs = _campaignState;
  if (!cs.seenEventIds) cs.seenEventIds = [];
  cs.seenEventIds.push(eventId);
  const _goldBefore = goldReserve;

  if (choice === 'B') {
    if (eventId === 'volva') {
      cs.goldReserve = (cs.goldReserve ?? 0) - 8;
      goldReserve    = cs.goldReserve;
    } else if (eventId === 'smeden') {
      cs.goldReserve = (cs.goldReserve ?? 0) - 12;
      goldReserve    = cs.goldReserve;
      const youngest = _roster.defenders.slice().sort((a, b) => (a.battlesPlayed ?? 0) - (b.battlesPlayed ?? 0))[0];
      if (youngest) _applyEventXp(youngest, 15);
    } else if (eventId === 'leidangr') {
      cs.goldReserve = (cs.goldReserve ?? 0) - 8;
      goldReserve    = cs.goldReserve;
    } else if (eventId === 'blotet') {
      cs.goldReserve = (cs.goldReserve ?? 0) - 20;
      goldReserve    = cs.goldReserve;
      const topDef   = _roster.defenders.slice().sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))[0];
      if (topDef) _applyEventXp(topDef, 20);
    } else if (eventId === 'runstenen') {
      stars    = Math.min(10, (stars ?? 0) + 1);
      cs.stars = stars;
    }
    // handelsman B, skalden B, utilegumadr B: no effect
  } else {
    if (eventId === 'handelsman') {
      cs.goldReserve = (cs.goldReserve ?? 0) - 60;
      goldReserve    = cs.goldReserve;
      const itemKeys = Object.keys(ITEM_DEFS).filter(k => ['common', 'rare'].includes(ITEM_DEFS[k].rarity));
      const itemId   = itemKeys[Math.floor(Math.random() * itemKeys.length)];
      _equipmentInventory.push(itemId);
      cs.equipmentInventory = _equipmentInventory.slice();
      sfxLootDrop();
    } else if (eventId === 'volva') {
      stars    = Math.max(0, (stars ?? 0) - 2);
      cs.stars = stars;
      const traitless = _roster.defenders.find(d => !d.trait);
      if (traitless) traitless.trait = getRandomTrait(traitless.type);
      sfxRune();
    } else if (eventId === 'smeden') {
      cs.goldReserve = (cs.goldReserve ?? 0) - 35;
      goldReserve    = cs.goldReserve;
      const top3     = _roster.defenders.slice().sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0)).slice(0, 3);
      for (const d of top3) _applyEventXp(d, 20);
    } else if (eventId === 'skalden') {
      cs.goldReserve  = (cs.goldReserve ?? 0) - 25;
      goldReserve     = cs.goldReserve;
      const topKiller = _roster.defenders.slice().sort((a, b) => (b.careerKills ?? 0) - (a.careerKills ?? 0))[0];
      if (topKiller) _applyEventXp(topKiller, 60);
    } else if (eventId === 'leidangr') {
      cs.goldReserve = (cs.goldReserve ?? 0) - 20;
      goldReserve    = cs.goldReserve;
      const heroTypes = HERO_BUILD_ITEMS.map(h => h.type);
      const type      = heroTypes[Math.floor(Math.random() * heroTypes.length)];
      const def       = new Defender({ defenderId: _generateId(), name: getDefenderName(type), type });
      def.trait       = getRandomTrait(type);
      _roster.defenders.push(def);
      sfxRecruit(type);
    } else if (eventId === 'blotet') {
      cs.goldReserve = (cs.goldReserve ?? 0) - 50;
      goldReserve    = cs.goldReserve;
      for (const d of _roster.defenders) _applyEventXp(d, 25);
    } else if (eventId === 'utilegumadr') {
      cs.goldReserve = (cs.goldReserve ?? 0) - 35;
      goldReserve    = cs.goldReserve;
      stars          = Math.max(0, (stars ?? 0) - 1);
      cs.stars       = stars;
      const heroTypes   = HERO_BUILD_ITEMS.map(h => h.type);
      const type        = heroTypes[Math.floor(Math.random() * heroTypes.length)];
      const def         = new Defender({ defenderId: _generateId(), name: getDefenderName(type), type });
      def.xp            = CAREER_XP[1];
      def.careerLevel   = 1;
      def.trait         = getRandomTrait(type);
      const scarOptions = ['lone_stand', 'mark_last_hour', 'rampart_wound'];
      def.scars         = [scarOptions[Math.floor(Math.random() * scarOptions.length)]];
      _roster.defenders.push(def);
      sfxRecruit(type);
    } else if (eventId === 'runstenen') {
      stars    = Math.max(0, (stars ?? 0) - 3);
      cs.stars = stars;
      const strongest = _roster.defenders.slice().sort((a, b) => (b.xp ?? 0) - (a.xp ?? 0))[0];
      if (strongest) {
        const talLevels = Object.keys(CLASS_TALENTS[strongest.type] ?? {}).map(Number).sort((a, b) => a - b);
        const nextLvl   = talLevels.find(lvl => {
          const talId = CLASS_TALENTS[strongest.type][lvl];
          return !(strongest.talents ?? []).includes(talId);
        });
        if (nextLvl !== undefined) {
          const talId = CLASS_TALENTS[strongest.type][nextLvl];
          if (!strongest.talents) strongest.talents = [];
          if (!strongest.talents.includes(talId)) strongest.talents.push(talId);
          sfxTalentUnlock();
        }
      }
    }
  }

  cs.defenders          = _roster.toJSON();
  const _goldAfter      = goldReserve;
  cs.goldReserve        = goldReserve;
  try { saveCampaign(cs); } catch {}
  // Show floater for gold spent on this event choice
  if (_goldBefore !== undefined && _goldAfter < _goldBefore) {
    const _spent = _goldBefore - _goldAfter;
    dmgFloaters.push({
      x: BASE_W / 2, y: GRID_TOP - 10,
      val: `−${_spent}g reserve`, life: 150, maxLife: 150,
      color: '#d0a040', large: false, suffix: '', vy: -0.4, raw: true,
    });
  }
  _lastResolvedEventTitle = _pendingCampaignEvent?.title ?? null;
  const _spent = _goldBefore !== undefined && goldReserve < _goldBefore ? _goldBefore - goldReserve : 0;
  _eventOutcomeToast = {
    text: _spent > 0 ? `${_lastResolvedEventTitle} — −${_spent}g reserve` : `${_lastResolvedEventTitle} resolved`,
    timer: 120,
    color: UI_COLORS.gold,
  };
  _pendingCampaignEvent = null;
  sfxEventResolve();
}

/** Campaign War Camp backdrop — hearth warmth; evolves with fortress upgrades. */
function drawWarCampBackdrop(fortressUpgrades = {}) {
  const W = BASE_W, H = BASE_H;
  const top = META_SCREEN_TOP;
  const tier = Object.values(fortressUpgrades).reduce((s, v) => s + (v ?? 0), 0);
  const warm = Math.min(1, 0.35 + tier * 0.08);
  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, '#0c0818');
  g.addColorStop(0.45, `rgb(${12 + tier}, ${8 + tier}, ${14 + tier * 2})`);
  g.addColorStop(1, '#080610');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, H - top);

  const t = performance.now() * 0.001;
  const hearthX = W * 0.58;
  const hearthY = top + (H - top) * 0.52;
  const pulse = 0.55 + Math.sin(t * 1.4) * 0.12;
  const glow = ctx.createRadialGradient(hearthX, hearthY, 0, hearthX, hearthY, 180 + tier * 12);
  glow.addColorStop(0, `rgba(200,120,50,${warm * pulse})`);
  glow.addColorStop(0.45, `rgba(120,60,30,${0.06 + tier * 0.02})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, top, W, H - top);

  ctx.fillStyle = 'rgba(30,20,12,0.35)';
  ctx.fillRect(hearthX - 48 - tier * 4, hearthY + 8, 96 + tier * 8, 28);
  ctx.fillStyle = 'rgba(50,32,18,0.5)';
  ctx.beginPath();
  ctx.moveTo(hearthX - 36 - tier * 2, hearthY + 8);
  ctx.lineTo(hearthX - 28, hearthY - 22 - tier * 3);
  ctx.lineTo(hearthX + 28 + tier * 2, hearthY - 22 - tier * 2);
  ctx.lineTo(hearthX + 36 + tier * 4, hearthY + 8);
  ctx.closePath();
  ctx.fill();
  if (tier >= 2) {
    ctx.fillStyle = 'rgba(40,28,18,0.45)';
    ctx.fillRect(hearthX - 90, hearthY - 8, 36, 22);
    ctx.fillStyle = 'rgba(60,45,25,0.5)';
    ctx.beginPath();
    ctx.moveTo(hearthX - 82, hearthY - 8);
    ctx.lineTo(hearthX - 74, hearthY - 24);
    ctx.lineTo(hearthX - 58, hearthY - 24);
    ctx.lineTo(hearthX - 50, hearthY - 8);
    ctx.closePath();
    ctx.fill();
  }
  if (tier >= 4) {
    ctx.strokeStyle = 'rgba(140,160,180,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hearthX + 52, hearthY - 18, 24, 32);
    ctx.fillStyle = 'rgba(80,90,100,0.2)';
    ctx.fillRect(hearthX + 56, hearthY - 28, 8, 12);
  }
  ctx.fillStyle = `rgba(255,140,50,${0.25 + pulse * 0.2 + tier * 0.03})`;
  ctx.beginPath();
  ctx.arc(hearthX, hearthY - 6, 5 + Math.sin(t * 2.2) * 1.5 + tier * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBetweenBattles() {
  _betweenBtns = [];
  const W = BASE_W, H = BASE_H;

  // W100 Campaign Victory overlay — shown once, dismissed by click
  if (_campaignVictoryScreen) {
    drawCampaignVictoryOverlay();
    return;
  }

  // Fade-in on screen entry
  const fadeAlpha = _betweenFadeIn > 0
    ? Math.min(1, (30 - _betweenFadeIn) / 20)
    : 1;
  if (_betweenFadeIn > 0) _betweenFadeIn--;
  ctx.save();
  ctx.globalAlpha = fadeAlpha;

  drawBtAmbientParticles();
  tickEquipCeremony();

  if (isCampaignWarCamp()) {
    drawWarCampBackdrop(_campaignState?.fortressUpgrades ?? {});
  } else {
    const t = performance.now() * 0.001;
    for (const s of STARS) {
      const sx = s.x * W, sy = s.y * H;
      const alpha = 0.25 + Math.sin(t * 0.4 + s.phase) * 0.18;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,255,${alpha})`;
      ctx.fill();
    }
    for (let _p = 0; _p < 24; _p++) {
      const _seed = _p * 2.39996;
      const _speed = 0.035 + (_p % 4) * 0.015;
      const _px = (Math.cos(_seed * 3.7) * 0.5 + 0.5) * W;
      const _py = ((Math.sin(_seed * 2.1) * 0.5 + 0.5 + t * _speed) % 1.0) * H;
      const _alpha = 0.12 + Math.sin(t * 0.5 + _seed) * 0.08;
      const _isEmber = _p % 6 === 0;
      ctx.beginPath();
      ctx.arc(_px, _py, _isEmber ? 1.8 : 1.2, 0, Math.PI * 2);
      ctx.fillStyle = _isEmber ? `rgba(240,140,60,${_alpha})` : `rgba(200,220,255,${_alpha})`;
      ctx.fill();
    }
  }

  const isVictory = _battleResult === 'victory';

  // ── LEFT PANEL: Battle summary ──────────────────────────────
  const _contentBot = H - FRAME_THICK - 8;
  const lpX = FRAME_THICK + 4, lpY = META_SCREEN_TOP, lpW = 300, lpH = _contentBot - META_SCREEN_TOP;
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

  // Campaign total progress line
  {
    const _cBattles = battlesCompleted;
    const _cWaves   = (_campaignState?.chronicle?.battles ?? []).reduce((s, b) => s + (b.waveCount ?? b.waves ?? 0), 0);
    const _cKills   = _roster.defenders.reduce((s, d) => s + (d.careerKills ?? 0), 0);
    const _bits2 = [`${_cBattles}B`];
    if (_cWaves > 0) _bits2.push(`${_cWaves}W`);
    if (_cKills > 0) _bits2.push(`${_cKills}K`);
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(140,120,75,0.40)';
    ctx.fillText(`Campaign: ${_bits2.join(' · ')}`, lcx, lpY + 68);
  }

  lpSep(lpY + 76);

  // Battle stats — cursor layout (no fixed Y collisions)
  let _ly = lpY + 88;
  const _lpLine = (text, color = 'rgba(200,170,100,0.8)', font = '11px monospace', center = true) => {
    ctx.font = font;
    ctx.fillStyle = color;
    if (center) ctx.textAlign = 'center';
    ctx.fillText(text, lcx, _ly);
    if (center) ctx.textAlign = 'center';
    _ly += parseInt(font, 10) + 6;
  };

  _lpLine(isCampaignWarCamp()
    ? `Assault waves: ${waveNumber}${_nodeWavePlan ? ` / ${_nodeWavePlan.waves.length}` : ''}`
    : `Waves cleared: ${waveNumber}`, '#e8c040');
  if (isCampaignWarCamp() && _lastAssaultCasualtyCount > 0 && isVictory) {
    _lpLine(`⚔ ${_lastAssaultCasualtyCount} fallen — rally at deploy slots`, 'rgba(255,120,100,0.85)', '8px monospace');
  }
  if (goldStolen > 0) {
    _lpLine(`Gold plundered: −${goldStolen}g`, '#ff9040', '9px monospace');
  }
  _lpLine(`Enemies slain: ${slain}`);
  _lpLine(`Gold earned: +${goldEarned}g  (+${_reserveContrib}g reserve)`);
  _lpLine(`✦ ${stars} stars${_starsEarnedThisBattle > 0 ? ` (+${_starsEarnedThisBattle})` : ''}  ·  ◆ ${goldReserve}g reserve`, '#f0d040', '10px monospace');
  if (flawlessCount > 0) {
    _lpLine(`★ ${flawlessCount} flawless wave${flawlessCount !== 1 ? 's' : ''}`, 'rgba(200,200,100,0.55)', '8px monospace');
  }
  {
    const _bondCount = (_campaignState?.bonds ?? []).length;
    const _bits = [];
    if (_bondCount > 0) _bits.push(`⚭ ${_bondCount} bond${_bondCount !== 1 ? 's' : ''}`);
    if (_lastResolvedEventTitle) _bits.push(`⚑ ${_lastResolvedEventTitle}`);
    if (_bits.length > 0) _lpLine(_bits.join('  ·  '), 'rgba(180,150,100,0.55)', '8px monospace');
  }
  if (isCampaignWarCamp() && _campaignMapIndex != null) {
    const _na = getNextAvailableAssault(ensureCampaignProgress(), _campaignMapIndex, null);
    const _nai = _na ? getAssaultInfo(_campaignMapIndex, _na.nodeIndex) : null;
    if (_nai) {
      _lpLine(`Next assault: ${_nai.codename} (${_nai.tierLabel})`, 'rgba(160,200,140,0.72)', '8px monospace');
    }
    const _wcMeta = loadPrepFieldMeta(getMapRun(ensureCampaignProgress(), _campaignMapIndex).fieldState);
    if (_wcMeta.westGateScarred && !_wcMeta.westGateRepaired) {
      _lpLine('West gate scarred — mend in fortress prep', 'rgba(220,140,60,0.72)', '8px monospace');
    } else if (_wcMeta.westGateRepaired) {
      _lpLine('West gate bears a patch', 'rgba(140,180,120,0.60)', '8px monospace');
    }
    if (_wcMeta.wood > 0) {
      _lpLine(`Salvage wood: ▣ ${_wcMeta.wood}`, 'rgba(160,130,90,0.70)', '8px monospace');
    }
  } else {
    const _damagedWalls = Object.values(wallData).filter(w => !w.temporary && w.hp < w.maxHp);
    if (_damagedWalls.length > 0) {
      _lpLine(`⚠ ${_damagedWalls.length} gate${_damagedWalls.length !== 1 ? 's' : ''} damaged`, 'rgba(220,140,60,0.65)', '8px monospace');
    }
  }
  if (isCampaignWarCamp() && goldReserve > 0) {
    const _fu = getNextFortressUpgradeOffer(_campaignState?.fortressUpgrades ?? {}, goldReserve);
    if (_fu) {
      _lpLine(`Fortress: ${ _fu.label } → L${_fu.nextLevel} (${_fu.cost}g)`, 'rgba(140,200,140,0.70)', '8px monospace');
    }
  }
  if (goldReserve > 0 && isCampaignWarCamp()) {
    const wcCost = getWarChestCost(false);
    const eliteCost = getWarChestCost(true);
    if (goldReserve >= wcCost) {
      const wcW = 140, wcH = 20;
      const wcX = lcx - wcW / 2, wcY = _ly;
      drawFantasyPanel(wcX, wcY, wcW, wcH, 'rgba(20,30,14,0.95)', 0.65, 4);
      ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#90c070';
      ctx.fillText(`WAR CHEST −${wcCost}g`, lcx, wcY + 13);
      _betweenBtns.push({ x: wcX, y: wcY, w: wcW, h: wcH, action: 'warChestDonate' });
      _ly += wcH + 6;
    }
    if (goldReserve >= eliteCost) {
      const ecW = 168, ecH = 20;
      const ecX = lcx - ecW / 2;
      drawFantasyPanel(ecX, _ly, ecW, ecH, 'rgba(28,22,8,0.95)', 0.65, 4);
      ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#e8c060';
      ctx.fillText(`GRAND CHEST −${eliteCost}g (+1 ✦)`, lcx, _ly + 13);
      _betweenBtns.push({ x: ecX, y: _ly, w: ecW, h: ecH, action: 'warChestElite' });
      _ly += ecH + 8;
    }
  }

  lpSep(_ly);
  _ly += 14;

  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(160,140,100,0.6)';
  ctx.fillText('TOP HEROES THIS BATTLE', lcx, _ly);
  _ly += 16;

  const top3 = getBattleHeroStats()
    .sort((a, b) => ((b.killCount || 0) + (b.damageDealt || 0) * 0.02) -
                    ((a.killCount || 0) + (a.damageDealt || 0) * 0.02))
    .slice(0, 3);

  if (top3.length === 0) {
    ctx.fillStyle = 'rgba(120,100,70,0.5)';
    ctx.fillText('none deployed', lcx, _ly);
    _ly += 18;
  } else {
    const icons = ['★', '·', '·'];
    top3.forEach((stat, i) => {
      const def2   = TOWER_DEFS[stat.type];
      const lvlTag = stat._careerLevel > 0 ? ` [${ROMAN[stat._careerLevel] ?? ''}]` : '';
      ctx.font      = i === 0 ? 'bold 11px monospace' : '10px monospace';
      const topRgb  = defenderGlowRgb(stat);
      ctx.fillStyle = `rgba(${topRgb},${i === 0 ? 0.95 : 0.78})`;
      if (i === 0) { ctx.shadowColor = `rgba(${topRgb},0.55)`; ctx.shadowBlur = 4; }
      ctx.fillText(`${icons[i]} ${stat.name}${lvlTag}  ☠${stat.killCount ?? 0}`, lcx, _ly);
      ctx.shadowBlur = 0;
      _ly += 14;
      if (i === 0) {
        ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.5)';
        ctx.fillText(def2?.label ?? stat.type, lcx, _ly);
        _ly += 12;
      }
    });
  }

  let postTop3Y = _ly + 6;

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
      const _promotedCount = _battleXpData.filter(d => d.newLevel > d.oldLevel).length;
      const _xpLabel = _promotedCount > 0
        ? `HERO XP  ·  ${_promotedCount} PROMOTED`
        : 'HERO XP';
      ctx.font = '9px monospace'; ctx.fillStyle = _promotedCount > 0 ? 'rgba(240,200,60,0.65)' : 'rgba(140,120,90,0.55)';
      ctx.fillText(_xpLabel, lcx, xpY0 + 12);
      let ey = xpY0 + 25;
      for (const { name, xpGained, oldLevel, newLevel, defType, defenderId } of _battleXpData) {
        if (ey + 12 > btnsTopLimit) break;
        const leveled  = newLevel > oldLevel;
        const lvlStr   = leveled ? `  ▲ Lv ${ROMAN[newLevel] ?? newLevel}` : '';
        const _bondRec  = (_campaignState?.bonds ?? []).find(b => b.defenderIds.includes(defenderId));
        const _bondPartId = _bondRec ? _bondRec.defenderIds.find(id => id !== defenderId) : null;
        const _bondPartName = _bondPartId ? (_roster.find(_bondPartId)?.name ?? '?').slice(0, 8) : null;
        const _bondSfx  = _bondRec ? `  ⚭${_bondPartName ? ' ' + _bondPartName : ''}` : '';
        ctx.font = leveled ? 'bold 9px monospace' : '9px monospace';
        ctx.fillStyle = leveled ? '#f0d060' : 'rgba(180,160,110,0.65)';
        if (leveled) { ctx.shadowColor = 'rgba(240,200,60,0.45)'; ctx.shadowBlur = 4; }
        ctx.fillText(`${name}  +${xpGained}xp${lvlStr}${_bondSfx}`, lcx, ey);
        ctx.shadowBlur = 0;
        ey += 13;
        // Talent unlock line when leveling up to a talent threshold
        if (leveled && defType) {
          const _talId = CLASS_TALENTS[defType]?.[newLevel];
          if (_talId) {
            const _talDef = TALENT_DEFS[_talId];
            if (_talDef && ey + 11 < btnsTopLimit) {
              ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(200,180,80,0.60)';
              ctx.fillText(`  ⚔ ${_talDef.label} unlocked`, lcx, ey);
              ey += 10;
            }
          }
        }
      }
    }
  }

  ctx.restore();

  // ── Battle Report — Chronicle prose for this battle ───────────────────────
  {
    const _chron = _campaignState?.chronicle;
    const _latestReport = _chron?.battles?.at(-1);
    if (_latestReport?.prose) {
      const reportAreaTop  = lpY + lpH - 162;
      const reportAreaBot  = lpY + lpH - 52;
      const reportAvailH   = reportAreaBot - reportAreaTop;

      // Section separator + label
      ctx.strokeStyle = 'rgba(140,110,60,0.28)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(lpX + 12, reportAreaTop); ctx.lineTo(lpX + lpW - 12, reportAreaTop); ctx.stroke();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(160,130,80,0.55)';
      ctx.fillText('THE CHRONICLE', lcx, reportAreaTop + 12);

      // Prose — word-wrapped at 8px monospace into the available width
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      const _proseX   = lpX + 14;
      const _proseW   = lpW - 28;
      const _proseLines = wrapText(ctx, _latestReport.prose, _proseW);
      const _lineH    = 12;
      const _maxLines = Math.floor((reportAvailH - 18) / _lineH);
      let _py = reportAreaTop + 23;
      const _truncated = _proseLines.length > _maxLines;
      for (let _li = 0; _li < Math.min(_proseLines.length, _maxLines); _li++) {
        const _isLast = _li === _proseLines.length - 1 || _li === _maxLines - 1;
        ctx.fillStyle = _isLast ? 'rgba(190,165,115,0.45)' : 'rgba(190,165,115,0.75)';
        ctx.fillText(_proseLines[_li], _proseX, _py);
        _py += _lineH;
      }
      if (_truncated) {
        ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(180,150,80,0.38)'; ctx.textAlign = 'right';
        ctx.fillText('→ see Chronicle for full entry', _proseX + _proseW, _py + 2);
        ctx.textAlign = 'left';
      }
      ctx.restore();
    }
  }

  // Buttons at bottom of left panel
  const btnW = 130, btnH = 34, btnGap = 10;
  const btnsY = lpY + lpH - 50;
  const b1x = lcx - btnW - btnGap / 2;
  const b2x = lcx + btnGap / 2;

  if (isCampaignWarCamp()) {
    const _nextNode = _pendingNextAssaultNode;
    const _prepNode = _nextNode ?? (_battleResult === 'defeat' ? _campaignNodeIndex : null);
    const _assaultInfo = getAssaultInfo(_campaignMapIndex, _campaignNodeIndex);
    let _btnSlot = 0;

    if (_prepNode != null) {
      const _prepDefeat = _battleResult === 'defeat' && _nextNode == null;
      drawFantasyPanel(b1x, btnsY, btnW, btnH,
        _prepDefeat ? 'rgba(40,16,16,0.97)' : 'rgba(8,26,8,0.97)', 0.75, 6);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = _prepDefeat ? '#e08060' : '#88ee66';
      ctx.shadowColor = _prepDefeat ? 'rgba(220,100,60,0.5)' : 'rgba(100,220,80,0.5)';
      ctx.shadowBlur = 8;
      ctx.fillText('PREPARE FORTRESS →', b1x + btnW / 2, btnsY + 22);
      ctx.restore();
      _betweenBtns.push({
        x: b1x, y: btnsY, w: btnW, h: btnH,
        action: _prepDefeat ? 'retryAssault' : 'nextAssault',
        nodeIndex: _prepNode,
      });
      _btnSlot++;
    }

    const _mapX = _btnSlot > 0 ? b2x : lcx - btnW / 2;
    drawFantasyPanel(_mapX, btnsY, btnW, btnH, 'rgba(12,8,4,0.97)', 0.7, 6);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#c0a060';
    ctx.shadowColor = 'rgba(180,140,60,0.45)'; ctx.shadowBlur = 6;
    ctx.fillText('COMMAND MAP', _mapX + btnW / 2, btnsY + 22);
    ctx.restore();
    _betweenBtns.push({ x: _mapX, y: btnsY, w: btnW, h: btnH, action: 'commandMap' });

    if (_assaultInfo) {
      ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(140,120,80,0.55)';
      const _hint = _prepNode != null
        ? 'Roster in tabs above · then prepare the fortress & sound the horn.'
        : 'Region secured — return to the command map.';
      ctx.fillText(_hint, lcx, btnsY - 6);
    }
  } else {
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
  }

  // Chronicle button — small, below the two main buttons
  const chronicleBtnH = 24, chronicleBtnW = btnW * 2 + btnGap;
  const cbX = b1x, cbY = btnsY + btnH + 6;
  const _hasChronicle = (_campaignState?.chronicle?.battles?.length ?? 0) > 0;
  if (_hasChronicle) {
    const _isFirstChronicle = _campaignState.chronicle.battles.length === 1;
    drawFantasyPanel(cbX, cbY, chronicleBtnW, chronicleBtnH, 'rgba(20,8,36,0.97)', 0.6, 4);
    ctx.save();
    ctx.textAlign = 'center'; ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(180,140,220,0.80)';
    ctx.fillText(`📜 THE CHRONICLE  (${_campaignState.chronicle.battles.length} ${_campaignState.chronicle.battles.length === 1 ? 'battle' : 'battles'})`, cbX + chronicleBtnW / 2, cbY + 16);
    ctx.restore();
    _betweenBtns.push({ x: cbX, y: cbY, w: chronicleBtnW, h: chronicleBtnH, action: 'openChronicle' });
    if (_isFirstChronicle) {
      const _pulse = 0.65 + 0.35 * Math.sin(performance.now() / 420);
      ctx.font = '7px monospace';
      ctx.fillStyle = `rgba(200,160,255,${_pulse.toFixed(2)})`;
      ctx.textAlign = 'center';
      ctx.fillText('↑  NEW ENTRY IN CHRONICLE', cbX + chronicleBtnW / 2, cbY - 4);
      ctx.textAlign = 'left';
    }
    // Notification dot — new battle added this betweenBattles
    {
      const _dotPulse = 0.75 + 0.25 * Math.sin(performance.now() / 300);
      ctx.fillStyle = `rgba(200,120,255,${_dotPulse.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(cbX + chronicleBtnW - 7, cbY + 5, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── RIGHT PANEL: War Camp tabs (one view at a time) ─────────
  const rpX = lpX + lpW + 8, rpY = META_SCREEN_TOP, rpW = W - (lpX + lpW + 8) - 12, rpH = _contentBot - META_SCREEN_TOP;
  _navBtns = [];
  const _bbNavH = drawHorizTabs(rpX, rpY, rpW, WAR_CAMP_TABS, _warCampTab, _navBtns, { pulseId: _warCampTabPulse });
  const rpContentY = rpY + _bbNavH + 4;
  const rpContentH = rpH - _bbNavH - 4;
  const rpY0 = rpContentY;
  const rpH0 = rpContentH;
  drawFantasyPanel(rpX, rpY0, rpW, rpH0, 'rgba(4,2,14,0.97)', 0.88, 10);
  const rix = rpX + 10;
  const riW = rpW - 20;

  ctx.save();
  ctx.textAlign = 'left';

  let _wcCursor = rpY0 + 10;
  const _wcTabHint = {
    warband:  'Manage roster · equip · talents',
    recruit:  `Hire defenders · ${_effectiveRecruitCost}g each`,
    fortress: 'Meta buildings · reserve gold · fortress status',
  };
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#e8c040';
  ctx.fillText(_warCampTab === 'warband' ? 'WARBAND' : _warCampTab === 'recruit' ? 'RECRUIT' : 'FORTRESS', rix, _wcCursor + 10);
  ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(140,120,90,0.55)';
  ctx.fillText(_wcTabHint[_warCampTab] ?? '', rix, _wcCursor + 22);
  _wcCursor += 30;

  if (_warCampTab === 'warband') {
    const rCount = _roster.defenders.length;
    const _wb = analyzeWarband(_roster.defenders);
    const _presetId = _campaignState?.squadPreset ?? 'balanced';
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.55)';
    ctx.fillText(`${rCount} heroes · Tank ${_wb.counts.tank} Sup ${_wb.counts.support} DPS ${_wb.counts.st_dps + _wb.counts.aoe_dps}`, rix, _wcCursor + 8);
    _wcCursor += 14;
    const _pChipW = Math.floor((riW - 8) / SQUAD_PRESETS.length);
    for (let pi = 0; pi < SQUAD_PRESETS.length; pi++) {
      const pr = SQUAD_PRESETS[pi];
      const px = rix + pi * (_pChipW + 2);
      const active = pr.id === _presetId;
      ctx.fillStyle = active ? 'rgba(80,120,50,0.35)' : 'rgba(30,25,15,0.5)';
      ctx.strokeStyle = active ? 'rgba(140,200,80,0.6)' : 'rgba(80,70,40,0.3)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.roundRect(px, _wcCursor, _pChipW, 14, 2); ctx.fill(); ctx.stroke();
      ctx.font = '6px monospace'; ctx.fillStyle = active ? '#b0e080' : 'rgba(160,140,100,0.55)';
      ctx.textAlign = 'center';
      const plbl = pr.label.length > 9 ? pr.label.slice(0, 8) + '…' : pr.label;
      ctx.fillText(plbl, px + _pChipW / 2, _wcCursor + 9);
      ctx.textAlign = 'left';
      _betweenBtns.push({ x: px, y: _wcCursor, w: _pChipW, h: 14, action: 'applyPreset', presetId: pr.id });
    }
    _wcCursor += 20;
  }

  ctx.strokeStyle = 'rgba(180,140,60,0.22)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(rpX + 6, _wcCursor); ctx.lineTo(rpX + rpW - 6, _wcCursor); ctx.stroke();
  _wcCursor += 8;

  // Rune Carver — warband tab, War Camp only; shows when player has stars to spend
  if (_warCampTab === 'warband' && stars > 0) {
    ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#c8a8ff';
    ctx.fillText('✦ RUNE CARVER', rix, _wcCursor + 9);
    ctx.textAlign = 'right'; ctx.font = '8px monospace'; ctx.fillStyle = '#f0d040';
    ctx.fillText(`${stars} ★`, rix + riW, _wcCursor + 9);
    ctx.textAlign = 'left';
    _wcCursor += 14;
    const slotW = Math.floor((riW - (RUNE_DEFS.length - 1) * 3) / RUNE_DEFS.length);
    for (let _ri = 0; _ri < RUNE_DEFS.length; _ri++) {
      const rd = RUNE_DEFS[_ri];
      const count = runeInventory[rd.id] ?? 0;
      const canBuy = stars >= rd.cost && count < rd.maxOwned;
      const rx2 = rix + _ri * (slotW + 3);
      ctx.fillStyle = canBuy ? 'rgba(36,18,58,0.85)' : 'rgba(18,10,28,0.6)';
      ctx.strokeStyle = canBuy ? `rgba(${rd.color ? '180,130,255' : '120,90,180'},0.55)` : 'rgba(70,50,90,0.30)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.roundRect(rx2, _wcCursor, slotW, 30, 2); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = '7px monospace'; ctx.fillStyle = canBuy ? '#c8a8ff' : 'rgba(130,100,170,0.55)';
      const _lbl = rd.label.length > 7 ? rd.symbol : rd.symbol;
      ctx.fillText(rd.symbol, rx2 + slotW / 2, _wcCursor + 10);
      ctx.font = '6px monospace'; ctx.fillStyle = canBuy ? '#f0d040' : 'rgba(150,130,70,0.5)';
      ctx.fillText(`${rd.cost}★`, rx2 + slotW / 2, _wcCursor + 19);
      ctx.fillStyle = count > 0 ? 'rgba(160,200,120,0.7)' : 'rgba(100,90,70,0.45)';
      ctx.fillText(`[${count}/${rd.maxOwned}]`, rx2 + slotW / 2, _wcCursor + 27);
      ctx.textAlign = 'left';
      if (canBuy) {
        _betweenBtns.push({ x: rx2, y: _wcCursor, w: slotW, h: 30, action: 'buyRune', runeId: rd.id, cost: rd.cost });
      }
    }
    _wcCursor += 36;
    ctx.strokeStyle = 'rgba(180,140,60,0.22)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(rpX + 6, _wcCursor); ctx.lineTo(rpX + rpW - 6, _wcCursor); ctx.stroke();
    _wcCursor += 8;
  }

  // Promotion banner — warband tab only
  let _promoBannerH = 0;
  if (_warCampTab === 'warband' && _promotionQueue.length > 0) {
    if (_promoBannerTimer <= 0) _promoBannerTimer = 600;
    _promoBannerTimer--;
    if (_promoBannerTimer <= 0) { _promotionQueue.shift(); _promoBannerTimer = 0; }

    if (_promotionQueue.length > 0) {
      _promoBannerH = 36;
      const prom   = _promotionQueue[0];
      const pbX    = rix - 2, pbY = _wcCursor, pbW = riW + 4, pbH = _promoBannerH;
      const pbCol  = prom.type === 'scar'      ? 'rgba(200,80,30,0.18)'   :
                     prom.type === 'bond'      ? 'rgba(130,90,200,0.18)'  :
                     prom.type === 'milestone' ? 'rgba(60,60,80,0.12)'    : 'rgba(60,130,60,0.18)';
      const pbBdr  = prom.type === 'scar'      ? 'rgba(200,100,50,0.55)'  :
                     prom.type === 'bond'      ? 'rgba(140,100,220,0.55)' :
                     prom.type === 'milestone' ? 'rgba(140,130,80,0.38)'  : 'rgba(100,200,100,0.55)';
      ctx.fillStyle = pbCol; ctx.strokeStyle = pbBdr; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.roundRect(pbX, pbY, pbW, pbH, 4); ctx.fill(); ctx.stroke();

      // Countdown progress bar along the bottom edge
      const _cdFrac = _promoBannerTimer / 600;
      ctx.fillStyle = pbBdr.replace('0.55', '0.30');
      ctx.fillRect(pbX + 2, pbY + pbH - 3, (pbW - 4) * _cdFrac, 2);

      // Left accent bar (3px) — color per type
      const _accentColor = prom.type === 'scar'      ? 'rgba(200,100,60,0.8)'  :
                           prom.type === 'bond'      ? 'rgba(160,100,220,0.8)' :
                           prom.type === 'milestone' ? 'rgba(140,130,80,0.6)'  : 'rgba(80,180,80,0.8)';
      ctx.fillStyle = _accentColor;
      ctx.fillRect(pbX, pbY, 3, pbH);

      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = prom.type === 'scar'      ? '#e87050'  :
                      prom.type === 'bond'      ? '#c0a0ff'  :
                      prom.type === 'milestone' ? '#b8a870'  : '#88dd80';
      ctx.textAlign = 'left';
      const _promIcon = prom.type === 'milestone' ? '◆' : '⬆';
      ctx.fillText(`${_promIcon}  ${prom.rankLabel}`, rix + 4, pbY + 13);
      ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(200,180,150,0.75)';
      const _promText = prom.text ?? `${prom.defenderName}: ${prom.rankLabel}`;
      ctx.fillText(_promText.length > 55 ? _promText.slice(0, 52) + '…' : _promText, rix + 4, pbY + 25);

      // [×] dismiss button + queue count
      const ackW = 20, ackH = 14;
      const ackX = rpX + rpW - 12 - ackW, ackY = pbY + 4;
      ctx.fillStyle = 'rgba(30,20,20,0.85)'; ctx.strokeStyle = pbBdr; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.roundRect(ackX, ackY, ackW, ackH, 3); ctx.fill(); ctx.stroke();
      ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(220,160,140,0.8)'; ctx.textAlign = 'center';
      ctx.fillText('×', ackX + ackW / 2, ackY + 10);
      ctx.textAlign = 'left';
      _betweenBtns.push({ x: ackX, y: ackY, w: ackW, h: ackH, action: 'ackPromotion' });
      if (_promotionQueue.length > 1) {
        ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.55)';
        ctx.textAlign = 'right';
        ctx.fillText(`${_promotionQueue.length - 1} more`, ackX - 3, ackY + 10);
        ctx.textAlign = 'left';
      }
      _wcCursor += _promoBannerH + 6;
    }
  }

  if (_warCampTab === 'warband') {
  const listTop  = _wcCursor;
  const listBot  = rpY0 + rpH0 - 6;
  const listH    = Math.max(40, listBot - listTop);
  const rowH     = 72;
  const maxRows  = Math.max(1, Math.floor(listH / rowH));

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
    const isRenaming  = _renameState?.defenderId === def.defenderId;
    const _cardBond = (_campaignState?.bonds ?? []).find(b => b.defenderIds.includes(def.defenderId));
    // Bonded defender: warm amber tint on card background
    ctx.fillStyle = _cardBond ? 'rgba(200,150,50,0.07)' : (i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent');
    ctx.fillRect(rpX + 4, ry, rpW - 8, rowH - 2);
    if (_cardBond) {
      ctx.strokeStyle = 'rgba(180,140,60,0.22)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.roundRect(rpX + 4, ry, rpW - 8, rowH - 2, 2); ctx.stroke();
    }
    if (isRenaming) {
      ctx.strokeStyle = 'rgba(255,180,40,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(rpX + 4, ry, rpW - 8, rowH - 2, 2); ctx.stroke();
    }
    if (_equipFlash?.defenderId === def.defenderId && _equipFlash.timer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, _equipFlash.timer / 28) * 0.75;
      ctx.strokeStyle = _equipFlash.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = _equipFlash.color;
      ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.roundRect(rpX + 4, ry, rpW - 8, rowH - 2, 3); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    const tDef    = TOWER_DEFS[def.type];
    const glow    = tDef?.glowRgb ?? '180,150,80';
    const lvlStr  = def.careerLevel > 0 ? ` [${ROMAN[def.careerLevel] ?? '?'}]` : '';
    const defRank = getRank(def);
    const isChampionPlus = ['champion','ironguard','legend'].includes(defRank.id);

    // Name + level
    const hasName     = Boolean(def.name?.trim());
    const displayName = isRenaming
      ? _renameState.draft + (Math.floor(performance.now() / 450) % 2 === 0 ? '|' : '')
      : hasName ? `${def.name}${lvlStr}`
      : '— unnamed —';
    ctx.font = 'bold 11px monospace';
    if (isRenaming) {
      ctx.fillStyle = 'rgba(255,220,100,0.95)';
      ctx.shadowColor = 'rgba(255,200,60,0.5)'; ctx.shadowBlur = 4;
      ctx.fillText(displayName, rix, ry + 14);
      ctx.shadowBlur = 0;
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(200,160,60,0.55)';
      ctx.fillText('Enter confirm · Esc cancel', rix, ry + 24);
    } else if (!hasName) {
      ctx.fillStyle = 'rgba(130,120,100,0.45)';
      ctx.fillText(displayName, rix, ry + 14);
    } else {
      drawDefenderName(displayName, rix, ry + 14, def.type, 0.95);
      // Bond tag — amber ⚭ after name if defender is bonded
      if (_cardBond) {
        const _nameW = ctx.measureText(displayName).width;
        ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(200,160,60,0.70)';
        ctx.fillText('⚭', rix + _nameW + 4, ry + 14);
      }
    }

    // 📜 BIO button (far right, ry+4)
    const bioW = 18, bioH = 12;
    const bioX = rpX + rpW - 12 - bioW;
    const bioY2 = ry + 4;
    ctx.fillStyle = 'rgba(30,20,40,0.7)'; ctx.strokeStyle = 'rgba(120,90,180,0.35)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.roundRect(bioX, bioY2, bioW, bioH, 2); ctx.fill(); ctx.stroke();
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(160,130,200,0.65)'; ctx.textAlign = 'center';
    ctx.fillText('📜', bioX + bioW / 2, bioY2 + 9);
    ctx.textAlign = 'left';
    _betweenBtns.push({ x: bioX, y: bioY2, w: bioW, h: bioH, action: 'openBio', defenderId: def.defenderId });

    // ✏ rename — always for unnamed; edit for named / promoted
    const rnW = 18, rnH = 12, rnX = bioX - 22, rnY = ry + 4;
    if (!hasName || hasName || def.careerLevel >= 1) {
      const rnLabel = !hasName ? '✎' : '✏';
      ctx.fillStyle   = isRenaming ? 'rgba(80,60,10,0.9)' : (!hasName ? 'rgba(60,45,8,0.85)' : 'rgba(40,35,15,0.6)');
      ctx.strokeStyle = isRenaming ? 'rgba(255,200,60,0.7)' : (!hasName ? 'rgba(255,200,60,0.55)' : 'rgba(120,100,40,0.3)');
      ctx.lineWidth   = 0.8;
      ctx.beginPath(); ctx.roundRect(rnX, rnY, rnW, rnH, 2); ctx.fill(); ctx.stroke();
      ctx.font = '7px monospace'; ctx.fillStyle = isRenaming ? '#ffd040' : 'rgba(160,140,60,0.55)';
      ctx.textAlign = 'center';
      ctx.fillText(rnLabel, rnX + rnW / 2, rnY + 9);
      ctx.textAlign = 'left';
      _betweenBtns.push({ x: rnX, y: rnY, w: rnW, h: rnH, action: 'startRename', defenderId: def.defenderId });
    }

    // Rank · class · title line (ry+26)
    const _rTitle = getPrimaryTitle(def);
    const _rankPart  = defRank.id !== 'greenhorn' ? `${defRank.label}  ·  ` : '';
    const _classPart = tDef?.label ?? def.type;
    let _postPart = '';
    if (isCampaignWarCamp() && _campaignMapIndex != null) {
      const _wcPosts = getMapRun(ensureCampaignProgress(), _campaignMapIndex).fieldState?.postAssignments
        ?? _postAssignments ?? {};
      _postPart = `  ·  ${formatDefenderPostBadge(def, _wcPosts)}`;
    }
    const _titlePart = _rTitle ? `  ·  ✦ ${_rTitle.label}` : '';
    const _traitPart = (!_rTitle && def.trait) ? `  ·  ${TRAIT_DEFS[def.trait]?.label ?? def.trait}` : '';
    ctx.font = '8px monospace';
    ctx.fillStyle = _rTitle ? 'rgba(160,130,200,0.65)' : defRank.id !== 'greenhorn' ? (defRank.color ?? 'rgba(160,140,100,0.55)') : 'rgba(160,140,100,0.55)';
    ctx.fillText(`${_rankPart}${_classPart}${_postPart}${_titlePart}${_traitPart}`, rix, ry + 26);

    // XP bar (ry+20)
    const nextXP = CAREER_XP[Math.min(def.careerLevel + 1, CAREER_XP.length - 1)];
    const prevXP = CAREER_XP[def.careerLevel] ?? 0;
    const frac   = nextXP > prevXP ? Math.min(1, (def.xp - prevXP) / (nextXP - prevXP)) : 1;
    const barX   = rix + 54;
    const barW   = riW - 58 - 44;
    ctx.fillStyle = 'rgba(60,50,30,0.7)';
    ctx.fillRect(barX, ry + 20, barW, 5);
    ctx.fillStyle = def.careerLevel >= 10 ? '#f0d040' : `rgba(${glow},0.8)`;
    ctx.fillRect(barX, ry + 20, barW * frac, 5);
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.5)'; ctx.textAlign = 'left';
    ctx.fillText(def.careerLevel >= 10 ? 'MAX' : `${def.xp}/${nextXP}xp`, barX + barW + 3, ry + 25);

    // DISMISS button (ry+14)
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

    // Fortress role chip (cycle on click)
    {
      const roleId = def.fortressRole ?? getDefaultFortressRole(def.type);
      const fr = FORTRESS_ROLES[roleId];
      const frX = rix, frY = ry + 48, frW = 78, frH = 12;
      ctx.fillStyle = 'rgba(35,30,18,0.85)'; ctx.strokeStyle = fr?.color ?? 'rgba(120,100,60,0.4)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.roundRect(frX, frY, frW, frH, 2); ctx.fill(); ctx.stroke();
      ctx.font = '7px monospace'; ctx.fillStyle = fr?.color ?? '#c0a060';
      ctx.fillText(`⛊ ${fr?.label ?? roleId}`, frX + 4, frY + 9);
      _betweenBtns.push({ x: frX, y: frY, w: frW, h: frH, action: 'cycleFortressRole', defenderId: def.defenderId });
    }

    // RETIRE button (ry+32) — CHAMPION+ only
    if (isChampionPlus) {
      const rtnX = dX, rtnY = ry + 32, rtnW = dW, rtnH = 14;
      ctx.fillStyle   = 'rgba(20,10,36,0.85)'; ctx.strokeStyle = 'rgba(160,130,200,0.50)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.roundRect(rtnX, rtnY, rtnW, rtnH, 3); ctx.fill(); ctx.stroke();
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(160,130,200,0.75)'; ctx.textAlign = 'center';
      ctx.fillText('RETIRE', rtnX + rtnW / 2, rtnY + 10);
      ctx.textAlign = 'left';
      _betweenBtns.push({ x: rtnX, y: rtnY, w: rtnW, h: rtnH, action: 'openRetire', defenderId: def.defenderId });

      // One-time tooltip: first CHAMPION retire hint
      if (_firstChampionTooltipTimer > 0) {
        const _fadeIn  = Math.min(1, (180 - _firstChampionTooltipTimer) / 12);
        const _fadeOut = _firstChampionTooltipTimer < 30 ? _firstChampionTooltipTimer / 30 : 1;
        const _alpha   = _fadeIn * _fadeOut;
        const ttX = rtnX + rtnW + 4;
        const ttW = 90, ttH = 18;
        ctx.save();
        ctx.globalAlpha = _alpha;
        ctx.fillStyle   = 'rgba(60,40,10,0.92)';
        ctx.strokeStyle = '#e8a040';
        ctx.lineWidth   = 0.8;
        ctx.beginPath(); ctx.roundRect(ttX, rtnY - 2, ttW, ttH, 3); ctx.fill(); ctx.stroke();
        ctx.font      = '7px monospace';
        ctx.fillStyle = '#f0c060';
        ctx.textAlign = 'left';
        ctx.fillText('← RETIRE WITH HONOR', ttX + 4, rtnY + 7);
        ctx.fillStyle = 'rgba(180,150,80,0.75)';
        ctx.fillText('grants legacy bonus', ttX + 4, rtnY + 15);
        ctx.restore();
      }
    }

    // Trait + scars row (ry+36) — replaced by bond grief warning when dismiss is pending
    const _defBond = (_campaignState?.bonds ?? []).find(b => b.defenderIds.includes(def.defenderId));
    const traitDef = def.trait ? TRAIT_DEFS[def.trait] : null;
    const scarLabels = (def.scars ?? []).map(s => SCAR_DEFS[s]?.label ?? s);
    if (isPendingDismiss && _defBond) {
      const _bonded = _roster?.find(_defBond.defenderIds.find(id => id !== def.defenderId));
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(220,80,60,0.82)';
      ctx.fillText(`⚠ ${_bonded?.name ?? '?'} carries Bond Grief`, rix, ry + 36);
    } else if (_defBond && !isPendingDismiss) {
      const _bondPartner = _roster?.find(_defBond.defenderIds.find(id => id !== def.defenderId));
      ctx.font = '7px monospace';
      ctx.fillStyle = 'rgba(200,160,60,0.60)';
      ctx.fillText(`∞ ${_defBond.name ?? 'Bond'} · ${_bondPartner?.name ?? '?'}`, rix, ry + 36);
      if (traitDef) {
        const _bondW = ctx.measureText(`∞ ${_defBond.name ?? 'Bond'} · `).width + 18;
        ctx.fillStyle = 'rgba(140,120,90,0.45)';
        ctx.fillText(traitDef.label, rix + _bondW, ry + 36);
      }
    } else if (traitDef || scarLabels.length) {
      const _traitColors = {
        reckless:'#e08060', steadfast:'#80b0e0', brooding:'#9090c0',
        serene:'#80d0c0',  methodical:'#b0d080', impulsive:'#e0c040',
        vengeful:'#d06080', devout:'#c0a8e0',
      };
      const _traitColor = def.trait ? (_traitColors[def.trait] ?? 'rgba(160,200,160,0.52)') : 'rgba(160,200,160,0.52)';
      ctx.font = '7px monospace';
      const _scarStr = scarLabels.slice(0,2).join(' · ') + (scarLabels.length > 2 ? ` +${scarLabels.length - 2}` : '');
      if (traitDef) {
        ctx.fillStyle = _traitColor;
        ctx.fillText(traitDef.label, rix, ry + 36);
        if (scarLabels.length) {
          const _scarX = rix + ctx.measureText(traitDef.label + '  ·  ').width;
          ctx.fillStyle = 'rgba(200,130,100,0.55)';
          ctx.fillText(_scarStr, _scarX, ry + 36);
        }
      } else if (scarLabels.length) {
        ctx.fillStyle = 'rgba(200,130,100,0.55)';
        ctx.fillText(_scarStr, rix, ry + 36);
      }
    }

    // Equipment chips (compact — no desc text in list)
    const chipSlotW = Math.floor((riW - 6) / 2);
    [0, 1].forEach(slotIdx => {
      const itemId  = def.equipment[slotIdx];
      const itemDef = itemId ? ITEM_DEFS[itemId] : null;
      const cx2     = rix + slotIdx * (chipSlotW + 3);
      const cy2     = ry + 48;
      const cH      = 12;
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
    });

    const talY = ry + 64;
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
      ctx.fillText(`✦ → ${nextTalDef.name}`, rix, talY);
    }

    const _legArr2 = (_campaignState?.legacyBonuses ?? {})[def.type];
    const _legBonus2 = def.legacyBonus ?? (Array.isArray(_legArr2) ? _legArr2[0] : _legArr2);
    if (_legBonus2) {
      const _statLabel = _legBonus2.stat === 'dm' ? '+8% DMG' : _legBonus2.stat === 'rm' ? '+8% RNG' : '−7% CD';
      const _legAlpha  = def.battlesPlayed === 0 ? 0.65 : 0.45;
      ctx.font = '7px monospace'; ctx.fillStyle = `rgba(160,200,160,${_legAlpha})`;
      ctx.fillText(`✦ ${_legBonus2.fromName}'s Legacy (${_statLabel})`, rix + 80, ry + 14);
    }
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

  // Inventory stash hint
  const freeItemCount = _equipmentInventory.length;
  if (freeItemCount > 0 && listBot + 24 < rpY0 + rpH0) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(160,130,60,0.55)';
    ctx.textAlign = 'left';
    ctx.fillText(`◈ ${freeItemCount} item${freeItemCount !== 1 ? 's' : ''} in stash — tap equip chips`, rix, listBot + 12);
  }
  } // end warband tab

  const recY = _wcCursor;

  if (_warCampTab === 'recruit') {
    const _recruitGate = canRecruitInCampaignWarCamp();
    if (!_recruitGate.ok) {
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(160,130,90,0.72)';
      ctx.textAlign = 'center';
      ctx.fillText(_recruitGate.reason, rix + riW / 2, recY + 36);
      ctx.font = '7px monospace';
      ctx.fillStyle = 'rgba(120,100,70,0.5)';
      ctx.fillText('Complete the Settlement Oath on the command map.', rix + riW / 2, recY + 52);
      ctx.textAlign = 'left';
    } else {
    // ── RECRUIT (full panel) ───────────────────────────────────────────────────
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.5)';
    ctx.fillText(`◆ ${goldReserve}g reserve · ${_effectiveRecruitCost}g each`, rix, recY + 10);

    const allTypes = (isCampaignWarCamp() && isFirstSagaMap(_campaignMapIndex))
      ? [{ type: 'valkyrie', short: 'Val' }, { type: 'military', short: 'Arc' }]
      : [
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
    ctx.shadowBlur = 0;
    const _legPending = (_campaignState?.legacyBonuses ?? {})[_recruitType];
    const _legCount = Array.isArray(_legPending) ? _legPending.length : (_legPending ? 1 : 0);
    if (_recruitType && _legCount > 0) {
      ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(200,170,100,0.60)';
      ctx.fillText(`✦ ${_legCount} legacy bonus${_legCount !== 1 ? 'es' : ''} waiting`, rix + riW / 2, rBtnY + rBtnH - 3);
    }
    // Barracks cost reduction hint
    if (_recruitType && _effectiveRecruitCost < RECRUIT_COST) {
      const _discount = RECRUIT_COST - _effectiveRecruitCost;
      ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(96,180,236,0.65)';
      ctx.fillText(`Barracks −${_discount}g`, rix + riW / 2, rBtnY + rBtnH - 3);
    }
    ctx.textAlign = 'left';
    if (canAfford) _betweenBtns.push({ x: rix, y: rBtnY, w: riW, h: rBtnH, action: 'recruit' });

    } // recruit unlocked

  } else if (_warCampTab === 'fortress') {
    // ── FORTRESS NODES (meta buildings — no field layout) ─────────────────────
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(160,140,100,0.5)';
    ctx.fillText(`◆ ${goldReserve}g reserve · fortress upgrades`, rix, recY + 10);

    let _fortStatusY = recY + 22;
    if (isCampaignWarCamp() && _campaignMapIndex != null) {
      const _fMeta = loadPrepFieldMeta(getMapRun(ensureCampaignProgress(), _campaignMapIndex).fieldState);
      ctx.font = '7px monospace';
      if (_fMeta.westGateScarred && !_fMeta.westGateRepaired) {
        ctx.fillStyle = 'rgba(220,140,80,0.72)';
        ctx.fillText('West gate scarred — repair in fortress prep', rix, _fortStatusY);
        _fortStatusY += 11;
      } else if (_fMeta.westGateRepaired) {
        ctx.fillStyle = 'rgba(140,180,120,0.65)';
        ctx.fillText('West gate patched', rix, _fortStatusY);
        _fortStatusY += 11;
      }
      if (_fMeta.wood > 0) {
        ctx.fillStyle = 'rgba(160,130,90,0.70)';
        ctx.fillText(`Salvage wood: ▣ ${_fMeta.wood}`, rix, _fortStatusY);
        _fortStatusY += 11;
      }
    }

    const upgrades  = _campaignState?.fortressUpgrades ?? {};
    const nodeKeys  = ['barracks', 'armory', 'watchtower', 'wallworks', 'treasury'];
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(140,120,90,0.58)';
    ctx.fillText('FORTRESS NODES', rix, _fortStatusY + 10);
    const _nodeBaseY = _fortStatusY + 18;
    {
      const _totalLvls = nodeKeys.reduce((s, k) => s + (upgrades[k] ?? 0), 0);
      const _maxLvls   = nodeKeys.reduce((s, k) => s + (FORTRESS_DEFS[k]?.maxLevel ?? 0), 0);
      if (_maxLvls > 0) {
        ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.40)'; ctx.textAlign = 'right';
        ctx.fillText(`${_totalLvls} / ${_maxLvls} unlocked`, rix + riW, recY + 10);
        ctx.textAlign = 'left';
      }
    }
    const nodeRowH  = 22;
    nodeKeys.forEach((key, i) => {
      const def    = FORTRESS_DEFS[key];
      const lvl    = upgrades[key] ?? 0;
      const maxed  = lvl >= def.maxLevel;
      const cost   = maxed ? 0 : def.cost[lvl];
      const ry2    = _nodeBaseY + i * nodeRowH;

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
        const descIdx = lvl;
        ctx.fillText(`${def.levelDesc[descIdx] ?? ''}`, rix + riW - 52, ry2 + 14);
      }
      ctx.textAlign = 'left';

      ctx.font = '8px monospace';
      ctx.fillStyle = maxed ? 'rgba(240,200,60,0.7)' : 'rgba(160,140,100,0.5)';
      const lvlBadgeX = rix + riW - 50;
      ctx.fillText(maxed ? 'MAX' : `→ L${lvl + 1}`, lvlBadgeX, ry2 + 14);

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
        ctx.fillText(`+${cost}g`, btnX + btnW2 / 2, btnY2 + 7);
        if (goldReserve > 0) {
          const pct = Math.round((cost / goldReserve) * 100);
          ctx.font = '6px monospace';
          ctx.fillStyle = !canBuy ? 'rgba(200,80,60,0.8)' : pct > 60 ? '#e0a040' : 'rgba(120,180,120,0.55)';
          ctx.fillText(`${pct}%`, btnX + btnW2 / 2, btnY2 + 13);
        }
        ctx.textAlign = 'left';
        if (canBuy) _betweenBtns.push({ x: btnX, y: btnY2, w: btnW2, h: btnH2, action: 'upgradeFortress', key });
      }
    });

    // Active bonuses summary — color-coded by type
    const fb = getFortressBonuses(upgrades);
    const _fbTyped = [];  // { text, color }
    if ((fb.startingGoldBonus   ?? 0) > 0) _fbTyped.push({ text: `+${fb.startingGoldBonus}g start`,                   color: '#e8c040' });
    if ((fb.recruitCostReduction ?? 0) > 0) _fbTyped.push({ text: `−${fb.recruitCostReduction}g recruit`,              color: '#60b0e8' });
    if ((fb.wallCostReduction   ?? 0) > 0) _fbTyped.push({ text: `wall −${fb.wallCostReduction}g`,                    color: '#60b0e8' });
    if ((fb.equipDmMult         ?? 1) > 1) _fbTyped.push({ text: `items +${Math.round((fb.equipDmMult - 1) * 100)}%`, color: '#80e880' });
    if ((fb.eventPreviewBonus   ?? 0) > 0) _fbTyped.push({ text: `${1 + fb.eventPreviewBonus} waves ahead`,           color: '#80e880' });
    if ((fb.wallSlowBonus       ?? 0) > 0) _fbTyped.push({ text: `slow +${Math.round(fb.wallSlowBonus * 100)}%`,      color: '#80c0e8' });
    if ((fb.marchSuppliesBonus  ?? 0) > 0) _fbTyped.push({ text: `march +${fb.marchSuppliesBonus}g`,                   color: '#e8c040' });
    if ((fb.warChestDiscount    ?? 0) > 0) _fbTyped.push({ text: `War Chest −${fb.warChestDiscount}g`,                 color: '#c0a060' });
    let _fortSummY = _nodeBaseY + nodeKeys.length * nodeRowH + 8;
    if (_fbTyped.length > 0) {
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(120,100,60,0.50)';
      ctx.fillText('ACTIVE BONUSES', rix, _fortSummY);
      _fortSummY += 10;
      // Tinted background behind bonus entries
      const _bonusH = _fbTyped.length * 10 + 4;
      ctx.fillStyle = 'rgba(14,24,14,0.55)';
      ctx.beginPath(); ctx.roundRect(rix - 2, _fortSummY - 8, rpW - 14, _bonusH, 3); ctx.fill();
      for (const { text, color } of _fbTyped) {
        ctx.font = '7px monospace'; ctx.fillStyle = color;
        ctx.fillText(`⬧ ${text}`, rix, _fortSummY);
        _fortSummY += 10;
      }
      _fortSummY += 4;
    }
    // Legacy bonuses display
    const _legBonusMap = _campaignState?.legacyBonuses ?? {};
    const _legEntries = Object.entries(_legBonusMap).filter(([, v]) => (Array.isArray(v) ? v.length : !!v) > 0);
    if (_legEntries.length > 0) {
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(140,120,80,0.45)';
      ctx.fillText('PENDING LEGACY', rix, _fortSummY);
      _fortSummY += 10;
      for (const [cls, val] of _legEntries) {
        const _arr = Array.isArray(val) ? val : [val];
        const _clsLabel = TOWER_DEFS[cls]?.label ?? cls;
        const _stackStr = `${_arr.length}/3`;
        const _topName  = _arr[0]?.fromName ?? '?';
        ctx.font = '7px monospace'; ctx.fillStyle = '#a8d080';
        ctx.fillText(`⬧ ${_clsLabel} [${_stackStr}] — ${_topName}${_arr.length > 1 ? ' +' + (_arr.length - 1) : ''}`, rix, _fortSummY);
        _fortSummY += 10;
      }
    }
  }

  ctx.restore(); // right panel clip
  ctx.restore(); // fade-in globalAlpha
}

function drawGuidedPulse(x, y, w, h, radius = 6) {
  const pulse = 0.45 + Math.sin(performance.now() * 0.007) * 0.35;
  ctx.save();
  ctx.strokeStyle = `rgba(240,200,80,${0.35 + pulse * 0.55})`;
  ctx.lineWidth = 1.4 + pulse;
  ctx.shadowColor = 'rgba(240,200,80,0.5)';
  ctx.shadowBlur = 5 + pulse * 8;
  ctx.beginPath(); ctx.roundRect(x - 2, y - 2, w + 4, h + 4, radius); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function assaultFieldHasGate() {
  return towers.some(t => t.type === 'gate')
    || Object.values(wallData ?? {}).some(w => w?.isGate);
}

function spawnEquipSparkles(color) {
  _equipSparkles = Array.from({ length: 14 }, () => ({
    x: BASE_W / 2 + (Math.random() - 0.5) * 100,
    y: 118 + (Math.random() - 0.5) * 24,
    vx: (Math.random() - 0.5) * 1.8,
    vy: -0.6 - Math.random() * 1.4,
    life: 32 + Math.random() * 24,
    color,
  }));
}

function tickEquipCeremony() {
  if (_equipFlash?.timer > 0) _equipFlash.timer--;
  if (!_equipSparkles.length) return;
  for (const p of _equipSparkles) {
    p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life--;
  }
  _equipSparkles = _equipSparkles.filter(p => p.life > 0);
}

function _drawCommandMapFortressHub(cx, cy) {
  ctx.save();
  for (const [hx, hy, rx, ry] of [[cx - 42, cy + 10, 14, 7], [cx + 38, cy + 8, 12, 6], [cx, cy - 30, 10, 5]]) {
    ctx.fillStyle = 'rgba(40,60,30,0.22)';
    ctx.beginPath(); ctx.ellipse(hx, hy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#4a3828';
  ctx.fillRect(cx - 20, cy - 12, 40, 30);
  ctx.strokeStyle = 'rgba(200,160,80,0.45)'; ctx.lineWidth = 1;
  ctx.strokeRect(cx - 20.5, cy - 12.5, 41, 31);
  for (const dx of [-15, 15]) {
    ctx.fillStyle = UI_COLORS.fortress;
    ctx.beginPath();
    ctx.moveTo(cx + dx, cy - 26);
    ctx.lineTo(cx + dx + 9, cy - 10);
    ctx.lineTo(cx + dx - 9, cy - 10);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(232,215,181,0.38)';
  ctx.fillRect(cx - 6, cy + 4, 12, 14);
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText('P', cx, cy - 2);
  ctx.restore();
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

function drawSlotSelect() {
  _slotSelectBtns = [];
  _slotConfirmBtns = [];
  const W = BASE_W, H = BASE_H;
  const cols = 5, cardW = 148, cardH = 74, gap = 10;
  const gridW = cols * cardW + (cols - 1) * gap;
  const startX = Math.round((W - gridW) / 2);
  const startY = FRAME_THICK + 52;

  ctx.textAlign = 'center';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText('SELECT SAVE SLOT', W / 2, FRAME_THICK + 24);
  ctx.font = '8px monospace';
  ctx.fillStyle = 'rgba(180,150,100,0.75)';
  ctx.fillText('10 campaigns — each remembers your last position', W / 2, FRAME_THICK + 40);

  if (!_slotsMeta) _slotsMeta = loadSlotsMeta();

  for (let i = 0; i < SLOT_COUNT; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = startX + col * (cardW + gap);
    const cy = startY + row * (cardH + gap);
    const occupied = slotHasSave(i);
    const meta = _slotsMeta.slots[i];

    drawFantasyPanel(cx, cy, cardW, cardH,
      occupied ? 'rgba(22,14,6,0.96)' : 'rgba(10,8,6,0.88)',
      occupied ? 0.7 : 0.4, 8);

    ctx.textAlign = 'left';
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = occupied ? '#e8d8a0' : '#605040';
    ctx.fillText(`SLOT ${i + 1}`, cx + 8, cy + 16);

    if (occupied && meta) {
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#f0e0b0';
      const label = meta.label.length > 16 ? `${meta.label.slice(0, 15)}…` : meta.label;
      ctx.fillText(label, cx + 8, cy + 32);
      ctx.font = '7px monospace';
      ctx.fillStyle = '#a08050';
      const s = meta.summary ?? {};
      ctx.fillText(`${s.battles ?? 0} battles · ${s.stars ?? 0} ★ · ${s.regions ?? 1} regions`, cx + 8, cy + 46);
      ctx.fillStyle = '#807050';
      ctx.fillText(s.location ?? 'Campaign', cx + 8, cy + 58);

      const delW = 18, delH = 16;
      const delX = cx + cardW - delW - 6, delY = cy + 6;
      drawFantasyPanel(delX, delY, delW, delH, 'rgba(40,12,8,0.92)', 0.5, 3);
      ctx.textAlign = 'center';
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#e08060';
      ctx.fillText('×', delX + delW / 2, delY + 12);
      _slotSelectBtns.push({ x: delX, y: delY, w: delW, h: delH, action: 'delete', slotIndex: i });
    } else {
      ctx.font = '8px monospace';
      ctx.fillStyle = '#504030';
      ctx.fillText('Empty', cx + 8, cy + 34);
      ctx.fillStyle = '#706040';
      ctx.fillText('Click to start new', cx + 8, cy + 50);
    }

    _slotSelectBtns.push({ x: cx, y: cy, w: cardW, h: cardH, action: 'select', slotIndex: i });
  }

  ctx.textAlign = 'center';
  ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(120,100,70,0.45)';
  ctx.fillText('Campaign assaults per slot · Skirmish = separate classic maze mode', W / 2, H - 34);
  ctx.fillText('Start a new campaign in any empty slot · × removes a save', W / 2, H - 22);

  if (_slotDeleteConfirm != null) {
    const ow = 300, oh = 104;
    const ox = (W - ow) / 2, oy = (H - oh) / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, W, H);
    drawFantasyPanel(ox, oy, ow, oh, 'rgba(18,10,4,0.98)', 0.88, 8);
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = UI_COLORS.threat;
    ctx.fillText(`DELETE SLOT ${_slotDeleteConfirm + 1}?`, W / 2, oy + 30);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#c0a080';
    ctx.fillText('All campaign progress in this slot will be lost.', W / 2, oy + 48);
    ctx.fillStyle = '#a08050';
    ctx.fillText('This cannot be undone.', W / 2, oy + 62);

    const btnW = 88, btnH = 26, btnY = oy + oh - 36;
    const yesX = W / 2 - btnW - 8, noX = W / 2 + 8;
    drawFantasyPanel(yesX, btnY, btnW, btnH, 'rgba(60,16,8,0.95)', 0.65, 5);
    drawFantasyPanel(noX, btnY, btnW, btnH, 'rgba(12,8,4,0.95)', 0.55, 5);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#e08060';
    ctx.fillText('DELETE', yesX + btnW / 2, btnY + 15);
    ctx.fillStyle = '#c0a060';
    ctx.fillText('CANCEL', noX + btnW / 2, btnY + 15);
    _slotConfirmBtns.push({ x: yesX, y: btnY, w: btnW, h: btnH, action: 'confirmDelete' });
    _slotConfirmBtns.push({ x: noX, y: btnY, w: btnW, h: btnH, action: 'cancelDelete' });
  }
}

function drawCampaignSelect() {
  _campaignSelectBtns = [];
  const W = BASE_W, H = BASE_H;
  const progress = ensureCampaignProgress();
  if (!_hintSeen.campaignPager) {
    for (let i = 0; i < CAMPAIGN_MAP_COUNT; i++) {
      if (i < progress.mapsUnlocked && !progress.clearedMaps.includes(i)) {
        _campaignMapPage = Math.floor(i / CAMPAIGN_MAPS_PER_PAGE);
        break;
      }
    }
    _hintSeen.campaignPager = true;
  }
  const pageStart = _campaignMapPage * CAMPAIGN_MAPS_PER_PAGE;
  const pageEnd   = Math.min(CAMPAIGN_MAP_COUNT, pageStart + CAMPAIGN_MAPS_PER_PAGE);

  const cols = 5, cardW = 132, cardH = 52, gap = 10;
  const gridW = cols * cardW + (cols - 1) * gap;
  const startX = Math.round((W - gridW) / 2);
  const startY = FRAME_THICK + META_TOP_BAR_COMPACT_H + 10;

  const _nextUnlockIdx = (() => {
    for (let i = 0; i < CAMPAIGN_MAP_COUNT; i++) {
      if (i < progress.mapsUnlocked && !progress.clearedMaps.includes(i)) return i;
    }
    return -1;
  })();

  for (let i = pageStart; i < pageEnd; i++) {
    const idx = i - pageStart;
    const col = idx % cols, row = Math.floor(idx / cols);
    const cx = startX + col * (cardW + gap);
    const cy = startY + row * (cardH + gap);
    const unlocked = i < progress.mapsUnlocked && !isFirstSagaSliceLockedRegion(i);
    const cleared  = progress.clearedMaps.includes(i);
    const meta     = getCampaignMapMeta(i);
    const sliceLocked = isFirstSagaSliceLockedRegion(i);

    drawFantasyPanel(cx, cy, cardW, cardH,
      unlocked ? 'rgba(22,14,6,0.96)' : 'rgba(10,8,6,0.92)',
      unlocked ? 0.75 : 0.35, 8);

    if (sliceLocked) {
      ctx.font = '7px monospace';
      ctx.fillStyle = '#504030';
      ctx.textAlign = 'center';
      ctx.fillText('SAGA II+', cx + cardW / 2, cy + cardH / 2 + 4);
      ctx.textAlign = 'left';
      continue;
    }

    if (i === _nextUnlockIdx) {
      const pulse = 0.5 + Math.sin(performance.now() * 0.005) * 0.3;
      ctx.strokeStyle = `rgba(212,175,55,${0.35 + pulse * 0.45})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect(cx + 1, cy + 1, cardW - 2, cardH - 2, 6); ctx.stroke();
    }

    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = unlocked ? (cleared ? '#a0e080' : '#e8d8a0') : '#504030';
    ctx.textAlign = 'left';
    ctx.fillText(`#${i + 1}`, cx + 8, cy + 16);
    ctx.font = '8px monospace';
    ctx.fillStyle = unlocked ? '#b09060' : '#403020';
    const shortName = (meta?.name ?? '').split(' ')[0];
    ctx.fillText(shortName, cx + 8, cy + 30);
    ctx.fillText(`${meta?.nodeCount ?? '?'} assaults`, cx + 8, cy + 42);

    if (unlocked) {
      _campaignSelectBtns.push({ x: cx, y: cy, w: cardW, h: cardH, action: 'openMap', mapIndex: i });
    }
  }

  const navY = startY + 3 * (cardH + gap) + 12;
  const btnW = 72, btnH = 24;
  const prevX = W / 2 - btnW - 50, nextX = W / 2 + 50;
  drawFantasyPanel(prevX, navY, btnW, btnH, 'rgba(12,8,4,0.95)', 0.6, 6);
  drawFantasyPanel(nextX, navY, btnW, btnH, 'rgba(12,8,4,0.95)', 0.6, 6);
  ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#c0a060';
  ctx.fillText('◀ PREV', prevX + btnW / 2, navY + 16);
  ctx.fillText('NEXT ▶', nextX + btnW / 2, navY + 16);
  _campaignSelectBtns.push({ x: prevX, y: navY, w: btnW, h: btnH, action: 'prevPage' });
  _campaignSelectBtns.push({ x: nextX, y: navY, w: btnW, h: btnH, action: 'nextPage' });

  const skX = W / 2 - 72, skY = H - 52;
  drawFantasyPanel(skX - 4, skY - 4, 152, 34, 'rgba(40,28,8,0.35)', 0.4, 8);
  drawFantasyPanel(skX, skY, 144, 26, 'rgba(18,10,4,0.95)', 0.65, 6);
  ctx.fillStyle = '#e8c060';
  ctx.fillText('SKIRMISH MODE', W / 2, skY + 17);
  _campaignSelectBtns.push({ x: skX, y: skY, w: 144, h: 26, action: 'skirmish' });

  if (_skirmishDiscoveryTimer > 0) {
    _skirmishDiscoveryTimer--;
    const pulse = 0.55 + Math.sin(performance.now() * 0.006) * 0.35;
    drawGuidedPulse(skX - 2, skY - 2, 148, 30, 6);
    ctx.font = '7px monospace';
    ctx.fillStyle = `rgba(240,210,120,${0.50 + pulse * 0.40})`;
    ctx.fillText('↑ Optional: classic 100-wave maze TD', W / 2, skY - 10);
  }

  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(180,150,100,0.65)';
  ctx.fillText('Classic 100-wave maze TD — separate from campaign assaults', W / 2, H - 30);
  ctx.font = '8px monospace'; ctx.fillStyle = '#504030';
  ctx.fillText(`Page ${_campaignMapPage + 1} / ${Math.ceil(CAMPAIGN_MAP_COUNT / CAMPAIGN_MAPS_PER_PAGE)}  ·  ${progress.mapsUnlocked} regions unlocked  ·  ← → pages`, W / 2, H - 18);
}

function drawNodeMap() {
  _nodeMapBtns = [];
  const W = BASE_W, H = BASE_H;
  const progress = ensureCampaignProgress();
  const meta     = getCampaignMapMeta(_campaignMapIndex);
  const nodeCount = meta?.nodeCount ?? getNodeCountForMap(_campaignMapIndex);
  const run       = getMapRun(progress, _campaignMapIndex);
  const portalCount = meta?.portalCount ?? getPortalCountForMap(_campaignMapIndex);
  const layout = getFrontLayout(_campaignMapIndex);
  const _hintExtra = (_commandMapHintTimer > 0 && gamePhase === 'nodeMap') ? 24 : 0;
  const _top = META_SCREEN_TOP + 4 + _hintExtra;

  ctx.textAlign = 'center';
  const _nextAssault = getNextAvailableAssault(progress, _campaignMapIndex);
  const _nextNode = _nextAssault?.nodeIndex ?? run.nodesCleared.length;
  const _isBossNext = _nextAssault?.isBoss ?? (_nextNode === nodeCount - 1);
  const _wavesNext = _nextNode < nodeCount ? getWaveCountForNode(_campaignMapIndex, _nextNode) : 0;
  const _deployHint = getRecommendedDeploy(portalCount, _isBossNext, _wavesNext);
  const _structRec  = getRecommendedStructureCount(portalCount, _isBossNext);
  const _wbAnalysis = analyzeWarband(_roster?.defenders ?? []);
  const _fieldTowers = run.fieldState?.towers ?? [];
  const _nodeCount = meta?.nodeCount ?? getNodeCountForMap(_campaignMapIndex);
  const _equivNext = _nextAssault
    ? difficultyToEquivWave(getNodeDifficulty(_campaignMapIndex, _nextAssault.nodeIndex, _nodeCount), 1)
    : 15;
  const _warnings = [
    ...getCompositionWarnings(_wbAnalysis, portalCount, _wavesNext, _isBossNext),
    ...getStructureWarnings(_fieldTowers, portalCount, _equivNext, _isBossNext),
  ];
  ctx.font = '8px monospace';
  ctx.fillStyle = '#907050';
  ctx.fillText(`${nodeCount} assaults  ·  ${portalCount} portal(s)  ·  Boss: ${meta?.boss?.name ?? '???'}`, W / 2, _top + 8);
  ctx.fillStyle = '#a08050';
  ctx.fillText(`Deploy ~${_deployHint} heroes · ~${_structRec} structures  ·  Tank ${_wbAnalysis.counts.tank}  Support ${_wbAnalysis.counts.support}  DPS ${_wbAnalysis.counts.st_dps + _wbAnalysis.counts.aoe_dps}`, W / 2, _top + 20);
  if (_warnings.length > 0) {
    ctx.fillStyle = 'rgba(220,160,60,0.75)';
    ctx.fillText(`⚠ ${_warnings[0]}`, W / 2, _top + 32);
  } else if (isTutorialNode(_campaignMapIndex, _nextNode)) {
    ctx.fillStyle = 'rgba(120,200,120,0.85)';
    ctx.fillText('Tutorial — hold the gate with 2–3 heroes', W / 2, _top + 32);
  }

  const _hasHint = isTutorialNode(_campaignMapIndex, _nextNode) || _warnings.length;
  const mapX = 40, mapY = _top + (_hasHint ? 40 : 26);
  const mapW = W - 80, mapH = H - 168 - (mapY - _top);
  drawFantasyPanel(mapX, mapY, mapW, mapH, 'rgba(8,12,8,0.95)', 0.65, 10);

  ctx.save();
  const _pg = ctx.createLinearGradient(mapX, mapY, mapX + mapW, mapY + mapH);
  _pg.addColorStop(0, 'rgba(48,38,24,0.22)');
  _pg.addColorStop(0.5, 'rgba(28,36,20,0.10)');
  _pg.addColorStop(1, 'rgba(18,24,14,0.18)');
  ctx.fillStyle = _pg;
  ctx.beginPath(); ctx.roundRect(mapX + 3, mapY + 3, mapW - 6, mapH - 6, 8); ctx.fill();
  ctx.restore();

  // Parchment grid
  ctx.save();
  ctx.strokeStyle = 'rgba(50,70,40,0.12)';
  ctx.lineWidth = 0.5;
  for (let gx = mapX + 12; gx < mapX + mapW; gx += 24) {
    ctx.beginPath(); ctx.moveTo(gx, mapY + 8); ctx.lineTo(gx, mapY + mapH - 8); ctx.stroke();
  }
  for (let gy = mapY + 12; gy < mapY + mapH; gy += 24) {
    ctx.beginPath(); ctx.moveTo(mapX + 8, gy); ctx.lineTo(mapX + mapW - 8, gy); ctx.stroke();
  }
  ctx.restore();

  // Parchment edge vignette
  {
    const vcx = mapX + mapW / 2, vcy = mapY + mapH / 2;
    const vig = ctx.createRadialGradient(vcx, vcy, mapW * 0.15, vcx, vcy, mapW * 0.58);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = vig;
    ctx.fillRect(mapX, mapY, mapW, mapH);
  }

  // Parchment corner flourishes
  ctx.save();
  ctx.strokeStyle = 'rgba(200,160,80,0.22)';
  ctx.lineWidth = 1.2;
  const _corners = [
    [mapX + 14, mapY + 14, 1, 1], [mapX + mapW - 14, mapY + 14, -1, 1],
    [mapX + 14, mapY + mapH - 14, 1, -1], [mapX + mapW - 14, mapY + mapH - 14, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of _corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * 10); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * 10, cy);
    ctx.stroke();
    ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(200,160,80,0.28)';
    ctx.fillText('ᛟ', cx + sx * 4, cy + sy * 4);
  }
  ctx.restore();

  // Compass rose (north indicator)
  {
    const nx = mapX + mapW - 28, ny = mapY + 28;
    ctx.save();
    ctx.strokeStyle = 'rgba(200,160,80,0.35)';
    ctx.fillStyle = 'rgba(200,160,80,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(nx, ny - 10); ctx.lineTo(nx + 4, ny + 2); ctx.lineTo(nx, ny); ctx.lineTo(nx - 4, ny + 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', nx, ny + 12);
    ctx.restore();
  }

  const mapName = meta?.name ?? 'REGION';
  if (isFirstSagaMap(_campaignMapIndex)) {
    drawFirstSagaCommandMap(ctx, {
      mapX, mapY, mapW, mapH,
      progress,
      mapIndex: _campaignMapIndex,
      run,
      btnsOut: _nodeMapBtns,
      settlementDone: isFirstSagaSettlementComplete(_campaignState),
    });
  } else if (_commandMapView === 'front' && _selectedFrontId) {
    _drawFrontAssaultPanel(progress, layout, run, mapX, mapY, mapW, mapH, _selectedFrontId);
  } else {
    _drawCommandMapOverview(progress, run, mapX, mapY, mapW, mapH, portalCount, layout, mapName);
  }

  const backX = 24, backY = H - 36;
  drawFantasyPanel(backX, backY, 90, 22, 'rgba(12,8,4,0.72)', 0.55, 6);
  ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#c0a060';
  ctx.fillText('◀ MAPS', backX + 45, backY + 14);
  _nodeMapBtns.push({ x: backX, y: backY, w: 90, h: 22, action: 'back' });

  const skX = W - 224;
  if (!isFirstSagaMap(_campaignMapIndex)) {
    drawFantasyPanel(skX, backY, 100, 22, 'rgba(30,22,8,0.72)', 0.55, 6);
    ctx.fillStyle = '#a08050';
    ctx.fillText('SKIRMISH', skX + 50, backY + 14);
    _nodeMapBtns.push({ x: skX, y: backY, w: 100, h: 22, action: 'skirmish' });
  }

  const campX = isFirstSagaMap(_campaignMapIndex) ? W - 114 : W - 114;
  drawFantasyPanel(campX, backY, 100, 22, 'rgba(20,30,14,0.72)', 0.55, 6);
  ctx.fillStyle = '#90c070';
  ctx.fillText('WAR CAMP', campX + 50, backY + 14);
  _nodeMapBtns.push({ x: campX, y: backY, w: 100, h: 22, action: 'warCamp' });

  const heroes = run.fieldState?.towers?.filter(t => isHeroTowerType(t.type)).length ?? 0;
  const structs = run.fieldState?.towers?.filter(t => !isHeroTowerType(t.type)).length ?? 0;
  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(112,96,64,0.65)';
  ctx.fillText(`Field: ${heroes}/${MAX_FIELD_HEROES} heroes · ${structs}/${MAX_FIELD_STRUCTURES} structures`, W / 2, H - 12);
}

function _drawCommandMapOverview(progress, run, mapX, mapY, mapW, mapH, portalCount, layout, mapName) {
  const cx = mapX + mapW / 2;
  const cy = mapY + mapH / 2;

  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = 'rgba(160,140,90,0.65)';
  ctx.textAlign = 'center';
  ctx.fillText(mapName.toUpperCase(), cx, mapY + 22);

  // Fortress hub
  _drawCommandMapFortressHub(cx, cy);
  ctx.font = '8px monospace';
  ctx.fillStyle = '#a09060';
  ctx.fillText('Fortress', cx, cy + 22);

  const cardW = 152, cardH = 72;
  const positions = {
    west:  { x: mapX + 14, y: cy - cardH / 2 },
    east:  { x: mapX + mapW - cardW - 14, y: cy - cardH / 2 },
    north: { x: cx - cardW / 2, y: mapY + 30 },
    south: { x: cx - cardW / 2, y: mapY + mapH - cardH - 14 },
  };

  // Spokes to fortress
  ctx.strokeStyle = 'rgba(80,100,60,0.25)';
  ctx.lineWidth = 1;
  for (const frontId of FRONT_IDS) {
    const pos = positions[frontId];
    const fx = pos.x + cardW / 2, fy = pos.y + cardH / 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(fx, fy); ctx.stroke();
  }

  for (const frontId of FRONT_IDS) {
    const front = layout.fronts[frontId];
    const pos   = positions[frontId];
    const { cleared, total } = getFrontProgress(front, run.nodesCleared);
    const secured   = cleared >= total;
    const hasActive = front.assaults.some(
      a => !run.nodesCleared.includes(a.nodeIndex)
        && isAssaultUnlocked(progress, _campaignMapIndex, a.nodeIndex)
    );
    const statusLine = getFrontStatusLine(front, progress, _campaignMapIndex, portalCount);
    const subtitle   = getFrontSubtitle(front, progress, _campaignMapIndex, portalCount);

    drawFantasyPanel(pos.x, pos.y, cardW, cardH,
      secured ? 'rgba(14,22,10,0.94)' : 'rgba(12,16,10,0.94)',
      hasActive ? 0.88 : secured ? 0.7 : 0.45, 6);

    if (hasActive) {
      const pulse = 0.45 + Math.sin(performance.now() * 0.006) * 0.35;
      ctx.strokeStyle = `rgba(220,170,60,${0.30 + pulse * 0.50})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect(pos.x + 1, pos.y + 1, cardW - 2, cardH - 2, 5); ctx.stroke();
    }
    if (_onboardingStep === ONBOARDING.COMMAND_MAP && frontId === 'west' && hasActive) {
      drawGuidedPulse(pos.x, pos.y, cardW, cardH, 6);
    }

    ctx.textAlign = 'center';
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = secured ? '#80c060' : hasActive ? '#e8d090' : '#706050';
    ctx.fillText(`${{ west: '← ', east: '→ ', north: '↑ ', south: '↓ ' }[frontId] ?? ''}${FRONT_LABELS[frontId]}`, pos.x + cardW / 2, pos.y + 16);

    ctx.font = '7px monospace';
    ctx.fillStyle = hasActive ? '#d8c080' : '#908060';
    ctx.fillText(statusLine, pos.x + cardW / 2, pos.y + 34);

    ctx.fillStyle = secured ? 'rgba(80,160,60,0.85)' : 'rgba(120,100,60,0.75)';
    ctx.fillText(subtitle, pos.x + cardW / 2, pos.y + 54);

    _nodeMapBtns.push({ x: pos.x, y: pos.y, w: cardW, h: cardH, action: 'openFront', frontId });
  }

  ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(100,90,60,0.45)';
  ctx.fillText('— select a front —', cx, mapY + mapH - 10);
}

function _drawFrontAssaultPanel(progress, layout, run, mapX, mapY, mapW, mapH, frontId) {
  const front   = layout.fronts[frontId];
  const panelX  = mapX + 24, panelY = mapY + 20;
  const panelW  = mapW - 48, panelH = mapH - 40;

  drawFantasyPanel(panelX, panelY, panelW, panelH, 'rgba(10,14,8,0.97)', 0.75, 8);

  ctx.textAlign = 'center';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#e8d8a8';
  ctx.fillText(FRONT_LABELS[frontId], panelX + panelW / 2, panelY + 26);

  const { cleared, total } = getFrontProgress(front, run.nodesCleared);
  ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(140,120,80,0.55)';
  ctx.fillText(`${cleared} / ${total} assaults secured`, panelX + panelW / 2, panelY + 40);

  let rowY = panelY + 58;
  const rowH = 34;
  const listX = panelX + 28;

  for (const assault of front.assaults) {
    const clearedRow = run.nodesCleared.includes(assault.nodeIndex);
    const unlocked   = isAssaultUnlocked(progress, _campaignMapIndex, assault.nodeIndex);
    const isNext     = !clearedRow && unlocked;
    const rowW = panelW - 56;

    if (isNext) {
      ctx.fillStyle = 'rgba(200,160,50,0.08)';
      ctx.beginPath(); ctx.roundRect(listX - 8, rowY - 14, rowW + 16, rowH - 4, 4); ctx.fill();
      if (_onboardingStep === ONBOARDING.LAUNCH
        || (_onboardingStep === ONBOARDING.PICK_FRONT && _commandMapView === 'front')) {
        drawGuidedPulse(listX - 8, rowY - 16, rowW + 16, rowH, 4);
      }
    }

    ctx.textAlign = 'left';
    ctx.font = clearedRow ? '9px monospace' : 'bold 9px monospace';
    ctx.fillStyle = clearedRow ? 'rgba(100,160,80,0.85)' : unlocked ? '#e8d8b0' : 'rgba(80,70,50,0.55)';
    const tierText = assault.isBoss ? assault.codename : assault.tierLabel;
    ctx.fillText(tierText, listX, rowY);

    if (!assault.isBoss) {
      ctx.font = '7px monospace';
      ctx.fillStyle = clearedRow ? 'rgba(80,120,70,0.6)' : 'rgba(140,120,80,0.55)';
      ctx.fillText(assault.codename, listX, rowY + 12);
    }

    ctx.textAlign = 'right';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = clearedRow ? '#60c840' : isNext ? '#f0c040' : 'rgba(60,50,35,0.4)';
    ctx.fillText(clearedRow ? '✓' : isNext ? '→' : '·', panelX + panelW - 28, rowY + 2);

    if (unlocked && !clearedRow) {
      _nodeMapBtns.push({
        x: listX - 8, y: rowY - 16, w: rowW + 16, h: rowH,
        action: 'attack', nodeIndex: assault.nodeIndex,
      });
    }
    rowY += rowH;
  }

  const closeX = panelX + 12, closeY = panelY + panelH - 34;
  drawFantasyPanel(closeX, closeY, 100, 24, 'rgba(12,8,4,0.95)', 0.55, 5);
  ctx.font = '8px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#c0a060';
  ctx.fillText('◀ COMMAND MAP', closeX + 50, closeY + 16);
  _nodeMapBtns.push({ x: closeX, y: closeY, w: 100, h: 24, action: 'closeFront' });
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

  // Battle 1 warband preview — orient new players with their starting defenders
  if (battlesCompleted === 0 && _roster.defenders.length > 0) {
    const _wbNames = _roster.defenders.map(d => d.name || TOWER_DEFS[d.type]?.label || '?').join(', ');
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(160,140,90,0.45)';
    ctx.fillText(`Warband: ${_wbNames}`, W / 2, 120);
  }

  // Bond pair display — show first formed bond below flavor text
  const _firstBond = (_campaignState?.bonds ?? [])[0];
  let _mapContextY = battlesCompleted === 0 ? 131 : 120;
  if (_firstBond) {
    const _bDefA = _roster.find(_firstBond.defenderIds[0]);
    const _bDefB = _roster.find(_firstBond.defenderIds[1]);
    if (_bDefA && _bDefB) {
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(180,150,80,0.42)';
      ctx.fillText(`∞ ${_bDefA.name} & ${_bDefB.name} — ${_firstBond.name}`, W / 2, _mapContextY);
      _mapContextY += 11;
    }
  }
  // Reserve gold display — show treasury heading into next battle
  if (battlesCompleted > 0 && goldReserve > 0) {
    ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(200,170,60,0.42)';
    ctx.fillText(`◆ ${goldReserve}g in reserve`, W / 2, _mapContextY);
    _mapContextY += 11;
  }

  // Campaign event preview — tease upcoming event if available
  if (_campaignState && battlesCompleted > 0) {
    const _previewEvent = getAvailableEvent(_campaignState);
    if (_previewEvent) {
      const _evPulse = 0.45 + Math.sin(performance.now() * 0.003) * 0.20;
      ctx.font = '7px monospace'; ctx.fillStyle = `rgba(220,180,80,${_evPulse})`;
      ctx.fillText(`⚑ Event awaits: ${_previewEvent.title}  (between battles)`, W / 2, _mapContextY);
    }
  }

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

    ctx.fillStyle = 'rgba(6,14,6,0.92)';
    ctx.fillRect(pvX, pvY, pvW, pvH);
    ctx.strokeStyle = selected ? 'rgba(180,130,30,0.55)' : 'rgba(50,70,40,0.5)';
    ctx.lineWidth   = 0.5;
    ctx.strokeRect(pvX, pvY, pvW, pvH);

    // Faint grid lines
    ctx.strokeStyle = 'rgba(35,50,25,0.35)';
    ctx.lineWidth   = 0.3;
    for (let c = 1; c < COLS; c += 6) {
      const lx = pvX + c * cw;
      ctx.beginPath(); ctx.moveTo(lx, pvY); ctx.lineTo(lx, pvY + pvH); ctx.stroke();
    }
    for (let r = 1; r < ROWS; r += 4) {
      const ly = pvY + r * ch;
      ctx.beginPath(); ctx.moveTo(pvX, ly); ctx.lineTo(pvX + pvW, ly); ctx.stroke();
    }

    // Goal / fortress position
    const gpx = pvX + (map.goal.col  + 0.5) * cw;
    const gpy = pvY + (map.goal.row  + 0.5) * ch;
    // Main spawn position
    const spx = pvX + (map.spawn.col + 0.5) * cw;
    const spy = pvY + (map.spawn.row + 0.5) * ch;

    if (map.multiPortal) {
      // ── MIDGARD: fortress-at-center concept ────────────────────────────────

      // Placement zone — Chebyshev 10 from goal (same as isInFortressZone)
      const zoneRadius = 10;
      const zLeft  = pvX + Math.max(0, map.goal.col - zoneRadius) * cw;
      const zRight = pvX + Math.min(COLS, map.goal.col + zoneRadius + 1) * cw;
      const zTop   = pvY + Math.max(0, map.goal.row - zoneRadius) * ch;
      const zBot   = pvY + Math.min(ROWS, map.goal.row + zoneRadius + 1) * ch;
      ctx.save();
      ctx.fillStyle = selected ? 'rgba(60,90,40,0.18)' : 'rgba(40,60,25,0.12)';
      ctx.fillRect(zLeft, zTop, zRight - zLeft, zBot - zTop);
      ctx.strokeStyle = selected ? 'rgba(130,170,60,0.35)' : 'rgba(80,110,40,0.22)';
      ctx.lineWidth   = 0.6;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(zLeft, zTop, zRight - zLeft, zBot - zTop);
      ctx.setLineDash([]);
      ctx.restore();

      // Extra portals: east W11, north W21, south W41
      const extraPortals = [
        { col: 47, row: 11, label: 'W11', color: 'rgba(180,140,40,0.65)', active: false },
        { col: 24, row:  0, label: 'W21', color: 'rgba(140,120,40,0.50)', active: false },
        { col: 24, row: 21, label: 'W41', color: 'rgba(110,100,35,0.40)', active: false },
      ];
      // Dashed paths from each extra portal to fortress
      ctx.save();
      ctx.setLineDash([2, 3]);
      for (const ep of extraPortals) {
        const epx = pvX + (ep.col + 0.5) * cw;
        const epy = pvY + (ep.row + 0.5) * ch;
        ctx.beginPath(); ctx.moveTo(epx, epy); ctx.lineTo(gpx, gpy);
        ctx.strokeStyle = ep.color;
        ctx.lineWidth   = 0.8;
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // Active west path
      ctx.beginPath(); ctx.moveTo(spx, spy); ctx.lineTo(gpx, gpy);
      ctx.strokeStyle = 'rgba(80,200,60,0.60)';
      ctx.lineWidth   = 1.2;
      ctx.stroke();

      // Extra portal dots + wave labels
      ctx.font = '6px monospace'; ctx.textAlign = 'center';
      for (const ep of extraPortals) {
        const epx = pvX + (ep.col + 0.5) * cw;
        const epy = pvY + (ep.row + 0.5) * ch;
        ctx.beginPath(); ctx.arc(epx, epy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = ep.color; ctx.fill();
        // wave label offset away from edge
        const lox = ep.col === 47 ? -10 : 0;
        const loy = ep.row === 0 ? 12 : ep.row === 21 ? -5 : 0;
        ctx.fillStyle = ep.color;
        ctx.fillText(ep.label, epx + lox, epy + loy);
      }

      // Fortress icon at goal: concentric glow + castle silhouette
      const fr = 7;
      const grad = ctx.createRadialGradient(gpx, gpy, 0, gpx, gpy, fr * 2.2);
      grad.addColorStop(0, selected ? 'rgba(230,175,50,0.45)' : 'rgba(200,150,40,0.28)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(gpx, gpy, fr * 2.2, 0, Math.PI * 2); ctx.fill();

      // Castle tower silhouette (small cross shape)
      ctx.fillStyle = selected ? 'rgba(240,200,80,0.90)' : 'rgba(200,160,60,0.70)';
      const fw = 5, fh = 6;
      ctx.fillRect(gpx - fw / 2, gpy - fh / 2, fw, fh);       // keep
      ctx.fillRect(gpx - fw * 1.4, gpy - fh * 0.3, fw * 0.6, fh * 0.5); // left tower
      ctx.fillRect(gpx + fw * 0.8, gpy - fh * 0.3, fw * 0.6, fh * 0.5); // right tower
      // Battlements (3 nubs on main keep)
      for (let bi = -1; bi <= 1; bi++) {
        ctx.fillRect(gpx + bi * 1.6 - 0.7, gpy - fh / 2 - 2, 1.4, 2);
      }

      // West spawn portal
      ctx.beginPath(); ctx.arc(spx, spy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#50e030'; ctx.fill();
      ctx.font = '6px monospace'; ctx.fillStyle = '#50e030'; ctx.textAlign = 'center';
      ctx.fillText('W', spx + 7, spy + 2);

    } else {
      // ── Standard maps: improved spawn→goal preview ─────────────────────────

      // Curved path with direction arrow
      const cpx = (spx + gpx) / 2 + (spy > gpy ? 16 : -16);
      const cpy = (spy + gpy) / 2 + (spy < gpy ? -14 : 14);
      ctx.beginPath();
      ctx.moveTo(spx, spy);
      ctx.quadraticCurveTo(cpx, cpy, gpx, gpy);
      ctx.strokeStyle = 'rgba(90,170,60,0.55)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();

      // Mid-point arrow
      const mt = 0.55;
      const mx = (1-mt)*(1-mt)*spx + 2*(1-mt)*mt*cpx + mt*mt*gpx;
      const my = (1-mt)*(1-mt)*spy + 2*(1-mt)*mt*cpy + mt*mt*gpy;
      const dx = 2*((1-mt)*(cpx-spx) + mt*(gpx-cpx));
      const dy = 2*((1-mt)*(cpy-spy) + mt*(gpy-cpy));
      const ang = Math.atan2(dy, dx);
      ctx.save();
      ctx.translate(mx, my); ctx.rotate(ang);
      ctx.fillStyle = 'rgba(90,170,60,0.55)';
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-3, 2.5); ctx.lineTo(-3, -2.5); ctx.closePath(); ctx.fill();
      ctx.restore();

      // Spawn portal
      ctx.beginPath(); ctx.arc(spx, spy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#50c830'; ctx.fill();
      ctx.font = '7px monospace'; ctx.fillStyle = '#50c830'; ctx.textAlign = 'center';
      ctx.fillText('S', spx + (spx < pvX + pvW / 2 ? 9 : -9), spy + 2);

      // Goal fortress dot with glow
      const gg = ctx.createRadialGradient(gpx, gpy, 0, gpx, gpy, 8);
      gg.addColorStop(0, 'rgba(240,190,40,0.55)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(gpx, gpy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(gpx, gpy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#f0c030'; ctx.fill();
      ctx.font = '7px monospace'; ctx.fillStyle = '#f0c030'; ctx.textAlign = 'center';
      ctx.fillText('G', gpx + (gpx > pvX + pvW / 2 ? -9 : 9), gpy + 2);
    }

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
    if (selected && _mapAutoStartEnabled && mapAutoTimerStart > 0) {
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
  if (_mapAutoStartEnabled && mapAutoTimerStart > 0 && autoRemaining > 0) {
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

  if (gamePhase === 'slotSelect') {
    drawSlotSelect();
    drawFrames();
    ctx.restore();
    return;
  }

  if (gamePhase === 'campaignSelect') {
    drawCampaignSelect();
    drawFrames();
    drawCampaignMetaBar();
    ctx.restore();
    return;
  }

  if (gamePhase === 'nodeMap') {
    drawNodeMap();
    drawCommandMapHint();
    drawOnboardingBanner();
    drawMapUnlockCelebration();
    drawRegionClearFanfare();
    drawFrames();
    drawCampaignMetaBar();
    ctx.restore();
    return;
  }

  if (gamePhase === 'settlementCeremony') {
    _settlementCeremonyBtns = [];
    drawSettlementCeremony(ctx, BASE_W, BASE_H, {
      step: _settlementCeremonyStep,
      recruitType: _settlementRecruitType,
      nameDraft: _settlementNameDraft,
      btnsOut: _settlementCeremonyBtns,
      settlementComplete: isFirstSagaSettlementComplete(_campaignState),
      stoneFlash: _settlementStoneFlash,
    });
    drawFrames();
    drawCampaignMetaBar({ line1: 'SETTLEMENT OATH', line2: 'Saga I finale', color: UI_COLORS.gold });
    ctx.restore();
    return;
  }

  if (gamePhase === 'heroNamingCeremony') {
    _heroNamingBtns = [];
    const namingDef = _roster?.find(_heroNamingDefenderId) ?? getUnnamedSagaHero(_roster);
    drawHeroNamingCeremony(ctx, BASE_W, BASE_H, {
      nameDraft: _heroNamingDraft,
      heroType: namingDef?.type ?? 'berserk',
      btnsOut: _heroNamingBtns,
      nameValid: validateHeroName(_heroNamingDraft),
    });
    drawFrames();
    drawCampaignMetaBar({ line1: 'NAMING', line2: 'The wall remembers', color: UI_COLORS.gold });
    ctx.restore();
    return;
  }

  if (gamePhase === 'mapSelect') {
    drawMapSelect();
    drawFrames();
    drawCampaignMetaBar({ line1: 'CLASSIC TD', line2: '100-wave maze skirmish', color: UI_COLORS.warband });
    ctx.restore();
    return;
  }

  if (gamePhase === 'debrief') {
    drawDebrief();
    drawMapUnlockCelebration();
    drawFrames();
    const _dai = getAssaultInfo(_campaignMapIndex, _campaignNodeIndex);
    drawCampaignMetaBar(_returnToNodeMapAfterDebrief && _dai
      ? { line1: _dai.codename.toUpperCase(), line2: 'ASSAULT COMPLETE', color: UI_COLORS.threat }
      : { line1: 'DEBRIEF', line2: `${waveNumber} waves cleared`, color: UI_COLORS.parchment });
    ctx.restore();
    return;
  }

  if (gamePhase === 'betweenBattles') {
    drawBetweenBattles();
    drawEquipCeremony();
    drawEventOutcomeToast();
    drawWarCampWelcome();
    drawFrames();
    drawCampaignMetaBar();
    if (_showChronicle)    drawChronicleOverlay();
    if (_showDefenderBio)  drawDefenderBioOverlay(_showDefenderBio);
    if (_retirementCeremony) drawRetirementCeremony(_retirementCeremony);
    if (_pendingCampaignEvent && _betweenFadeIn <= 0) drawCampaignEventCard();
    ctx.restore();
    return;
  }

  if (gamePhase === 'fortressPrep') {
    drawFortressCommanderPrepScreen();
    drawUiToast();
    drawLeftDock();
    drawRightPanel();
    drawFrames();
    const assault = _pendingAssaultNode != null
      ? getAssaultInfo(_campaignMapIndex, _pendingAssaultNode) : null;
    drawCampaignMetaBar(assault
      ? { line1: assault.codename.toUpperCase(), line2: 'FORTRESS PREP', color: UI_COLORS.fortress }
      : null);
    ctx.restore();
    return;
  }

  // Game world — clipped to playfield, zoom applied here (not to frame/UI)
  ctx.save();
  const _pfLeft  = playfieldLeft();
  const _pfW     = playfieldWidth();
  const _pfH     = playfieldHeight();
  const _pfScale = playfieldScale();
  const _gridCx  = COLS * CELL_SIZE * 0.5;
  const _gridCy  = ROWS * CELL_SIZE * 0.5;
  ctx.beginPath();
  ctx.rect(_pfLeft, GRID_TOP, _pfW, _pfH);
  ctx.clip();
  if (screenShake > 0) screenShake *= 0.86;
  const _shakeMag = screenShake > 20 ? Math.min(screenShake, 10) : Math.min(screenShake, 4);
  const shakeX = _shakeMag > 0.3 ? (Math.random() - 0.5) * _shakeMag * 2 : 0;
  const shakeY = _shakeMag > 0.3 ? (Math.random() - 0.5) * _shakeMag * 2 : 0;
  ctx.translate(_pfLeft + gridPanX + playfieldShiftX() + shakeX, GRID_TOP + gridPanY + playfieldShiftY() + shakeY);
  ctx.translate(_gridCx, _gridCy);
  ctx.scale(gridZoom * _pfScale, gridZoom * _pfScale);
  ctx.translate(-_gridCx, -_gridCy);

  const time = performance.now() * 0.001;
  // Animated gold display — lags slightly behind real value (coins land, then counter ticks up)
  _displayGold += (gold - _displayGold) * 0.10;
  if (Math.abs(_displayGold - gold) < 0.5) _displayGold = gold;
  grid.healthRatio = Math.max(0, lives / STARTING_LIVES);
  grid.gold        = gold;
  grid.hoardPulse  = hoardPulse;
  grid.wallData    = wallData;

  // Grass terrain (blit pre-rendered offscreen canvas — free per frame)
  if (terrainCanvas) ctx.drawImage(terrainCanvas, 0, 0);

  // Path — drawn behind walls, towers, and enemies
  drawPath();
  drawExtraPortalPaths();
  drawRingGateMarkers();

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
  if (!hideAssaultBattleGrid()) {
  if (wallFrostDirty) {
    wallFrostCells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid.getCell(c, r) !== CELL.EMPTY) continue;
        const adj = [[c-1,r],[c+1,r],[c,r-1],[c,r+1]];
        if (adj.some(([nc,nr]) => {
          const c = grid.getCell(nc, nr);
          return c === CELL.WALL || c === CELL.GATE;
        })) {
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
  }

  // Tactical high-ground choke tiles — amber diamond marker on empty cells
  if (!hideAssaultBattleGrid() && _chokeCells.size > 0) {
    const _ct = performance.now() * 0.001;
    const _chokePulse = 0.55 + Math.sin(_ct * 1.4) * 0.35;
    for (const key of _chokeCells) {
      const [_cc, _cr] = key.split('_').map(Number);
      if (grid.getCell(_cc, _cr) !== CELL.EMPTY) continue; // occupied
      const _cx = _cc * CELL_SIZE + CELL_SIZE / 2;
      const _cy = _cr * CELL_SIZE + CELL_SIZE / 2;
      // Subtle amber tile tint
      ctx.save();
      ctx.globalAlpha = 0.10 * _chokePulse;
      ctx.fillStyle = '#d0a020';
      ctx.fillRect(_cc * CELL_SIZE, _cr * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.restore();
      // Diamond glyph
      ctx.save();
      ctx.globalAlpha = 0.55 * _chokePulse;
      ctx.strokeStyle = '#e0b030';
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.moveTo(_cx,     _cy - 4);
      ctx.lineTo(_cx + 4, _cy    );
      ctx.lineTo(_cx,     _cy + 4);
      ctx.lineTo(_cx - 4, _cy    );
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Wall HP overlay — show health of damaged walls during break (adjacent to path = at risk)
  if (waveState === 'break' || waveState === 'countdown') {
    ctx.save();
    ctx.font = '5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [wk, wd] of Object.entries(wallData)) {
      if (wd.temporary) continue;
      const ratio = wd.hp / wd.maxHp;
      if (ratio >= 1) continue; // undamaged — no label
      const [wc, wr] = wk.split('_').map(Number);
      const wx = wc * CELL_SIZE + CELL_SIZE / 2;
      const wy = wr * CELL_SIZE + CELL_SIZE / 2;
      // Color-code by damage level
      if (ratio >= 0.5) {
        ctx.fillStyle = `rgba(255,200,80,${0.55 + (1 - ratio) * 0.3})`;
      } else {
        ctx.fillStyle = `rgba(255,80,40,${0.70 + (0.5 - ratio) * 0.5})`;
      }
      ctx.fillText(`${Math.ceil(wd.hp)}`, wx, wy);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  drawFortressComplex();

  // Cell features always drawn; grid lines hidden during pathless assault combat
  const _inPlacementMode = buildMode === CELL.GATE || buildMode === CELL.TOWER;
  const _gridAlpha = hideAssaultBattleGrid() ? 0 : (
    showGrid ? (waveState === 'active' ? 0 : (_inPlacementMode ? 0.20 : 0.022)) : 0
  );
  grid.draw(ctx, time, _gridAlpha);

  // Wall level tints — per-level color overlay to make upgrade investment visible
  if (!hideAssaultBattleGrid() && Object.keys(wallData).length > 0) {
    const _wLvlColors = [
      'rgba(80,80,80,0.10)',       // level 0: bare stone
      'rgba(100,110,120,0.14)',    // level 1: reinforced
      'rgba(120,140,170,0.18)',    // level 2: heavy stone
      'rgba(160,175,200,0.22)',    // level 3: silver-clad
      'rgba(200,175,60,0.20)',     // level 4: gold-traced
    ];
    const _wEdgeColors = ['#808080','#9090a0','#a0b0c0','#c0c8d8','#c8a840'];
    ctx.save();
    for (const [wk, wd] of Object.entries(wallData)) {
      if (wd.temporary) continue;
      const lvl = Math.min(4, wd.level ?? 0);
      const [wc, wr] = wk.split('_').map(Number);
      const wx = wc * CELL_SIZE, wy = wr * CELL_SIZE;
      if (lvl > 0) {
        ctx.fillStyle = _wLvlColors[lvl];
        ctx.fillRect(wx, wy, CELL_SIZE, CELL_SIZE);
      }
      // 1px bright edge on top+left for 3D fortification suggestion
      ctx.strokeStyle = _wEdgeColors[lvl] + '66';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(wx + 0.5, wy + CELL_SIZE); ctx.lineTo(wx + 0.5, wy + 0.5); ctx.lineTo(wx + CELL_SIZE, wy + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Path adjacent contrast — darken terrain cells beside path for legibility under enemy crowding
  if (_pathAdjacentCells.length > 0 && waveState === 'active') {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (const c of _pathAdjacentCells) ctx.fillRect(c.x, c.y, CELL_SIZE, CELL_SIZE);
    ctx.restore();
  }

  // Grid cell hover highlight
  if (!hideAssaultBattleGrid() && !dragItem && hoverCol >= 0 && hoverRow >= 0 && !gameOver) {
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

  // Tower light pools — per-tower signature color halo (shared with card portrait glow)
  for (const t of towers) {
    if (t.disabledTimer > 0) continue;
    drawDefenderPortraitGlow(t.x, t.y + 2, t.glowRgb, CELL_SIZE * 0.5);
  }

  [...towers].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x)
    .forEach(t => { t.selected = (t === selectedTower); t.draw(ctx); });

  for (const t of towers) drawHeroCombatHpBar(t);
  drawFortressGateHpBars();
  drawPostMarkers();

  // Pre-fire targeting line
  if (selectedTower && selectedTower._currentTarget?.alive && waveState === 'active') {
    if (selectedTower.fireRate > 0 && (selectedTower.fireCooldown ?? 0) <= 8) {
      const _tgt = selectedTower._currentTarget;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,200,0.22)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(selectedTower.x, selectedTower.y);
      ctx.lineTo(_tgt.x, _tgt.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

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

  // Last-enemy ring — pulsing outline on the final alive enemy
  if (waveState === 'active') {
    const _aliveEnemies2 = enemies.filter(e => e.alive && !e.reached);
    if (_aliveEnemies2.length === 1) {
      const _le = _aliveEnemies2[0];
      const _lePulse = 0.55 + 0.45 * Math.abs(Math.sin(performance.now() * 0.012));
      ctx.save();
      ctx.strokeStyle = `rgba(255,80,40,${_lePulse})`;
      ctx.lineWidth   = 1.5;
      ctx.shadowColor = 'rgba(255,60,20,0.90)';
      ctx.shadowBlur  = 8 * _lePulse;
      ctx.beginPath();
      ctx.arc(_le.x, _le.y, (_le.radius ?? 8) + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
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

  // Rank pips — small colored circle on base of towers with WARRIOR+ rank
  {
    ctx.save();
    for (const t of towers) {
      if (!t.defenderId) continue;
      const _rankDef = _roster?.find(t.defenderId);
      if (!_rankDef) continue;
      const _rank = getRank(_rankDef);
      if (_rank.id === 'greenhorn') continue;
      const px = t.x - CELL_SIZE * 0.52, py = t.y + CELL_SIZE * 0.42;
      ctx.fillStyle = _rank.color ?? '#c0a060';
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    }
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
      // Name text with glow — class color matched to portrait halo
      ctx.textAlign = 'center';
      ctx.font      = 'bold 6px monospace';
      drawDefenderName(t.name, nx, ny + 1, t, 1);
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

  // Enemy type underglow — silhouette read on dark terrain
  for (const e of enemies) {
    if (!e.alive || e.reached) continue;
    const er   = e.radius + 3;
    const glow = e.highlightColor ?? e.color ?? '#8860c0';
    const _eg  = ctx.createRadialGradient(e.x, e.y + 1, 0, e.x, e.y + 1, er * 2.4);
    _eg.addColorStop(0,   glow + '55');
    _eg.addColorStop(0.55, glow + '22');
    _eg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = _eg;
    ctx.beginPath(); ctx.arc(e.x, e.y, er * 2.4, 0, Math.PI * 2); ctx.fill();
  }

  enemies.slice().sort((a, b) => a.y - b.y).forEach(e => e.draw(ctx));
  drawAssaultEnemyTelegraph();

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

      // Fossegrim — idle teal aura ring + expanding heal pulse
      if (e.type === ENEMY_TYPES.FOSSEGRIM) {
        const fPulse = 0.5 + Math.sin(_now * 0.006 + e.x * 0.2) * 0.5;
        const aura   = ENEMY_DEFS.fossegrim.healAura;
        ctx.save();
        // Idle soft ring
        ctx.strokeStyle = `rgba(50,220,170,${0.18 + fPulse * 0.14})`;
        ctx.lineWidth   = 1.2;
        ctx.shadowColor = 'rgba(40,200,160,0.5)'; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 3 + fPulse, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
        // Expanding heal-pulse ring
        if (e.healPulseVis > 0) {
          const prog  = e.healPulseVis / 22;
          const rng   = aura.radius * (1 - prog) * 0.9 + e.radius;
          const alpha = prog * 0.65;
          ctx.strokeStyle = `rgba(70,240,190,${alpha})`;
          ctx.lineWidth   = 1.5 * prog;
          ctx.shadowColor = `rgba(50,200,160,${alpha})`; ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(e.x, e.y, rng, 0, Math.PI * 2); ctx.stroke();
          ctx.shadowBlur = 0;
        }
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
        const tx    = closest.e.x;
        const ty    = closest.e.y - closest.e.radius - 12;
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

  // ── Tower targeting lines — brief aimline when a defender fires ─────────────
  if (!gameOver && waveState === 'active') {
    ctx.save();
    for (const t of towers) {
      if (!t.targetLineTimer || t.targetLineTimer <= 0) continue;
      const isSel = selectedTower === t;
      const tlAlpha = (t.targetLineTimer / 20) * (isSel ? 0.85 : 0.45);
      const rgb = defenderGlowRgb(t);
      ctx.strokeStyle = isSel ? `rgba(${rgb},${tlAlpha})` : `rgba(255,230,100,${tlAlpha})`;
      ctx.lineWidth   = isSel ? 2.4 : 1.4;
      ctx.setLineDash(isSel ? [] : [3, 3]);
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.lastTargetX, t.lastTargetY);
      ctx.stroke();
      ctx.setLineDash([]);
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
    const hx    = (GOAL.col + 0.5) * CELL_SIZE;
    const hy    = (GOAL.row + 0.5) * CELL_SIZE - 42;
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
      const lx = leader.x;
      const ly = leader.y - leader.radius - 7;
      const sz = leader.isBoss ? 7 : 5;
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
    ctx.globalAlpha = 0.22;
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

  // Boss entry vignette — brief darkening when a boss wave starts
  if (_bossEntryVignette > 0) {
    _bossEntryVignette--;
    const _bevAlpha = (_bossEntryVignette / 50) * 0.32;
    const { width, height } = getViewSize();
    ctx.save();
    ctx.globalAlpha = _bevAlpha;
    ctx.fillStyle   = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Boss phase 25% flash — deep red world-fire pulse
  if (_bossPhase25Flash > 0) {
    _bossPhase25Flash--;
    const { width, height } = getViewSize();
    const _p25Alpha = (_bossPhase25Flash / 18) * 0.35;
    ctx.save();
    ctx.globalAlpha = _p25Alpha;
    ctx.fillStyle   = '#cc1000';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  drawLeftDock();
  if (!selectedTower) _dossierSlideT = 0;
  drawThreatIntelCard();
  drawRightPanel();
  drawHud();
  drawGoldCoins();
  drawBossWarning();
  drawLastStandBanner();
  drawBossDefeat();
  drawBossLootBanner();
  drawEnemyIntroBanner();
  drawRuneForgeHint();
  drawWaveAnnouncement();
  drawChapterBanner();
  drawGateBreachBanner();
  drawTutorialBanner();
  drawDepthBanner();
  drawFirstPlacementHint();
  drawAncestralAidBanner();
  drawMylingWarning();
  drawMaraEmpWarning();
  drawJotunnWarning();
  drawFossegrimWarning();
  drawWave1Hint();
  if (!hideAssaultBattleGrid()) {
    drawFortressZoneRing();
    drawGateSlotHints();
  }
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

  // Rune picker overlay (equip on selected defender)
  if (showRunePicker && runePickerTower) drawRunePicker();
  drawHelpOverlay();

  drawFrames();
  if (gamePhase === 'playing') {
    drawTopBar();
    drawUiToast();
    drawOnboardingBanner();
    drawGoldPoolsHint();
    drawAutoMoveHint();
  }
  ctx.restore();
}

function drawChapterBanner() {
  if (chapterBannerTimer <= 0) return;
  chapterBannerTimer--;
  const maxT  = 240;
  const alpha = chapterBannerTimer > 40
    ? Math.min(1, (maxT - chapterBannerTimer) / 22)
    : chapterBannerTimer / 40;
  const cx = gridScreenX(COLS * CELL_SIZE / 2);
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

function drawTutorialBanner() {
  if (_tutorialBannerTimer <= 0 || gamePhase !== 'playing') return;
  _tutorialBannerTimer--;
  const alpha = Math.min(1, _tutorialBannerTimer / 60);
  const cx = playfieldLeft() + playfieldWidth() / 2;
  const cy = canModifyWarbandDeployment() ? GRID_TOP + 50 : GRID_TOP + 12;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(4,12,4,${alpha * 0.42})`;
  ctx.beginPath(); ctx.roundRect(cx - 148, cy - 10, 296, 32, 3); ctx.fill();
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = `rgba(160,230,140,${alpha * 0.90})`;
  ctx.fillText('FIRST ASSAULT — Hold the gate', cx, cy + 2);
  ctx.font = '7px monospace';
  ctx.fillStyle = `rgba(140,200,120,${alpha * 0.75})`;
  ctx.fillText('Heroes near portal · Structures in fortress zone', cx, cy + 13);
  ctx.restore();
}

function drawFirstPlacementHint() {
  if (_campaignNodeMode) return;
  if (_hintSeen.firstPlacement || gamePhase !== 'playing' || waveNumber !== 1 || towers.length > 0 || waveState !== 'countdown') return;
  const hx = playfieldLeft() + playfieldWidth() / 2;
  const hy = GRID_TOP + (ROWS * CELL_SIZE) / 2 - 8;
  const hw = 240, hh = 38;
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = 'rgba(6,3,14,0.92)';
  ctx.beginPath(); ctx.roundRect(hx - hw / 2, hy - hh / 2, hw, hh, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(200,160,50,0.40)'; ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#d8c890';
  ctx.fillText('Place defenders on the grid', hx, hy - 4);
  ctx.font = '8px monospace'; ctx.fillStyle = 'rgba(160,135,80,0.65)';
  ctx.fillText('Drag from the deploy bar above ↑', hx, hy + 10);
  ctx.restore();
}

function drawDepthBanner() {
  if (_depthBannerTimer <= 0) return;
  _depthBannerTimer--;
  const maxT  = 180;
  const alpha = _depthBannerTimer > 40
    ? Math.min(1, (maxT - _depthBannerTimer) / 18)
    : _depthBannerTimer / 40;
  const cx = playfieldLeft() + playfieldWidth() / 2;
  const cy = GRID_TOP + (ROWS * CELL_SIZE) / 2 + 28;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(100,0,0,${alpha * 0.80})`;
  ctx.beginPath(); ctx.roundRect(cx - 110, cy - 18, 220, 34, 4); ctx.fill();
  ctx.font        = 'bold 14px monospace';
  ctx.fillStyle   = `rgba(255,80,60,${alpha})`;
  ctx.shadowColor = `rgba(180,20,10,${alpha * 0.95})`;
  ctx.shadowBlur  = 10;
  ctx.fillText(`DEPTH ${_depthBannerTier} REACHED`, cx, cy);
  ctx.shadowBlur = 0;
  ctx.font = '9px monospace'; ctx.fillStyle = `rgba(200,120,100,${alpha * 0.70})`;
  const _tierLabel = _depthBannerTier >= 20 ? '— THE ABYSS DEEPENS —'
                   : _depthBannerTier >= 10 ? '— THE SIEGE NEVER ENDS —'
                   : '— DESCENT CONTINUES —';
  ctx.fillText(_tierLabel, cx, cy + 12);
  ctx.restore();
}

function drawAncestralAidBanner() {
  if (!ancestralAidActive) return;
  const pulse = 0.65 + Math.abs(Math.sin(performance.now() * 0.010)) * 0.35;
  const cx = gridScreenX(COLS * CELL_SIZE / 2);
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
  const cx = gridScreenX(COLS * CELL_SIZE / 2);
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
  const cx = gridScreenX(COLS * CELL_SIZE / 2);
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
  const cx = gridScreenX(COLS * CELL_SIZE / 2);
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

function drawFossegrimWarning() {
  if (fossegrimWarningTimer <= 0) return;
  const fadeAlpha = fossegrimWarningTimer < 60 ? fossegrimWarningTimer / 60 : 1;
  const cx = gridScreenX(COLS * CELL_SIZE / 2);
  const by = GRID_TOP + 64;
  ctx.save();
  ctx.textAlign   = 'center';
  ctx.font        = 'bold 11px monospace';
  ctx.fillStyle   = `rgba(50,200,168,${fadeAlpha * 0.92})`;
  ctx.shadowColor = `rgba(20,150,130,${fadeAlpha * 0.8})`;
  ctx.shadowBlur  = 10;
  ctx.fillText('◈ FOSSEGRIM — HEALS NEARBY ENEMIES', cx, by);
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawWave1Hint() {
  if (waveNumber !== 0 || waveState !== 'countdown') return;
  if (_campaignNodeMode) return;
  if (isPathlessMode() && canModifyWarbandDeployment()) return;

  const cx    = playfieldLeft() + playfieldWidth() / 2;
  const cy    = GRID_TOP + 12;
  const pulse = 0.5 + Math.abs(Math.sin(performance.now() * 0.003)) * 0.5;
  const hw    = 280, hh = 18;
  ctx.save();
  ctx.globalAlpha = 0.55 + pulse * 0.25;
  ctx.fillStyle = 'rgba(4,2,12,0.42)';
  ctx.beginPath(); ctx.roundRect(cx - hw / 2, cy - hh / 2, hw, hh, 3); ctx.fill();
  ctx.strokeStyle = `rgba(200,160,60,${pulse * 0.25})`; ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = '7px monospace';
  ctx.fillStyle = `rgba(220,190,130,${0.70 + pulse * 0.30})`;
  ctx.fillText('Portal → Fortress  ·  Drag defenders onto the field', cx, cy + 3);
  ctx.restore();
}

function drawPathBlockFlash() {
  if (!pathBlockFlash) return;
  pathBlockFlash.timer--;
  if (pathBlockFlash.timer <= 0) { pathBlockFlash = null; return; }
  const { col, row, timer, type } = pathBlockFlash;
  const occupied  = type === 'occupied';
  const zoneBlock = type === 'zone';
  const alpha = Math.min(1, timer / 20) * (timer % 8 < 4 ? 1 : 0.4);
  const vx = gridScreenX(col * CELL_SIZE);
  const vy = gridScreenY(row * CELL_SIZE);
  const vs = gridScreenCell(CELL_SIZE);
  const fillC   = occupied ? '#e8b040' : zoneBlock ? '#4060e8' : '#e84040';
  const strokeC = occupied ? '#ffd040' : zoneBlock ? '#8090ff' : '#ff4040';
  const labelC  = occupied ? '#ffe080' : zoneBlock ? '#c0d0ff' : '#ff8080';
  const shadowC = occupied ? 'rgba(220,160,0,0.8)' : zoneBlock ? 'rgba(80,100,240,0.8)' : 'rgba(220,0,0,0.8)';
  const label   = occupied ? 'OCCUPIED' : zoneBlock ? 'FORTRESS ZONE ONLY' : 'PATH BLOCKED';
  ctx.save();
  ctx.globalAlpha  = alpha * 0.55;
  ctx.fillStyle    = fillC;
  ctx.fillRect(vx, vy, vs, vs);
  ctx.globalAlpha  = alpha * 0.9;
  ctx.strokeStyle  = strokeC;
  ctx.lineWidth    = 2;
  ctx.strokeRect(vx + 1, vy + 1, vs - 2, vs - 2);
  ctx.globalAlpha  = Math.min(1, timer / 20) * 0.92;
  ctx.font         = 'bold 14px monospace';
  ctx.fillStyle    = labelC;
  ctx.textAlign    = 'center';
  ctx.shadowColor  = shadowC;
  ctx.shadowBlur   = 10;
  ctx.fillText(label, vx + vs / 2, vy - 4);
  ctx.fillText(label, gridScreenX(COLS * CELL_SIZE / 2), gridScreenY(ROWS * CELL_SIZE / 2));
  ctx.shadowBlur   = 0;
  ctx.restore();
}

function drawPendingSell() {
  if (!pendingSell) return;
  const { col, row } = pendingSell;
  const tower = getTowerAtCell(col, row);
  const fp  = tower?.footprint ?? { w: 1, h: 1 };
  const vx  = gridScreenX(col * CELL_SIZE);
  const vy  = gridScreenY(row * CELL_SIZE);
  const vsW = gridScreenCell(fp.w * CELL_SIZE);
  const vsH = gridScreenCell(fp.h * CELL_SIZE);
  const pulse = 0.55 + Math.sin(performance.now() * 0.012) * 0.35;
  ctx.save();
  ctx.beginPath();
  ctx.rect(playfieldLeft(), GRID_TOP, playfieldWidth(), playfieldHeight());
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
    const _wd = wallData[`${pendingSell.col}_${pendingSell.row}`];
    ctx.fillText(`REMOVE GATE? (${sellCountdown}s)`, vx + vsW / 2, vy + vsH / 2 - 6);
    ctx.font      = '8px monospace';
    ctx.fillStyle = `rgba(240,200,60,${pulse * 0.8})`;
    const _refund = Math.floor(GATE_COST * 0.5);
    ctx.fillText(`Refund: ◆${_refund}`, vx + vsW / 2, vy + vsH / 2 + 8);
    if (_wd?.isGate && _wd.hp < _wd.maxHp) {
      const _repCost  = Math.max(1, Math.ceil((_wd.maxHp - _wd.hp) / _wd.maxHp * GATE_COST));
      const _canRep   = gold >= _repCost;
      ctx.fillStyle = `rgba(${_canRep ? '200,210,255' : '180,120,100'},${pulse * 0.9})`;
      ctx.fillText(`[R] Repair ◆${_repCost}`, vx + vsW / 2, vy + vsH / 2 + 20);
    }
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
    let canPlace = (dragItem.cost === 0 && dragItem.defenderId != null) || gold >= dragItem.cost;
    const _isHeroDrag = dragItem.mode === CELL.TOWER && HERO_BUILD_ITEMS.some(h => h.id === dragItem.id);
    const _isGateDrag = dragItem.mode === CELL.GATE;
    if (canPlace && _isGateDrag && !isFortressGateSlot(col, row)) canPlace = false;
    if (canPlace && !_isHeroDrag && !_isGateDrag && !isInFortressZone(col, row)) canPlace = false;
    if (canPlace) {
      for (let dc = 0; dc < fp.w && canPlace; dc++) {
        for (let dr = 0; dr < fp.h && canPlace; dr++) {
          const tc = col + dc, tr2 = row + dr;
          if (tc >= COLS || tr2 >= ROWS || grid.getCell(tc, tr2) !== CELL.EMPTY || hasEnemyInCell(tc, tr2))
            canPlace = false;
        }
      }
    }
    if (canPlace && !isPathlessMode()) {
      for (let dc = 0; dc < fp.w; dc++)
        for (let dr = 0; dr < fp.h; dr++)
          grid.setCell(col + dc, row + dr, dragItem.mode);
      {
        const _testPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
        if (!_testPath) canPlace = false;
        else for (const _tes of _extraSpawns) {
          if (!grid.findPath(_tes.col, _tes.row, GOAL.col, GOAL.row)) { canPlace = false; break; }
        }
      }
      for (let dc = 0; dc < fp.w; dc++)
        for (let dr = 0; dr < fp.h; dr++)
          grid.setCell(col + dc, row + dr, CELL.EMPTY);
    }

    const fpVX = gridScreenX(col * CELL_SIZE);
    const fpVY = gridScreenY(row * CELL_SIZE);
    const fpVW = gridScreenCell(fp.w * CELL_SIZE);
    const fpVH = gridScreenCell(fp.h * CELL_SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.rect(playfieldLeft(), GRID_TOP, playfieldWidth(), playfieldHeight());
    ctx.clip();
    const _isGate = dragItem.mode === CELL.GATE;
    ctx.fillStyle   = canPlace ? (_isGate ? 'rgba(200,160,80,0.35)' : 'rgba(80,220,80,0.28)') : 'rgba(220,60,60,0.42)';
    ctx.fillRect(fpVX, fpVY, fpVW, fpVH);
    ctx.strokeStyle = canPlace ? (_isGate ? 'rgba(220,180,100,0.75)' : 'rgba(120,255,120,0.75)') : 'rgba(255,80,80,0.75)';
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
        ctx.arc(cx2, cy2, gridScreenCell(tRange), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Splash radius ring for catapult/drakship
        const splashR = tDef?.splashRadius ?? 0;
        if (splashR > 0) {
          ctx.strokeStyle = 'rgba(255,140,40,0.70)';
          ctx.lineWidth   = 1;
          ctx.setLineDash([6, 2]);
          ctx.beginPath();
          ctx.arc(cx2, cy2, gridScreenCell(splashR), 0, Math.PI * 2);
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
  const _isBenchHero = dragItem.cost === 0 && dragItem.defenderId != null;
  ctx.fillStyle = _isBenchHero ? '#60e878' : (gold >= dragItem.cost ? '#e8c040' : '#ff6060');
  ctx.fillText(_isBenchHero ? 'FREE' : `◆${dragItem.cost}`, cx, gy + gh - 3);
  ctx.restore();
}

function gameLoop() {
  // Terrain is always procedural — no sprite rebake needed
  // Auto-launch countdown on map select screen
  if (gamePhase === 'mapSelect' && _mapAutoStartEnabled) {
    if (mapAutoTimerStart === 0) mapAutoTimerStart = performance.now();
    if (performance.now() - mapAutoTimerStart >= MAP_AUTO_DELAY) {
      initGame(PRESET_MAPS[selectedMapIdx]);
      _mapAutoStartEnabled = false;
      mapAutoTimerStart = 0;
    }
  }
  _frameTick++;
  if (_structuresTabPulse > 0) _structuresTabPulse--;
  if (_settlementStoneFlash > 0) _settlementStoneFlash = Math.max(0, _settlementStoneFlash - 18);
  tickAssaultDamageFlashes();
  // 1x=30 ticks/s (alt frames), 2x=60 ticks/s (every frame), 4x=120 ticks/s (2 per frame)
  const _ticks = gameSpeed >= 4 ? 2 : (gameSpeed >= 2 || _frameTick % 2 === 1) ? 1 : 0;
  for (let _i = 0; _i < _ticks; _i++) update();
  draw();
  requestAnimationFrame(gameLoop);
}

computeScale();
window.addEventListener('resize', computeScale);
window.addEventListener('beforeunload', () => { if (_activeSlotIndex != null) persistCampaign(); });
initTerrain();
_slotsMeta = migrateLegacyToSlots();
gameLoop();
