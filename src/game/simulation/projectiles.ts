import type { Point, ProjectileState, Rect, Team } from './state';
import { pointInRect } from './geometry';

let projectileSequence = 0;

export function createProjectile(
    ownerTeam: Team,
    position: Point,
    rotation: number,
    speed: number,
    lifetimeMs: number,
    damage: number
): ProjectileState {
    projectileSequence += 1;
    return {
        id: `projectile-${projectileSequence}`,
        ownerTeam,
        position: { ...position },
        rotation,
        speed,
        damage,
        lifetimeRemainingMs: lifetimeMs
    };
}

export function updateProjectiles(projectiles: ProjectileState[], blockers: Rect[], deltaMs: number): ProjectileState[] {
    return projectiles
        .map((projectile) => ({
            ...projectile,
            position: advanceProjectile(projectile, deltaMs),
            lifetimeRemainingMs: projectile.lifetimeRemainingMs - deltaMs
        }))
        .filter((projectile) => projectile.lifetimeRemainingMs > 0)
        .filter((projectile) => blockers.every((blocker) => !pointInRect(projectile.position, blocker)));
}

function advanceProjectile(projectile: ProjectileState, deltaMs: number): Point {
    const radians = projectile.rotation - Math.PI / 2;
    const distance = projectile.speed * (deltaMs / 1000);

    return {
        x: projectile.position.x + Math.cos(radians) * distance,
        y: projectile.position.y + Math.sin(radians) * distance
    };
}
