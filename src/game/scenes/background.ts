import type { GameObjects, Scene } from 'phaser';
import { coverScale } from './layout';

export function addCoverBackground(scene: Scene, alpha: number): GameObjects.Image {
    const background = scene.add.image(0, 0, 'background');

    resizeCoverBackground(scene, background);

    background
        .setAlpha(alpha)
        .setDepth(-10);

    scene.scale.on('resize', () => resizeCoverBackground(scene, background));

    return background;
}

export function resizeCoverBackground(scene: Scene, background: GameObjects.Image): void {
    const viewport = { width: scene.scale.width, height: scene.scale.height };
    const scale = coverScale(viewport, { width: background.width, height: background.height });

    background
        .setPosition(viewport.width / 2, viewport.height / 2)
        .setScale(scale);
}
