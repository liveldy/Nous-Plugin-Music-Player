# 文本检视 · MIT

这是一个与破晓下载器无关的完整原生示例。业务只依赖公开 JSON RPC、Java 标准库和 Android 公开 API。Windows 使用 `app/plugin.jar`；Android 使用无独立应用入口的 Dex/资源容器。

由 `sdk/create.mjs --template native-text` 生成独立目录后：

1. 设置 `JAVA_HOME`，执行 `python build.py windows`。它构建模块自己的最小 Java runtime，不要求最终用户安装 Java。
2. Android 安装 SDK35、Build Tools35和Gradle8.11.1，设置 `ANDROID_HOME`、`GRADLE`，执行 `python build.py android`。
3. 执行 `node sdk/dev.mjs . --module windows-x64=dist/windows.module.zip --module android-arm64=dist/android.module.zip`。
4. 在对应 Nous 客户端插件管理的开发页面启用本机开发模式，读取 `http://127.0.0.1:8088/`，授权运行本机模块。Android 使用 `adb reverse tcp:8088 tcp:8088`。
5. 输入文本，检查字符数、词组数和SHA-256；停用后再调用会被拒绝。改代码后重建模块，再重新读取和安装开发版。

正式发布时，将manifest中的命名空间和仓库替换为自己的值，使用 `sdk/module.mjs` 固定真实Release资源、摘要和大小，执行 `sdk/check.mjs`、`sdk/pack.mjs`，按发布文档提交目录条目。示例中的零摘要和占位地址不代表已经发布的原生模块。
