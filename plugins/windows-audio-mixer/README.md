# Windows Audio Mixer

Control per-app audio volumes directly from your deck.

## Features

- Shows each audio source (app) as a key with app name, volume bar, and mute state
- **Press a key** to toggle mute for that app
- **Rotate an encoder** to adjust volume for the last-selected app (±5% per click)
- Automatic pagination when more apps than available keys
- Polls every 1.5 seconds to stay in sync with system changes
- Activates/deactivates by pressing the assigned key

## Requirements

- **Windows only** — silently disabled on macOS
- OpenInput v1.4.0+ (requires Plugin Context API)

## How to use

1. Install the plugin from the OpenInput Store
2. Go to the Deck page, select a key
3. Assign the **Audio Mixer** action
4. Press the key to activate — all deck keys will show your audio sources
5. Press the same key again (or the assigned key) to deactivate

## Permissions

| Permission | Why |
|-----------|-----|
| `shell` | Runs PowerShell to access Windows Core Audio API |
| `system` | Controls per-app volume and mute state |
