# KeeWeb Pinyin Search — AGENTS.md

## Repo structure

```
manifest.json    — plugin metadata (name, version, resources, publicKey)
plugin.js        — inline pinyin dict + _buildSearchText override + rebuild + uninstall
plugin.test.js   — unit tests (Node 24 built-in test runner)
build-pinyin-data.js  — regenerates PINYIN_MAP from data/kMandarin_8105.txt
data/kMandarin_8105.txt  — pinyin source (通用规范汉字表 2013, 8105 chars)
private_key.pem  +  public_key.pem  — RSA key pair for signing
```

## Key facts

- **KeeWeb plugin**, no bundler/transpiler/package.json. Plugin runs inside KeeWeb's require/module system.
- Overrides `EntryModel.prototype._buildSearchText` to append full pinyin + first-letter pinyin to `searchText`.
- Pinyin dictionary: 401 keys, ~8300 chars, from [mozillazg/pinyin-data](https://github.com/mozillazg/pinyin-data) (kMandarin_8105.txt, 通用规范汉字表). Tone-stripped, most common pronunciation per character.
- Uninstall via `module.exports.uninstall` restores original prototype method and removes event listener.

## Manifest fields

KeeWeb validates these fields strictly:

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

## Development commands

Run from repo **parent directory** (keeweb-plugin expects the dir name as arg):

```bash
# Start dev server with auto-re-sign on changes
keeweb-plugin watch keeweb_pinyin

# Re-sign without server
keeweb-plugin sign keeweb_pinyin
```

Add plugin URL `https://127.0.0.1:8089` in KeeWeb Settings → Plugins.

## Testing in KeeWeb desktop

The dev server (`keeweb-plugin watch`) uses a **self-signed certificate** for `127.0.0.1`. KeeWeb desktop (Electron) rejects it by default.

**Option A (recommended for dev):** Start KeeWeb with `--ignore-certificate-errors`:

```bash
# Kill existing KeeWeb, then:
Start-Process -FilePath "C:\Program Files\KeeWeb\KeeWeb.exe" -ArgumentList "--ignore-certificate-errors"
```

After plugin is installed, you can restart KeeWeb normally.

**Option B:** Install the self-signed cert to CurrentUser\Root:

```powershell
certutil -user -addstore Root "C:\Users\rambo\AppData\Roaming\npm\node_modules\keeweb-plugin\self-signed-cert.pem"
# Then fully restart KeeWeb
```

## Architecture notes

- `_buildSearchText` is called from `_fillByEntry()`, which is called from `setEntry()`. Overriding it catches all entries (new + existing).
- `rebuildExistingEntries()` calls `_fillByEntry()` on every entry in open files for late-load scenarios.
- `filter` event one-shot is a safety net: rebuilds on first search if entries were loaded before the plugin.
- Entry fields are iterated via `this.entry.fields.forEach()` (Map). Non-string values (ProtectedValue) are skipped.
- Tamper with `EntryModel`/`AppModel`/`Events` using safe import pattern: `require('...').X || require('...')`.

## Testing

```bash
# Unit tests (pinyin conversion logic, no KeeWeb dependency)
node --test plugin.test.js
```

### Manual verification

1. Start dev server: `keeweb-plugin watch keeweb_pinyin` (from parent dir)
2. Start KeeWeb with `--ignore-certificate-errors`
3. Add `https://127.0.0.1:8089` in Settings → Plugins
4. Open demo db (password: `demo`) or any kdbx with Chinese entries
5. Search by full pinyin (`baidu` → 百度) and first-letter (`wx` → 微信)

## Data source

The pinyin data is from [kMandarin_8105.txt](https://raw.githubusercontent.com/mozillazg/pinyin-data/refs/heads/master/kMandarin_8105.txt) — the 2013 official standard (通用规范汉字表). Local copy: `data/kMandarin_8105.txt`. Each character has its most common pronunciation, tone-stripped. To update:

```bash
# Replace data/kMandarin_8105.txt with a newer version, then:
node build-pinyin-data.js
# This outputs pinyin-data.js; paste its PINYIN_MAP into plugin.js.
```

The build script (`build-pinyin-data.js`) reads `data/kMandarin_8105.txt`, strips tone marks, and generates the `PINYIN_MAP` object literal. Run it only when the dictionary needs updating.
