# pinyin-search

[KeeWeb](https://keeweb.info) 插件，为 KeeWeb 添加拼音搜索支持。

支持拼音全拼（如 `taobao` → 淘宝）和拼音首字母（如 `wx` → 微信）搜索标题、用户名、网址、备注和标签。

## 安装

### 从 KeeWeb 插件菜单安装

KeeWeb → **设置** → **插件** → 从 URL 添加插件 → 输入插件 URL → **安装**。

点击安装后，KeeWeb 内部流程：

1. `GET {url}/manifest.json` — 获取并解析插件清单
2. 验证 manifest 字段（name、version、publicKey、resources、author 等）
3. `GET {url}/plugin.js?v={version}` — 获取插件脚本
4. 用 `manifest.publicKey` + `manifest.resources.js`（RSA-SHA256 签名）验证脚本完整性
5. `eval()` 执行插件代码，要求 `module.exports.uninstall` 存在
6. 资源写入 IndexedDB 缓存，插件信息持久化到 SettingsStore

手动输入的 URL 安装会自动跳过 publicKey 归属验证（`skipSignatureValidation=true`），但**签名匹配验证始终执行**。开发测试必须先用 `keeweb-plugin sign` 签名。

### 开发模式

```bash
# 安装签名工具
npm i -g keeweb-plugin

# 自动签名 + HTTPS 服务（从插件目录的上级目录执行）
cd temp
keeweb-plugin watch keeweb_pinyin
```

启动后在 KeeWeb 设置 → 插件 → 添加 `https://127.0.0.1:8089`。

### 处理自签名证书

`keeweb-plugin watch` 使用自签名证书，KeeWeb 桌面版（Electron）默认拒绝。

**方案 A（推荐开发用）：** 启动 KeeWeb 时加参数：

```bash
Start-Process -FilePath "C:\Program Files\KeeWeb\KeeWeb.exe" -ArgumentList "--ignore-certificate-errors"
```

**方案 B：** 安装证书到系统：

```powershell
certutil -user -addstore Root "C:\Users\用户名\AppData\Roaming\npm\node_modules\keeweb-plugin\self-signed-cert.pem"
```

## 工作原理

插件在加载时重写 `EntryModel.prototype._buildSearchText`，为每个条目的 `searchText` 追加拼音形式。输入搜索关键词时，`EntrySearch.matches()` 会同时匹配原文和追加的拼音，原有搜索行为不受影响。

- 拼音全拼：`zhifubao` → 支付宝
- 拼音首字母：`zfb` → 支付宝
- 混合查询：`alipay` → 支付宝
- 非中文文本原样保留

拼音字典（8300 字，401 键）来自《通用规范汉字表》(2013)，取自 [kMandarin_8105.txt](https://raw.githubusercontent.com/mozillazg/pinyin-data/refs/heads/master/kMandarin_8105.txt) 并内联在插件中，运行时无网络请求。

## Manifest 字段说明

KeeWeb 对以下字段有非空验证：

| 字段 | 要求 | 说明 |
|------|------|------|
| `name` | 非空字符串 | 插件标识符 |
| `version` | 非空字符串 | 语义版本号 |
| `manifestVersion` | `"0.1.0"` | KeeWeb 固定值 |
| `author.name` | 非空字符串 | |
| `author.email` | 非空（truthy） | 空字符串校验失败 |
| `author.url` | 非空（truthy） | 作者主页，仅显示 |
| `url`（外层） | 非空（truthy） | 插件主页，仅显示 |
| `publicKey` | 非空字符串 | RSA 公钥 |
| `resources` | 至少一个键的对象 | `{"js": "<签名>"}` |
| `desktop` | boolean | 桌面测试需设为 `true` |

## 文件说明

| 文件 | 用途 |
|------|------|
| `manifest.json` | 插件元数据 |
| `plugin.js` | 主插件代码：拼音映射、构建逻辑、条目重写、重建及卸载 |
| `data/kMandarin_8105.txt` | 拼音原始数据源（8105 个通用规范汉字） |
| `build-pinyin-data.js` | 从原始数据生成 `PINYIN_MAP` 的构建脚本 |
| `plugin.test.js` | 拼音转换逻辑单元测试 |

## 开发

### 更新拼音数据

```bash
# 更新 data/kMandarin_8105.txt（替换为更新版本）
node build-pinyin-data.js
# 输出 pinyin-data.js，将其中的 PINYIN_MAP 粘贴到 plugin.js 顶部
```

### 签名并测试

```bash
keeweb-plugin sign keeweb_pinyin
# 或文件修改后自动重签名
keeweb-plugin watch keeweb_pinyin
```

### 运行单元测试

```bash
node --test plugin.test.js
```

### 手动验证

1. 启动 dev server：`keeweb-plugin watch keeweb_pinyin`
2. 启动 KeeWeb（带 `--ignore-certificate-errors`）
3. 添加 `https://127.0.0.1:8089`
4. 打开演示库（密码 `demo`）或任何含中文条目的 kdbx
5. 搜索拼音全拼（`baidu` → 百度）和首字母（`wx` → 微信）

## 许可证

MIT
