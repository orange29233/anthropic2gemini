/**
 * Gemini API 响应格式 → Claude API 响应格式转换器
 */

/**
 * 生成消息 ID
 */
function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 转换 Gemini parts → Claude content
 */
function convertPartsToContent(parts) {
  if (!parts || parts.length === 0) {
    return [{ type: 'text', text: '' }];
  }

  return parts.map(part => {
    if (part.text !== undefined) {
      return { type: 'text', text: part.text };
    }
    if (part.functionCall) {
      return {
        type: 'tool_use',
        id: `toolu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: part.functionCall.name,
        input: part.functionCall.args || {}
      };
    }
    // 其他类型暂不处理
    return { type: 'text', text: JSON.stringify(part) };
  });
}

/**
 * 转换使用量信息
 */
function convertUsage(usageMetadata) {
  if (!usageMetadata) {
    return { input_tokens: 0, output_tokens: 0 };
  }

  return {
    input_tokens: usageMetadata.promptTokenCount || 0,
    output_tokens: usageMetadata.candidatesTokenCount || 0
  };
}

/**
 * 主转换函数：Gemini 响应 → Claude 响应（非流式）
 */
export function convertResponse(geminiResponse, model) {
  const candidate = geminiResponse.candidates?.[0];

  if (!candidate) {
    throw new Error('Invalid Gemini response: no candidates');
  }

  return {
    id: generateMessageId(),
    type: 'message',
    role: 'assistant',
    content: convertPartsToContent(candidate.content?.parts),
    model: model,
    stop_reason: candidate.finishReason === 'STOP' ? 'end_turn' : candidate.finishReason?.toLowerCase(),
    usage: convertUsage(geminiResponse.usageMetadata)
  };
}

/**
 * 流式响应事件生成器
 * 将 Gemini 流式响应转换为 Claude SSE 事件格式
 */
export async function* convertStream(geminiStream, model) {
  const messageId = generateMessageId();
  let contentBuffer = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let hasContent = false;

  try {
    for await (const chunk of geminiStream) {
      const data = JSON.parse(chunk);
      const candidate = data.candidates?.[0];

      if (!candidate) continue;

      // 记录 token 使用
      if (data.usageMetadata) {
        inputTokens = data.usageMetadata.promptTokenCount || inputTokens;
        outputTokens = data.usageMetadata.candidatesTokenCount || outputTokens;
      }

      // 获取内容
      const parts = candidate.content?.parts || [];

      for (const part of parts) {
        if (part.text) {
          const text = part.text;

          if (!hasContent) {
            // content_block_start 事件
            hasContent = true;
            yield {
              event: 'content_block_start',
              data: {
                type: 'content_block_start',
                index: 0,
                content_block: { type: 'text', text: '' }
              }
            };
          }

          // content_block_delta 事件
          yield {
            event: 'content_block_delta',
            data: {
              type: 'content_block_delta',
              index: 0,
              delta: { type: 'text_delta', text: text }
            }
          };

          contentBuffer += text;
        }
      }

      // 检查是否结束
      if (candidate.finishReason) {
        break;
      }
    }

    // content_block_stop 事件
    if (hasContent) {
      yield {
        event: 'content_block_stop',
        data: {
          type: 'content_block_stop',
          index: 0
        }
      };
    }

    // message_delta 事件
    yield {
      event: 'message_delta',
      data: {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens
        }
      }
    };

    // message_stop 事件
    yield {
      event: 'message_stop',
      data: {
        type: 'message_stop'
      }
    };

  } catch (error) {
    // 错误事件
    yield {
      event: 'error',
      data: {
        type: 'error',
        error: {
          type: 'api_error',
          message: error.message
        }
      }
    };
  }
}
