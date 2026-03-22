# Example Profile Plugin

A reference implementation showing how to create a **profile** plugin for OpenInput.

## What profile plugins do

Profile plugins provide pre-made configurations that users can import with one click. They're ideal for sharing curated layouts for specific workflows:

- **Streaming** — OBS scenes, mute, camera toggle
- **Development** — Git shortcuts, build/run, debug
- **Music production** — DAW transport, mixer controls
- **Productivity** — Copy/paste, screenshots, app launchers

## Plugin structure

```
plugins/example-profile/
  dist/index.js       ← The profile bundle
  README.md           ← This file
```

## How it works

Your `index.js` exports a standard plugin object with a `profiles` array:

```javascript
module.exports = {
  id: 'my-profiles',
  name: 'My Profile Pack',
  description: 'Curated layouts for streaming and productivity.',
  version: '1.0.0',

  profiles: [
    {
      id: 'streaming-layout',
      name: 'Streaming Starter',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pages: [
        {
          name: 'Main',
          keys: {
            0: {
              action: { type: 'hotkey', hotkey: { modifiers: ['meta'], key: 'c' }, label: 'Copy' },
              title: 'Copy',
            },
            // ... more keys
          },
        },
      ],
      encoders: {
        0: {
          rotateClockwise: { type: 'media', mediaAction: 'volume_up' },
          rotateCounterClockwise: { type: 'media', mediaAction: 'volume_down' },
          pressAction: { type: 'media', mediaAction: 'mute' },
        },
      },
      touchZones: {},
      iconStyle: { bgColor: '#1e1e2e', accentColor: '#89b4fa' },
    },
  ],
};
```

## Profile schema

Each profile in the `profiles` array must follow this structure:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Default ID (auto-regenerated on import to avoid conflicts) |
| `name` | string | Display name shown in the profile list |
| `createdAt` | string | ISO date string |
| `updatedAt` | string | ISO date string |
| `pages` | PageConfig[] | Array of key page configurations |
| `encoders` | Record | Encoder configs (press, CW, CCW actions) |
| `touchZones` | Record | Touch zone configs (image + action) |
| `swipeLeft` | ActionConfig | Optional swipe left action |
| `swipeRight` | ActionConfig | Optional swipe right action |
| `iconStyle` | object | Default `{ bgColor, accentColor }` for auto-generated icons |
| `screensaverTimeout` | number | Seconds before screensaver (0 = disabled) |

### Page config

```javascript
{
  name: 'Page Name',
  keys: {
    0: { action: { type: 'hotkey', hotkey: { modifiers: ['meta'], key: 'c' } }, title: 'Copy' },
    1: { action: { type: 'media', mediaAction: 'play_pause' }, title: 'Play' },
    // ... key index → KeyConfig
  },
}
```

### Available action types

| Type | Config fields | Description |
|------|--------------|-------------|
| `hotkey` | `hotkey: { modifiers, key }` | Send a keyboard shortcut |
| `hotkey_switch` | `hotkey` + `hotkey2` | Toggle between two shortcuts |
| `text` | `text: string` | Type out a text string |
| `launch_app` | `appPath: string` | Open an application |
| `close_app` | `appPath: string` | Quit an application |
| `open_url` | `url: string` | Open a URL in browser |
| `open_file` | `filePath: string` | Open a file |
| `media` | `mediaAction: string` | Media control (play_pause, next_track, etc.) |
| `system` | `systemAction: string` | System control (brightness) |
| `multi_action` | `actions: [], delayMs` | Run multiple actions in sequence |
| `folder` | — | Open a key folder |
| `page_next` | — | Go to next page |
| `page_previous` | — | Go to previous page |
| `page_goto` | `pageIndex: number` | Jump to specific page |
| `none` | — | No action |

### Encoder config

```javascript
{
  pressAction: { type: 'media', mediaAction: 'mute' },
  rotateClockwise: { type: 'media', mediaAction: 'volume_up' },
  rotateCounterClockwise: { type: 'media', mediaAction: 'volume_down' },
}
```

## Tips

- **Use platform-independent actions** — `media` and `open_url` work on all platforms. Hotkey modifiers differ (meta = Cmd on macOS, Win on Windows).
- **Provide multiple pages** — users can switch between them with `page_next` / `page_previous` actions.
- **Set icon styles** — the `iconStyle` with `bgColor` and `accentColor` makes auto-generated icons look cohesive.
- **Don't hardcode images** — profiles with `title` fields get auto-generated icons matching the user's device dimensions.
- **Include multiple profiles** — a single plugin can ship several profiles for different use cases.
