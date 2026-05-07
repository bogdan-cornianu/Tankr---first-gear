import { Scene, GameObjects } from 'phaser';
import { DIFFICULTY_PRESETS } from '../content/difficulty';
import { getGameSettings, setGameSettings } from '../gameSettings';
import { actionLabel, DEFAULT_BINDINGS, rebindAction, type ControlBindings, type InputAction } from '../input/bindings';
import type { Difficulty } from '../simulation/state';
import { addCoverBackground } from './background';
import { verticalPosition, viewportCenter } from './layout';

export class Settings extends Scene
{
    selectedDifficulty: Difficulty;
    bindings: ControlBindings;
    remappingAction?: InputAction;
    statusText: GameObjects.Text;
    controlRows: GameObjects.Text[] = [];
    difficultyButtons: GameObjects.Text[] = [];

    constructor ()
    {
        super('Settings');
    }

    create ()
    {
        const settings = getGameSettings();
        this.selectedDifficulty = settings.difficulty;
        this.bindings = settings.bindings;
        const viewport = { width: this.scale.width, height: this.scale.height };
        const center = viewportCenter(viewport);

        addCoverBackground(this, 0.5);
        this.add.text(center.x, verticalPosition(viewport, 0.11), 'SETTINGS', {
            fontFamily: 'Arial Black',
            fontSize: 56,
            color: '#f6f2d8',
            stroke: '#111614',
            strokeThickness: 8
        }).setOrigin(0.5);

        this.add.text(center.x, verticalPosition(viewport, 0.21), 'Difficulty', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#f6f2d8'
        }).setOrigin(0.5);

        this.renderDifficultyButtons();
        this.renderControlRows();

        const save = this.add.text(center.x - 80, verticalPosition(viewport, 0.90), 'SAVE', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#111614',
            backgroundColor: '#e0d359',
            padding: { x: 22, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const back = this.add.text(center.x + 80, verticalPosition(viewport, 0.90), 'BACK', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#f6f2d8',
            backgroundColor: '#314044',
            padding: { x: 22, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        save.on('pointerdown', () => {
            this.saveAndReturn();
        });
        back.on('pointerdown', () => {
            this.scene.start('MainMenu');
        });

        this.statusText = this.add.text(center.x, verticalPosition(viewport, 0.83), '', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#f6f2d8'
        }).setOrigin(0.5);

        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (!this.remappingAction) {
                return;
            }

            try {
                this.bindings = rebindAction(this.bindings, this.remappingAction, event.code);
                this.statusText.setText(`${actionLabel(this.remappingAction)} set to ${event.code}`);
            } catch (error) {
                this.statusText.setText(error instanceof Error ? error.message : 'Unable to bind key');
            }

            this.remappingAction = undefined;
            this.renderControlRows();
        });
    }

    private renderDifficultyButtons (): void
    {
        for (const button of this.difficultyButtons) {
            button.destroy();
        }
        this.difficultyButtons = [];

        (Object.keys(DIFFICULTY_PRESETS) as Difficulty[]).forEach((difficulty, index) => {
            const selected = this.selectedDifficulty === difficulty;
            const center = this.scale.width / 2;
            const button = this.add.text(center - 152 + index * 152, this.scale.height * 0.28, DIFFICULTY_PRESETS[difficulty].label.toUpperCase(), {
                fontFamily: 'Arial Black',
                fontSize: 20,
                color: selected ? '#111614' : '#f6f2d8',
                backgroundColor: selected ? '#e0d359' : '#314044',
                padding: { x: 18, y: 10 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            button.on('pointerdown', () => {
                this.selectedDifficulty = difficulty;
                this.renderDifficultyButtons();
            });

            this.difficultyButtons.push(button);
        });
    }

    private renderControlRows (): void
    {
        for (const row of this.controlRows) {
            row.destroy();
        }
        this.controlRows = [];

        const center = this.scale.width / 2;
        this.controlRows.push(this.add.text(center, this.scale.height * 0.39, 'Keyboard Controls', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#f6f2d8'
        }).setOrigin(0.5));

        const actions: InputAction[] = ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'pause'];
        actions.forEach((action, index) => {
            const waiting = this.remappingAction === action;
            const row = this.add.text(center, this.scale.height * 0.46 + index * 42, `${actionLabel(action)}: ${waiting ? 'press a key...' : this.bindings[action]}`, {
                fontFamily: 'Arial',
                fontSize: 22,
                color: waiting ? '#e0d359' : '#ffffff',
                backgroundColor: '#263235',
                padding: { x: 16, y: 7 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            row.on('pointerdown', () => {
                this.remappingAction = action;
                this.renderControlRows();
            });

            this.controlRows.push(row);
        });

        const reset = this.add.text(center, this.scale.height * 0.76, 'Reset Controls', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#ffffff',
            backgroundColor: '#4a2c2b',
            padding: { x: 14, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        reset.on('pointerdown', () => {
            this.bindings = DEFAULT_BINDINGS;
            this.renderControlRows();
        });

        this.controlRows.push(reset);
    }

    private saveAndReturn (): void
    {
        setGameSettings({
            difficulty: this.selectedDifficulty,
            bindings: this.bindings
        });
        this.scene.start('MainMenu');
    }
}
