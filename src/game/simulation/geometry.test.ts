import { describe, expect, test } from 'vitest';
import { circleIntersectsRect, rectsOverlap } from './geometry';

describe('geometry collision helpers', () => {
    test('detects rectangle overlap with padding', () => {
        const first = { x: 10, y: 10, width: 40, height: 40 };
        const second = { x: 58, y: 10, width: 30, height: 30 };

        expect(rectsOverlap(first, second, 0)).toBe(false);
        expect(rectsOverlap(first, second, 10)).toBe(true);
    });

    test('detects circle collision at the rectangle edge before the center enters', () => {
        const obstacle = { x: 100, y: 100, width: 40, height: 40 };

        expect(circleIntersectsRect({ x: 88, y: 120 }, 14, obstacle)).toBe(true);
        expect(circleIntersectsRect({ x: 80, y: 120 }, 14, obstacle)).toBe(false);
    });
});
