import { describe, expect, test } from 'vitest';
import { coverScale, verticalPosition, viewportCenter } from './layout';

describe('scene viewport layout', () => {
    test('centers UI from the live viewport size', () => {
        expect(viewportCenter({ width: 1920, height: 1080 })).toEqual({ x: 960, y: 540 });
        expect(viewportCenter({ width: 1366, height: 768 })).toEqual({ x: 683, y: 384 });
    });

    test('covers the viewport without distorting a background image', () => {
        const scale = coverScale({ width: 1920, height: 1080 }, { width: 1672, height: 941 });

        expect(scale).toBeCloseTo(1.148, 2);
    });

    test('places vertical UI by viewport ratio', () => {
        expect(verticalPosition({ width: 1600, height: 900 }, 0.25)).toBe(225);
    });
});
