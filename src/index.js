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
        // 返回支持的模型列表
        return new Response(JSON.stringify({
          object: 'list',
          data: [
            { id: 'claude-sonnet-4.5', object: 'model' },
            { id: 'claude-opus-4.5', object: 'model' },
            { id: 'claude-haiku-4.5', object: 'model' }
          ]
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
