# Rally Storybook native shell

This is an isolated Expo development shell for the guarded shared Storybook entry at `../rally-app/.rnstorybook/index.tsx`. It contains no copied Rally screen JSX and does not use Expo Router, production app configuration, EAS configuration, or production service credentials.

Install workspace dependencies before the first native build with the repository-pinned npm 11.9.0. `npm ci` preserves the committed root lockfile; do not use it to regenerate dependency resolution.

```sh
npm ci
```

Build and install only the sibling simulator target. The wrapper checks your exact UDID against available `simctl` simulators before invoking Expo; names, unknown IDs and physical devices are rejected:

```sh
npm run ios -w rally-storybook -- 1D71D5AB-0332-4892-858A-CCEC19991143
```

Start the guarded local development server after the simulator build:

```sh
npm run start -w rally-storybook
```

Both commands scrub inherited Storybook, public Expo, analytics, Sentry, Supabase, proxy, and `NODE_OPTIONS` settings, verify the exact Expo localhost patch before spawning, and use `shell: false`. The initial story is `Home/Home/Ready`; other local stories remain selectable on-device.

Local iOS build and Home acceptance passed on 2026-09-07. First launch may show Expo's developer-menu introduction; close it to see Home. Use the bottom-left Storybook menu to select states, then tap outside the sheet to dismiss it. Edit the existing production View in `rally-app/components/`, never copy a screen here.

The iOS wrapper forces its launch URL to trusted localhost. If the client was built before Metro started, connect after starting Metro:

```sh
xcrun simctl openurl 1D71D5AB-0332-4892-858A-CCEC19991143 'exp+rally-storybook://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'
```

Replace the sample UDID with your own confirmed iOS Simulator. Generated `ios/`, `android/`, `.expo/`, and export output are ignored; Xcode also maintains a separate `RallyStorybook-*` DerivedData directory. No Android/device build or Docker is included. See `../docs/devops/storybook-local.md` for the current workflow and verification evidence.

## Offline Simulator ZIP

For a teammate who should not install Node, Git, or Metro, make a fresh verified ZIP from a Release Simulator build:

```sh
npm run package -w rally-storybook -- --simulator 'Rally Storybook' --run-id release-20260909-01
```

The command requires exactly one available iOS Simulator named `Rally Storybook`; it never picks a latest device and never creates one. It builds a Release arm64 iPhone Simulator app in a new `outputs/rally-storybook/<run-id>/DerivedData` directory, then writes a ZIP with one top-level `Rally Storybook` folder. That folder has exactly four direct items: `RallyStorybook.app`, `manifest.json`, `checksums.txt`, and the double-click installer. The ZIP is made with `ditto --norsrc` and verified after extraction to reject `__MACOSX`, AppleDouble, or other extra entries. It refuses an existing run ID, less than 15 GiB free before building, unsafe Xcode Node environment files, unexpected runtime-source diffs, non-arm64/non-Simulator artifacts, missing Storybook bundle sentinel, disabled-update/minimum-OS/load-command failures, or known production service references.

Every distributable ZIP is built internally from the current worktree; an external `.app` override is intentionally unsupported. Its manifest records `artifactSourceBinding: current-worktree` with the packaging context.

The ZIP is for Xcode Simulator, not a standalone macOS application. The recipient needs an arm64 Mac, Xcode/Simulator, and an iOS Simulator runtime 15.1 or newer; unverified on M1/macOS Sequoia remains unverified until recorded separately. They unzip it and double-click `Install Rally Storybook.command`; see the Thai instructions in the runbook. Each update is a new ZIP. The installer checks the bundled app and installer checksums, validates the Rally Storybook Simulator identity, boots exactly one existing simulator named `Rally Storybook`, installs the same bundle ID as an update, and launches it. It does not create, delete, uninstall, remove quarantine, disable Gatekeeper, or execute Node/Python.
