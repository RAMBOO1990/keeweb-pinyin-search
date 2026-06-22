# KeeWeb Pinyin Search — AGENTS.md

## Repo structure

```
manifest.json            — plugin metadata (name, version, resources, publicKey)
plugin.js                — inline pinyin dict + _buildSearchText override + rebuild + uninstall
plugin.test.js           — unit tests (Node 24 built-in test runner)
build-pinyin-data.js     — regenerates PINYIN_MAP from data/kMandarin_8105.txt
data/kMandarin_8105.txt  — pinyin source (通用规范汉字表 2013, 8105 chars)
private_key.pem          — RSA private key for signing
public_key.pem           — RSA public key for manifest.publicKey
```

## How KeeWeb loads a plugin

1. `GET {url}/manifest.json` — fetch & parse manifest
2. Validate manifest fields (name, version, publicKey, resources, author, etc.)
3. `GET {url}/plugin.js?v={version}` — fetch script
4. Verify script integrity via `manifest.publicKey` + `manifest.resources.js` (RSA-SHA256 signature)
5. `eval()` executes plugin code (`module.exports.uninstall` must exist)
6. Resources cached in IndexedDB, plugin info persisted to SettingsStore

Manually entered URLs skip publicKey ownership check (`skipSignatureValidation=true`), but **signature matching always runs**. Dev testing requires `keeweb-plugin sign`.

## Manifest validation rules

| Field | Requirement | Note |
|---|---|---|
| `name` | non-empty string | Plugin identifier |
| `version` | non-empty string | Semver |
| `manifestVersion` | `"0.1.0"` | Fixed by KeeWeb |
| `author.name` | non-empty string | |
| `author.email` | **truthy** (non-empty) | Empty string fails validation |
| `author.url` | **truthy** (non-empty) | Author homepage, display only |
| `url` (top-level) | **truthy** (non-empty) | Plugin homepage link, display only |
| `publicKey` | non-empty string | RSA public key for signature verification |
| `resources` | object with at least one key | `{"js": "<signature>"}` |
| `desktop` | boolean | Set `true` if testing on desktop |
| `licence` | string | e.g. `"MIT"` |
| `versionMin`/`versionMax` | `null` or semver | Compatibility range |

## Development workflow

### Setup

```bash
npm i -g keeweb-plugin
```

All commands run from repo **parent directory** (keeweb-plugin expects dir name as arg).

### Dev server with auto-re-sign

```bash
keeweb-plugin watch keeweb_pinyin
```

Add `https://127.0.0.1:8089` in KeeWeb Settings → Plugins.

### Sign-only (no server)

```bash
keeweb-plugin sign keeweb_pinyin
```

### Self-signed cert workaround

`keeweb-plugin watch` uses a self-signed cert for `127.0.0.1`. KeeWeb desktop (Electron) rejects it by default.

**Option A (recommended):** Start KeeWeb with `--ignore-certificate-errors`:

```bash
Start-Process -FilePath "C:\Program Files\KeeWeb\KeeWeb.exe" -ArgumentList "--ignore-certificate-errors"
```

After plugin installs, restart KeeWeb normally.

**Option B:** Install cert system-wide:

```powershell
certutil -user -addstore Root "C:\Users\<user>\AppData\Roaming\npm\node_modules\keeweb-plugin\self-signed-cert.pem"
```

## Architecture

### How it works

Plugin overrides `EntryModel.prototype._buildSearchText` to append full pinyin + first-letter pinyin to each entry's `searchText`. When searching, `EntrySearch.matches()` matches both original text and appended pinyin, leaving original search behavior intact.

### Call chain

- `_buildSearchText` is called from `_fillByEntry()`, called from `setEntry()`. Override catches all entries (new + existing).
- `rebuildExistingEntries()` calls `_fillByEntry()` on every entry in open files (late-load safety).
- `filter` event (one-shot) rebuilds on first search if entries loaded before plugin.
- Entry fields iterated via `this.entry.fields.forEach()` (Map). Non-string values (ProtectedValue) skipped.
- Safe import pattern: `require('...').X || require('...')`.

## Testing

### Unit tests

```bash
node --test plugin.test.js
```

### Manual verification

1. `keeweb-plugin watch keeweb_pinyin` (from parent dir)
2. Start KeeWeb with `--ignore-certificate-errors`
3. Add `https://127.0.0.1:8089` in Settings → Plugins
4. Open demo db (password: `demo`) or any kdbx with Chinese entries
5. Search full pinyin (`baidu` → 百度) and first-letter (`wx` → 微信)

## Pinyin data

Dictionary: 401 keys, ~8300 chars, from [kMandarin_8105.txt](https://raw.githubusercontent.com/mozillazg/pinyin-data/refs/heads/master/kMandarin_8105.txt) (通用规范汉字表 2013). Tone-stripped, most common pronunciation per character. Inlined in plugin.js — zero network requests at runtime.

### Update pinyin data

```bash
# 1. Replace data/kMandarin_8105.txt with newer version
# 2. Run build script (strips tones, generates PINYIN_MAP object literal):
node build-pinyin-data.js
# 3. Paste output (pinyin-data.js → PINYIN_MAP) into plugin.js top
```

## Uninstall

`module.exports.uninstall` restores the original `_buildSearchText` prototype method and removes the `filter` event listener.
