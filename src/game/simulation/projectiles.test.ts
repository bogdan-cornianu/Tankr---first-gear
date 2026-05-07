import { describe, expect, test } from 'vitest';
import { createProjectile, updateProjectiles } from './projectiles';
import type { Rect } from './state';

describe('projectiles', () => {
    test('expires projectiles after their lifetime', () => {
        const projectile = createProjectile('player', { x: 10, y: 10 }, 0, 200, 50, 20);

        const next = updateProjectiles([projectile], [], 60);

        expect(next).toHaveLength(0);
    });

    test('removes projectiles that hit blocking obstacles', () => {
        const projectile = createProjectile('player', { x: 10, y: 10 }, Math.PI / 2, 200, 500, 20);
        const blockers: Rect[] = [{ x: 15, y: 0, width: 20, height: 30 }];

        const next = updateProjectiles([projectile], blockers, 50);

        expect(next).toHaveLength(0);
    });
});
