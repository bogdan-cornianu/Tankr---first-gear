import { Scene } from 'phaser';
import { addCoverBackground } from './background';
import { verticalPosition, viewportCenter } from './layout';

export class GameOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameover_text : Phaser.GameObjects.Text;
    result: string;

    constructor ()
    {
        super('GameOver');
    }

    init (data: { result?: string })
    {
        this.result = data.result === 'won' ? 'Mission Complete' : 'Game Over';
    }

    create ()
    {
        this.camera = this.cameras.main
        this.camera.setBackgroundColor(0x111614);
        const viewport = { width: this.scale.width, height: this.scale.height };
        const center = viewportCenter(viewport);

        this.background = addCoverBackground(this, 0.35);
        this.background.setAlpha(0.18);

        this.gameover_text = this.add.text(center.x, verticalPosition(viewport, 0.40), this.result, {
            fontFamily: 'Arial Black', fontSize: 64, color: '#f6f2d8',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        });
        this.gameover_text.setOrigin(0.5);

        this.add.text(center.x, verticalPosition(viewport, 0.55), 'Click to return to main menu', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff'
        }).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}
