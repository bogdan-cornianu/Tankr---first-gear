import { describe, expect, test } from 'vitest';
import {
    DEFAULT_BINDINGS,
    decodeBindings,
    encodeBindings,
    rebindAction
} from './bindings';

describe('input bindings', () => {
    test('serialize and decode custom movement bindings', () => {
        const bindings = rebindAction(DEFAULT_BINDINGS, 'moveUp', 'ArrowUp');

        const decoded = decodeBindings(encodeBindings(bindings));

        expect(decoded.moveUp).toBe('ArrowUp');
        expect(decoded.moveDown).toBe('KeyS');
    });

    test('reject duplicate key assignments', () => {
        expect(() => rebindAction(DEFAULT_BINDINGS, 'moveUp', 'KeyS')).toThrow(/already bound/i);
    });

    test('falls back to defaults for invalid saved data', () => {
        expect(decodeBindings('not-json')).toEqual(DEFAULT_BINDINGS);
        expect(decodeBindings(JSON.stringify({ moveUp: 'KeyI' }))).toEqual(DEFAULT_BINDINGS);
    });
});
