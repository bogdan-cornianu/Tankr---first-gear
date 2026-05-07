import { Scene } from 'phaser';
import { IMAGE_MANIFEST } from '../assets/manifest';
import { addCoverBackground } from './background';
import { viewportCenter } from './layout';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        addCoverBackground(this, 0.6);
        const center = viewportCenter({ width: this.scale.width, height: this.scale.height });

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(center.x, center.y, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(center.x - 230, center.y, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        this.load.image('logo', 'assets/logo.png');

        for (const [key, path] of Object.entries(IMAGE_MANIFEST)) {
            this.load.image(key, path);
        }
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}
