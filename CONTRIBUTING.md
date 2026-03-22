# Contributing to the OpenInput Plugin Store

Thanks for wanting to create a plugin! Here's the quick process:

## Steps

1. **Fork** this repo
2. **Create** your plugin in `plugins/your-plugin-id/dist/index.js`
3. **Add** an entry to `registry.json`
4. **Open** a Pull Request

## Plugin types

| Type | What to export | Example |
|------|---------------|---------|
| **Action** | `actions[]` + `execute()` | [`hello-world`](./plugins/hello-world/) |
| **Device** | `devicePlugin` property | [`ajazz-akp05`](./plugins/ajazz-akp05/) |
| **Profile** | `profiles[]` | [`example-profile`](./plugins/example-profile/) |

See the [README](./README.md) for full documentation on each type.

## Review checklist

Your PR will be reviewed for:

- [ ] No malicious or obfuscated code
- [ ] Permissions in `registry.json` match actual usage
- [ ] Platforms list is accurate
- [ ] Plugin loads without errors
- [ ] Actions/drivers/profiles work as described
- [ ] Clean, readable code

## Guidelines

- **One plugin per PR** — makes review faster
- **Test on the platforms you declare** — if you list `macos`, make sure it works on macOS
- **Use the minimum permissions needed** — don't request `shell` if you only need `notifications`
- **Bundle dependencies** — your `index.js` should be self-contained (use a bundler like esbuild or webpack)
- **Semver versioning** — use proper semantic versioning for updates
- **Include a README** — document what your plugin does and how to use it

## Device plugins

If you're creating a device driver:

1. Find your device's USB Vendor ID and Product ID (macOS: System Information > USB, Linux: `lsusb`, Windows: Device Manager)
2. Capture HID traffic with [Wireshark](https://www.wireshark.org/) or similar
3. Implement the full `DeviceProtocol` interface (initialize, heartbeat, brightness, sendImage, parseInput, etc.)
4. Test with a real device before submitting

See [`plugins/ajazz-akp05/`](./plugins/ajazz-akp05/) for a production reference implementation.

## Profile plugins

If you're sharing profile configurations:

1. Use platform-independent actions where possible (`media`, `open_url`)
2. Remember that hotkey modifiers differ across platforms (meta = Cmd on macOS, Win on Windows)
3. Use `title` fields on keys — auto-generated icons will adapt to any device's display dimensions
4. Include multiple profiles for different use cases

See [`plugins/example-profile/`](./plugins/example-profile/) for a complete example.

## Questions?

Open an issue or check the [plugin development docs](https://github.com/lucatescari/OpenInput/blob/main/docs/plugins.md).
