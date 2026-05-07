export type Team = 'player' | 'enemy';
export type Difficulty = 'low' | 'medium' | 'high';
export type AiStateName = 'patrol' | 'investigate' | 'engage' | 'reposition';
export type GameOutcome = 'playing' | 'won' | 'lost';

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface DifficultyPreset {
    id: Difficulty;
    label: string;
    enemyCount: number;
    enemyHealth: number;
    enemySpeed: number;
    enemyProjectileSpeed: number;
    enemyDamage: number;
    fireCooldownMs: number;
    reactionDelayMs: number;
    visibilityRange: number;
}

export interface TankState {
    id: string;
    team: Team;
    position: Point;
    rotation: number;
    turretRotation: number;
    health: number;
    maxHealth: number;
    speed: number;
    fireCooldownRemainingMs: number;
    alive: boolean;
}

export interface EnemyAiState {
    state: AiStateName;
    visibilityRange: number;
    reactionDelayMs: number;
    reactionRemainingMs: number;
    patrolPoints: Point[];
    patrolIndex: number;
    lastKnownPlayerPosition?: Point;
}

export interface EnemyState extends TankState {
    team: 'enemy';
    ai: EnemyAiState;
}

export interface ProjectileState {
    id: string;
    ownerTeam: Team;
    position: Point;
    rotation: number;
    speed: number;
    damage: number;
    lifetimeRemainingMs: number;
}

export interface EnemySpawn {
    position: Point;
    patrolPoints: Point[];
}

export type TerrainTileKind =
    'grass' |
    'grassAlt' |
    'sand' |
    'sandAlt' |
    'transitionN' |
    'transitionE' |
    'transitionS' |
    'transitionW';

export type RoadVariant =
    'north' |
    'east' |
    'cornerLL' |
    'cornerLR' |
    'cornerUL' |
    'cornerUR' |
    'crossing' |
    'crossingRound' |
    'splitN' |
    'splitE' |
    'splitS' |
    'splitW';

export type RoadTransitionVariant =
    'N' |
    'E' |
    'S' |
    'W' |
    'N_dirt' |
    'E_dirt' |
    'S_dirt' |
    'W_dirt';

export interface ArenaObstacle {
    id: string;
    kind: 'crate' | 'barricade' | 'tree' | 'barrel';
    role?: 'cover' | 'roadblock' | 'oilSource';
    position: Point;
    size: Point;
    blocksVision: boolean;
    blocksShots: boolean;
}

export interface ArenaDecoration {
    id: string;
    kind: 'road' | 'oil' | 'sandbag' | 'tracks';
    position: Point;
    rotation: number;
    variant?: RoadVariant;
    roadTransition?: RoadTransitionVariant;
}

export interface ArenaData {
    seed: number;
    width: number;
    height: number;
    tileSize: number;
    safeRadius: number;
    terrain: TerrainTileKind[][];
    playerSpawn: Point;
    enemySpawns: EnemySpawn[];
    obstacles: ArenaObstacle[];
    decorations: ArenaDecoration[];
}

export interface GameState {
    arena: ArenaData;
    player: TankState;
    enemies: EnemyState[];
    projectiles: ProjectileState[];
    outcome: GameOutcome;
}
