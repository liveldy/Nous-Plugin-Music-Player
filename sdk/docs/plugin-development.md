# Nous Plugin Interface 1.3

这份文档和公开 SDK 是插件与 Nous 之间的合同。开发者无需主程序源码，也无需参考破晓下载器。SDK、两个完整示例、类型定义、JSON Schema和检查工具均以MIT许可提供；插件自行决定其业务实现和许可。下载器的网盘、视频模型及账号逻辑不属于宿主协议。

## 从空目录开始

安装 Node.js 22+，下载 [SDK 1.3.0](https://github.com/liveldy/Nous/releases/download/v1.2.0/Nous-Plugin-SDK-1.3.0.zip) 并解压。以下命令从解压目录运行：

```sh
node sdk/create.mjs --template notes my-notes
node my-notes/sdk/dev.mjs my-notes
```

浏览器打开 `http://127.0.0.1:8088/`，新增、完成、删除清单，切换设置和深色主题。这个模拟宿主提供存储与导航，明确拒绝系统操作，不会伪造原生执行成功。

```sh
node my-notes/sdk/check.mjs my-notes
node my-notes/sdk/pack.mjs my-notes
```

输出 `my-notes/dist/org.example.notes.dev-1.0.0.nous-plugin.json`。修改自己的命名空间、名称、仓库、许可和版本后才用于正式发布。工程只含自己的UI、公开SDK和可选的原生模块。

## 在发布版客户端测试

安装 [Nous 1.2.0或更新版本](https://github.com/liveldy/Nous/releases)，登录后打开 **插件管理 → 开发插件 → 本机开发测试**。

1. 启用当前账户的本机开发模式。
2. 保持 `node sdk/dev.mjs 工程路径` 运行，填写 `http://127.0.0.1:8088/` 并读取开发插件。
3. 核对插件名称、平台与权限后安装。侧栏出现插件入口，可使用真实宿主接口。
4. 修改代码后重新读取、安装开发版。更新保留该账户插件数据。

Android 通过USB连接开发电脑，运行 `adb reverse tcp:8088 tcp:8088`，手机内使用同一地址。可用 `adb devices` 检查连接。开发服务器只绑定回环地址，不需要开放公网端口、上传私有代码或安装主程序开发环境。关闭开发模式会停止开发插件并拒绝执行。开发ID使用`.dev`后缀，不能覆盖同ID的正式插件。

开发模式绕过正式发布目录签名，因此只运行自己信任的代码；原生代码可访问设备文件与网络。正式安装不允许使用本地HTTP源。

## 原生插件：独立构建示例

```sh
node sdk/create.mjs --template native-text my-text
```

`my-text/README.md`列出完整构建步骤。Windows在Windows电脑上使用JDK17+、Python3.11+执行 `python build.py windows`，生成包含独立Java运行时的模块ZIP。Android安装SDK35、Gradle8.11.1，设置 `JAVA_HOME`、`ANDROID_HOME`、`GRADLE`，执行 `python build.py android`。

```sh
node my-text/sdk/dev.mjs my-text --module windows-x64=my-text/dist/windows.module.zip --module android-arm64=my-text/dist/android.module.zip
```

未构建的平台可省略其`--module`参数，但不能在对应客户端启动。开发服务器根据显式指定的ZIP计算真实摘要与大小，客户端仍执行校验。文本示例在Windows JVM和Android Dex中分别统计Unicode字符、空白分隔词组及SHA-256，没有下载器依赖。

## 协议版本与安装门禁

`manifest.api`是插件遵守的协议版本；`manifest.version`是插件自己的产品版本；`requiresHost`是最低客户端版本。三者不能互相替代。

| 客户端 | 当前宿主协议 | 明确兼容的插件协议 |
| --- | --- | --- |
| Nous 1.1.0 | 1.2 | 1.0、1.1、1.2 |
| Nous 1.2.0 | 1.3 | 1.0、1.1、1.2、1.3 |
| 早期客户端 | 以该客户端实现为准 | 不推断支持新协议 |

安装时必须满足：插件协议在宿主`supportedApis`内；最低客户端版本满足；当前平台已声明；全部必需权限获授；`requiredMethods`全部可用。任一不满足都拒绝安装，下载和执行原生代码之前完成检查。原生安装端再次验证，不能仅依赖UI。打开已安装插件时重复协商，失败不创建运行页面。

宿主1.2接受1.1是显式提供兼容适配，并非忽略版本差异；未公布的1.4、2.0等一律拒绝。不自动降级插件协议、不猜测方法存在。`hostVersion`在原生端来自本机安装版本，不能来自在线页面、插件版本或服务器版本。

新增可选方法保持现有行为，使用能力查询；改变已有参数、返回语义、权限或生命周期必须发布新的协议主版本，或增加新方法。移除旧协议必须从兼容列表移除，并在发布记录说明。插件只把确实不可缺少的方法放在`requiredMethods`；可选能力列入`optionalMethods`并使用`supports()`判断。

## 清单与文件格式

完整定义见[manifest JSON Schema](../schema/manifest.schema.json)、[类型定义](../protocol.d.mts)和两个[公开示例](../examples)。

```json
{
  "id":"org.example.notes.dev",
  "name":"随手清单",
  "version":"1.0.0",
  "api":"1.3",
  "requiresHost":"1.2.0",
  "author":{"name":"Example Developer"},
  "changelog":[{"version":"1.0.0","publishedAt":"2026-11-14","changes":["首个插件版本。"]}],
  "description":"按当前账户保存清单。",
  "platforms":["web","windows-x64","android-arm64"],
  "permissions":["storage"],
  "entry":"ui/index.html",
  "repository":"example-org/nous-notes",
  "license":"MIT",
  "navigation":[{"id":"notes","label":"清单","icon":"file-text"}],
  "defaultView":"notes",
  "requiredMethods":["storage.get","storage.set"],
  "optionalMethods":[],
  "resources":["ui/index.html","ui/style.css","ui/app.js","ui/nous-plugin.js"]
}
```

ID小写命名空间、最长100字符；名称最长60字符；菜单1–12项，ID唯一、label最长24字符；`defaultView`必须已声明。导航是模块二级菜单，不重复Nous最左侧核心模块栏。

包为UTF-8 JSON：`{format:'nous.plugin/v1',manifest,files}`。最多256资源，总计4MiB；`resources`只用于工程清单，打包后移除。脚本和样式读取UTF-8；PNG、JPEG、WebP、SVG、ICO、WOFF/WOFF2转为data URL，HTML图片和CSS资源路径在装载时内联。禁止绝对路径、符号链接越界、`..`逃逸、外部脚本与CDN。框架项目应先输出单一IIFE脚本及声明的本地资源；当前协议不提供任意动态模块导入或网络脚本加载。

## 页面API

在自己的HTML引入随包`nous-plugin.js`，TypeScript项目引用`nous-plugin.d.ts`。

```js
const context = await NousPlugin.ready;
// pluginId, platform, api(协商结果), hostApi, pluginApi, supportedApis,
// hostVersion, theme, locale, view, navigation, permissions, methods, limits
const saved = await NousPlugin.request('storage.get', {key:'notes'});
if (NousPlugin.supports('clipboard.write')) {
  await NousPlugin.request('clipboard.write', {text:'结果'});
}
const off = NousPlugin.on('navigation.changed', view => render(view));
// 离开自己的视图时 off()
```

公开方法的逐项参数/结果Schema、平台、权限、首次支持版本和超时，见[机器合同](../contract.json)与[方法参考](plugin-api-reference.md)。这是统一来源，宿主与SDK检查不能各自发明同名方法。

| 权限 | 范围 |
| --- | --- |
| storage | 当前账户/插件的JSON存储，最多64KiB |
| clipboard.write | 显式复制文本，最多30000字符；不读取剪贴板 |
| external.open | 在系统打开HTTPS链接；不返回网页登录凭证 |
| native.runtime | 加载可信本机代码、内置官方登录窗口；具备Nous本身的设备权限 |
| auth.external | 在默认浏览器启动标准授权并接收本机回调，不读取浏览器Cookie |

`native.application/native.bridge`仅为旧1.0兼容保留，新插件应使用runtime模块。网页平台不提供原生执行、内置原生登录或外部本机授权回调。网页网络请求也不能通过插件iframe绕过CSP；需要网络/文件业务的插件在其原生模块中实现。

## 消息、错误、超时和取消

页面运行在不透明来源的iframe，`sandbox="allow-scripts allow-forms"`。脚本/样式/图片随包提供，禁止直接网络、嵌套iframe和网络表单提交。握手为`frame.ready → render → rendered → init`，插件使用SDK无需手写。每次装载生成nonce；宿主验证窗口来源、协议、nonce、启用状态及当前账户。

请求：`{protocol:'nous.plugin/1',kind:'request',nonce,id,method,params}`。结果携带相同nonce/id、`kind:'result'`，且只含value或error之一。事件：`{kind:'event',event,value,...}`。保留事件为`navigation.changed`、`theme.changed`。应用切换账户或卸载页面后，旧请求结果不得投递到新页面。

每次请求最大1MiB，结果最大4MiB，同时最多32个未完成请求；JSON最多32层，不接受函数、循环对象或保留属性名。默认超时见合同，可用`{timeoutMs}`在100–900000毫秒内指定。SDK超时或AbortSignal取消后发送取消通知并忽略迟到结果。**通用取消只取消等待，不回滚已经发生的业务修改，也不承诺中断原生代码**；业务取消应由插件自己的runtime方法实现。内置登录另有`runtime.webLogin.cancel`，外部授权另有`auth.external.cancel`。

```js
const controller = new AbortController();
try {
  await NousPlugin.request('runtime.invoke',
    {method:'text.inspect',params:{text:'hello'}},
    {signal:controller.signal,timeoutMs:30000});
} catch (error) {
  if (error.code === 'E_CANCELLED') return;
  showError(error.message);
}
```

SDK保留`PluginError.code`。标准错误包括参数错误、未知方法、缺权限、平台不支持、宿主过旧、插件停用、取消、超时、繁忙、超限、运行错误、授权拒绝/过期和开发模式关闭，完整枚举见合同。无法分类的旧宿主错误使用`E_HOST`，不返回宿主堆栈或凭证。

## 内置官方登录

`runtime.webLogin`使用隔离窗口，不注入Nous桥。参数包括`url, domains, cookieUrls, requiredCookies`；1.2增加按平台的`urls`、`userAgents`。Android默认使用移动UA、手机宽度和正常缩放，不沿用旧配置中的Windows UA。登录地址、Cookie读取和跳转必须属于显式声明的HTTPS域。

可选`validation:{url,path,equals,nonEmpty?,userAgent?}`在Cookie稳定后执行只读GET；最大64KiB、8秒、失败最多每5秒重试。通过后才关闭窗口、返回`{cookie}`。验证请求UA可与登录页面UA分别声明，避免为了API兼容而把手机登录页伪装成电脑。

Windows会话只在内存中保存；Android清理所声明平台的域/路径Cookie，不清理Nous账户。取消、停用、卸载或10分钟超时结束流程。插件应再次验证凭证再保存，不把Cookie写入页面storage、日志、公开Release或Nous服务器。

## 外部默认浏览器授权

使用[OAuth Native Apps RFC8252](https://www.rfc-editor.org/rfc/rfc8252)的回环回调与[PKCE RFC7636](https://www.rfc-editor.org/rfc/rfc7636)。Windows与Android均绑定`127.0.0.1`的临时端口、随机回调路径、随机state、S256 challenge；打开系统默认浏览器。供应商必须支持公共客户端PKCE和动态回环回调，并为插件开发者登记合法client_id。

```js
if (NousPlugin.supports('auth.external.begin')) {
  const result = await NousPlugin.authorize({
    authorizationEndpoint:'https://你的供应商/authorize',
    clientId:'你登记的公共客户端ID', scope:'所需权限'
  }, {signal:controller.signal});
  // result.code、codeVerifier、redirectUri立即交给自己的runtime模块换取凭证。
  // 换取成功、验证账号后再保存；不要在页面storage中保留这些数据。
}
```

`begin`返回sessionId、实际授权地址、redirectUri、expiresAt；`status`返回pending/success/cancelled/expired/error/consumed。成功的授权码和verifier只交付一次，最长10分钟；`cancel`关闭监听和清除秘密。state不匹配、错误路径、非回环Host或重复授权码都不能完成会话。回调页面不回显code、不缓存、不加载远程内容。进程重启或Activity销毁时未完成授权失效，需重新发起。

授权成功后浏览器显示返回Nous的说明，数据已经自动回传，不需复制凭证。没有供应商回调、只有网页登录Cookie的平台不提供此方式；不得用打开网页登录页冒充已支持外部自动登录，不得读取其他浏览器的私有数据库。破晓下载器也遵守这个规则，只为已实现且验证过凭证交换的供应商显示外部入口。

## Windows模块ABI

模块ZIP包含`runtime/bin/java.exe`、完整独立runtime和`app/*.jar`。`runtime.windows-x64`声明`type:'jvm'`、入口类、可选`mainJar:'app/plugin.jar'`及asset。兼容旧包时mainJar默认`app/Nous-Engine.jar`；新插件可以自行命名，不依赖下载器。

入口`main`读UTF-8 stdin，每行`{method,params}`，每行stdout返回`{value}`或`{error:'信息'}`。stdout不得混入日志，日志写stderr。一个账户/插件对应一个工作进程，请求串行。宿主设置`nous.plugin.root`为私有数据目录、`nous.engine.home`为模块目录。禁止依赖系统预装Java或旧服务器项目。

## Android模块ABI

ZIP包含`module.apk`和可选`lib/arm64-v8a/*.so`。APK仅是Dex/资源容器，不能包含独立Activity/Service/Application入口，不经PackageManager安装。编译Java17，minSdk30；使用非宿主资源包ID（示例0x81、宿主0x7f）。入口为公开无参类：

```java
public void initialize(android.content.Context context,
  java.util.function.BiFunction<String,org.json.JSONObject,Object> host);
public Object execute(String method,org.json.JSONObject params) throws Exception;
public void close() throws Exception;
```

execute在工作线程运行，返回JSON可序列化类型。context为插件/账户提供私有files、cache、no-backup、数据库路径和偏好，以及模块Resources和ClassLoader；不要把它替换为宿主Application再存数据。类加载器以Android/宿主已有类优先，其余来自模块；不能假设主程序内部类或AndroidX内部实现属于公开ABI。依赖应由插件构建管理，避免以宿主包名声明自己的类。

通用回调：`activity.current {}`返回当前Activity（仅原生进程内对象）；`directory.choose {}`返回具有持久授权的目录URI或null；`file.open {path}`打开插件私有文件或已授权content URI；`foreground.update {text}`更新通用前台服务通知。调用UI必须通过Activity主线程。文件打开不授予任意宿主私有文件访问能力。

## 生命周期和数据

商城安装先核对已审批目录，再校验协议、平台、权限及包/模块摘要；本地安装跳过商城审批，但执行相同协议、版本、权限及模块摘要检查，且固定标为非官方。完成后再记录安装状态；失败不替换已有正常版本。更新新增权限须再次授权。升级保留插件数据，插件自行迁移自己的业务格式；应记录数据schema并支持迁移失败恢复。页面切换不等于停止原生后台任务。

停用、卸载、升级停止原生模块并拒绝后续执行，取消登录和授权。Windows结束工作进程；Android调用close暂停任务、取消协程、关闭数据库，Dex内存由系统回收。退出Nous也停止进程内会话。卸载时由用户选择保留或清除插件数据：保留模式移除入口、页面和运行模块，单独保留SDK storage与原生业务数据以便重装恢复；清除模式删除当前账户下该插件的SDK storage、私有业务目录、数据库与偏好。用户自行选择目录中的下载文件和文档始终保留。插件应在close中关闭数据库、取消任务，以便清理。不同账户和插件不共用storage、偏好与数据库。可信原生代码不是安全沙箱，仍具有Nous设备权限。

## 正式发布

1. 以自己的独立仓库和许可发布源码（许可证要求时必须提供对应源码）；不提交主程序源码、密钥或账号。
2. 构建各平台模块，上传自己的GitHub Release。用`node sdk/module.mjs 工程 平台 模块ZIP GitHub资源URL`固定摘要和大小。
3. 运行check、SDK合同测试与目标客户端验证，然后pack页面包；上传页面包和SHA256SUMS。Release资产发布后不得覆盖同版本字节。
4. 可用`node sdk/catalog-entry.mjs 页面包 GitHub页面包URL 提交信息.json`生成地址和摘要。在Nous登录后进入 **插件管理 → 开发插件 → 提交商城审核**，填写发行包URL和SHA-256。结果及驳回原因在“我的提交”查看；不再通过GitHub Issue或PR请求接入目录。
5. 管理员在 **管理 → 插件管理** 重新校验发行包、审核并上架，也可下架及设置官方标签。新版本需要独立提交。商城目录以服务器已审核记录为准；旧GitHub签名插件目录只作迁移存档，不作为商城回退来源。服务器只保存元数据、审批和公告，不保存插件包或运行模块。
6. 正式模块、页面包和对应源码继续放各插件自己的GitHub Release。审核不需要作者持有宿主发布私钥。离线或测试使用本地安装时，选择`.nous-plugin.json`；原生模块仍从声明的GitHub发行地址下载并验证。禁止降级覆盖已安装版本。


正式发布前至少验证：协议不匹配拒绝、缺方法/缺权限拒绝、账号隔离、真实导航、断网/超时/错误、更新保留数据、停用与卸载、1440/768/390及深色模式；有原生模块时验证目标设备。构建成功、合同测试和实机通过是不同结论，应分别记录。公开SDK自测命令为`node --test sdk/test/*.test.mjs`。


## 作者、官方标签与独立版本记录（协议1.3）

协议1.3最低宿主为Nous1.2.0，`author`为必填对象：`{name, url?, email?}`；name最多80字符，url仅HTTPS，email为可公开联系地址。不要写入私人凭证。作者属于插件自身元信息，商城及已安装页面直接显示。

`changelog`为插件自己的历史数组，按新到旧排列，每项`{version, publishedAt, changes:string[]}`，最多100个版本、每版本30条。日期使用ISO格式；版本不能重复或高于当前插件版本。商城与本地安装都能查看该插件的独立历史，不混入Nous本体更新记录。

```json
{"api":"1.3","requiresHost":"1.2.0","author":{"name":"你的公开作者名","url":"https://github.com/你的账户"},"changelog":[{"version":"1.0.0","publishedAt":"2026-11-14","changes":["首个插件发行版。"]}]}
```

`official`或`marketplace`不是manifest字段，不得打包。官方/非官方由管理员在商城设置；只有商城中对应已审批发行包的安装可以显示官方标签。本地安装、开发安装及无法确认商城来源的旧记录始终显示非官方，即使包声称自己官方。此信任标签不等于操作系统沙箱或软件安全保证。

客户端本地安装在原生层再次检查协议、最低宿主、平台和权限；Web本地安装仅接受支持web的平台包。Nous1.2.0明确兼容1.0、1.1、1.2、1.3；旧协议未提供作者信息时显示“未提供”，不能推断或编造作者身份。
