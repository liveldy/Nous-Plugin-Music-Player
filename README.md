# 音乐播放器

Nous 插件：一个空壳播放器。装好是空的，把本机的音频加进来就播——曲库、进度、音量、顺序/单曲/随机都在这一页里，文件不上传、不离开这一页。

交互是从破晓《弦音余韵》的播放器上收下来的：同一副三根弦的可视化、同一套模式与听曲时长；界面按 Nous 插件重画，业务按插件协议重写。

## 音频怎么进来的

宿主给插件页面的是这段 CSP（`sdk/protocol.mjs` 的 `pluginDocument`）：

```
default-src 'none'; script-src 'nonce-…'; style-src 'nonce-…' 'unsafe-inline';
img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'
```

没有 `media-src`，`<audio>`、`<video>`、blob: 与 data: 音频都被拒绝（实测 `play()` 报 `NotSupportedError`），页面也不能联网。

接口对整包资源的上限是 4 MiB（`sdk/protocol.mjs` 的 `validateBundle`：超过就抛「插件界面资源最大 4 MB」），所以音频也不随包走。

因此播放用 **Web Audio**：`decodeAudioData(File.arrayBuffer())` 不走 CSP、不联网；`AudioBufferSourceNode` 出进度与时长，`AnalyserNode` 出中间那三根弦。音频只在内存里，关掉页面就没了。

## 页面能力：后台播放、通知栏与托盘

**当前插件接口（Plugin Interface 1.3）不提供。**

| 想要的能力 | 接口里有没有 | 依据 |
| --- | --- | --- |
| 页面内播放音频 | 有，只能走 Web Audio | 页面 CSP 无 `media-src`，`<audio>` 被拒 |
| 离开插件页继续播放 | 没有 | 页面在 `sandbox="allow-scripts allow-forms"` 的不透明源 iframe 里，切到别的模块即销毁；协议里没有常驻页面 |
| 通知栏 / 媒体控件（Windows、Android） | 没有 | `sdk/contract.json` 的 17 个方法里没有任何媒体、通知或媒体会话方法 |
| 托盘图标与托盘菜单 | 没有 | 同上，宿主不把主进程 UI 暴露给插件 |
| Android 前台服务通知 | 仅限原生模块的一句文字 | `plugin-development.md` 的 Android ABI：通用回调 `foreground.update {text}`，纯文本，没有 MediaStyle、播放按钮与 MediaSession |
| 后台任务 | 只有原生 runtime 模块可以 | 同一份文档：「页面切换不等于停止原生后台任务」；那需要 `native.runtime` 与随包发布的 JVM/APK 模块 |

要让音频真的离开这一页（后台播放、通知栏、从服务器取歌），唯一的路是加一个原生 runtime 模块：模块自己联网下载、自己解码出声，页面用 `runtime.invoke` 当遥控器。这一版没有做，所以边界写在界面上：播放发生在这一页，离开即停。

## 怎么用

- 「添加文件」或把文件拖进窗口：加进曲库，选中第一首，不自动播。
- 点曲库里的任意一行：换到那一首并开始播；再点当前这首是暂停。
- 进度条拖动、空格暂停、左右方向键前后跳 5 秒；音量在最右。
- 顺序（放到最后一首停）、单曲（一首循环）、随机。
- 时长在第一次解码后出现在行尾；没播过的行先留空。

## 存储

`storage.get/set` 一个键 `player`，按账户隔离，远小于 64 KiB：

```json
{"v":2,"mode":"single","volume":0.55,"listen":{"d":"2026-11-14","s":125}}
```

只记模式、音量与今日听曲时长。文件名与进度不记：页面拿不到文件系统，重开必须重新添加，记了也用不上。

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
ui/app.js              播放引擎（Web Audio）、曲库、模式、拖放、存储
ui/fonts/              Mona Sans、Geist Mono 的 latin 子集与 OFL 许可
ui/nous-plugin.js      宿主页面 SDK（MIT）
sdk/                   公开插件 SDK（MIT）
```

权限只有 `storage`：没有原生模块，网页、Windows、Android 用同一份页面。

## 验证

- `node sdk/check.mjs .`：三个平台的协议、权限、必需方法与资源检查通过。
- 在宿主 CSP 文档里实测：起始为空（0 行、「还没有音乐」、播放按钮禁用）→ 选两个 mp3 → 自动选中第一首 → 播放、拖到 1:01、下一首、随机、拖入第三个文件，曲库与时长都对。
- 在本机模拟宿主里跑通：读取种子存储恢复模式、音量、今日听曲时长，改动写回该账户的存储。
- `copy-lint` 0 FAIL 0 WARN；`perf` 0 FAIL 0 WARN（首屏 56 ms、传输 78.1 KiB、0 个 WebGL 上下文、0 个长任务）。

## 发行

- 仓库：https://github.com/liveldy/Nous-Plugin-Music-Player
- 发行包：https://github.com/liveldy/Nous-Plugin-Music-Player/releases/download/v1.0.0/app.nous.music-player-1.0.0.nous-plugin.json
- SHA-256：`550e7b6d571032491258ac29a3314a67480cde9bbc142e385e02b6b66cbfed04`（138,433 字节）

## 许可

插件代码 MIT。字体为 SIL OFL 1.1（见 `ui/fonts/OFL-*.txt`）。插件不含任何歌曲音频或歌词。
