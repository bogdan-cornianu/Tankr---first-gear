import { Scene } from 'phaser';
import { AssetKeys } from '../assets/manifest';
import { generateArena, obstacleToRect } from '../content/arena';
import { DIFFICULTY_PRESETS } from '../content/difficulty';
import { getGameSettings } from '../gameSettings';
import type { ControlBindings } from '../input/bindings';
import { updateEnemyAi } from '../simulation/ai';
import { applyProjectileHit, createInitialGameState, getEnemiesLeft } from '../simulation/combat';
import { angleBetween, circleIntersectsRect, distanceBetween, pointInRect } from '../simulation/geometry';
import type { ArenaDecoration, ArenaObstacle, GameState, Rect, RoadVariant, TankState, Team, TerrainTileKind } from '../simulation/state';

interface TankView {
    body: Phaser.Physics.Arcade.Sprite;
    barrel: Phaser.GameObjects.Image;
}

interface ProjectileSprite extends Phaser.Physics.Arcade.Sprite {
    ownerTeam: Team;
    ownerId: string;
    damage: number;
    velocityX: number;
    velocityY: number;
    expiresAt: number;
}

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    state: GameState;
    bindings: ControlBindings;
    playerView: TankView;
    enemyViews = new Map<string, TankView>();
    obstacleGroup: Phaser.Physics.Arcade.StaticGroup;
    enemyGroup: Phaser.Physics.Arcade.Group;
    projectileGroup: Phaser.Physics.Arcade.Group;
    blockerRects: Rect[] = [];
    healthText: Phaser.GameObjects.Text;
    enemiesText: Phaser.GameObjects.Text;
    pauseText: Phaser.GameObjects.Text;
    isPaused = false;
    lastPlayerShotAt = 0;
    pressedKeys = new Set<string>();

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        const settings = getGameSettings();
        const difficulty = DIFFICULTY_PRESETS[settings.difficulty];
        const seed = Date.now() % 1000000;
        const arena = generateArena(seed, difficulty);

        this.bindings = settings.bindings;
        this.state = createInitialGameState(arena, difficulty);
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x182022);
        this.physics.world.setBounds(0, 0, arena.width, arena.height);

        this.renderArena();
        this.obstacleGroup = this.physics.add.staticGroup();
        this.enemyGroup = this.physics.add.group();
        this.projectileGroup = this.physics.add.group();
        this.renderObstacles(arena.obstacles);
        this.playerView = this.createTankView(this.state.player, AssetKeys.playerBody, AssetKeys.playerBarrel);
        this.enemyViews = new Map(this.state.enemies.map((enemy) => [
            enemy.id,
            this.createTankView(enemy, AssetKeys.enemyBody, AssetKeys.enemyBarrel)
        ]));

        this.physics.add.collider(this.playerView.body, this.obstacleGroup);

        this.camera.startFollow(this.playerView.body, true, 0.12, 0.12);
        this.camera.setBounds(0, 0, arena.width, arena.height);

        this.createHud();
        this.scale.on('resize', this.layoutHud, this);
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!this.isPaused && pointer.leftButtonDown()) {
                this.firePlayerProjectile();
            }
        });
        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            this.pressedKeys.add(event.code);
            if (event.code === this.bindings.pause) {
                this.togglePause();
            }
        });
        this.input.keyboard?.on('keyup', (event: KeyboardEvent) => {
            this.pressedKeys.delete(event.code);
        });
    }

    update (_time: number, delta: number)
    {
        if (this.isPaused || this.state.outcome !== 'playing') {
            return;
        }

        this.updatePlayer(delta);
        this.updateEnemies(delta);
        this.updateProjectiles(delta);
        this.syncViews();
        this.updateHud();

        if (this.state.outcome !== 'playing') {
            this.scene.start('GameOver', { result: this.state.outcome });
        }
    }

    private renderArena (): void
    {
        const { width, height, tileSize } = this.state.arena;
        for (let tileY = 0; tileY < height / tileSize; tileY += 1) {
            for (let tileX = 0; tileX < width / tileSize; tileX += 1) {
                const x = tileX * tileSize + tileSize / 2;
                const y = tileY * tileSize + tileSize / 2;
                this.add.image(x, y, this.getTerrainAsset(this.state.arena.terrain[tileY][tileX]));
            }
        }

        for (const decoration of this.state.arena.decorations) {
            if (decoration.kind === 'sandbag') {
                continue;
            }
            const key = this.getDecorationAsset(decoration);
            const image = this.add.image(decoration.position.x, decoration.position.y, key).setRotation(decoration.rotation);
            if (decoration.kind === 'road') {
                image.setDepth(1);
            } else {
                image.setDepth(2).setAlpha(decoration.kind === 'tracks' ? 0.62 : 0.9);
            }
        }
    }

    private renderObstacles (obstacles: ArenaObstacle[]): void
    {
        this.blockerRects = obstacles
            .filter((obstacle) => obstacle.blocksVision)
            .map(obstacleToRect);

        for (const obstacle of obstacles) {
            const key = obstacle.kind === 'crate'
                ? AssetKeys.crate
                : obstacle.kind === 'barricade'
                    ? AssetKeys.barricade
                    : obstacle.kind === 'tree'
                        ? AssetKeys.tree
                        : obstacle.kind === 'sandbag'
                            ? AssetKeys.sandbag
                            : AssetKeys.barrel;
            const sprite = this.obstacleGroup.create(obstacle.position.x, obstacle.position.y, key) as Phaser.Physics.Arcade.Sprite;
            sprite.setData('blocksShots', obstacle.blocksShots);
            sprite.setDisplaySize(obstacle.size.x, obstacle.size.y);
            sprite.refreshBody();
        }
    }

    private createTankView (tank: TankState, bodyKey: string, barrelKey: string): TankView
    {
        const body = this.physics.add.sprite(tank.position.x, tank.position.y, bodyKey);
        body.setCircle(18);
        body.setCollideWorldBounds(true);
        body.setData('tankId', tank.id);
        body.setData('team', tank.team);

        if (tank.team === 'enemy') {
            this.enemyGroup.add(body);
        }

        const barrel = this.add.image(tank.position.x, tank.position.y, barrelKey);
        barrel.setOrigin(0.5, 0.72);
        barrel.setDepth(5);
        body.setDepth(4);

        return { body, barrel };
    }

    private createHud (): void
    {
        this.healthText = this.add.text(24, 20, '', {
            fontFamily: 'Arial Black',
            fontSize: 22,
            color: '#f6f2d8',
            stroke: '#111614',
            strokeThickness: 5
        }).setScrollFactor(0).setDepth(30);

        this.enemiesText = this.add.text(24, 54, '', {
            fontFamily: 'Arial Black',
            fontSize: 22,
            color: '#f6f2d8',
            stroke: '#111614',
            strokeThickness: 5
        }).setScrollFactor(0).setDepth(30);

        this.pauseText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'PAUSED', {
            fontFamily: 'Arial Black',
            fontSize: 64,
            color: '#f6f2d8',
            stroke: '#111614',
            strokeThickness: 9
        }).setOrigin(0.5).setScrollFactor(0).setDepth(40).setVisible(false);

        this.updateHud();
        this.layoutHud();
    }

    private layoutHud (): void
    {
        this.pauseText?.setPosition(this.scale.width / 2, this.scale.height / 2);
    }

    private updatePlayer (delta: number): void
    {
        const velocity = { x: 0, y: 0 };
        if (this.pressedKeys.has(this.bindings.moveUp)) {
            velocity.y -= 1;
        }
        if (this.pressedKeys.has(this.bindings.moveDown)) {
            velocity.y += 1;
        }
        if (this.pressedKeys.has(this.bindings.moveLeft)) {
            velocity.x -= 1;
        }
        if (this.pressedKeys.has(this.bindings.moveRight)) {
            velocity.x += 1;
        }

        const velocityLength = Math.hypot(velocity.x, velocity.y);
        if (velocityLength > 0) {
            velocity.x = (velocity.x / velocityLength) * this.state.player.speed;
            velocity.y = (velocity.y / velocityLength) * this.state.player.speed;
        }
        this.playerView.body.setVelocity(0, 0);
        const nextPosition = this.getWalkablePosition(
            { x: this.playerView.body.x, y: this.playerView.body.y },
            { x: this.playerView.body.x + velocity.x * (delta / 1000), y: this.playerView.body.y + velocity.y * (delta / 1000) }
        );
        this.playerView.body.setPosition(nextPosition.x, nextPosition.y);

        const pointer = this.input.activePointer;
        const worldPoint = pointer.positionToCamera(this.camera) as Phaser.Math.Vector2;
        const playerPosition = nextPosition;
        const turretRotation = angleBetween(playerPosition, { x: worldPoint.x, y: worldPoint.y });
        const rotation = velocityLength > 0 ? Math.atan2(velocity.y, velocity.x) + Math.PI / 2 : this.state.player.rotation;

        this.state = {
            ...this.state,
            player: {
                ...this.state.player,
                position: playerPosition,
                rotation,
                turretRotation,
                fireCooldownRemainingMs: Math.max(0, this.state.player.fireCooldownRemainingMs - delta)
            }
        };
    }

    private updateEnemies (delta: number): void
    {
        const difficulty = DIFFICULTY_PRESETS[getGameSettings().difficulty];
        const enemies = this.state.enemies.map((enemy) => {
            const updated = updateEnemyAi(enemy, this.state.player, this.blockerRects, delta);
            const cooldown = Math.max(0, updated.fireCooldownRemainingMs - delta);
            const readyEnemy = { ...updated, fireCooldownRemainingMs: cooldown };

            if (readyEnemy.alive && readyEnemy.ai.state === 'engage' && cooldown === 0) {
                this.fireProjectile(readyEnemy, AssetKeys.bulletEnemy, difficulty.enemyProjectileSpeed, difficulty.enemyDamage);
                return { ...readyEnemy, fireCooldownRemainingMs: difficulty.fireCooldownMs };
            }

            return readyEnemy;
        });

        this.state = {
            ...this.state,
            enemies
        };
    }

    private syncViews (): void
    {
        this.syncTankView(this.state.player, this.playerView);

        for (const enemy of this.state.enemies) {
            const view = this.enemyViews.get(enemy.id);
            if (!view) {
                continue;
            }

            if (!enemy.alive) {
                view.body.disableBody(true, true);
                view.barrel.setVisible(false);
                continue;
            }

            view.body.setPosition(enemy.position.x, enemy.position.y);
            this.syncTankView(enemy, view);
        }
    }

    private syncTankView (tank: TankState, view: TankView): void
    {
        view.body.setRotation(tank.rotation);
        view.barrel.setPosition(view.body.x, view.body.y);
        view.barrel.setRotation(tank.turretRotation);
    }

    private firePlayerProjectile (): void
    {
        const now = this.time.now;
        if (now - this.lastPlayerShotAt < 320) {
            return;
        }

        this.lastPlayerShotAt = now;
        this.fireProjectile(this.state.player, AssetKeys.bulletPlayer, 430, 25);
    }

    private fireProjectile (tank: TankState, assetKey: string, speed: number, damage: number): void
    {
        const radians = tank.turretRotation - Math.PI / 2;
        const muzzleDistance = 34;
        const spawn = {
            x: tank.position.x + Math.cos(radians) * muzzleDistance,
            y: tank.position.y + Math.sin(radians) * muzzleDistance
        };
        const sprite = this.physics.add.sprite(spawn.x, spawn.y, assetKey) as ProjectileSprite;
        sprite.ownerTeam = tank.team;
        sprite.ownerId = tank.id;
        sprite.damage = damage;
        sprite.velocityX = Math.cos(radians) * speed;
        sprite.velocityY = Math.sin(radians) * speed;
        sprite.expiresAt = this.time.now + 1400;
        sprite.setData('ownerId', tank.id);
        sprite.setData('ownerTeam', tank.team);
        sprite.setRotation(tank.turretRotation);
        sprite.setVelocity(0, 0);
        sprite.setData('spawnedAt', this.time.now);
        sprite.setDepth(3);
        this.projectileGroup.add(sprite);
        this.spawnMuzzleFlash(spawn.x, spawn.y, tank.turretRotation);
    }

    private updateProjectiles (delta: number): void
    {
        for (const child of this.projectileGroup.getChildren()) {
            const projectile = child as ProjectileSprite;
            if (!projectile.active) {
                continue;
            }

            projectile.setPosition(
                projectile.x + projectile.velocityX * (delta / 1000),
                projectile.y + projectile.velocityY * (delta / 1000)
            );

            if (this.projectileHitBlocker(projectile)) {
                this.spawnPropImpactEffect(projectile.x, projectile.y);
                projectile.destroy();
                continue;
            }

            if (this.time.now >= projectile.expiresAt ||
                projectile.x < 0 ||
                projectile.y < 0 ||
                projectile.x > this.state.arena.width ||
                projectile.y > this.state.arena.height) {
                projectile.destroy();
                continue;
            }

            if (projectile.ownerTeam === 'player') {
                this.checkProjectileAgainstEnemies(projectile);
            } else {
                this.checkProjectileAgainstPlayer(projectile);
            }
        }
    }

    private projectileHitBlocker (projectile: ProjectileSprite): boolean
    {
        return this.blockerRects.some((rect) => pointInRect(projectile, rect));
    }

    private checkProjectileAgainstEnemies (projectile: ProjectileSprite): void
    {
        for (const enemy of this.state.enemies) {
            if (!enemy.alive || enemy.id === projectile.ownerId) {
                continue;
            }

            if (distanceBetween(projectile, enemy.position) <= 24) {
                const wasAlive = enemy.alive;
                this.state = applyProjectileHit(this.state, enemy.id, projectile.damage);
                const updatedEnemy = this.state.enemies.find((candidate) => candidate.id === enemy.id);
                if (wasAlive && updatedEnemy && !updatedEnemy.alive) {
                    this.spawnTankDestroyEffect(enemy.position.x, enemy.position.y);
                } else {
                    this.spawnHitEffect(enemy.position.x, enemy.position.y);
                }
                projectile.destroy();
                return;
            }
        }
    }

    private checkProjectileAgainstPlayer (projectile: ProjectileSprite): void
    {
        if (this.state.player.id === projectile.ownerId || !this.state.player.alive) {
            return;
        }

        if (distanceBetween(projectile, this.state.player.position) <= 24) {
            const wasAlive = this.state.player.alive;
            this.state = applyProjectileHit(this.state, this.state.player.id, projectile.damage);
            if (wasAlive && !this.state.player.alive) {
                this.spawnTankDestroyEffect(this.state.player.position.x, this.state.player.position.y);
            } else {
                this.spawnHitEffect(this.state.player.position.x, this.state.player.position.y);
            }
            projectile.destroy();
        }
    }

    private getWalkablePosition (current: { x: number; y: number }, next: { x: number; y: number }): { x: number; y: number }
    {
        const clamped = {
            x: Math.max(22, Math.min(this.state.arena.width - 22, next.x)),
            y: Math.max(22, Math.min(this.state.arena.height - 22, next.y))
        };

        const tankRadius = 22;
        return this.blockerRects.some((rect) => circleIntersectsRect(clamped, tankRadius, rect)) ? current : clamped;
    }

    private getTerrainAsset (kind: TerrainTileKind): string
    {
        return {
            grass: AssetKeys.tileGrass,
            grassAlt: AssetKeys.tileGrassAlt,
            sand: AssetKeys.tileSand,
            sandAlt: AssetKeys.tileSandAlt,
            transitionN: AssetKeys.transitionN,
            transitionE: AssetKeys.transitionE,
            transitionS: AssetKeys.transitionS,
            transitionW: AssetKeys.transitionW
        }[kind];
    }

    private getDecorationAsset (decoration: ArenaDecoration): string
    {
        if (decoration.kind === 'road') {
            return this.getRoadAsset(decoration);
        }
        if (decoration.kind === 'oil') {
            return AssetKeys.oil;
        }
        if (decoration.kind === 'sandbag') {
            return AssetKeys.sandbag;
        }

        return AssetKeys.tracks;
    }

    private getRoadAsset (decoration: ArenaDecoration): string
    {
        if (decoration.roadTransition) {
            return {
                N: AssetKeys.roadTransitionN,
                E: AssetKeys.roadTransitionE,
                S: AssetKeys.roadTransitionS,
                W: AssetKeys.roadTransitionW,
                N_dirt: AssetKeys.roadTransitionDirtN,
                E_dirt: AssetKeys.roadTransitionDirtE,
                S_dirt: AssetKeys.roadTransitionDirtS,
                W_dirt: AssetKeys.roadTransitionDirtW
            }[decoration.roadTransition];
        }

        const tileX = Math.floor(decoration.position.x / this.state.arena.tileSize);
        const tileY = Math.floor(decoration.position.y / this.state.arena.tileSize);
        const terrain = this.state.arena.terrain[tileY]?.[tileX] ?? 'grass';
        const roadSet = terrain === 'sand' || terrain === 'sandAlt' ? 'sand' : 'grass';
        const variant = decoration.variant === 'crossing' && (tileX + tileY) % 3 === 0
            ? 'crossingRound'
            : decoration.variant ?? 'north';

        const assets: Record<'grass' | 'sand', Record<RoadVariant, string>> = {
            grass: {
                north: AssetKeys.roadGrassNorth,
                east: AssetKeys.roadGrassEast,
                cornerLL: AssetKeys.roadGrassCornerLL,
                cornerLR: AssetKeys.roadGrassCornerLR,
                cornerUL: AssetKeys.roadGrassCornerUL,
                cornerUR: AssetKeys.roadGrassCornerUR,
                crossing: AssetKeys.roadGrassCrossing,
                crossingRound: AssetKeys.roadGrassCrossingRound,
                splitN: AssetKeys.roadGrassSplitN,
                splitE: AssetKeys.roadGrassSplitE,
                splitS: AssetKeys.roadGrassSplitS,
                splitW: AssetKeys.roadGrassSplitW
            },
            sand: {
                north: AssetKeys.roadSandNorth,
                east: AssetKeys.roadSandEast,
                cornerLL: AssetKeys.roadSandCornerLL,
                cornerLR: AssetKeys.roadSandCornerLR,
                cornerUL: AssetKeys.roadSandCornerUL,
                cornerUR: AssetKeys.roadSandCornerUR,
                crossing: AssetKeys.roadSandCrossing,
                crossingRound: AssetKeys.roadSandCrossingRound,
                splitN: AssetKeys.roadSandSplitN,
                splitE: AssetKeys.roadSandSplitE,
                splitS: AssetKeys.roadSandSplitS,
                splitW: AssetKeys.roadSandSplitW
            }
        };

        return assets[roadSet][variant];
    }

    private spawnMuzzleFlash (x: number, y: number, rotation: number): void
    {
        const flash = this.add.image(x, y, AssetKeys.shotLarge)
            .setRotation(rotation)
            .setScale(0.78)
            .setDepth(7);

        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 1.05,
            duration: 85,
            onComplete: () => flash.destroy()
        });
    }

    private spawnHitEffect (x: number, y: number): void
    {
        this.playEffectFrames(x, y, [
            AssetKeys.explosionSmoke1,
            AssetKeys.explosionSmoke2,
            AssetKeys.explosionSmoke3,
            AssetKeys.explosionSmoke4,
            AssetKeys.explosionSmoke5
        ], {
            frameMs: 28,
            scale: 0.62,
            fadeMs: 130
        });
    }

    private spawnPropImpactEffect (x: number, y: number): void
    {
        this.playEffectFrames(x, y, [
            AssetKeys.explosion1,
            AssetKeys.explosion4,
            AssetKeys.explosionSmoke2,
            AssetKeys.explosionSmoke5
        ], {
            frameMs: 24,
            scale: 0.48,
            fadeMs: 95
        });
    }

    private spawnTankDestroyEffect (x: number, y: number): void
    {
        this.playEffectFrames(x, y, [
            AssetKeys.explosion1,
            AssetKeys.explosion2,
            AssetKeys.explosion3,
            AssetKeys.explosion4,
            AssetKeys.explosion5
        ], {
            frameMs: 38,
            scale: 1.1,
            fadeMs: 185
        });
        this.time.delayedCall(150, () => {
            this.playEffectFrames(x, y, [
                AssetKeys.explosionSmoke1,
                AssetKeys.explosionSmoke2,
                AssetKeys.explosionSmoke3,
                AssetKeys.explosionSmoke4,
                AssetKeys.explosionSmoke5
            ], {
                frameMs: 45,
                scale: 1,
                fadeMs: 260
            });
        });
    }

    private playEffectFrames (
        x: number,
        y: number,
        frames: string[],
        options: { frameMs: number; scale: number; fadeMs: number }
    ): void
    {
        frames.forEach((key, index) => {
            this.time.delayedCall(index * options.frameMs, () => {
                const image = this.add.image(x, y, key)
                    .setDepth(8)
                    .setScale(options.scale)
                    .setRotation((index % 2 === 0 ? -0.1 : 0.1) * index);
                this.tweens.add({
                    targets: image,
                    alpha: 0,
                    scale: options.scale * 1.18,
                    duration: options.fadeMs,
                    onComplete: () => image.destroy()
                });
            });
        });
    }

    private updateHud (): void
    {
        this.healthText.setText(`Health: ${Math.max(0, Math.ceil(this.state.player.health))}`);
        this.enemiesText.setText(`Enemies Left: ${getEnemiesLeft(this.state)}`);
    }

    private togglePause (): void
    {
        this.isPaused = !this.isPaused;
        this.pauseText.setVisible(this.isPaused);

        if (this.isPaused) {
            this.physics.world.pause();
        } else {
            this.physics.world.resume();
        }
    }

}
