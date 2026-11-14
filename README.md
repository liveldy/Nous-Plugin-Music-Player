# 音乐播放器

Nous 插件：古风歌曲包的逐句歌词播放器。曲目表、歌词、顺序/单曲/随机三种模式、进度与音量都在一页里；音频只从你本机选取的文件读入内存播放。

这是把破晓《弦音余韵》搬到插件接口上的复写，不是移植：界面按插件页面重画，业务按插件协议重写。

## 音频怎么进来的

宿主给插件页面的是这段 CSP（`sdk/protocol.mjs`）：

```
default-src 'none'; script-src 'nonce-…'; style-src 'nonce-…' 'unsafe-inline';
img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'
```

没有 `media-src`，所以 `<audio>`、`<video>`、blob: 与 data: 音频都被拒绝（实测：`play()` 报 `NotSupportedError`），页面也不能联网。插件包里只有图片与字体会被内联成 data:，音频文件进不了页面，总包也只有 4 MiB。

因此这一版用 **Web Audio** 播：`decodeAudioData(File.arrayBuffer())` 不走 CSP，也不联网；`AudioBufferSourceNode` 出进度与时长，`AnalyserNode` 出这一页中间那根会振动的弦。

- 打开插件看到的是《弦音余韵》古风歌曲包里的 22 首曲目（名称、歌手、时长、逐句 LRC 歌词）。
- 点「选择本地文件」，或在曲库里点任意一首，选取歌曲包里的 mp3：文件名（`001.mp3`、`弱水三千.mp3`）对上就自动归位。
- 文件不离开设备，也不会被写入插件存储；关闭页面后要重新选择一次，这是接口限制，不是遗漏。

## 页面能力：后台播放、通知栏与托盘

**当前插件接口（Plugin Interface 1.3）不提供。** 核对来源：

| 想要的能力 | 接口里有没有 | 依据 |
| --- | --- | --- |
| 页面内播放音频 | 有，只能走 Web Audio | 页面 CSP 无 `media-src`，`<audio>` 被拒 |
| 离开插件页继续播放 | 没有 | 插件页面在 `sandbox="allow-scripts allow-forms"` 的不透明源 iframe 里，切到别的模块即销毁；没有常驻页面的协议 |
| 通知栏 / 媒体控件（Windows、Android） | 没有 | `sdk/contract.json` 的 18 个方法里没有任何媒体、通知或媒体会话方法；Windows 侧原生模块是独立 JVM 进程，只有 stdin/stdout 请求，接不进宿主的托盘或媒体会话 |
| 托盘图标与托盘菜单 | 没有 | 同上，宿主不把主进程 UI 暴露给插件 |
| Android 前台服务通知 | 仅限原生模块的一句文字 | `plugin-development.md` 的 Android ABI：通用回调 `foreground.update {text}`，纯文本通知，没有 MediaStyle、没有播放按钮、没有 MediaSession |
| 关闭页面后仍能出声 | 理论上只能由原生模块自己解码播放 | 原生模块进程在页面关闭后继续存在；但要自带解码器（JDK 只有 WAV/AIFF/AU），且仍然没有通知栏与托盘入口 |

所以这一版的边界写在界面上：播放发生在这一页，离开页面即停。要做到破晓里的后台播放 + 通知栏 + 托盘，需要宿主先加一条媒体能力（例如把 `media.play` / `media.state` / 系统媒体会话作为 methods 进合同，或在 Windows 侧给原生模块一个媒体会话桥）。

## 与《弦音余韵》的对应关系

| 弦音余韵 | 这一版 |
| --- | --- |
| 曲目表 `server/content/music.json` + `/api/plugins/music/audio/{id}` | `ui/pack.js` 随包曲目表；音频由用户在本机选取 |
| 迷你播放器（跨模块常驻）+ 歌词弹窗 | 一页两栏播放器：正在播放 + 逐句歌词 + 曲库，歌词点句跳转 |
| 顺序 / 随机 / 单曲 | 同名三种模式，写入插件存储 |
| 听曲时长上报（只记真实播放时间） | 本地记录今日听曲分钟数，只累加真实播放的进度增量 |
| Android `DawnMusicService`（MediaSession、通知栏、音频焦点、缓存、桌面控件） | 接口不支持，未实现；见上表 |
| Windows 托盘、置顶歌词控件、`powerSaveBlocker` | 接口不支持，未实现；见上表 |

