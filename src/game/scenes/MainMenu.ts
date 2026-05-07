import { Scene, GameObjects } from 'phaser';
import { getGameSettings } from '../gameSettings';
import { menuThemePlayer } from '../audio/menuTheme';
import { addCoverBackground } from './background';
import { verticalPosition, viewportCenter } from './layout';

export class MainMenu extends Scene
{
    background: GameObjects.Image;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        const settings = getGameSettings();
        const viewport = { width: this.scale.width, height: this.scale.height };
        const center = viewportCenter(viewport);
        menuThemePlayer.start();
        this.input.once('pointerdown', () => menuThemePlayer.start());
        this.background = addCoverBackground(this, 0.72);

        this.add.text(center.x, verticalPosition(viewport, 0.11), 'TANKR', {
            fontFamily: 'Arial Black',
            fontSize: 74,
            color: '#f6f2d8',
            stroke: '#111614',
            strokeThickness: 10
        }).setOrigin(0.5);

        this.add.text(center.x, verticalPosition(viewport, 0.19), 'Top-down tank combat', {
            fontFamily: 'Arial',
            fontSize: 22,
            color: '#d7dfc5'
        }).setOrigin(0.5);

        this.add.text(center.x, verticalPosition(viewport, 0.30), `Difficulty: ${settings.difficulty.toUpperCase()}`, {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#f6f2d8',
            stroke: '#111614',
            strokeThickness: 5
        }).setOrigin(0.5);

        const start = this.add.text(center.x, verticalPosition(viewport, 0.44), 'START NEW GAME', {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#111614',
            backgroundColor: '#e0d359',
            padding: { x: 26, y: 14 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        start.on('pointerdown', () => {
            menuThemePlayer.stop();
            this.scene.start('Game');
        });

        const settingsButton = this.add.text(center.x, verticalPosition(viewport, 0.56), 'SETTINGS', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#f6f2d8',
            backgroundColor: '#314044',
            padding: { x: 22, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        settingsButton.on('pointerdown', () => {
            this.scene.start('Settings');
        });

        this.add.text(center.x, verticalPosition(viewport, 0.74), 'Aim with mouse  |  Left click fires  |  Pause key toggles pause', {
            fontFamily: 'Arial',
            fontSize: 18,
            color: '#ffffff',
        }).setOrigin(0.5);
    }
}
