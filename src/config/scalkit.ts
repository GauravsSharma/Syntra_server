import { Scalekit } from '@scalekit-sdk/node';
import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env variable: ${key}`);
  return value;
};

const scalekit = new Scalekit(
  getEnv('SCALEKIT_ENVIRONMENT_URL'),
  getEnv('SCALEKIT_CLIENT_ID'),
  getEnv('SCALEKIT_CLIENT_SECRET'),
);

export default scalekit;