## 曲目表

`ui/pack.js` 由 `tools/pack.mjs` 从破晓的音乐内容生成（`music.json` 是 `scripts/import_music.py` 的产物）：

```sh
node tools/pack.mjs --content "D:/Desktop/DawnBreaker/server/content"   # 默认路径
node tools/pack.mjs --music path/to/music.json --out ui/pack.js
```

22 首、801 行歌词，约 33 KiB。**音频不入包**：200 MB 的歌装不进 4 MiB，页面也放不了。歌词与曲目名来自歌曲包本身，发行仓库前请确认你对这些文本的发行权。

## 存储

`storage.get/set` 一个键 `player`，按账户隔离，远小于 64 KiB：

```json
{"v":1,"mode":"sequence","volume":0.8,"track":"004","position":42.5,"listen":{"d":"2026-11-14","s":125}}
```

重新打开时恢复曲目、进度、模式、音量（暂停状态），今日听曲时长按同一天续上。

## 命令

```sh
node sdk/dev.mjs .      # 本机模拟宿主，浏览器打开 http://127.0.0.1:8088/
node sdk/check.mjs .    # 协议、权限、方法、资源预检
node sdk/pack.mjs .     # 生成 dist/app.nous.music-player-1.0.0.nous-plugin.json
```

## 结构

```
manifest.json          插件清单（Plugin Interface 1.3，需要 Nous 1.2.0+）
ui/index.html          页面骨架：顶栏、正在播放、曲库、隐藏的文件选择
ui/style.css           设计令牌与样式（Mona Sans 随包，中文回落到系统字体）
ui/app.js              播放引擎（Web Audio）、歌词、队列、模式、存储
ui/pack.js             古风歌曲包曲目表（tools/pack.mjs 生成，勿手改）
ui/fonts/              Mona Sans、Geist Mono 的 latin 子集与 OFL 许可
ui/nous-plugin.js      宿主页面 SDK（MIT）
tools/pack.mjs         曲目表生成器
sdk/                   公开插件 SDK（MIT）
```

权限只有 `storage`：没有任何原生模块，网页、Windows、Android 用同一份页面。

## 验证

- `node sdk/check.mjs .`：三个平台的协议、权限、必需方法与资源检查通过。
- 在本机模拟宿主里跑通：读取种子存储恢复曲目/进度/音量/听曲时长，改动写回该账户的存储。
- 真实 mp3（歌曲包 `001.mp3`、`002.mp3`）解码播放：进度前进、逐句歌词跟着走、上一首/下一首/单曲/随机都对；播放 65 秒后今日听曲时长出现。
- 设计检查用 taste-skill 的 `copy-lint`、`consistency`、`check`、`perf` 与 `gate`：`copy-lint` 0 FAIL 0 WARN；`perf` 0 FAIL 0 WARN（首屏 92 ms、传输 91.9 KiB、0 个 WebGL 上下文）；`gate` 收在 `GATE: OPEN 21 (rounds used up)`，未过的 21 条全是落地页版式规则（首屏一次只放一个 section、每个 section 恰好一屏、CTA 在 hero 里），这一版是全视口双栏应用界面，不按那套版式排；判定为误报的 5 条写在 `.taste-skill/waivers.json`。

## 发行

- 仓库：https://github.com/liveldy/Nous-Plugin-Music-Player （私有；`ui/pack.js` 带 22 首歌名与 801 行歌词，属第三方版权文本，确认有权再转公开）
- 发行包：https://github.com/liveldy/Nous-Plugin-Music-Player/releases/download/v1.0.0/app.nous.music-player-1.0.0.nous-plugin.json
- SHA-256：`a6405a95148dea40aa62795b1c30e26bb0dc0b2a799b567094e5534651d8dbb8`（177,250 字节）

## 许可

插件代码 MIT。字体为 SIL OFL 1.1（见 `ui/fonts/OFL-*.txt`）。歌曲音频与歌词文本不属于本仓库。
