/**
 * /v1/messages 端点处理器
 */

import { GEMINI_API_BASE } from '../config.js';
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

    // 获取 API Key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: { type: 'authentication_error', message: 'Missing x-api-key header' }
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 解析模型映射
    const modelMapping = env.MODEL_MAPPING
      ? JSON.parse(env.MODEL_MAPPING)
      : {};

    // 转换请求
    const { geminiModel, geminiRequest } = convertRequest(claudeRequest, modelMapping);

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
