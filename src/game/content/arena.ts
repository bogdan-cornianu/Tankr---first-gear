import type {
    ArenaData,
    ArenaDecoration,
    ArenaObstacle,
    DifficultyPreset,
    EnemySpawn,
    Point,
    RoadTransitionVariant,
    RoadVariant,
    TerrainTileKind
} from '../simulation/state';
import { distanceBetween, rectsOverlap } from '../simulation/geometry';

const ARENA_WIDTH = 2304;
const ARENA_HEIGHT = 1728;
const TILE_SIZE = 64;
const SAFE_RADIUS = 360;
const GRID_COLUMNS = ARENA_WIDTH / TILE_SIZE;
const GRID_ROWS = ARENA_HEIGHT / TILE_SIZE;

type GridPoint = { x: number; y: number };

export function generateArena(seed: number, difficulty: DifficultyPreset): ArenaData {
    const random = mulberry32(seed);
    const playerSpawn = { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 };
    const terrain = generateTerrain(seed);
    const roadDecorations = generateRoadNetwork(random, terrain);
    const enemySpawns = generateEnemySpawns(random, playerSpawn, difficulty.enemyCount);
    const sandbags = generateSandbagCover(enemySpawns);
    const obstacles = generateObstacles(random, playerSpawn, roadDecorations, sandbags);
    const decorations = [
        ...roadDecorations,
        ...generateStoryDecorations(random, obstacles, sandbags)
    ];

    return {
        seed,
        width: ARENA_WIDTH,
        height: ARENA_HEIGHT,
        tileSize: TILE_SIZE,
        safeRadius: SAFE_RADIUS,
        terrain,
        playerSpawn,
        enemySpawns,
        obstacles,
        decorations
    };
}

export function obstacleToRect(obstacle: ArenaObstacle) {
    return {
        x: obstacle.position.x - obstacle.size.x / 2,
        y: obstacle.position.y - obstacle.size.y / 2,
        width: obstacle.size.x,
        height: obstacle.size.y
    };
}

function generateTerrain(seed: number): TerrainTileKind[][] {
    const sandBiome: boolean[][] = [];

    for (let y = 0; y < GRID_ROWS; y += 1) {
        const row: boolean[] = [];
        for (let x = 0; x < GRID_COLUMNS; x += 1) {
            row.push(isSandBiomeCell(x, y, seed));
        }
        sandBiome.push(row);
    }

    const terrain: TerrainTileKind[][] = [];

    for (let y = 0; y < GRID_ROWS; y += 1) {
        const row: TerrainTileKind[] = [];

        for (let x = 0; x < GRID_COLUMNS; x += 1) {
            if (sandBiome[y][x]) {
                row.push(hashGrid(x, y, seed + 31) > 0.78 ? 'sandAlt' : 'sand');
                continue;
            }

            const sandDirection = firstNeighborDirection(x, y, sandBiome, true);
            if (sandDirection) {
                row.push(`transition${sandDirection}` as TerrainTileKind);
                continue;
            }

            row.push(hashGrid(x, y, seed) > 0.82 ? 'grassAlt' : 'grass');
        }

        terrain.push(row);
    }

    return terrain;
}

function generateRoadNetwork(random: () => number, terrain: TerrainTileKind[][]): ArenaDecoration[] {
    const roadCells = new Set<string>();
    const westGate = { x: 0, y: 5 + Math.floor(random() * 5) };
    const northGate = { x: 18 + Math.floor(random() * 7), y: 0 };
    const eastGate = { x: GRID_COLUMNS - 1, y: 17 + Math.floor(random() * 5) };
    const southGate = { x: 9 + Math.floor(random() * 6), y: GRID_ROWS - 1 };
    const junctionA = { x: 7 + Math.floor(random() * 5), y: westGate.y };
    const junctionB = { x: 16 + Math.floor(random() * 5), y: 10 + Math.floor(random() * 4) };
    const junctionC = { x: 24 + Math.floor(random() * 5), y: eastGate.y };
    const southBend = { x: junctionA.x + 1 + Math.floor(random() * 5), y: 18 + Math.floor(random() * 4) };
    const northBend = { x: northGate.x, y: junctionB.y };

    addPolylineRoad(roadCells, [
        westGate,
        junctionA,
        { x: junctionA.x, y: junctionB.y },
        junctionB,
        { x: junctionC.x, y: junctionB.y },
        junctionC,
        eastGate
    ]);
    addPolylineRoad(roadCells, [
        junctionB,
        northBend,
        northGate
    ]);
    addPolylineRoad(roadCells, [
        junctionA,
        { x: junctionA.x, y: southBend.y },
        southBend,
        { x: southGate.x, y: southBend.y },
        southGate
    ]);
    addPolylineRoad(roadCells, [
        { x: junctionA.x, y: junctionB.y },
        { x: junctionA.x + 4, y: junctionB.y + 4 },
        { x: junctionB.x + 4, y: junctionB.y + 4 },
        { x: junctionC.x, y: junctionC.y - 3 }
    ]);

    return [...roadCells].map((key, index) => {
        const [x, y] = key.split(',').map(Number);
        const variant = getRoadVariant({ x, y }, roadCells);
        return {
            id: `road-${index}`,
            kind: 'road',
            position: gridToWorld({ x, y }),
            rotation: 0,
            variant,
            roadTransition: getRoadTransition({ x, y }, roadCells, terrain, variant)
        };
    });
}

