import type { EnemyState, Rect, TankState } from './state';
import { angleBetween, circleIntersectsRect, distanceBetween, hasLineOfSight, moveToward } from './geometry';

const TANK_COLLISION_RADIUS = 22;

export function updateEnemyAi(enemy: EnemyState, player: TankState, blockers: Rect[], deltaMs: number): EnemyState {
    if (!enemy.alive || !player.alive) {
        return enemy;
    }

    const canSeePlayer = distanceBetween(enemy.position, player.position) <= enemy.ai.visibilityRange &&
        hasLineOfSight(enemy.position, player.position, blockers);

    if (canSeePlayer) {
        const reactionRemainingMs = Math.max(0, enemy.ai.reactionRemainingMs - deltaMs);
        return {
            ...enemy,
            turretRotation: angleBetween(enemy.position, player.position),
            ai: {
                ...enemy.ai,
                state: reactionRemainingMs === 0 ? 'engage' : 'investigate',
                reactionRemainingMs,
                lastKnownPlayerPosition: { ...player.position }
            }
        };
    }

    if (enemy.ai.state === 'engage' || enemy.ai.state === 'investigate') {
        return {
            ...enemy,
            ai: {
                ...enemy.ai,
                state: 'reposition',
                reactionRemainingMs: enemy.ai.reactionDelayMs
            }
        };
    }

    return patrolEnemy(enemy, blockers, deltaMs);
}

function patrolEnemy(enemy: EnemyState, blockers: Rect[], deltaMs: number): EnemyState {
    const target = enemy.ai.patrolPoints[enemy.ai.patrolIndex] ?? enemy.position;
    const desiredPosition = moveToward(enemy.position, target, enemy.speed * (deltaMs / 1000));
    const nextPosition = resolveEnemyMovement(enemy.position, desiredPosition, blockers);
    const reachedTarget = distanceBetween(nextPosition, target) < 4;
    const nextIndex = reachedTarget
        ? (enemy.ai.patrolIndex + 1) % enemy.ai.patrolPoints.length
        : enemy.ai.patrolIndex;
    const nextTarget = enemy.ai.patrolPoints[nextIndex] ?? target;

    return {
        ...enemy,
        position: nextPosition,
        rotation: angleBetween(enemy.position, nextTarget),
        turretRotation: angleBetween(enemy.position, nextTarget),
        ai: {
            ...enemy.ai,
            state: enemy.ai.state === 'reposition' ? 'reposition' : 'patrol',
            patrolIndex: nextIndex
        }
    };
}

function resolveEnemyMovement(current: EnemyState['position'], desired: EnemyState['position'], blockers: Rect[]): EnemyState['position'] {
    const distance = distanceBetween(current, desired);
    if (distance === 0) {
        return current;
    }

    const steps = Math.max(1, Math.ceil(distance / 6));
    let lastClear = current;

    for (let step = 1; step <= steps; step += 1) {
        const candidate = {
            x: current.x + (desired.x - current.x) * (step / steps),
            y: current.y + (desired.y - current.y) * (step / steps)
        };

        if (!isTankPositionClear(candidate, blockers)) {
            return lastClear;
        }

        lastClear = candidate;
    }

    return lastClear;
}

function isTankPositionClear(position: EnemyState['position'], blockers: Rect[]): boolean {
    return blockers.every((blocker) => !circleIntersectsRect(position, TANK_COLLISION_RADIUS, blocker));
}
