/**
 * Cloudflare Workers 入口文件
 * 路由分发到各个处理器
 */

import { handleMessages } from './handlers/messagesHandler.js';
import { logger } from './utils/logger.js';

export default {
  /**
   * Fetch 事件处理器
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    logger.info('收到请求:', {
      method: request.method,
      path,
      userAgent: request.headers.get('user-agent')
    });

    try {
      // CORS 预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
          }
        });
      }

      // 路由分发
      if (path === '/v1/messages' && request.method === 'POST') {
        return await handleMessages(request, env);
      }

      if (path === '/health' && request.method === 'GET') {
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (path === '/v1/models' && request.method === 'GET') {
        // 返回支持的模型列表（符合 Anthropic API 规范）
        const models = [
          { id: 'claude-opus-4-6', created_at: '2025-09-29T00:00:00Z', display_name: 'Claude Opus 4.6', type: 'model' },
          { id: 'claude-sonnet-4-5-20250929', created_at: '2025-09-29T00:00:00Z', display_name: 'Claude Sonnet 4.5', type: 'model' },
          { id: 'claude-haiku-4-5-20251001', created_at: '2025-10-01T00:00:00Z', display_name: 'Claude Haiku 4.5', type: 'model' }
        ];
        return new Response(JSON.stringify({
          data: models,
          first_id: models[0].id,
          has_more: false,
          last_id: models[models.length - 1].id
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 404
      return new Response(JSON.stringify({
        error: { type: 'not_found_error', message: 'Not found' }
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      logger.error('处理请求时出错:', error);

      return new Response(JSON.stringify({
        error: { type: 'api_error', message: error.message }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
