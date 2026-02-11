/**
 * SSE 流处理工具
 */

/**
 * 创建 Claude API 格式的 SSE 响应
 */
export function createSSEResponse(streamGenerator) {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamGenerator) {
          const sseLine = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(sseLine));
        }
      } catch (error) {
        const errorEvent = `event: error\ndata: ${JSON.stringify({
          type: 'error',
          error: { type: 'api_error', message: error.message }
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}

/**
 * 读取 Gemini SSE 流
 */
export async function* readGeminiStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Gemini SSE 格式：data: {...}
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留不完整的行

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const data = trimmed.slice(5).trim();
          if (data && data !== '[DONE]') {
            try {
              yield data;
            } catch (e) {
              // 忽略 JSON 解析错误
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
