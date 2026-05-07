import type { Difficulty } from './simulation/state';
import { decodeBindings, DEFAULT_BINDINGS, encodeBindings, type ControlBindings } from './input/bindings';

const DIFFICULTY_STORAGE_KEY = 'tankr.difficulty.v1';

export interface GameSettings {
    difficulty: Difficulty;
    bindings: ControlBindings;
}

let currentSettings: GameSettings = {
    difficulty: loadDifficulty(),
    bindings: loadBindings()
};

export function getGameSettings(): GameSettings {
    return {
        difficulty: currentSettings.difficulty,
        bindings: { ...currentSettings.bindings }
    };
}

export function setGameSettings(settings: GameSettings): void {
    currentSettings = {
        difficulty: settings.difficulty,
        bindings: { ...settings.bindings }
    };
    saveDifficulty(currentSettings.difficulty);
    saveBindings(currentSettings.bindings);
}

function loadDifficulty(): Difficulty {
    if (typeof localStorage === 'undefined') {
        return 'medium';
    }

    const saved = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    return saved === 'low' || saved === 'medium' || saved === 'high' ? saved : 'medium';
}

function saveDifficulty(difficulty: Difficulty): void {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
    }
}

function loadBindings(): ControlBindings {
    if (typeof localStorage === 'undefined') {
        return DEFAULT_BINDINGS;
    }

    return decodeBindings(localStorage.getItem('tankr.controls.v1'));
}

function saveBindings(bindings: ControlBindings): void {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tankr.controls.v1', encodeBindings(bindings));
    }
}
