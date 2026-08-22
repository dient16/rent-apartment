import dotenv from 'dotenv';
import { cleanEnv, host, num, port, str, testOnly } from 'envalid';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    devDefault: testOnly('test'),
    choices: ['development', 'production', 'test'],
  }),
  HOST: host({ devDefault: testOnly('localhost') }),
  PORT: port({ devDefault: testOnly(3000) }),
  CORS_ORIGIN: str({ devDefault: testOnly('http://localhost:8000') }),
  COMMON_RATE_LIMIT_MAX_REQUESTS: num({ devDefault: testOnly(1000) }),
  COMMON_RATE_LIMIT_WINDOW_MS: num({ devDefault: testOnly(1000) }),
  SERVER_URL: str({ devDefault: testOnly('http://localhost:9009') }),
  CLIENT_URL: str({ devDefault: testOnly('http://localhost:8000') }),
  MONGODB_URL: str(),
  ELASTICSEARCH_URL: str({ default: 'http://localhost:9200' }),
  JWT_ACCESS_KEY: str(),
  EMAIL_NAME: str(),
  EMAIL_APP_PASSWORD: str(),
  JWT_REFRESH_KEY: str(),
  ACCESS_TOKEN_TTL: str({ default: '15m' }),
  REFRESH_TOKEN_TTL: str({ default: '7d' }),
  STRIPE_SECRET_KEY: str(),
  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),
  FACEBOOK_APP_ID: str(),
  FACEBOOK_APP_SECRET: str(),
});
