import { describe, it, expect } from 'vitest';
import { Bullet } from '../src/entities/bullet.js';

describe('Bullet', () => {
  it('moves toward target and damages on hit', () => {
    const target = { x: 30, y: 0, radius: 7, hp: 100, alive: true, reached: false };
    const bullet = new Bullet(0, 0, target, 35, 10);

    let frames = 0;
    while (bullet.alive && frames < 10) {
      bullet.update();
      frames++;
    }

    expect(bullet.alive).toBe(false);
    expect(target.hp).toBe(65);
    expect(target.alive).toBe(true);
  });

  it('returns kill count when hit kills target', () => {
    const target = { x: 12, y: 0, radius: 7, hp: 20, alive: true, reached: false };
    const bullet = new Bullet(0, 0, target, 35, 20);

    const kills = bullet.update();

    expect(kills).toBe(1);
    expect(target.alive).toBe(false);
    expect(target.hp).toBe(0);
  });
});
