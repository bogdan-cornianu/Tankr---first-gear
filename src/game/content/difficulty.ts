import type { Difficulty, DifficultyPreset } from '../simulation/state';

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
    low: {
        id: 'low',
        label: 'Low',
        enemyCount: 4,
        enemyHealth: 50,
        enemySpeed: 90,
        enemyProjectileSpeed: 230,
        enemyDamage: 12,
        fireCooldownMs: 1250,
        reactionDelayMs: 550,
        visibilityRange: 230
    },
    medium: {
        id: 'medium',
        label: 'Medium',
        enemyCount: 7,
        enemyHealth: 65,
        enemySpeed: 105,
        enemyProjectileSpeed: 275,
        enemyDamage: 16,
        fireCooldownMs: 950,
        reactionDelayMs: 350,
        visibilityRange: 300
    },
    high: {
        id: 'high',
        label: 'High',
        enemyCount: 10,
        enemyHealth: 80,
        enemySpeed: 120,
        enemyProjectileSpeed: 320,
        enemyDamage: 20,
        fireCooldownMs: 700,
        reactionDelayMs: 180,
        visibilityRange: 380
    }
};
