import { describe, it, expect } from 'vitest';
import { Enemy, ENEMY_TYPES, getEnemyGoldSteal, getEnemyTargetPriority, computeAssaultDefeatGoldRaid } from '../src/entities/enemy.js';

describe('Enemy', () => {
  it('moves along waypoints and reaches goal', () => {
    const enemy = new Enemy([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }]);
    enemy.baseSpeed = 5;

    enemy.update();
    expect(enemy.x).toBe(5);
    expect(enemy.y).toBe(0);
    expect(enemy.pathIndex).toBe(0);

    enemy.update();           // dist=5 ≤ 5 → snap to (10,0)
    expect(enemy.x).toBe(10);
    expect(enemy.pathIndex).toBe(1);

    enemy.update();
    enemy.update();           // 10→15, 15→20 (snap)
    expect(enemy.x).toBe(20);
    expect(enemy.pathIndex).toBe(2);

    enemy.update();
    expect(enemy.reached).toBe(true);
  });

  it('reroutes with setPath without teleporting', () => {
    const enemy = new Enemy([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }]);
    enemy.baseSpeed = 2;

    enemy.update();
    enemy.update();
    expect(enemy.x).toBe(4);
    expect(enemy.y).toBe(0);

    enemy.setPath([{ x: 10, y: 10 }, { x: 20, y: 10 }]);

    expect(enemy.path[0]).toEqual({ x: 4, y: 0 });
    expect(enemy.pathIndex).toBe(0);

    enemy.update();
    expect(enemy.y).toBeGreaterThan(0);
  });

  it('calculates gold steal from reward with plunder multiplier, capped by current gold', () => {
    const enemy = new Enemy([{ x: 0, y: 0 }], ENEMY_TYPES.JOTUNN);
    expect(getEnemyGoldSteal(enemy, 200)).toBe(40); // 32 * 1.25
    expect(getEnemyGoldSteal(enemy, 10)).toBe(10);
    expect(getEnemyGoldSteal(enemy, 0)).toBe(0);

    enemy.isElite = true;
    enemy.reward = 64;
    expect(getEnemyGoldSteal(enemy, 100)).toBe(80); // 64 * 1.25
  });

  it('exposes ordered target priorities per enemy type', () => {
    expect(getEnemyTargetPriority(ENEMY_TYPES.MYLING)).toEqual(['goal', 'warband']);
    expect(getEnemyTargetPriority(ENEMY_TYPES.JOTUNN)).toEqual(['structures', 'warband', 'goal']);
    expect(getEnemyTargetPriority(ENEMY_TYPES.DRAUGR)).toEqual(['warband', 'structures', 'goal']);
  });

  it('computes heavy defeat raid on remaining assault gold', () => {
    const raiders = [new Enemy([{ x: 0, y: 0 }], ENEMY_TYPES.MYLING)];
    const raid = computeAssaultDefeatGoldRaid(200, raiders);
    expect(raid).toBeGreaterThan(100);
    expect(raid).toBeLessThanOrEqual(200);
  });
});
