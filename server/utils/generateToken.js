import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Generates a signed JWT for a given user id.
 * @param {string} userId - Mongo ObjectId of the user
 * @returns {string} signed JWT
 */
function generateToken(userId) {
  return jwt.sign({ id: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export default generateToken;