function generateObstacles(random: () => number, playerSpawn: Point, roads: ArenaDecoration[], sandbags: ArenaDecoration[]): ArenaObstacle[] {
    const obstacles: ArenaObstacle[] = [];
    const roadCells = new Set(roads.map((road) => worldGridKey(road.position)));
    const blockedRoads = new Set<string>();
    const roadBlocks: ArenaDecoration[] = [];

    for (const road of roads) {
        const key = worldGridKey(road.position);
        if (roadBlocks.length >= 5 ||
            distanceBetween(road.position, playerSpawn) <= SAFE_RADIUS * 0.7 ||
            roadBlocks.some((roadBlock) => distanceBetween(roadBlock.position, road.position) < TILE_SIZE * 1.5) ||
            roadNeighborCount(key, roadCells) < 1 ||
            !roadsRemainConnected(roadCells, new Set([...blockedRoads, key]))) {
            continue;
        }

        roadBlocks.push(road);
        blockedRoads.add(key);
    }

    for (const road of roadBlocks) {
        obstacles.push({
            id: `roadblock-${obstacles.length}`,
            kind: 'barricade',
            role: 'roadblock',
            position: { ...road.position },
            size: { x: 58, y: 40 },
            blocksVision: true,
            blocksShots: true
        });
    }

    for (const sandbag of sandbags) {
        obstacles.push({
            id: `sandbag-${obstacles.length}`,
            kind: 'sandbag',
            role: 'sandbag',
            position: { ...sandbag.position },
            size: { x: 20, y: 18 },
            blocksVision: true,
            blocksShots: true
        });
    }

    for (let index = 0; index < 4; index += 1) {
        addObstacleIfSeparated(obstacles, {
            id: `oil-barrel-${index}`,
            kind: 'barrel',
            role: 'oilSource',
            position: randomRoadsidePoint(random, roads),
            size: { x: 36, y: 36 },
            blocksVision: true,
            blocksShots: true
        }, 18);
    }

    const kinds: ArenaObstacle['kind'][] = ['crate', 'barricade', 'tree', 'barrel'];
    let attempts = 0;
    while (obstacles.length < 48 && attempts < 800) {
        attempts += 1;
        const position = randomPoint(random, 160);
        if (distanceBetween(position, playerSpawn) < SAFE_RADIUS * 0.75 ||
            roads.some((road) => distanceBetween(position, road.position) < TILE_SIZE * 0.75)) {
            continue;
        }

        const kind = kinds[Math.floor(random() * kinds.length)];
        const large = kind === 'tree' || kind === 'barricade';
        addObstacleIfSeparated(obstacles, {
            id: `obstacle-${obstacles.length}`,
            kind,
            role: 'cover',
            position,
            size: large ? { x: 56, y: 56 } : { x: 36, y: 36 },
            blocksVision: true,
            blocksShots: true
        }, 20);
    }

    return obstacles;
}

function generateStoryDecorations(random: () => number, obstacles: ArenaObstacle[], sandbags: ArenaDecoration[]): ArenaDecoration[] {
    const decorations: ArenaDecoration[] = [];

    for (const obstacle of obstacles.filter((candidate) => candidate.role === 'oilSource')) {
        decorations.push({
            id: `oil-${decorations.length}`,
            kind: 'oil',
            position: {
                x: obstacle.position.x + 24 + random() * 22,
                y: obstacle.position.y + 16 + random() * 22
            },
            rotation: random() * Math.PI
        });
    }

    decorations.push(...sandbags);

    for (let index = 0; index < 26; index += 1) {
        decorations.push({
            id: `tracks-${index}`,
            kind: 'tracks',
            position: randomPoint(random, 96),
            rotation: Math.floor(random() * 4) * (Math.PI / 2)
        });
    }

    return decorations;
}

function generateSandbagCover(enemySpawns: EnemySpawn[]): ArenaDecoration[] {
    const sandbags: ArenaDecoration[] = [];

    enemySpawns.slice(0, 4).forEach((enemy, enemyIndex) => {
        [-1, 0, 1].forEach((offset, offsetIndex) => {
            sandbags.push({
                id: `nest-${enemyIndex}-${offsetIndex}`,
                kind: 'sandbag',
                position: {
                    x: enemy.position.x + offset * 34,
                    y: enemy.position.y + 58
                },
                rotation: offset * 0.18
            });
        });
    });

    return sandbags;
}

