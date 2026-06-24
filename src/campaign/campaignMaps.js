/**
 * Campaign map definitions — 100 regions, each with 10–30 nodes.
 * Nodes have 2–3 waves; the final node ends with a boss wave.
 */

export const CAMPAIGN_MAP_COUNT = 100;
export const MIN_NODES_PER_MAP  = 10;
export const MAX_NODES_PER_MAP  = 30;
export const MIN_WAVES_PER_NODE = 2;
export const MAX_WAVES_PER_NODE = 3;

export const MAX_FIELD_HEROES     = 10;
export const MAX_FIELD_STRUCTURES = 10;

const MAP_NAMES = [
  'MIDGARD', 'BIFROST PASS', "NIDHOGG'S RUN", 'FROST GATE', 'IRON FJORD',
  'ASH WATCH', 'RUNE VALLEY', 'WOLF DEN', 'DRAGON COAST', 'SHIELD MARCH',
];

/** Mulberry32 — deterministic per map/node seed. */
export function createRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getMapSeed(mapIndex) {
  return (mapIndex + 1) * 9973 + 42;
}

export function getNodeCountForMap(mapIndex) {
  const rng = createRng(getMapSeed(mapIndex));
  const span = MAX_NODES_PER_MAP - MIN_NODES_PER_MAP + 1;
  return MIN_NODES_PER_MAP + Math.floor(rng() * span);
}

/** Active portal count scales with campaign map tier (1 → 4). */
export function getPortalCountForMap(mapIndex) {
  if (mapIndex < 15)  return 1;
  if (mapIndex < 40)  return 2;
  if (mapIndex < 70)  return 3;
  return 4;
}

export function getMapDisplayName(mapIndex) {
  const base = MAP_NAMES[mapIndex % MAP_NAMES.length];
  const chapter = Math.floor(mapIndex / MAP_NAMES.length) + 1;
  return chapter > 1 ? `${base} ${chapter}` : base;
}

export function getWaveCountForNode(mapIndex, nodeIndex) {
  const rng = createRng(getMapSeed(mapIndex) + nodeIndex * 131);
  return MIN_WAVES_PER_NODE + Math.floor(rng() * (MAX_WAVES_PER_NODE - MIN_WAVES_PER_NODE + 1));
}

/** Difficulty scales with map + node position (0..1 along the path). */
export function getNodeDifficulty(mapIndex, nodeIndex, nodeCount) {
  const mapTier   = mapIndex / Math.max(1, CAMPAIGN_MAP_COUNT - 1);
  const nodeTier  = nodeIndex / Math.max(1, nodeCount - 1);
  return 0.35 + mapTier * 0.45 + nodeTier * 0.35;
}

/** Boss config keyed by map tier — rotates through boss archetypes. */
const NODE_BOSS_TIERS = [
  { name: 'DRAUGEN-JARL',     hpScale: 1.0,  reward: 80  },
  { name: 'JÖTUNHELM WALKER', hpScale: 1.6,  reward: 150 },
  { name: 'MARA-VOID',        hpScale: 2.2,  reward: 250 },
  { name: 'FENRIR',           hpScale: 3.5,  reward: 500 },
  { name: 'SURTR',            hpScale: 5.0,  reward: 1000 },
];

export function getNodeBossConfig(mapIndex) {
  const tier = Math.min(NODE_BOSS_TIERS.length - 1, Math.floor(mapIndex / 20));
  const base = NODE_BOSS_TIERS[tier];
  const scale = 1 + mapIndex * 0.04;
  return {
    name:   base.name,
    hp:     Math.round(1200 * base.hpScale * scale),
    reward: Math.round(base.reward * (1 + mapIndex * 0.08)),
  };
}

/**
 * Build wave plan for a node attack.
 * @returns {{ waves: Array<{ waveInNode: number, isBoss: boolean, difficulty: number }>, nodeCount, isLastNode }}
 */
