import { describe, it, expect } from 'vitest';
import { Enemy } from '../src/entities/enemy.js';

describe('Enemy', () => {
  it('moves along waypoints and reaches goal', () => {
    const enemy = new Enemy(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 }
      ],
      5
    );

    enemy.update();
    expect(enemy.x).toBe(5);
    expect(enemy.y).toBe(0);
    expect(enemy.pathIndex).toBe(0);

    enemy.update();
    expect(enemy.x).toBe(10);
    expect(enemy.pathIndex).toBe(1);

    enemy.update();
    enemy.update();
    expect(enemy.x).toBe(20);
    expect(enemy.pathIndex).toBe(2);

    enemy.update();
    expect(enemy.reached).toBe(true);
  });

  it('reroutes with setPath without teleporting', () => {
    const enemy = new Enemy(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 }
      ],
      2
    );

    enemy.update();
    enemy.update();
    expect(enemy.x).toBe(4);
    expect(enemy.y).toBe(0);

    enemy.setPath([
      { x: 10, y: 10 },
      { x: 20, y: 10 }
    ]);

    expect(enemy.path[0]).toEqual({ x: 4, y: 0 });
    expect(enemy.pathIndex).toBe(0);

    enemy.update();
    expect(enemy.y).toBeGreaterThan(0);
  });
});
