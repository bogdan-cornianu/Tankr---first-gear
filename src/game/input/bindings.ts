export type InputAction = 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight' | 'pause';
export type ControlBindings = Record<InputAction, string>;

export const CONTROLS_STORAGE_KEY = 'tankr.controls.v1';

export const DEFAULT_BINDINGS: ControlBindings = {
    moveUp: 'KeyW',
    moveDown: 'KeyS',
    moveLeft: 'KeyA',
    moveRight: 'KeyD',
    pause: 'Escape'
};

const ACTIONS: InputAction[] = ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'pause'];

export function rebindAction(bindings: ControlBindings, action: InputAction, code: string): ControlBindings {
    const duplicate = ACTIONS.find((candidate) => candidate !== action && bindings[candidate] === code);
    if (duplicate) {
        throw new Error(`${code} is already bound to ${duplicate}`);
    }

    return {
        ...bindings,
        [action]: code
    };
}

export function encodeBindings(bindings: ControlBindings): string {
    return JSON.stringify(bindings);
}

export function decodeBindings(serialized: string | null): ControlBindings {
    if (!serialized) {
        return DEFAULT_BINDINGS;
    }

    try {
        const parsed = JSON.parse(serialized) as Partial<ControlBindings>;
        if (!isCompleteBindings(parsed) || hasDuplicateCodes(parsed)) {
            return DEFAULT_BINDINGS;
        }

        return parsed;
    } catch {
        return DEFAULT_BINDINGS;
    }
}

export function actionLabel(action: InputAction): string {
    return {
        moveUp: 'Move Up',
        moveDown: 'Move Down',
        moveLeft: 'Move Left',
        moveRight: 'Move Right',
        pause: 'Pause'
    }[action];
}

function isCompleteBindings(value: Partial<ControlBindings>): value is ControlBindings {
    return ACTIONS.every((action) => typeof value[action] === 'string' && value[action] !== '');
}

function hasDuplicateCodes(bindings: ControlBindings): boolean {
    const codes = ACTIONS.map((action) => bindings[action]);
    return new Set(codes).size !== codes.length;
}
