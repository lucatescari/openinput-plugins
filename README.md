# OpenInput Plugin Store

Community plugins for [OpenInput](https://github.com/lucatescari/OpenInput) — the open-source configuration tool for deck-style input devices.

## What are plugins?

Plugins extend OpenInput with new capabilities:

| Type | What it does | Examples |
|------|-------------|---------|
| **Device** | Adds hardware support for a new deck | Steam Deck, Loupedeck CT, Elgato Stream Deck |
| **Action** | Adds new key/encoder actions | Spotify control, OBS scene switching, Home Assistant |
| **Profile** | Shared pre-made configurations | Streaming starter pack, developer shortcuts |

## Installing plugins

1. Open OpenInput
2. Go to **Store** in the sidebar
3. Browse or search for a plugin
4. Click **Install** — you'll see what permissions the plugin needs
5. Restart the app to activate the plugin

To uninstall a plugin, go to the **Installed** tab in the Store and click **Uninstall**.

## Security & trust model

**Plugins run code on your machine.** This is the same trust model used by:
- [VS Code extensions](https://code.visualstudio.com/docs/editor/extension-marketplace)
- [Obsidian plugins](https://obsidian.md/plugins)
- [npm packages](https://www.npmjs.com/)
- [Homebrew formulas](https://brew.sh/)

Every plugin in this store has been **code-reviewed before publishing**. The review process checks for:

- No malicious code
- No unnecessary permissions
- Correct API usage
- Working functionality

Plugins must declare their **permissions** (what system access they need) and **platforms** (which operating systems they support). This information is shown to you before installation so you can make an informed decision.

**We take security seriously.** If you find a security issue in any plugin, please [open an issue](https://github.com/lucatescari/openinput-plugins/issues) or email the maintainer directly.

---

## Creating plugins

There are three types of plugins you can create. Each one is a self-contained JavaScript bundle (`index.js`) that exports a `module.exports` object.

### Common fields (all plugin types)

Every plugin must export these fields:

```javascript
module.exports = {
  id: 'your-plugin-id',       // unique identifier (lowercase, hyphens)
  name: 'Your Plugin Name',   // display name
  description: 'What it does in 1-2 sentences.',
  version: '1.0.0',           // semver

  // ... type-specific fields below
};
```

---

## Action Plugins

Action plugins add new actions that users can drag onto keys, encoders, and touch zones.

### Contract

```javascript
module.exports = {
  id: 'my-action-plugin',
  name: 'My Actions',
  description: 'Custom actions for XYZ.',
  version: '1.0.0',

  // Actions that appear in the action palette
  actions: [
    {
      id: 'do-something',
      name: 'Do Something',
      icon: 'zap',                // Any Lucide icon name
      description: 'What this action does',
    },
  ],

  // Called once when the plugin loads (optional)
  async initialize() {
    // Set up connections, state, etc.
  },

  // Called when a key with your action is pressed
  async execute(actionId, config) {
    switch (actionId) {
      case 'do-something':
        // Do something!
        break;
    }
  },

  // Called when the plugin unloads (optional)
  dispose() {
    // Clean up timers, connections, etc.
  },
};
```

### Available APIs

Plugins run in the Electron main process with full Node.js access:

- `require('electron')` — Notifications, shell, clipboard, etc.
- `require('child_process')` — Run system commands
- `require('fs')` — Read/write files
- `require('https')` — Make HTTP requests
- Any npm package (bundle it into your `index.js`)

### Example

See [`plugins/hello-world/`](./plugins/hello-world/) for a complete working example with three actions (Greet, Show Time, Counter).

---

## Device Plugins

Device plugins add support for new hardware. They tell the app how to discover, connect to, and communicate with a specific deck-style input device.

### Contract

A device plugin exports a `devicePlugin` property that describes the hardware layout and provides a protocol implementation:

```javascript
module.exports = {
  id: 'my-device',
  name: 'My Device Driver',
  description: 'Adds support for the XYZ macro pad.',
  version: '1.0.0',

  // This property is what makes it a device plugin
  devicePlugin: {
    meta: {
      id: 'my-device',
      name: 'XYZ Macro Pad',

      // Layout — tells the app what your device looks like
      layout: {
        keys: {
          rows: 2,
          cols: 3,
          count: 6,
          imageSpec: {
            width: 72,
            height: 72,
            rotation: 0,        // 0 | 90 | 180 | 270
            format: 'jpeg',     // 'jpeg' | 'png' | 'bmp'
            quality: 85,
            maxBytes: 15360,
          },
        },
        encoders: {
          count: 1,
          hasPress: true,
        },
        // touchZones and swipe are optional
      },

      // USB match — how the app finds your device
      match: [
        {
          vendorId: 0x1234,
          productIds: [0x5678],
          usagePage: 0xff00,     // optional HID usage page filter
        },
      ],
    },

    createProtocol() {
      return new MyProtocol();
    },
  },
};
```

### Protocol methods

Your protocol class must implement these methods:

| Method | Signature | Description |
|--------|-----------|-------------|
| `initialize` | `(device) => Promise<void>` | Send wake/handshake after HID open |
| `sendHeartbeat` | `(device) => Promise<void>` | Keep-alive every ~10 seconds |
| `setBrightness` | `(device, level) => Promise<void>` | Set brightness 0-100 |
| `sendImage` | `(device, outputId, imageData) => Promise<void>` | Send pre-encoded image to a slot |
| `clearSlot` | `(device, outputId) => Promise<void>` | Clear a display slot (0xFF = all) |
| `sleep` | `(device) => Promise<void>` | Turn off the display |
| `parseInputReport` | `(data) => event \| null` | Parse HID input into app events |
| `getOutputId` | `(elementType, index) => number \| undefined` | Map logical element to physical slot |
| `dispose` | `() => void` | Optional cleanup on disconnect |

### Image processing

You do **not** handle image processing. The framework does it all based on your `imageSpec`:

1. User assigns an image to a key
2. Framework resizes to `width` x `height`
3. Framework rotates by `rotation` degrees
4. Framework encodes to `format` at `quality`
5. If encoded size exceeds `maxBytes`, quality is auto-reduced
6. Your `sendImage()` receives the final buffer — just send it over the wire

### Input events

Your `parseInputReport()` should return events with these types:

| Event type | Description |
|-----------|-------------|
| `key_down` / `key_up` | LCD key press/release |
| `encoder_cw` / `encoder_ccw` | Encoder rotation |
| `encoder_press` / `encoder_release` | Encoder button |
| `touch_press` / `touch_release` | Touch zone tap |
| `swipe_left` / `swipe_right` | Swipe gestures |

```javascript
parseInputReport(data) {
  return {
    type: 'key_down',      // event type
    index: 0,              // 0-based element index
    timestamp: Date.now(),
  };
}
```

### What the app handles

Once your plugin is registered, all of these work automatically:

- Device discovery (USB scan every 3s) and auto-connect
- Image resize, rotate, encode
- Profile management, pages, folders with animated transitions
- Action system (hotkeys, media, apps, multi-actions, etc.)
- UI rendering — key grid, encoders, touch strip adapt to your layout
- Screensaver, overlays, heartbeat, auto-reconnect

### Example

See [`plugins/ajazz-akp05/`](./plugins/ajazz-akp05/) for a production device driver (the AJAZZ AKP05 macro pad) that demonstrates the full protocol implementation.

---

## Profile Plugins

Profile plugins provide pre-made configurations that users can import with one click.

### Contract

```javascript
module.exports = {
  id: 'my-profiles',
  name: 'My Profile Pack',
  description: 'Curated layouts for streaming and productivity.',
  version: '1.0.0',

  // This property is what makes it a profile plugin
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
            1: {
              action: { type: 'media', mediaAction: 'play_pause', label: 'Play' },
              title: 'Play/Pause',
            },
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

### Profile schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Default ID (auto-regenerated on import) |
| `name` | string | Yes | Display name |
| `pages` | PageConfig[] | Yes | Array of key pages |
| `encoders` | Record | Yes | Encoder configs |
| `touchZones` | Record | Yes | Touch zone configs |
| `swipeLeft` | ActionConfig | No | Swipe left action |
| `swipeRight` | ActionConfig | No | Swipe right action |
| `iconStyle` | object | No | `{ bgColor, accentColor }` for auto-generated icons |
| `screensaverTimeout` | number | No | Seconds before screensaver (0 = disabled) |

### Available action types

| Type | Key config fields | Description |
|------|------------------|-------------|
| `hotkey` | `hotkey: { modifiers, key }` | Send a keyboard shortcut |
| `hotkey_switch` | `hotkey` + `hotkey2` | Toggle between two shortcuts |
| `text` | `text: string` | Type out text |
| `launch_app` | `appPath: string` | Open an app |
| `close_app` | `appPath: string` | Quit an app |
| `open_url` | `url: string` | Open a URL |
| `open_file` | `filePath: string` | Open a file |
| `media` | `mediaAction: string` | Media control |
| `system` | `systemAction: string` | System control |
| `multi_action` | `actions: [], delayMs` | Sequential actions |
| `folder` | — | Open a key folder |
| `page_next` / `page_previous` | — | Navigate pages |
| `page_goto` | `pageIndex: number` | Jump to page |
| `none` | — | No action |

### Example

See [`plugins/example-profile/`](./plugins/example-profile/) for a complete example with two profiles (productivity + media).

---

## Registry entry

For any plugin type, add an entry to `registry.json`:

```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "description": "What it does.",
  "author": "your-github-username",
  "version": "1.0.0",
  "type": "action",
  "tags": ["relevant", "tags"],
  "downloadUrl": "plugins/your-plugin-id/dist/index.js",
  "platforms": ["macos", "windows", "linux"],
  "permissions": ["notifications"]
}
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier (lowercase, hyphens) |
| `name` | Yes | Display name |
| `description` | Yes | 1-2 sentence description |
| `author` | Yes | Your GitHub username |
| `version` | Yes | Semver version |
| `type` | Yes | `device`, `action`, or `profile` |
| `tags` | Yes | Searchable keywords |
| `downloadUrl` | Yes | Path to the JS bundle in this repo |
| `platforms` | No | `["macos", "windows", "linux"]` — omit for all platforms |
| `permissions` | No | What system access your plugin needs |
| `homepage` | No | Link to docs or source repo |
| `minAppVersion` | No | Minimum OpenInput version required |

**Available permissions:**

| Permission | Description |
|-----------|-------------|
| `notifications` | Show desktop notifications |
| `shell` | Execute shell commands |
| `network` | Make HTTP requests |
| `filesystem` | Read/write files outside the plugin directory |
| `clipboard` | Access the system clipboard |
| `keyboard` | Simulate keyboard shortcuts |
| `system` | Control brightness, volume, and other system settings |

## Submit a PR

1. Fork this repository
2. Add your plugin under `plugins/your-plugin-id/`
3. Add your entry to `registry.json`
4. Open a Pull Request

All plugins are reviewed before being merged. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full review checklist.

## Example plugins

| Plugin | Type | Description |
|--------|------|-------------|
| [`hello-world`](./plugins/hello-world/) | Action | Desktop notifications — demonstrates actions, initialize, execute, dispose |
| [`ajazz-akp05`](./plugins/ajazz-akp05/) | Device | AJAZZ AKP05/AKP05E/AKP05E Pro — production device driver with full protocol |
| [`example-profile`](./plugins/example-profile/) | Profile | Productivity + media profiles — shows the profile schema |

## License

Plugin submissions are accepted under the [MIT License](https://opensource.org/licenses/MIT) unless otherwise specified by the plugin author.
