# Tankr Agent Notes

## Project Snapshot
- Stack: Phaser 4, TypeScript, Vite.
- Goal: top-down 2D tank arena game using Kenney Top-down Tanks Remastered assets.
- Game flow: `Boot -> Preloader -> MainMenu -> Settings -> Game -> GameOver`; `Settings` is reached from `MainMenu`, not part of every run.
- This workspace currently has no `.git` metadata, so do not rely on git commands for history or commits.

## Gameplay Requirements
- The player starts from a main menu, selects difficulty, and can remap keyboard movement/pause controls.
- Difficulty and control remapping live on the separate `Settings` scene.
- Default movement is WASD. The tank turret follows the mouse. Left click fires.
- Player projectiles should spawn from the barrel muzzle and carry owner team/id data so firing never damages or hides the shooter.
- ESC, or the configured pause key, toggles pause and unpause.
- Each run creates one random arena. The player wins by destroying all enemies and loses at zero health.
- Enemies patrol first, then engage only when the player is inside visibility range with line of sight.
- Obstacles should block both enemy vision and shots.

## Assets
- Use assets from `public/assets/kenney_top-down-tanks-remastered/PNG/Default size`.
- Prefer stable keys from `src/game/assets/manifest.ts` instead of scattering file paths.
- Tanks use separate body and barrel sprites so hull movement and turret aiming are independent.
- Ground rendering uses the Kenney grass/sand road family: base grass/sand tiles, road straights/corners/splits/crossings/round crossings, grass road transitions, dirt road transitions, and grass/sand boundary transitions.
- Retina assets are present but are not part of the v1 implementation.

## Architecture
- Keep pure gameplay behavior under `src/game/simulation`, `src/game/content`, and `src/game/input`.
- Phaser scenes should orchestrate rendering, physics, camera, input, and effects, but gameplay rules should stay testable without a canvas.
- `src/game/content/arena.ts` owns deterministic arena generation.
- Arena generation should stay map-like rather than scatter-like: connected roads, grass/sand transition terrain, roadblocks on roads, oil spills near barrels, and sandbag cover near enemy positions.
- `src/game/content/difficulty.ts` owns difficulty tuning.
- `src/game/input/bindings.ts` owns remappable keyboard controls and persistence shape.
- `src/game/scenes/Game.ts` is the Phaser adapter that wires generated arenas and simulation rules into sprites.
- Terrain rendering should use clustered/seeded variation. Avoid simple modulo patterns that create checkerboards or obvious diagonals.
- Road generation should remain graph-based: connected waypoint paths with bends, branches, and joins. Road tile variants are derived from north/east/south/west neighbor masks, and roadblocks must be chosen so removing their cells does not disconnect the road graph.
- Grass/sand biomes should be large organic regions with transition tiles only near biome edges. Roads crossing those edges should carry `roadTransition` metadata so `Game.ts` can render the matching transition or dirt-transition asset.

## Commands
- Dev server: `npm run dev`
- Production build: `npm run build`
- Preview production build: `npm run preview`
- Unit tests: `npm run test`
- Watch tests: `npm run test:watch`
- Type check fallback: `./node_modules/.bin/tsc --noEmit`
- Codex environment note: inside Codex, `node` may resolve to the Codex app's bundled Node, which macOS can block from loading Rollup's native module. If Vite or Vitest fails with a Rollup native module signature/loading error, put the workspace Node first on `PATH` before running scripts; a normal terminal using the user's regular Node install should usually be fine.

## Testing Expectations
- Unit tests should target pure TypeScript systems, not Phaser rendering.
- Keep tests for deterministic generation, difficulty ordering, input serialization/remap validation, AI range/LOS, combat outcomes, and projectile lifecycle.
- Arena tests should also cover road auto-tiling from neighbor masks, connected road graphs, corner/split/crossing presence, biome transition placement, road-transition metadata, no isolated roads, and roadblock graph safety.
- Before claiming work is complete, run `npm run test` and `npm run build`.
- If Vitest or Vite fails before collecting tests due to Rollup native optional dependency errors on macOS, repair dependencies with a clean `npm install` before judging the app code.

## Manual Playtest Checklist
- Menu starts a new game with the selected difficulty.
- Remapped keys persist after browser refresh.
- Default WASD movement works.
- Mouse aim rotates the turret.
- Left click fires with cooldown.
- Enemies patrol before detecting the player.
- Cover blocks detection and bullets.
- Pause key toggles pause/unpause reliably.
- HUD health and enemies-left values update.
- Win/loss screens return to the main menu.