function generateEnemySpawns(random: () => number, playerSpawn: Point, count: number): EnemySpawn[] {
    const spawns: EnemySpawn[] = [];
    let attempts = 0;

    while (spawns.length < count && attempts < count * 100) {
        attempts += 1;
        const position = randomPoint(random, 180);

        if (distanceBetween(position, playerSpawn) < SAFE_RADIUS ||
            spawns.some((spawn) => distanceBetween(position, spawn.position) < 180)) {
            continue;
        }

        spawns.push({
            position,
            patrolPoints: [
                position,
                clampPoint({
                    x: position.x + (random() - 0.5) * 360,
                    y: position.y + (random() - 0.5) * 360
                }, 128),
                clampPoint({
                    x: position.x + (random() - 0.5) * 420,
                    y: position.y + (random() - 0.5) * 420
                }, 128)
            ]
        });
    }

    return spawns;
}

function addObstacleIfSeparated(obstacles: ArenaObstacle[], candidate: ArenaObstacle, padding: number): void {
    const candidateRect = obstacleToRect(candidate);
    const overlapsExisting = obstacles.some((obstacle) => rectsOverlap(candidateRect, obstacleToRect(obstacle), padding));
    if (!overlapsExisting) {
        obstacles.push(candidate);
    }
}

function isSandBiomeCell(x: number, y: number, seed: number): boolean {
    const boundary = 17 +
        Math.sin((y + seed % 17) / 3.6) * 3.2 +
        Math.sin((y + seed % 31) / 8.5) * 2.4 +
        (hashGrid(0, Math.floor(y / 2), seed + 7) - 0.5) * 2.4;
    const sandPocket = biomeBlob(x, y, 10 + (seed % 5), 18 + (seed % 4), 5.5, 4.5);
    const grassPocket = biomeBlob(x, y, 25 + (seed % 6), 7 + (seed % 5), 6.5, 5);
    const lowerSandPocket = biomeBlob(x, y, 22 + (seed % 4), 22 - (seed % 5), 5, 4);
    const score = x - boundary + sandPocket * 5.5 + lowerSandPocket * 3.8 - grassPocket * 5.2;

    return score > 0;
}

function biomeBlob(x: number, y: number, centerX: number, centerY: number, radiusX: number, radiusY: number): number {
    const normalized = ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2;
    return Math.max(0, 1 - normalized);
}

function firstNeighborDirection(x: number, y: number, grid: boolean[][], target: boolean): 'N' | 'E' | 'S' | 'W' | undefined {
    if (grid[y - 1]?.[x] === target) return 'N';
    if (grid[y]?.[x + 1] === target) return 'E';
    if (grid[y + 1]?.[x] === target) return 'S';
    if (grid[y]?.[x - 1] === target) return 'W';
    return undefined;
}

function addPolylineRoad(roadCells: Set<string>, points: GridPoint[]): void {
    for (let index = 1; index < points.length; index += 1) {
        addRoadSegment(roadCells, points[index - 1], points[index]);
    }
}

function addRoadSegment(roadCells: Set<string>, from: GridPoint, to: GridPoint): void {
    const firstX = Math.max(0, Math.min(GRID_COLUMNS - 1, from.x));
    const firstY = Math.max(0, Math.min(GRID_ROWS - 1, from.y));
    const secondX = Math.max(0, Math.min(GRID_COLUMNS - 1, to.x));
    const secondY = Math.max(0, Math.min(GRID_ROWS - 1, to.y));

    if (firstX === secondX) {
        for (let y = Math.min(firstY, secondY); y <= Math.max(firstY, secondY); y += 1) {
            roadCells.add(`${firstX},${y}`);
        }
        return;
    }

    if (firstY === secondY) {
        for (let x = Math.min(firstX, secondX); x <= Math.max(firstX, secondX); x += 1) {
            roadCells.add(`${x},${firstY}`);
        }
        return;
    }

    addRoadSegment(roadCells, { x: firstX, y: firstY }, { x: secondX, y: firstY });
    addRoadSegment(roadCells, { x: secondX, y: firstY }, { x: secondX, y: secondY });
}

function getRoadTransition(point: GridPoint, roadCells: Set<string>, terrain: TerrainTileKind[][], variant: RoadVariant): RoadTransitionVariant | undefined {
    if (variant !== 'north' && variant !== 'east') {
        return undefined;
    }
    if (isSandTerrain(terrain[point.y]?.[point.x])) {
        return undefined;
    }

    const direction = firstSandRoadDirection(point, roadCells, terrain, variant);
    if (!direction) {
        return undefined;
    }

    return `${direction}_dirt` as RoadTransitionVariant;
}

