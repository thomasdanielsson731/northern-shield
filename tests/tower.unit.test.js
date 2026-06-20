import { describe, it, expect } from 'vitest';
import { Tower } from '../src/entities/tower.js';
import { Bullet } from '../src/entities/bullet.js';

function makeEnemy(overrides) {
  return { x: 10, y: 0, radius: 7, pathIndex: 0, hp: 100, alive: true, reached: false,
    kill() { this.alive = false; }, ...overrides };
}

describe('Tower', () => {
  it('targets the most progressed enemy in range', () => {
    const tower = new Tower(0, 0, 0, 0);
    tower.fireCooldown = 0;

    // Both within BERSERK range (22px). Ahead has higher pathIndex.
    const behind = makeEnemy({ x: 15, pathIndex: 1, hp: 100 });
    const ahead  = makeEnemy({ x: 20, pathIndex: 3, hp: 100 });

    tower.update([behind, ahead]);

    expect(ahead.hp).toBe(52);   // 100 - 48 damage
    expect(behind.hp).toBe(100);
  });

  it('applies cooldown between shots', () => {
    const tower = new Tower(0, 0, 0, 0);
    tower.fireCooldown = 0;
    const enemy = makeEnemy({ x: 10 });

    tower.update([enemy]);
    expect(enemy.hp).toBe(52);  // 100 - 48

    tower.update([enemy]);       // fireCooldown now 22, no shot
    expect(enemy.hp).toBe(52);
  });

  it('returns kill count when enemy dies', () => {
    const tower = new Tower(0, 0, 0, 0);
    tower.fireCooldown = 0;
    const enemy = makeEnemy({ x: 10, hp: 20 });

    const kills = tower.update([enemy]);

    expect(kills).toBe(1);
    expect(enemy.alive).toBe(false);
    expect(enemy.hp).toBe(0);
  });

  it('spawns a bullet when projectile mode is enabled', () => {
    const tower = new Tower(0, 0, 0, 0);
    tower.fireCooldown = 0;
    const enemy   = makeEnemy({ x: 10 });
    const bullets = [];

    const kills = tower.update([enemy], bullets);

    expect(kills).toBe(0);
    expect(enemy.hp).toBe(100);
    expect(bullets.length).toBe(1);
    expect(bullets[0]).toBeInstanceOf(Bullet);
  });
});
