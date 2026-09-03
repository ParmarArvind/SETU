import jwt from 'jsonwebtoken';

import User from '../models/user.model.js';
import env from '../config/env.js';

// --------------------------------------------------------------
// Helper: generate a signed JWT containing the user's id
// --------------------------------------------------------------
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
    },
  );
};

// --------------------------------------------------------------
// Helper: shape a user document into the "safe" object we
// are allowed to send back to the client (never the password)
// --------------------------------------------------------------
const toSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
});

// --------------------------------------------------------------
// POST /api/auth/register
// --------------------------------------------------------------
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      });
    }

    // 2. Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Check whether user already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists',
      });
    }

    // 4. Create user
    // Password hashing happens automatically through the
    // pre('save') hook in user.model.js.
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
    });

    // 5. Generate JWT
    const token = generateToken(user._id);

    // 6. Return safe user information + token
    return res.status(201).json({
      success: true,
      data: {
        user: toSafeUser(user),
        token,
      },
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(', ');

      return res.status(400).json({
        success: false,
        message,
      });
    }

    // Handle duplicate-key race condition
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Forward unexpected errors to centralized error middleware
    next(error);
  }
};

// --------------------------------------------------------------
// POST /api/auth/login
// --------------------------------------------------------------
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // 2. Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Find user
    // Password has select:false in the schema, so explicitly
    // include it for password comparison.
    const user = await User.findOne({
      email: normalizedEmail,
    }).select('+password');

    // 4. Generic error for unknown email
    // This prevents revealing whether an account exists.
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 5. Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 6. Generate JWT
    const token = generateToken(user._id);

    // 7. Return safe user information + token
    return res.status(200).json({
      success: true,
      data: {
        user: toSafeUser(user),
        token,
      },
    });
  } catch (error) {
    // Forward unexpected errors to centralized error middleware
    next(error);
  }
};

// --------------------------------------------------------------
// GET /api/auth/me
// Protected route — req.user is set by auth.middleware.js
// --------------------------------------------------------------
const getCurrentUser = async (req, res, next) => {
  try {
    // req.user.id comes from the verified JWT.
    // We do NOT trust an id from req.body or req.params.
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: toSafeUser(user),
      },
    });
  } catch (error) {
    // Forward unexpected errors to centralized error middleware
    next(error);
  }
};

// --------------------------------------------------------------
// POST /api/auth/logout
// --------------------------------------------------------------
const logout = async (req, res, next) => {
  try {
    /*
      SETU currently uses stateless JWT authentication.

      Therefore, the server does not invalidate the JWT here.
      The frontend will remove the stored token during logout.

      A future phase could introduce:
      - Refresh tokens
      - Token revocation
      - Token blocklists
    */

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    // Forward unexpected errors to centralized error middleware
    next(error);
  }
};

// --------------------------------------------------------------
// Named exports
// --------------------------------------------------------------
export {
  register,
  login,
  getCurrentUser,
  logout,
};