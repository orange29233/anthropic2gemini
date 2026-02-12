# Anthropic to Gemini API Proxy

<div align="center">

**一个基于 Cloudflare Workers 的 Claude API 到 Gemini API 转换代理服务**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)

</div>

## 简介

这是一个部署在 Cloudflare Workers 上的无服务器代理服务，可以将 Anthropic Claude API 的请求格式转换为 Google Gemini API 格式。这让使用 Claude API 的应用能够无缝切换到 Gemini 模型，无需修改客户端代码。

## 功能特性

- ✨ **API 兼容性**：完全兼容 Claude API 格式，无需修改客户端代码
- 🔄 **双向转换**：自动转换请求和响应格式
- 🌊 **流式响应**：支持流式（Streaming）和非流式响应处理
- 🖼️ **图片支持**：支持图片输入处理
- 🚀 **零配置部署**：基于 Cloudflare Workers，无需服务器维护
- 🔐 **多种认证方式**：支持 `x-api-key` 和 `Authorization` 请求头
- 🌐 **CORS 支持**：完整的跨域资源共享支持

## 支持的 API 端点

- `POST /v1/messages` - 消息对话接口
- `GET /v1/models` - 模型列表查询
- `GET /health` - 健康检查

## 快速开始

### 前置要求

- Node.js 18+
- pnpm 或 npm
- Cloudflare 账号
- Google Gemini API Key

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/anthropic2gemini.git
cd anthropic2gemini

# 安装依赖
pnpm install
# 或
npm install
```

### 配置

如需修改默认模型，编辑 `wrangler.toml`：

```toml
[vars]
DEFAULT_MODEL = "gemini-2.0-flash-exp"  # 修改为你想要的模型
```

### 本地开发

```bash
# 启动开发服务器
pnpm dev
# 或
npm run dev

# 查看实时日志
pnpm tail
# 或
npm run tail
```

### 部署到 Cloudflare Workers

```bash
# 登录 Cloudflare
npx wrangler login

# 部署
pnpm deploy
# 或
npm run deploy
```

## 使用方法

### 基本请求示例

```bash
curl https://your-worker.workers.dev/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-gemini-api-key" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "Hello, Claude!"
      }
    ]
  }'
```

### 使用 cURL

```bash
curl https://your-worker.workers.dev/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-gemini-api-key" \
  -d '{
    "model": "claude-3-opus-20240229",
    "max_tokens": 1024,
    "stream": true,
    "messages": [
      {
        "role": "user",
        "content": "请介绍一下你自己"
      }
    ]
  }'
```

### 使用 JavaScript

```javascript
const response = await fetch('https://your-worker.workers.dev/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-gemini-api-key'
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: 'What is the capital of France?'
      }
    ]
  })
});

const data = await response.json();
console.log(data.content[0].text);
```

### 使用 Python

```python
import requests

response = requests.post(
    'https://your-worker.workers.dev/v1/messages',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'your-gemini-api-key'
    },
    json={
        'model': 'claude-3-5-sonnet-20241022',
        'max_tokens': 1024,
        'messages': [
            {
                'role': 'user',
                'content': 'What is the capital of France?'
            }
        ]
    }
)

print(response.json()['content'][0]['text'])
```

## 项目结构

```
anthropic2gemini/
├── src/
│   ├── index.js                 # 入口文件，路由分发
│   ├── config.js                # 配置常量
│   ├── handlers/
│   │   └── messagesHandler.js   # 消息处理核心逻辑
│   ├── converters/
│   │   ├── requestConverter.js  # 请求格式转换
│   │   └── responseConverter.js # 响应格式转换
│   └── utils/
│       ├── logger.js            # 日志工具
│       └── streaming.js         # 流式处理工具
├── package.json                 # 项目配置
├── wrangler.toml                # Cloudflare Workers 配置
└── README.md                    # 项目文档
```

## 工作原理

```
客户端                    代理服务                    Gemini API
  │                          │                           │
  ├── POST /v1/messages ───>│                           │
  │  (Claude API 格式)       │                           │
  │                          ├── 转换请求格式 ────────> │
  │                          │  (Claude → Gemini)       │
  │                          │                           │
  │                          ├── Gemini API 响应 ────── │
  │                          │                           │
  │<── Claude API 格式 ──────┤                           │
  │  (转换后)                │                           │
```

## 配置说明

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `DEFAULT_MODEL` | 默认 Gemini 模型（所有 Claude 模型都会映射到此模型） | 否 | `gemini-3-flash-preview` |

**重要说明**：
- API Key 需要客户端在请求头中传递，支持两种方式：
  - `x-api-key: your-gemini-api-key`
  - `Authorization: Bearer your-gemini-api-key`
- 不需要在服务端配置环境变量，API Key 由客户端自行管理

## 支持的 Gemini 模型

- `gemini-2.0-flash-exp`
- `gemini-2.5-flash-preview`
- `gemini-2.0-flash-thinking-exp`
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-3-flash-preview` (默认)

## 注意事项

1. 所有 Claude 模型名称都会被映射到配置的默认 Gemini 模型
2. API Key 通过请求头传递，支持以下两种格式：
   - `x-api-key: your-api-key`
   - `Authorization: Bearer your-api-key`
3. 流式响应使用 Server-Sent Events (SSE) 格式
4. 建议在生产环境中使用自定义域名并配置 HTTPS

## 常见问题

<details>
<summary>如何获取 Gemini API Key？</summary>

访问 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取免费的 API Key。
</details>

<details>
<summary>为什么所有模型都映射到同一个？</summary>

这是设计决策，简化了配置。如需支持多个模型，可以修改 `config.js` 中的模型映射逻辑。
</details>

<details>
<summary>支持自定义域名吗？</summary>

是的。在 Cloudflare Dashboard 中为你的 Worker 添加自定义域名或路由。
</details>

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 链接

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Google Gemini API 文档](https://ai.google.dev/docs)
- [Anthropic Claude API 文档](https://docs.anthropic.com/claude/reference)

---

<div align="center">

Made with ❤️ by [orange2922@126.com]

</div>
