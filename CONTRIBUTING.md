# Contributing to the OpenInput Plugin Store

Thanks for wanting to create a plugin! Here's the quick process:

## Steps

1. **Fork** this repo
2. **Create** your plugin in `plugins/your-plugin-id/dist/index.js`
3. **Add** an entry to `registry.json`
4. **Open** a Pull Request

## Review checklist

Your PR will be reviewed for:

- [ ] No malicious or obfuscated code
- [ ] Permissions in `registry.json` match actual usage
- [ ] Platforms list is accurate
- [ ] Plugin loads without errors
- [ ] Actions work as described
- [ ] Clean, readable code

## Guidelines

- **One plugin per PR** — makes review faster
- **Test on the platforms you declare** — if you list `macos`, make sure it works on macOS
- **Use the minimum permissions needed** — don't request `shell` if you only need `notifications`
- **Bundle dependencies** — your `index.js` should be self-contained (use a bundler like esbuild or webpack)
- **Semver versioning** — use proper semantic versioning for updates

## Questions?

Open an issue or check the [plugin development docs](https://github.com/lucatescari/OpenInput/blob/main/docs/plugins.md).
