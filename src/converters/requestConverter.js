/**
 * Claude API 请求格式 → Gemini API 请求格式转换器
 */

import { DEFAULT_GEMINI_MODEL } from '../config.js';

/**
 * 模型名称映射
 * @param {string} claudeModel - Claude 模型名
 * @param {string} defaultModel - 默认 Gemini 模型
 */
export function mapModelName(claudeModel, defaultModel = DEFAULT_GEMINI_MODEL) {
  // 如果已经是 gemini-* 模型，直接透传
  if (claudeModel.startsWith('gemini-')) {
    return claudeModel;
  }
  // 如果是 claude-* 模型，使用默认 Gemini 模型
  if (claudeModel.startsWith('claude-')) {
    return defaultModel;
  }
  // 其他情况，直接返回原模型名
  return claudeModel;
}

/**
 * 转换消息内容
 * Claude: content 可以是 string 或 [{type: "text", text: "..."}]
 * Gemini: parts [{text: "..."}]
 */
function convertContent(content) {
  if (typeof content === 'string') {
    return [{ text: content }];
  }

  if (Array.isArray(content)) {
    return content.map(item => {
      if (item.type === 'text') {
        return { text: item.text };
      }
      if (item.type === 'image') {
        return {
          inlineData: {
            mimeType: item.source.media_type,
            data: item.source.data
          }
        };
      }
      // 工具调用等复杂类型暂不处理
      return { text: JSON.stringify(item) };
    });
  }

  return [{ text: String(content) }];
}

/**
 * 转换消息列表
 * Claude: messages [{role, content}]
 * Gemini: contents [{role, parts}]
 */
function convertMessages(messages) {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: convertContent(msg.content)
  }));
}

/**
 * 转换 system prompt
 */
function convertSystemPrompt(system) {
  if (!system) return undefined;

  if (typeof system === 'string') {
    return { parts: [{ text: system }] };
  }

  // 如果是数组格式
  if (Array.isArray(system)) {
    return { parts: convertContent(system) };
  }

  return { parts: [{ text: String(system) }] };
}

/**
 * 转换工具定义
 * Claude tools → Gemini function declarations
 */
function convertTools(tools) {
  if (!tools) return undefined;

  const functionDeclarations = [];

  for (const tool of tools) {
    if (tool.type === 'function') {
      const functionDecl = {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.input_schema
      };
      functionDeclarations.push(functionDecl);
    }
  }

  if (functionDeclarations.length === 0) {
    return undefined;
  }

  return [{ functionDeclarations }];
}

/**
 * 主转换函数：Claude 请求 → Gemini 请求
 */
export function convertRequest(claudeRequest, defaultModel = DEFAULT_GEMINI_MODEL) {
  const geminiModel = mapModelName(claudeRequest.model, defaultModel);

  const geminiRequest = {
    contents: convertMessages(claudeRequest.messages)
  };

  // 添加 system instruction
  if (claudeRequest.system) {
    geminiRequest.systemInstruction = convertSystemPrompt(claudeRequest.system);
  }

  // 添加生成配置
  geminiRequest.generationConfig = {
    maxOutputTokens: claudeRequest.max_tokens || 8192,
  };

  if (claudeRequest.temperature !== undefined) {
    geminiRequest.generationConfig.temperature = claudeRequest.temperature;
  }
  if (claudeRequest.top_p !== undefined) {
    geminiRequest.generationConfig.topP = claudeRequest.top_p;
  }

  // 添加工具
  if (claudeRequest.tools) {
    geminiRequest.tools = convertTools(claudeRequest.tools);
  }

  return { geminiModel, geminiRequest };
}
