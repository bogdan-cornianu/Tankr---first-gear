# Tankr

Tankr is a top-down Phaser 4 tank arena game built with TypeScript and Vite. It uses the Kenney Top-down Tanks Remastered asset pack in `public/assets/kenney_top-down-tanks-remastered`.

## Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install project dependencies. |
| `npm run dev` | Launch the Vite development server. |
| `npm run build` | Type-check with TypeScript and create a production build in `dist`. |
| `npm run preview` | Preview the production build locally. |
| `npm run test` | Run Vitest unit tests for pure gameplay systems. |
| `npm run test:watch` | Run Vitest in watch mode. |

`dev-nolog` and `build-nolog` remain as compatibility aliases, but the project scripts no longer call `log.js`.

## Gameplay

- Start a generated arena from the main menu.
- Choose low, medium, or high difficulty from the settings screen.
- Remap movement and pause keys from the settings screen.
- Move with WASD by default, aim the turret with the mouse, and fire with left click.
- Enemies patrol until the player enters their visibility range with clear line of sight.
- Destroy every enemy to win. Losing all player health ends the run.

## Project Structure

| Path | Description |
|------|-------------|
| `index.html` | HTML shell for the Phaser canvas. |
| `public/assets` | Static assets served by Vite. |
| `src/main.ts` | Browser bootstrap. |
| `src/game/main.ts` | Phaser game configuration. |
| `src/game/scenes` | Phaser scenes for boot, menu, settings, gameplay, and game over. |
| `src/game/content` | Difficulty presets and arena generation. |
| `src/game/simulation` | Pure gameplay systems and geometry helpers. |
| `src/game/input` | Keyboard control binding logic. |
| `src/game/assets` | Stable asset manifest keys. |
