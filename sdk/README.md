# Nous Plugin SDK 1.3.0 · MIT

公开SDK不依赖Nous主程序或破晓下载器。需要Node.js22+；原生示例另需JDK17+、Python3.11+，Android另需SDK35和Gradle8.11.1。使用正式Nous1.2.0或更新客户端进行原生集成测试。

```sh
node sdk/create.mjs --template notes my-notes
node my-notes/sdk/dev.mjs my-notes
node my-notes/sdk/check.mjs my-notes
node my-notes/sdk/pack.mjs my-notes
node --test sdk/test/*.test.mjs
```

原生示例：`node sdk/create.mjs --template native-text my-text`，按生成工程README构建。客户端本机开发模式读取回环开发服务器，Android使用`adb reverse tcp:8088 tcp:8088`。

- 完整离线手册：[plugin-development.md](docs/plugin-development.md)
- 方法参考：[plugin-api-reference.md](docs/plugin-api-reference.md)
- 机器合同：contract.json；包和消息Schema：schema/；浏览器类型：nous-plugin.d.ts。
- 协议协商：插件api必须在宿主supportedApis中，并满足最低宿主版本、平台、权限、必需方法。不能靠产品版本或“同为1.x”猜测兼容。
- 预览是模拟宿主；check是静态检查；原生构建和真实客户端测试分别执行，不能互相替代。
- 仅主版本相同也不代表任意接口可用；先用supports判断可选能力。
- SDK源码、示例和工具均为MIT；原生示例JSON-java 20240303为Public Domain，构建时校验来源摘要。自己的插件需遵守全部依赖许可。
