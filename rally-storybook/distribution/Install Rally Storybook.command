#!/bin/zsh
set -euo pipefail

package_dir="$(cd -- "$(dirname -- "$0")" && pwd -P)"
app_path="$package_dir/RallyStorybook.app"
checksums_path="$package_dir/checksums.txt"
installer_path="$package_dir/Install Rally Storybook.command"
simulator_name='Rally Storybook'
bundle_identifier='com.rallyactiver.rally.storybook'

fail() {
  print -u2 -- "Rally Storybook: $1"
  exit 1
}

[[ -d "$app_path" && -f "$app_path/main.jsbundle" && -x "$app_path/RallyStorybook" ]] || fail 'the packaged app is incomplete; download the ZIP again.'
[[ -f "$checksums_path" ]] || fail 'checksums.txt is missing; download the ZIP again.'

app_tree_hash() {
  (
    cd -- "$app_path"
    /usr/bin/find . -type f -print | LC_ALL=C /usr/bin/sort | while IFS= read -r relative_path; do
      digest="$(/usr/bin/shasum -a 256 "$relative_path" | /usr/bin/awk '{print $1}')"
      print -r -- "$digest  $relative_path"
    done
  ) | /usr/bin/shasum -a 256 | /usr/bin/awk '{print $1}'
}

expected_app_hash="$(/usr/bin/awk -F '\t' '$2 == "RallyStorybook.app" { print $1 }' "$checksums_path")"
expected_installer_hash="$(/usr/bin/awk -F '\t' '$2 == "Install Rally Storybook.command" { print $1 }' "$checksums_path")"
[[ "$expected_app_hash" =~ ^[0-9a-f]{64}$ && "$expected_installer_hash" =~ ^[0-9a-f]{64}$ ]] || fail 'checksums.txt is malformed; download the ZIP again.'
[[ "$(app_tree_hash)" == "$expected_app_hash" ]] || fail 'app checksum mismatch; download the ZIP again.'
[[ "$(/usr/bin/shasum -a 256 "$installer_path" | /usr/bin/awk '{print $1}')" == "$expected_installer_hash" ]] || fail 'installer checksum mismatch; download the ZIP again.'
[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app_path/Info.plist")" == "$bundle_identifier" ]] || fail 'the app bundle identifier is not Rally Storybook.'
[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleSupportedPlatforms:0' "$app_path/Info.plist")" == 'iPhoneSimulator' ]] || fail 'the app is not an iPhone Simulator build.'
[[ "$(/usr/bin/lipo -archs "$app_path/RallyStorybook")" == 'arm64' ]] || fail 'the app is not an arm64 Simulator build.'

device_rows=("${(@f)$(/usr/bin/xcrun simctl list devices available | /usr/bin/awk '/^-- iOS / { ios = 1; next } /^-- / { ios = 0 } ios { print }' | /usr/bin/sed -nE 's/^[[:space:]]*Rally Storybook \(([A-F0-9-]+)\) \((Booted|Shutdown)\)$/\1\t\2/p')}")
if (( ${#device_rows[@]} != 1 )) || [[ -z "${device_rows[1]:-}" ]]; then
  fail "create or rename exactly one iPhone Simulator to '$simulator_name' in Xcode, then run this installer again. This installer never creates or deletes simulators."
fi

device_udid="${device_rows[1]%%$'\t'*}"
device_state="${device_rows[1]#*$'\t'}"
if [[ "$device_state" == 'Shutdown' ]]; then
  /usr/bin/xcrun simctl boot "$device_udid"
elif [[ "$device_state" != 'Booted' ]]; then
  fail "the '$simulator_name' simulator is not ready; open Xcode and try again."
fi
/usr/bin/xcrun simctl bootstatus "$device_udid"
/usr/bin/open -a Simulator
/usr/bin/xcrun simctl install "$device_udid" "$app_path"
/usr/bin/xcrun simctl launch "$device_udid" "$bundle_identifier"
print -- 'Rally Storybook installed and launched in the Rally Storybook Simulator.'
