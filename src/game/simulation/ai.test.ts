import { describe, expect, test } from 'vitest';
import { updateEnemyAi } from './ai';
import type { EnemyState, Rect, TankState } from './state';

const player: TankState = {
    id: 'player',
    team: 'player',
    position: { x: 100, y: 100 },
    rotation: 0,
    turretRotation: 0,
    health: 100,
    maxHealth: 100,
    speed: 160,
    fireCooldownRemainingMs: 0,
    alive: true
};

const enemy: EnemyState = {
    id: 'enemy-1',
    team: 'enemy',
    position: { x: 180, y: 100 },
    rotation: 0,
    turretRotation: 0,
    health: 60,
    maxHealth: 60,
    speed: 105,
    fireCooldownRemainingMs: 0,
    alive: true,
    ai: {
        state: 'patrol',
        visibilityRange: 180,
        reactionDelayMs: 0,
        reactionRemainingMs: 0,
        patrolPoints: [
            { x: 180, y: 100 },
            { x: 240, y: 100 }
        ],
        patrolIndex: 0
    }
};

describe('enemy AI', () => {
    test('engages when the player is inside range with clear line of sight', () => {
        const next = updateEnemyAi(enemy, player, [], 16);

        expect(next.ai.state).toBe('engage');
        expect(next.turretRotation).toBeCloseTo(Math.PI * 1.5, 4);
    });

    test('does not engage when an obstacle blocks line of sight', () => {
        const blockers: Rect[] = [{ x: 135, y: 80, width: 20, height: 40 }];

        const next = updateEnemyAi(enemy, player, blockers, 16);

        expect(next.ai.state).toBe('patrol');
    });

    test('stops patrol movement at obstacle edges instead of tank center', () => {
        const patrolEnemy: EnemyState = {
            ...enemy,
            position: { x: 70, y: 200 },
            speed: 120,
            ai: {
                ...enemy.ai,
                visibilityRange: 10,
                patrolPoints: [
                    { x: 220, y: 200 }
                ],
                patrolIndex: 0
            }
        };
        const blockers: Rect[] = [{ x: 100, y: 176, width: 40, height: 48 }];

        const next = updateEnemyAi(patrolEnemy, player, blockers, 1000);

        expect(next.position.x).toBeLessThan(80);
        expect(next.position.x).toBeGreaterThan(70);
    });
});