export function buildNodeWavePlan(mapIndex, nodeIndex) {
  const nodeCount   = getNodeCountForMap(mapIndex);
  const waveCount   = getWaveCountForNode(mapIndex, nodeIndex);
  const isLastNode  = nodeIndex >= nodeCount - 1;
  const difficulty = getNodeDifficulty(mapIndex, nodeIndex, nodeCount);

  const waves = [];
  for (let w = 1; w <= waveCount; w++) {
    waves.push({
      waveInNode: w,
      isBoss:     isLastNode && w === waveCount,
      difficulty: difficulty * (0.85 + (w - 1) * 0.12),
    });
  }
  return { waves, nodeCount, isLastNode, waveCount };
}

/** Full map metadata (lazy — generate nodes on demand). */
export function getCampaignMapMeta(mapIndex) {
  if (mapIndex < 0 || mapIndex >= CAMPAIGN_MAP_COUNT) return null;
  const nodeCount = getNodeCountForMap(mapIndex);
  return {
    mapIndex,
    name:         getMapDisplayName(mapIndex),
    nodeCount,
    portalCount:  getPortalCountForMap(mapIndex),
    boss:         getNodeBossConfig(mapIndex),
  };
}

export function createEmptyCampaignProgress() {
  return {
    mapsUnlocked:     1,
    clearedMaps:      [],
    currentMapIndex:  null,
    currentNodeIndex: null,
    /** mapIndex → { nodesCleared: number[], fieldState: object|null } */
    mapRuns:          {},
  };
}

export function getMapRun(progress, mapIndex) {
  if (!progress.mapRuns[mapIndex]) {
    progress.mapRuns[mapIndex] = { nodesCleared: [], fieldState: null };
  }
  return progress.mapRuns[mapIndex];
}

export function isNodeUnlocked(progress, mapIndex, nodeIndex) {
  if (mapIndex >= progress.mapsUnlocked) return false;
  if (nodeIndex === 0) return true;
  const run = progress.mapRuns[mapIndex];
  return run?.nodesCleared?.includes(nodeIndex - 1) ?? false;
}

export function isMapComplete(progress, mapIndex) {
  const meta = getCampaignMapMeta(mapIndex);
  if (!meta) return false;
  const run = progress.mapRuns[mapIndex];
  if (!run) return false;
  return run.nodesCleared.includes(meta.nodeCount - 1);
}

/** Map difficulty (0–1) to an equivalent skirmish wave number for composition. */
export function difficultyToEquivWave(difficulty, waveInNode = 1) {
  return Math.max(3, Math.min(95, Math.round(8 + difficulty * 70 + (waveInNode - 1) * 6)));
}

const ENEMY_TYPES_REF = {
  DRAUGR: 'draugr', MYLING: 'myling', JOTUNN: 'jotunn', MARA: 'mara',
  WARG: 'warg', EINHERJAR: 'einherjar', FOSSEGRIM: 'fossegrim',
};

/**
 * Spawn queue for one campaign node wave.
 * Boss waves on the last node end with a node boss marker.
 */
export function buildCampaignNodeSpawnQueue(waveSpec, mapIndex) {
  const equiv = difficultyToEquivWave(waveSpec.difficulty, waveSpec.waveInNode);
  if (waveSpec.isBoss) {
    const heraldCount = 4 + Math.floor(waveSpec.difficulty * 6);
    const types = [ENEMY_TYPES_REF.DRAUGR, ENEMY_TYPES_REF.WARG, ENEMY_TYPES_REF.MARA];
    const heralds = [];
    for (let i = 0; i < heraldCount; i++) {
      heralds.push({ __herald: true, type: types[i % types.length] });
    }
    heralds.push({ __nodeBoss: true, mapIndex });
    return heralds;
  }
  const count = 4 + Math.floor(equiv * 0.35);
  const mix = [
    ...Array(Math.ceil(count * 0.45)).fill(ENEMY_TYPES_REF.DRAUGR),
    ...Array(Math.ceil(count * 0.25)).fill(ENEMY_TYPES_REF.WARG),
    ...Array(Math.ceil(count * 0.15)).fill(ENEMY_TYPES_REF.MYLING),
    ...Array(Math.ceil(count * 0.10)).fill(ENEMY_TYPES_REF.MARA),
    ...Array(Math.floor(count * 0.05)).fill(ENEMY_TYPES_REF.JOTUNN),
  ];
  for (let i = mix.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mix[i], mix[j]] = [mix[j], mix[i]];
  }
  return mix.slice(0, count);
}
