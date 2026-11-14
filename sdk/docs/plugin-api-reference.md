# Nous Plugin Interface 1.3 · 方法参考

与sdk/contract.mjs生成自同一方法清单。参数和结果均为JSON。权限未授予、平台不支持或宿主版本不足时，不应显示对应操作。`since`为最低客户端产品版本，`version`为方法合同版本。

## host.info

宿主基本信息。

平台：windows-x64、android-arm64、web；权限：无；最低客户端：1.0.0；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {},
  "required": [],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "version": {
      "type": "string"
    },
    "api": {
      "type": "string"
    },
    "platform": {
      "enum": [
        "windows-x64",
        "android-arm64",
        "web"
      ]
    },
    "theme": {
      "type": "string"
    },
    "locale": {
      "type": "string"
    },
    "development": {
      "type": "boolean"
    }
  },
  "required": [
    "version",
    "api",
    "platform",
    "theme",
    "locale"
  ],
  "additionalProperties": false
}
```

## host.capabilities

当前可用方法、协议、兼容列表和限制。

平台：windows-x64、android-arm64、web；权限：无；最低客户端：1.1.0；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {},
  "required": [],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {},
  "required": [],
  "additionalProperties": true
}
```

## navigation.go

切换已声明菜单。

平台：windows-x64、android-arm64、web；权限：无；最低客户端：1.0.0；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {
    "view": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9-]{0,39}$"
    }
  },
  "required": [
    "view"
  ],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "ok": {
      "const": true
    }
  },
  "required": [
    "ok"
  ],
  "additionalProperties": false
}
```

## storage.get

读取私有JSON值，不存在为null。

平台：windows-x64、android-arm64、web；权限：storage；最低客户端：1.0.0；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "pattern": "^[A-Za-z0-9._-]{1,80}$"
    }
  },
  "required": [
    "key"
  ],
  "additionalProperties": false
}
```

结果：

```json
{}
```

## storage.set

保存私有JSON值。

平台：windows-x64、android-arm64、web；权限：storage；最低客户端：1.0.0；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "pattern": "^[A-Za-z0-9._-]{1,80}$"
    },
    "value": {}
  },
  "required": [
    "key",
    "value"
  ],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "ok": {
      "const": true
    }
  },
  "required": [
    "ok"
  ],
  "additionalProperties": false
}
```

## storage.remove

删除私有键。

平台：windows-x64、android-arm64、web；权限：storage；最低客户端：1.0.0；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "pattern": "^[A-Za-z0-9._-]{1,80}$"
    }
  },
  "required": [
    "key"
  ],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "ok": {
      "const": true
    }
  },
  "required": [
    "ok"
  ],
  "additionalProperties": false
}
```

## clipboard.write

复制文本。

平台：windows-x64、android-arm64、web；权限：clipboard.write；最低客户端：1.0.0；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "maxLength": 30000
    }
  },
  "required": [
    "text"
  ],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "ok": {
      "const": true
    }
  },
  "required": [
    "ok"
  ],
  "additionalProperties": false
}
```

## external.open

打开外部HTTPS链接，无凭证回传。

平台：windows-x64、android-arm64、web；权限：external.open；最低客户端：1.0.0；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "maxLength": 4096,
      "pattern": "^https://"
    }
  },
  "required": [
    "url"
  ],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "opened": {
      "const": true
    }
  },
  "required": [
    "opened"
  ],
  "additionalProperties": false
}
```

## runtime.status

查询模块状态。

平台：windows-x64、android-arm64；权限：native.runtime；最低客户端：1.0.1；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {},
  "required": [],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "installed": {
      "type": "boolean"
    },
    "ready": {
      "type": "boolean"
    },
    "running": {
      "type": "boolean"
    }
  },
  "required": [
    "installed",
    "ready",
    "running"
  ],
  "additionalProperties": false
}
```

## runtime.start

校验并启动模块。

平台：windows-x64、android-arm64；权限：native.runtime；最低客户端：1.0.1；方法版本：1.0；默认超时：900000ms。

参数：

```json
{
  "type": "object",
  "properties": {},
  "required": [],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "running": {
      "type": "boolean"
    }
  },
  "required": [
    "running"
  ],
  "additionalProperties": false
}
```

## runtime.stop

停止模块。

平台：windows-x64、android-arm64；权限：native.runtime；最低客户端：1.0.1；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {},
  "required": [],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "running": {
      "type": "boolean"
    }
  },
  "required": [
    "running"
  ],
  "additionalProperties": false
}
```

## runtime.invoke

调用插件自己的业务方法。

