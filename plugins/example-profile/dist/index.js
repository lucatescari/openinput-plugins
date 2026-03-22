/**
 * Example Profile Plugin for OpenInput
 *
 * Profile plugins provide pre-made configurations that users can import
 * into their OpenInput setup. They're perfect for sharing curated layouts
 * for specific workflows (streaming, development, music production, etc.).
 *
 * A profile plugin exports one or more Profile objects that match the
 * app's Profile schema. When installed, the profiles become available
 * in the user's profile list.
 */

module.exports = {
  // Standard community plugin metadata (required)
  id: 'example-profile',
  name: 'Starter Profiles',
  description: 'Example profile pack — a productivity layout and a media controller layout.',
  version: '1.0.0',

  /**
   * The profiles array is what makes this a profile plugin.
   *
   * Each entry must follow the Profile schema from OpenInput.
   * The app imports these into the user's profile storage on install.
   *
   * Profile schema reference:
   * {
   *   id: string           — unique ID (auto-generated on import, but provide a default)
   *   name: string         — display name
   *   createdAt: string    — ISO date
   *   updatedAt: string    — ISO date
   *   pages: PageConfig[]  — array of key pages
   *   encoders: Record<number, EncoderConfig>
   *   touchZones: Record<number, TouchZoneConfig>
   *   swipeLeft?: ActionConfig
   *   swipeRight?: ActionConfig
   *   iconStyle?: { bgColor: string, accentColor: string }
   *   screensaverTimeout?: number   — seconds (0 = disabled)
   * }
   *
   * PageConfig: { name: string, keys: Record<number, KeyConfig> }
   * KeyConfig:  { action?: ActionConfig, title?: string, iconStyle?: IconStyle }
   * EncoderConfig: { pressAction?, rotateClockwise?, rotateCounterClockwise? }
   */
  profiles: [
    // ── Profile 1: Productivity ────────────────────────────────────
    {
      id: 'example-productivity',
      name: 'Productivity Starter',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pages: [
        {
          name: 'Main',
          keys: {
            // Key 0: Copy
            0: {
              action: {
                type: 'hotkey',
                hotkey: { modifiers: ['meta'], key: 'c' },
                label: 'Copy',
              },
              title: 'Copy',
            },
            // Key 1: Paste
            1: {
              action: {
                type: 'hotkey',
                hotkey: { modifiers: ['meta'], key: 'v' },
                label: 'Paste',
              },
              title: 'Paste',
            },
            // Key 2: Undo
            2: {
              action: {
                type: 'hotkey',
                hotkey: { modifiers: ['meta'], key: 'z' },
                label: 'Undo',
              },
              title: 'Undo',
            },
            // Key 3: Redo
            3: {
              action: {
                type: 'hotkey',
                hotkey: { modifiers: ['meta', 'shift'], key: 'z' },
                label: 'Redo',
              },
              title: 'Redo',
            },
            // Key 4: Save
            4: {
              action: {
                type: 'hotkey',
                hotkey: { modifiers: ['meta'], key: 's' },
                label: 'Save',
              },
              title: 'Save',
            },
            // Key 5: Select All
            5: {
              action: {
                type: 'hotkey',
                hotkey: { modifiers: ['meta'], key: 'a' },
                label: 'Select All',
              },
              title: 'Select All',
            },
            // Key 6: Find
            6: {
              action: {
                type: 'hotkey',
                hotkey: { modifiers: ['meta'], key: 'f' },
                label: 'Find',
              },
              title: 'Find',
            },
            // Key 7: Open URL
            7: {
              action: {
                type: 'open_url',
                url: 'https://github.com',
                label: 'GitHub',
              },
              title: 'GitHub',
            },
            // Key 8: Screenshot
            8: {
              action: {
                type: 'hotkey',
                hotkey: { modifiers: ['meta', 'shift'], key: '4' },
                label: 'Screenshot',
              },
              title: 'Screenshot',
            },
            // Key 9: Next page
            9: {
              action: {
                type: 'page_next',
                label: 'Next Page',
              },
              title: 'Page >',
            },
          },
        },
        {
          name: 'Window Management',
          keys: {
            0: {
              action: {
                type: 'page_previous',
                label: 'Prev Page',
              },
              title: '< Page',
            },
            // Spotlight / search
            1: {
              action: {
                type: 'hotkey',
                hotkey: { modifiers: ['meta'], key: 'space' },
                label: 'Spotlight',
              },
              title: 'Search',
            },
            // Mission Control
            2: {
              action: {
                type: 'hotkey',
                hotkey: { modifiers: ['ctrl'], key: 'up' },
                label: 'Mission Ctrl',
              },
              title: 'Mission Ctrl',
            },
          },
        },
      ],
      encoders: {
        // Encoder 0: Volume control
        0: {
          rotateClockwise: {
            type: 'media',
            mediaAction: 'volume_up',
            label: 'Vol +',
          },
          rotateCounterClockwise: {
            type: 'media',
            mediaAction: 'volume_down',
            label: 'Vol -',
          },
          pressAction: {
            type: 'media',
            mediaAction: 'mute',
            label: 'Mute',
          },
        },
      },
      touchZones: {},
      iconStyle: {
        bgColor: '#1e1e2e',
        accentColor: '#89b4fa',
      },
    },

    // ── Profile 2: Media Controller ────────────────────────────────
    {
      id: 'example-media',
      name: 'Media Controller',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pages: [
        {
          name: 'Media',
          keys: {
            0: {
              action: {
                type: 'media',
                mediaAction: 'prev_track',
                label: 'Previous',
              },
              title: 'Prev',
            },
            1: {
              action: {
                type: 'media',
                mediaAction: 'play_pause',
                label: 'Play/Pause',
              },
              title: 'Play/Pause',
            },
            2: {
              action: {
                type: 'media',
                mediaAction: 'next_track',
                label: 'Next',
              },
              title: 'Next',
            },
            3: {
              action: {
                type: 'media',
                mediaAction: 'mute',
                label: 'Mute',
              },
              title: 'Mute',
            },
          },
        },
      ],
      encoders: {
        0: {
          rotateClockwise: {
            type: 'media',
            mediaAction: 'volume_up',
            label: 'Vol +',
          },
          rotateCounterClockwise: {
            type: 'media',
            mediaAction: 'volume_down',
            label: 'Vol -',
          },
          pressAction: {
            type: 'media',
            mediaAction: 'mute',
            label: 'Mute',
          },
        },
      },
      touchZones: {},
      iconStyle: {
        bgColor: '#1a1a2e',
        accentColor: '#a6e3a1',
      },
    },
  ],
};