function firstSandRoadDirection(point: GridPoint, roadCells: Set<string>, terrain: TerrainTileKind[][], variant: RoadVariant): 'N' | 'E' | 'S' | 'W' | undefined {
    const candidates: Array<{ direction: 'N' | 'E' | 'S' | 'W'; x: number; y: number }> = variant === 'north'
        ? [
            { direction: 'N', x: point.x, y: point.y - 1 },
            { direction: 'S', x: point.x, y: point.y + 1 }
        ]
        : [
            { direction: 'E', x: point.x + 1, y: point.y },
            { direction: 'W', x: point.x - 1, y: point.y }
        ];

    for (const candidate of candidates) {
        if (roadCells.has(`${candidate.x},${candidate.y}`) && isSandTerrain(terrain[candidate.y]?.[candidate.x])) {
            return candidate.direction;
        }
    }

    return undefined;
}

function isSandTerrain(tile: TerrainTileKind | undefined): boolean {
    return tile === 'sand' || tile === 'sandAlt';
}

function worldGridKey(point: Point): string {
    return `${Math.floor(point.x / TILE_SIZE)},${Math.floor(point.y / TILE_SIZE)}`;
}

function roadNeighborCount(key: string, roadCells: Set<string>): number {
    const [x, y] = key.split(',').map(Number);
    return [`${x},${y - 1}`, `${x + 1},${y}`, `${x},${y + 1}`, `${x - 1},${y}`]
        .filter((neighbor) => roadCells.has(neighbor))
        .length;
}

function roadsRemainConnected(roadCells: Set<string>, blockedRoads: Set<string>): boolean {
    const available = [...roadCells].filter((key) => !blockedRoads.has(key));
    const first = available[0];
    if (!first) {
        return false;
    }

    const availableSet = new Set(available);
    const visited = new Set<string>();
    const queue = [first];

    while (queue.length > 0) {
        const key = queue.shift();
        if (!key || visited.has(key)) {
            continue;
        }
        visited.add(key);
        const [x, y] = key.split(',').map(Number);
        for (const neighbor of [`${x},${y - 1}`, `${x + 1},${y}`, `${x},${y + 1}`, `${x - 1},${y}`]) {
            if (availableSet.has(neighbor) && !visited.has(neighbor)) {
                queue.push(neighbor);
            }
        }
    }

    return visited.size === availableSet.size;
}

function getRoadVariant(point: GridPoint, roadCells: Set<string>): RoadVariant {
    const north = roadCells.has(`${point.x},${point.y - 1}`);
    const south = roadCells.has(`${point.x},${point.y + 1}`);
    const east = roadCells.has(`${point.x + 1},${point.y}`);
    const west = roadCells.has(`${point.x - 1},${point.y}`);
    const connections = [north, south, east, west].filter(Boolean).length;

    if (connections >= 4) return 'crossing';
    if (connections === 3 && !north) return 'splitS';
    if (connections === 3 && !south) return 'splitN';
    if (connections === 3 && !east) return 'splitW';
    if (connections === 3) return 'splitE';
    if (north && south) return 'north';
    if (east && west) return 'east';
    if (north && east) return 'cornerUR';
    if (north && west) return 'cornerUL';
    if (south && east) return 'cornerLR';
    if (south && west) return 'cornerLL';
    return north || south ? 'north' : 'east';
}

function randomRoadsidePoint(random: () => number, roads: ArenaDecoration[]): Point {
    const road = roads[Math.floor(random() * roads.length)];
    const side = random() > 0.5 ? 1 : -1;
    return {
        x: road.position.x + side * (48 + random() * 24),
        y: road.position.y + (random() - 0.5) * 42
    };
}

function gridToWorld(point: GridPoint): Point {
    return {
        x: point.x * TILE_SIZE + TILE_SIZE / 2,
        y: point.y * TILE_SIZE + TILE_SIZE / 2
    };
}

function randomPoint(random: () => number, margin: number): Point {
    return {
        x: margin + random() * (ARENA_WIDTH - margin * 2),
        y: margin + random() * (ARENA_HEIGHT - margin * 2)
    };
}

function clampPoint(point: Point, margin: number): Point {
    return {
        x: Math.max(margin, Math.min(ARENA_WIDTH - margin, point.x)),
        y: Math.max(margin, Math.min(ARENA_HEIGHT - margin, point.y))
    };
}

function hashGrid(x: number, y: number, seed: number): number {
    let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function mulberry32(seed: number): () => number {
    let value = seed >>> 0;

    return () => {
        value += 0x6D2B79F5;
        let result = value;
        result = Math.imul(result ^ (result >>> 15), result | 1);
        result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
        return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
}
