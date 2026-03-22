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

## Creating a plugin

Want to build a plugin? Here's how:

### 1. Plugin structure

```
plugins/your-plugin/
  dist/index.js       ← Your compiled plugin bundle
  manifest.json       ← Plugin metadata (optional, for reference)
  README.md           ← Documentation for your plugin
```

### 2. Plugin contract

Your `index.js` must export an object with this shape:

```javascript
module.exports = {
  // Required metadata
  id: 'your-plugin-id',
  name: 'Your Plugin Name',
  description: 'What it does in 1-2 sentences.',
  version: '1.0.0',

  // Actions that appear in the action palette
  actions: [
    {
      id: 'my-action',
      name: 'My Action',
      icon: 'keyboard',       // Any Lucide icon name
      description: 'What this action does',
    },
  ],

  // Called once when the plugin loads
  async initialize() {
    // Set up connections, state, etc.
  },

  // Called when a key with your action is pressed
  async execute(actionId, config) {
    switch (actionId) {
      case 'my-action':
        // Do something!
        break;
    }
  },

  // Called when the plugin unloads
  dispose() {
    // Clean up timers, connections, etc.
  },
};
```

### 3. Available APIs

Plugins run in the Electron main process with full Node.js access. You can use:

- `require('electron')` — Notifications, shell, clipboard, etc.
- `require('child_process')` — Run system commands
- `require('fs')` — Read/write files
- `require('https')` — Make HTTP requests
- Any npm package (bundle it into your `index.js`)

### 4. Registry entry

Add your plugin to `registry.json`:

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

### 5. Submit a PR

1. Fork this repository
2. Add your plugin under `plugins/your-plugin-id/`
3. Add your entry to `registry.json`
4. Open a Pull Request

All plugins are reviewed before being merged. Please make sure your plugin:

- Has no malicious code
- Only requests permissions it actually needs
- Works on the platforms you've declared
- Includes clear documentation
- Follows the plugin API contract

## Example plugin

See [`plugins/hello-world/`](./plugins/hello-world/) for a complete, working example that demonstrates the full plugin lifecycle with three actions (Greet, Show Time, Counter).

## License

Plugin submissions are accepted under the [MIT License](https://opensource.org/licenses/MIT) unless otherwise specified by the plugin author.
