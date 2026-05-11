import { describe, it, expect } from 'vitest';
import { Tower } from '../src/entities/tower.js';
import { Bullet } from '../src/entities/bullet.js';

describe('Tower', () => {
  it('targets the most progressed enemy in range', () => {
    const tower = new Tower(0, 0, 0, 0);

    const behind = { x: 20, y: 0, pathIndex: 1, hp: 100, alive: true, reached: false };
    const ahead = { x: 40, y: 0, pathIndex: 3, hp: 100, alive: true, reached: false };

    tower.update([behind, ahead]);

    expect(ahead.hp).toBe(65);
    expect(behind.hp).toBe(100);
  });

  it('applies cooldown between shots', () => {
    const tower = new Tower(0, 0, 0, 0);
    const enemy = { x: 10, y: 0, pathIndex: 0, hp: 100, alive: true, reached: false };

    tower.update([enemy]);
    expect(enemy.hp).toBe(65);

    tower.update([enemy]);
    expect(enemy.hp).toBe(65);
  });

  it('returns kill count when enemy dies', () => {
    const tower = new Tower(0, 0, 0, 0);
    const enemy = { x: 10, y: 0, pathIndex: 0, hp: 20, alive: true, reached: false };

    const kills = tower.update([enemy]);

    expect(kills).toBe(1);
    expect(enemy.alive).toBe(false);
    expect(enemy.hp).toBe(0);
  });

  it('spawns a bullet when projectile mode is enabled', () => {
    const tower = new Tower(0, 0, 0, 0);
    const enemy = { x: 10, y: 0, radius: 7, pathIndex: 0, hp: 100, alive: true, reached: false };
    const bullets = [];

    const kills = tower.update([enemy], bullets);

    expect(kills).toBe(0);
    expect(enemy.hp).toBe(100);
    expect(bullets.length).toBe(1);
    expect(bullets[0]).toBeInstanceOf(Bullet);
  });
});
