# Rally Frontend

This repository contains only the Rally mobile application and its native Storybook shell. It is exported from Rally commit `2f513e70145ed6eda93aeba5e061ebbd4279501e`; its source paths intentionally match the main repository.

## Layout

- `rally-app/` — Expo / React Native application and the shared production components.
- `rally-app/.rnstorybook/` — local stories and display fixtures for those same components.
- `rally-storybook/` — isolated native Storybook launcher. It imports the real components from `rally-app/`; never copy a screen into this folder.
- `packages/contracts/` and `packages/db-types/` — compile-time API contracts consumed by the app.

The backend, admin dashboard, credentials, and environment files are deliberately absent. Backend changes must arrive as a reviewed contract update; this repository must not invent server behavior.

## Setup

`npm install` creates this repository's lockfile. Then use `npm run start` for the app or `npm run storybook:start` for Storybook.

Run `npm run lint`, `npm run typecheck`, and `npm run test` before opening a frontend pull request.
