import type { ArenaData, DifficultyPreset, EnemyState, GameOutcome, GameState, TankState } from './state';

export function createInitialGameState(arena: ArenaData, difficulty: DifficultyPreset): GameState {
    const player: TankState = {
        id: 'player',
        team: 'player',
        position: { ...arena.playerSpawn },
        rotation: 0,
        turretRotation: 0,
        health: 100,
        maxHealth: 100,
        speed: 175,
        fireCooldownRemainingMs: 0,
        alive: true
    };

    const enemies: EnemyState[] = arena.enemySpawns.map((spawn, index) => ({
        id: `enemy-${index + 1}`,
        team: 'enemy',
        position: { ...spawn.position },
        rotation: 0,
        turretRotation: 0,
        health: difficulty.enemyHealth,
        maxHealth: difficulty.enemyHealth,
        speed: difficulty.enemySpeed,
        fireCooldownRemainingMs: difficulty.fireCooldownMs,
        alive: true,
        ai: {
            state: 'patrol',
            visibilityRange: difficulty.visibilityRange,
            reactionDelayMs: difficulty.reactionDelayMs,
            reactionRemainingMs: difficulty.reactionDelayMs,
            patrolPoints: spawn.patrolPoints.map((point) => ({ ...point })),
            patrolIndex: 0
        }
    }));

    return {
        arena,
        player,
        enemies,
        projectiles: [],
        outcome: 'playing'
    };
}

export function applyProjectileHit(state: GameState, targetId: string, damage: number): GameState {
    if (targetId === state.player.id) {
        const player = damageTank(state.player, damage);
        return {
            ...state,
            player,
            outcome: player.alive ? state.outcome : 'lost'
        };
    }

    const enemies = state.enemies.map((enemy) => (
        enemy.id === targetId ? damageTank(enemy, damage) as EnemyState : enemy
    ));

    return {
        ...state,
        enemies,
        outcome: resolveOutcome(state.player, enemies)
    };
}

export function getEnemiesLeft(state: GameState): number {
    return state.enemies.filter((enemy) => enemy.alive).length;
}

function damageTank<T extends TankState>(tank: T, damage: number): T {
    const health = Math.max(0, tank.health - damage);
    return {
        ...tank,
        health,
        alive: health > 0
    };
}

function resolveOutcome(player: TankState, enemies: EnemyState[]): GameOutcome {
    if (!player.alive) {
        return 'lost';
    }

    return enemies.some((enemy) => enemy.alive) ? 'playing' : 'won';
}
