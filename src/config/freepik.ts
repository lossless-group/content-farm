export const FREEPIK_CONFIG = {
  API_BASE_URL: 'https://api.freepik.com/v1',
  DEFAULT_LIMIT: 20,
  DEFAULT_PAGE: 1,
  CACHE_TTL: 1000 * 60 * 60 * 24, // 24 hours
  THUMBNAIL_SIZE: 'small', // 'small' | 'medium' | 'large'
} as const;

export const FREEPIK_ERRORS = {
  MISSING_API_KEY: 'Freepik API key is missing. Please check your .env file.',
  INVALID_RESPONSE: 'Invalid response from Freepik API',
  REQUEST_FAILED: 'Failed to fetch from Freepik API',
  INVALID_IMAGE: 'Invalid image data received',
} as const;
