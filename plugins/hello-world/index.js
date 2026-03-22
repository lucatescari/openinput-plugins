/**
 * Hello World — Example community plugin for OpenInput.
 *
 * This plugin demonstrates the full plugin lifecycle:
 *   1. `actions` — defines two actions that appear in the action palette
 *   2. `initialize()` — called once when the plugin is loaded
 *   3. `execute()` — called each time a key with one of this plugin's actions is pressed
 *   4. `dispose()` — called when the plugin is unloaded
 *
 * To install this plugin for testing, copy this folder into:
 *   ~/Library/Application Support/OpenInput/store/plugins/hello-world/
 *   (macOS — adjust for Windows/Linux)
 *
 * Then restart the app. The plugin's actions will appear in the action palette.
 */

const { Notification } = require('electron');

let pressCount = 0;

module.exports = {
  id: 'hello-world',
  name: 'Hello World',
  description: 'Example plugin — shows desktop notifications when keys are pressed.',
  version: '1.0.0',

  actions: [
    {
      id: 'greet',
      name: 'Greet',
      icon: 'music',           // Lucide icon name (reuse any icon from the palette)
      description: 'Show a friendly greeting notification',
    },
    {
      id: 'show-time',
      name: 'Show Time',
      icon: 'sun',
      description: 'Show the current time as a notification',
    },
    {
      id: 'counter',
      name: 'Counter',
      icon: 'hash',
      description: 'Count how many times this key has been pressed',
    },
  ],

  async initialize() {
    pressCount = 0;
    console.log('[hello-world] Plugin initialized!');
  },

  async execute(actionId, _config) {
    switch (actionId) {
      case 'greet': {
        new Notification({
          title: 'Hello from OpenInput!',
          body: 'Your community plugin is working. 🎉',
        }).show();
        break;
      }

      case 'show-time': {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        new Notification({
          title: 'Current Time',
          body: time,
        }).show();
        break;
      }

      case 'counter': {
        pressCount++;
        new Notification({
          title: 'Key Press Counter',
          body: `Pressed ${pressCount} time${pressCount === 1 ? '' : 's'}`,
        }).show();
        break;
      }

      default:
        console.warn(`[hello-world] Unknown action: ${actionId}`);
    }
  },

  dispose() {
    pressCount = 0;
    console.log('[hello-world] Plugin disposed.');
  },
};
