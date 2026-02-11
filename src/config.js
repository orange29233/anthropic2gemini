/**
 * 配置常量
 */

// Gemini API 基础 URL
export const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta";

// 默认 Gemini 模型（可通过环境变量 DEFAULT_MODEL 覆盖）
export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

// HTTP 超时配置
export const TIMEOUT_MS = 60000;
