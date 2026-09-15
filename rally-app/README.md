# Rally App

Rally is a competitive activity profile app built with Expo, React Native, TypeScript, Supabase, Zustand, and TanStack Query.

## Local development

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create a local environment file.

   ```bash
   cp .env.example .env
   ```

3. Start the app.

   ```bash
   npm run dev
   ```

   For Android Emulator development, prefer:

   ```bash
   npm run android:dev
   ```

   This starts Metro in localhost/dev-client mode, applies `adb reverse tcp:8081 tcp:8081` to connected emulators, and opens the Rally dev client with a localhost URL. It avoids the common LAN-IP asset errors where the app tries to fetch from `192.168.x.x:8081`.

   If one emulator is stuck in ADB `offline`, restart that emulator; the script will continue with the emulators that are actually in the `device` state.

## Scripts

- `npm run dev`: start Expo in localhost dev-client mode
- `npm run ios`: boot Rally iPhone 12 A, wait for Metro, then open the iOS dev client
- `npm run ios:test`: boot Rally iPhone 12 A/B, wait for Metro, then open both dev clients
- `npm run ios:server`: warm the Metro server without opening a simulator
- `npm run ios:build`: build/install the iOS dev client once if the simulator cannot open Rally
- Android native builds are produced by the team or remote EAS; this workspace does not
  expose a local Android build command
- `npm run android:dev`: restart non-localhost Metro if needed, apply adb reverse to Android emulators, then open the dev client
- `npm run android:server`: prepare localhost Metro and adb reverse without launching the app
- `npm run lint`: run Expo lint
- `npm run typecheck`: run TypeScript checks

## GitHub and CI/CD

See [docs/devops/github-cicd.md](./docs/devops/github-cicd.md) for the GitHub Actions and EAS setup.

## Stack

- Expo + React Native
- TypeScript
- Expo Router
- Supabase
- Zustand
- TanStack Query

## EAS

This repository includes `eas.json` profiles for:

- `development`
- `preview`
- `production`

Link the app to Expo once before using GitHub Actions:

```bash
npx eas login
npx eas init
```
