import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  mongodbUri: process.env.MONGODB_URI,

  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
};

export default env;