平台：windows-x64、android-arm64；权限：native.runtime；最低客户端：1.0.1；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {
    "method": {
      "type": "string",
      "minLength": 1,
      "maxLength": 160
    },
    "params": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": true
    }
  },
  "required": [
    "method"
  ],
  "additionalProperties": false
}
```

结果：

```json
{}
```

## runtime.webLogin

内置官方网页登录并返回Cookie。

平台：windows-x64、android-arm64；权限：native.runtime；最低客户端：1.0.2；方法版本：1.0；默认超时：660000ms。

参数：

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "maxLength": 4096,
      "pattern": "^https://"
    },
    "domains": {
      "type": "array",
      "minItems": 1,
      "maxItems": 10,
      "items": {
        "type": "string"
      }
    },
    "cookieUrls": {
      "type": "array",
      "minItems": 1,
      "maxItems": 10,
      "items": {
        "type": "string",
        "maxLength": 4096,
        "pattern": "^https://"
      }
    },
    "requiredCookies": {
      "type": "array",
      "minItems": 1,
      "maxItems": 10,
      "items": {
        "type": "array",
        "minItems": 1,
        "maxItems": 20,
        "items": {
          "type": "string"
        }
      }
    },
    "userAgent": {
      "type": "string",
      "maxLength": 512
    },
    "userAgents": {
      "type": "object",
      "properties": {
        "windows-x64": {
          "type": "string",
          "maxLength": 512
        },
        "android-arm64": {
          "type": "string",
          "maxLength": 512
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "urls": {
      "type": "object",
      "properties": {
        "windows-x64": {
          "type": "string",
          "maxLength": 4096,
          "pattern": "^https://"
        },
        "android-arm64": {
          "type": "string",
          "maxLength": 4096,
          "pattern": "^https://"
        }
      },
      "required": [],
      "additionalProperties": false
    },
    "validation": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": true
    }
  },
  "required": [
    "url",
    "domains",
    "cookieUrls",
    "requiredCookies"
  ],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "cookie": {
      "type": "string"
    }
  },
  "required": [
    "cookie"
  ],
  "additionalProperties": false
}
```

## runtime.webLogin.cancel

关闭当前插件的内置登录。

平台：windows-x64、android-arm64；权限：native.runtime；最低客户端：1.1.0；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {},
  "required": [],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "cancelled": {
      "const": true
    }
  },
  "required": [
    "cancelled"
  ],
  "additionalProperties": false
}
```

## auth.external.begin

生成PKCE会话并打开默认浏览器。

平台：windows-x64、android-arm64；权限：auth.external；最低客户端：1.1.0；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {
    "authorizationEndpoint": {
      "type": "string",
      "maxLength": 4096,
      "pattern": "^https://"
    },
    "clientId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    },
    "scope": {
      "type": "string",
      "maxLength": 1000
    },
    "extra": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": true
    },
    "timeoutMs": {
      "type": "integer",
      "minimum": 10000,
      "maximum": 600000
    }
  },
  "required": [
    "authorizationEndpoint",
    "clientId"
  ],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string"
    },
    "authorizationUrl": {
      "type": "string",
      "maxLength": 4096,
      "pattern": "^https://"
    },
    "redirectUri": {
      "type": "string"
    },
    "expiresAt": {
      "type": "integer"
    }
  },
  "required": [
    "sessionId",
    "authorizationUrl",
    "redirectUri",
    "expiresAt"
  ],
  "additionalProperties": false
}
```

## auth.external.status

读取外部授权状态；成功数据只交付一次。

平台：windows-x64、android-arm64；权限：auth.external；最低客户端：1.1.0；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "minLength": 16,
      "maxLength": 100
    }
  },
  "required": [
    "sessionId"
  ],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "status": {
      "enum": [
        "pending",
        "success",
        "cancelled",
        "expired",
        "error",
        "consumed"
      ]
    },
    "code": {
      "type": "string"
    },
    "codeVerifier": {
      "type": "string"
    },
    "redirectUri": {
      "type": "string"
    },
    "error": {
      "type": "string"
    }
  },
  "required": [
    "status"
  ],
  "additionalProperties": false
}
```

## auth.external.cancel

取消外部授权并清除秘密。

平台：windows-x64、android-arm64；权限：auth.external；最低客户端：1.1.0；方法版本：1.0；默认超时：150000ms。

参数：

```json
{
  "type": "object",
  "properties": {
    "sessionId": {
      "type": "string",
      "minLength": 16,
      "maxLength": 100
    }
  },
  "required": [
    "sessionId"
  ],
  "additionalProperties": false
}
```

结果：

```json
{
  "type": "object",
  "properties": {
    "cancelled": {
      "const": true
    }
  },
  "required": [
    "cancelled"
  ],
  "additionalProperties": false
}
```

## 错误码

- `E_INVALID_PARAMS`
- `E_METHOD_NOT_FOUND`
- `E_PERMISSION_DENIED`
- `E_PLATFORM_UNSUPPORTED`
- `E_HOST_TOO_OLD`
- `E_PLUGIN_DISABLED`
- `E_CANCELLED`
- `E_TIMEOUT`
- `E_BUSY`
- `E_TOO_LARGE`
- `E_RUNTIME`
- `E_AUTH_DENIED`
- `E_AUTH_EXPIRED`
- `E_DEVELOPMENT_DISABLED`
- `E_HOST`

通用取消只取消等待，不撤销已完成的业务操作。登录与授权提供显式取消方法；原生业务取消由插件实现。未知旧宿主异常归为E_HOST。
