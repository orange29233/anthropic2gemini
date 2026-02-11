/**
 * 配置常量
 */

// Gemini API 基础 URL
export const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta";

// 默认模型映射（可通过环境变量覆盖）
export const DEFAULT_MODEL_MAPPING = {
  "claude-sonnet-4.5": "gemini-3-flash-preview",
  "claude-opus-4.5": "gemini-3-flash-preview",
  "claude-haiku-4.5": "gemini-2.0-flash-lite",
};

// HTTP 超时配置
export const TIMEOUT_MS = 60000;
