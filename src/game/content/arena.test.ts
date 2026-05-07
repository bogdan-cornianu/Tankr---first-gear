import { describe, expect, test } from 'vitest';
import { DIFFICULTY_PRESETS } from './difficulty';
import { generateArena, obstacleToRect } from './arena';
import { distanceBetween, rectsOverlap } from '../simulation/geometry';
import type { ArenaDecoration, RoadVariant, TerrainTileKind } from '../simulation/state';

describe('arena generation', () => {
    test('is deterministic for the same seed and difficulty', () => {
        const first = generateArena(12345, DIFFICULTY_PRESETS.medium);
        const second = generateArena(12345, DIFFICULTY_PRESETS.medium);

        expect(second).toEqual(first);
    });

    test('keeps enemies outside the player safe radius', () => {
        const arena = generateArena(99, DIFFICULTY_PRESETS.high);

        for (const enemy of arena.enemySpawns) {
            expect(distanceBetween(arena.playerSpawn, enemy.position)).toBeGreaterThanOrEqual(arena.safeRadius);
            expect(enemy.patrolPoints.length).toBeGreaterThanOrEqual(2);
        }
    });

    test('keeps blocking obstacles separated from each other', () => {
        const arena = generateArena(2026, DIFFICULTY_PRESETS.high);
        const obstacleRects = arena.obstacles.map(obstacleToRect);

        for (let first = 0; first < obstacleRects.length; first += 1) {
            for (let second = first + 1; second < obstacleRects.length; second += 1) {
                expect(rectsOverlap(obstacleRects[first], obstacleRects[second], 12)).toBe(false);
            }
        }
    });

    test('generates a connected road network', () => {
        const arena = generateArena(314, DIFFICULTY_PRESETS.medium);
        const roads = arena.decorations.filter((decoration) => decoration.kind === 'road');
        const visited = new Set<string>();
        const roadKeys = new Set(roads.map((road) => gridKey(road, arena.tileSize)));
        const queue = [gridKey(roads[0], arena.tileSize)];

        while (queue.length > 0) {
            const key = queue.shift();
            if (!key || visited.has(key)) {
                continue;
            }
            visited.add(key);
            const [x, y] = key.split(',').map(Number);
            for (const neighbor of [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`]) {
                if (roadKeys.has(neighbor) && !visited.has(neighbor)) {
                    queue.push(neighbor);
                }
            }
        }

        expect(roads.length).toBeGreaterThan(20);
        expect(visited.size).toBe(roadKeys.size);
    });

    test('auto-tiles roads from their neighbor masks', () => {
        const arena = generateArena(314, DIFFICULTY_PRESETS.medium);
        const roads = arena.decorations.filter((decoration) => decoration.kind === 'road');
        const roadKeys = new Set(roads.map((road) => gridKey(road, arena.tileSize)));

        for (const road of roads) {
            const key = gridKey(road, arena.tileSize);
            const [x, y] = key.split(',').map(Number);
            const expected = expectedRoadVariant({
                north: roadKeys.has(`${x},${y - 1}`),
                east: roadKeys.has(`${x + 1},${y}`),
                south: roadKeys.has(`${x},${y + 1}`),
                west: roadKeys.has(`${x - 1},${y}`)
            });

            expect(road.variant).toBe(expected);
        }
    });

    test('uses corners and intersections instead of only straight roads', () => {
        const arena = generateArena(5150, DIFFICULTY_PRESETS.medium);
        const roads = arena.decorations.filter((decoration) => decoration.kind === 'road');
        const cornerCount = roads.filter((road) => road.variant?.startsWith('corner')).length;
        const splitOrCrossingCount = roads.filter((road) => road.variant?.startsWith('split') || road.variant === 'crossing' || road.variant === 'crossingRound').length;

        expect(cornerCount).toBeGreaterThanOrEqual(4);
        expect(splitOrCrossingCount).toBeGreaterThanOrEqual(2);
    });

    test('uses grass-sand transition terrain along the biome boundary', () => {
        const arena = generateArena(2718, DIFFICULTY_PRESETS.medium);
        let transitionCount = 0;

        for (let y = 0; y < arena.terrain.length; y += 1) {
            for (let x = 0; x < arena.terrain[y].length; x += 1) {
                const tile = arena.terrain[y][x];
                if (!tile.startsWith('transition')) {
                    continue;
                }
                transitionCount += 1;
                expect(neighborTerrainKinds(arena.terrain, x, y).some((neighbor) => isSandTerrain(neighbor))).toBe(true);
            }
        }
        expect(transitionCount).toBeGreaterThan(8);
    });

    test('uses road-transition variants when roads cross grass-sand boundaries', () => {
        const arena = generateArena(404, DIFFICULTY_PRESETS.medium);
        const roads = arena.decorations.filter((decoration) => decoration.kind === 'road');
        const transitionRoads = roads.filter((road) => road.roadTransition);
        const roadKeys = new Set(roads.map((road) => gridKey(road, arena.tileSize)));

        expect(transitionRoads.length).toBeGreaterThan(0);
        for (const road of transitionRoads) {
            const [x, y] = gridKey(road, arena.tileSize).split(',').map(Number);
            const direction = road.roadTransition?.replace('_dirt', '');
            const target = direction === 'N'
                ? `${x},${y - 1}`
                : direction === 'E'
                    ? `${x + 1},${y}`
                    : direction === 'S'
                        ? `${x},${y + 1}`
                        : `${x - 1},${y}`;
            const [targetX, targetY] = target.split(',').map(Number);

            expect(isSandTerrain(arena.terrain[y][x])).toBe(false);
            expect(roadKeys.has(target)).toBe(true);
            expect(isSandTerrain(arena.terrain[targetY][targetX])).toBe(true);
        }
    });

    test('keeps road-transition tiles aligned with the connected road axis', () => {
        for (const seed of [404, 5150, 909, 1212]) {
            const arena = generateArena(seed, DIFFICULTY_PRESETS.medium);
            const roads = arena.decorations.filter((decoration) => decoration.kind === 'road');
            const transitionRoads = roads.filter((road) => road.roadTransition);

            expect(transitionRoads.length).toBeGreaterThan(0);
            for (const road of transitionRoads) {
                const direction = road.roadTransition?.replace('_dirt', '');
                const expectedVariant = direction === 'N' || direction === 'S' ? 'north' : 'east';

                expect(road.variant).toBe(expectedVariant);
            }
        }
    });

    test('uses dirt road-transition art for paved-to-sand road handoffs', () => {
        const arena = generateArena(404, DIFFICULTY_PRESETS.medium);
        const transitionRoads = arena.decorations
            .filter((decoration) => decoration.kind === 'road' && decoration.roadTransition);

        expect(transitionRoads.length).toBeGreaterThan(0);
        expect(transitionRoads.every((road) => road.roadTransition?.endsWith('_dirt'))).toBe(true);
    });

    test('does not chain multiple road-transition tiles across the same road crossing', () => {
        for (const seed of [404, 5150, 909, 1212]) {
            const arena = generateArena(seed, DIFFICULTY_PRESETS.medium);
            const roads = arena.decorations.filter((decoration) => decoration.kind === 'road');
            const transitionKeys = new Set(roads
                .filter((road) => road.roadTransition)
                .map((road) => gridKey(road, arena.tileSize)));

            for (const key of transitionKeys) {
                const [x, y] = key.split(',').map(Number);
                const adjacentTransitions = [`${x},${y - 1}`, `${x + 1},${y}`, `${x},${y + 1}`, `${x - 1},${y}`]
                    .filter((neighbor) => transitionKeys.has(neighbor));

                expect(adjacentTransitions).toEqual([]);
            }
        }
    });

    test('does not generate isolated single road tiles', () => {
        const arena = generateArena(909, DIFFICULTY_PRESETS.medium);
        const roads = arena.decorations.filter((decoration) => decoration.kind === 'road');
        const roadKeys = new Set(roads.map((road) => gridKey(road, arena.tileSize)));

        for (const road of roads) {
            const [x, y] = gridKey(road, arena.tileSize).split(',').map(Number);
            const neighbors = [`${x},${y - 1}`, `${x + 1},${y}`, `${x},${y + 1}`, `${x - 1},${y}`];
            expect(neighbors.some((neighbor) => roadKeys.has(neighbor))).toBe(true);
        }
    });

    test('roadblocks do not sever the road graph', () => {
        const arena = generateArena(1212, DIFFICULTY_PRESETS.medium);
        const roads = arena.decorations.filter((decoration) => decoration.kind === 'road');
        const blockedRoadKeys = new Set(arena.obstacles
            .filter((obstacle) => obstacle.role === 'roadblock')
            .map((obstacle) => `${Math.floor(obstacle.position.x / arena.tileSize)},${Math.floor(obstacle.position.y / arena.tileSize)}`));
        const roadKeys = new Set(roads
            .map((road) => gridKey(road, arena.tileSize))
            .filter((key) => !blockedRoadKeys.has(key)));
        const visited = floodRoads(roadKeys);

        expect(visited.size).toBe(roadKeys.size);
    });

    test('places map-story props near their related objects', () => {
        const arena = generateArena(808, DIFFICULTY_PRESETS.medium);
        const roads = arena.decorations.filter((decoration) => decoration.kind === 'road');
        const roadBarriers = arena.obstacles.filter((obstacle) => obstacle.kind === 'barricade' && obstacle.role === 'roadblock');
        const oilSpills = arena.decorations.filter((decoration) => decoration.kind === 'oil');
        const barrels = arena.obstacles.filter((obstacle) => obstacle.kind === 'barrel');
        const sandbags = arena.decorations.filter((decoration) => decoration.kind === 'sandbag');

        expect(roadBarriers.length).toBeGreaterThanOrEqual(3);
        expect(roadBarriers.every((barrier) => roads.some((road) => distanceBetween(barrier.position, road.position) <= arena.tileSize / 2))).toBe(true);
        expect(oilSpills.some((oil) => barrels.some((barrel) => distanceBetween(oil.position, barrel.position) <= 70))).toBe(true);
        expect(arena.enemySpawns.some((enemy) => sandbags.filter((sandbag) => distanceBetween(sandbag.position, enemy.position) <= 110).length >= 2)).toBe(true);
    });

    test('turns sandbag cover into blocking obstacles', () => {
        const arena = generateArena(808, DIFFICULTY_PRESETS.medium);
        const sandbagDecorations = arena.decorations.filter((decoration) => decoration.kind === 'sandbag');
        const sandbagObstacles = arena.obstacles.filter((obstacle) => obstacle.kind === 'sandbag');

        expect(sandbagObstacles.length).toBe(sandbagDecorations.length);
        for (const sandbag of sandbagDecorations) {
            const blocker = sandbagObstacles.find((obstacle) => distanceBetween(obstacle.position, sandbag.position) < 1);

            expect(blocker).toBeDefined();
            expect(blocker?.blocksVision).toBe(true);
            expect(blocker?.blocksShots).toBe(true);
            expect(blocker?.size.x).toBeGreaterThan(0);
            expect(blocker?.size.y).toBeGreaterThan(0);
        }
    });
});

function gridKey(decoration: ArenaDecoration, tileSize: number): string {
    return `${Math.floor(decoration.position.x / tileSize)},${Math.floor(decoration.position.y / tileSize)}`;
}

function expectedRoadVariant(mask: { north: boolean; east: boolean; south: boolean; west: boolean }): RoadVariant {
    const connections = [mask.north, mask.east, mask.south, mask.west].filter(Boolean).length;

    if (connections === 4) return 'crossing';
    if (connections === 3 && !mask.north) return 'splitS';
    if (connections === 3 && !mask.east) return 'splitW';
    if (connections === 3 && !mask.south) return 'splitN';
    if (connections === 3) return 'splitE';
    if (mask.north && mask.south) return 'north';
    if (mask.east && mask.west) return 'east';
    if (mask.north && mask.east) return 'cornerUR';
    if (mask.north && mask.west) return 'cornerUL';
    if (mask.south && mask.east) return 'cornerLR';
    if (mask.south && mask.west) return 'cornerLL';
    return mask.north || mask.south ? 'north' : 'east';
}

function neighborTerrainKinds(terrain: TerrainTileKind[][], x: number, y: number): TerrainTileKind[] {
    return [
        terrain[y - 1]?.[x],
        terrain[y]?.[x + 1],
        terrain[y + 1]?.[x],
        terrain[y]?.[x - 1]
    ].filter((tile): tile is TerrainTileKind => Boolean(tile));
}

function isSandTerrain(tile: TerrainTileKind): boolean {
    return tile === 'sand' || tile === 'sandAlt';
}

function floodRoads(roadKeys: Set<string>): Set<string> {
    const visited = new Set<string>();
    const first = [...roadKeys][0];
    const queue = first ? [first] : [];

    while (queue.length > 0) {
        const key = queue.shift();
        if (!key || visited.has(key)) {
            continue;
        }
        visited.add(key);
        const [x, y] = key.split(',').map(Number);
        for (const neighbor of [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`]) {
            if (roadKeys.has(neighbor) && !visited.has(neighbor)) {
                queue.push(neighbor);
            }
        }
    }

    return visited;
}
