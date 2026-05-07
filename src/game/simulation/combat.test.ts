import { describe, expect, test } from 'vitest';
import { applyProjectileHit, createInitialGameState, getEnemiesLeft } from './combat';
import { DIFFICULTY_PRESETS } from '../content/difficulty';
import { generateArena } from '../content/arena';

describe('combat', () => {
    test('damages tanks and removes enemies from enemies-left count on death', () => {
        const arena = generateArena(7, DIFFICULTY_PRESETS.low);
        const state = createInitialGameState(arena, DIFFICULTY_PRESETS.low);
        const enemyId = state.enemies[0].id;

        const damaged = applyProjectileHit(state, enemyId, 20);
        expect(damaged.enemies[0].health).toBe(DIFFICULTY_PRESETS.low.enemyHealth - 20);

        const destroyed = applyProjectileHit(damaged, enemyId, 500);
        expect(destroyed.enemies[0].alive).toBe(false);
        expect(getEnemiesLeft(destroyed)).toBe(DIFFICULTY_PRESETS.low.enemyCount - 1);
    });

    test('marks the run lost when player health reaches zero', () => {
        const arena = generateArena(7, DIFFICULTY_PRESETS.low);
        const state = createInitialGameState(arena, DIFFICULTY_PRESETS.low);

        const next = applyProjectileHit(state, 'player', 1000);

        expect(next.player.alive).toBe(false);
        expect(next.outcome).toBe('lost');
    });
});
