import { describe, expect, test } from 'vitest';
import { DIFFICULTY_PRESETS } from './difficulty';

describe('difficulty presets', () => {
    test('scale enemy pressure from low to high', () => {
        expect(DIFFICULTY_PRESETS.low.enemyCount).toBeLessThan(DIFFICULTY_PRESETS.medium.enemyCount);
        expect(DIFFICULTY_PRESETS.medium.enemyCount).toBeLessThan(DIFFICULTY_PRESETS.high.enemyCount);
        expect(DIFFICULTY_PRESETS.low.visibilityRange).toBeLessThan(DIFFICULTY_PRESETS.high.visibilityRange);
        expect(DIFFICULTY_PRESETS.low.fireCooldownMs).toBeGreaterThan(DIFFICULTY_PRESETS.high.fireCooldownMs);
        expect(DIFFICULTY_PRESETS.low.reactionDelayMs).toBeGreaterThan(DIFFICULTY_PRESETS.high.reactionDelayMs);
    });
});
