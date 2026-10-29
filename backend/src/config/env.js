import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/transitiq',
  JWT_SECRET: process.env.JWT_SECRET || 'transitiq_super_secret_jwt_access_key_2026_pk',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'transitiq_super_secret_jwt_refresh_key_2026_pk_7d',
  SIMULATION_INTERVAL_MS: Number(process.env.SIMULATION_INTERVAL_MS) || 3000,
};
