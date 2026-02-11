/**
 * /v1/messages 端点处理器
 */

import { GEMINI_API_BASE, DEFAULT_GEMINI_MODEL } from '../config.js';
import { convertRequest } from '../converters/requestConverter.js';
import { convertResponse, convertStream } from '../converters/responseConverter.js';
import { createSSEResponse, readGeminiStream } from '../utils/streaming.js';
import { logger } from '../utils/logger.js';

/**
 * 处理流式请求
 */
async function handleStreaming(geminiModel, geminiRequest, apiKey) {
  const url = `${GEMINI_API_BASE}/models/${geminiModel}:streamGenerateContent?key=${apiKey}`;

  logger.debug('流式请求 Gemini:', { url, model: geminiModel });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(geminiRequest)
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Gemini API 错误:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  // 创建转换器
  const geminiStream = readGeminiStream(response);
  const claudeStream = convertStream(geminiStream, geminiModel);

  return createSSEResponse(claudeStream);
}

/**
 * 处理非流式请求
 */
async function handleNonStreaming(geminiModel, geminiRequest, apiKey) {
  const url = `${GEMINI_API_BASE}/models/${geminiModel}:generateContent?key=${apiKey}`;

  logger.debug('非流式请求 Gemini:', { url, model: geminiModel });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(geminiRequest)
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Gemini API 错误:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const geminiResponse = await response.json();

  // 调试日志：输出 Gemini 原始响应
  logger.info('Gemini 原始响应:', JSON.stringify(geminiResponse));

  const claudeResponse = convertResponse(geminiResponse, geminiModel);

  logger.debug('响应转换完成:', claudeResponse);

  return new Response(JSON.stringify(claudeResponse), {
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

/**
 * 主处理函数
 */
export async function handleMessages(request, env) {
  try {
    // 解析请求
    const claudeRequest = await request.json();

    // 获取 API Key（支持两种方式）
    let apiKey = request.headers.get('x-api-key');

    // 如果没有 x-api-key，尝试从 Authorization header 获取
    if (!apiKey) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7); // 移除 "Bearer " 前缀
      }
    }

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: { type: 'authentication_error', message: 'Missing authentication (x-api-key or Authorization header required)' }
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取默认模型（优先使用环境变量，否则使用代码默认值）
    const defaultModel = env.DEFAULT_MODEL || DEFAULT_GEMINI_MODEL;

    // 转换请求
    const { geminiModel, geminiRequest } = convertRequest(claudeRequest, defaultModel);

    logger.info('处理请求:', {
      claudeModel: claudeRequest.model,
      geminiModel,
      stream: claudeRequest.stream || false
    });

    // 根据是否流式选择处理方式
    if (claudeRequest.stream) {
      return await handleStreaming(geminiModel, geminiRequest, apiKey);
    } else {
      return await handleNonStreaming(geminiModel, geminiRequest, apiKey);
    }

  } catch (error) {
    logger.error('处理请求时出错:', error);

    return new Response(JSON.stringify({
      error: {
        type: 'api_error',
        message: error.message
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
