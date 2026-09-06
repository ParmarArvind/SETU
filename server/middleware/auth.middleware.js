import jwt from 'jsonwebtoken';

import env from '../config/env.js';
import User from '../models/User.js';

// --------------------------------------------------------------
// protect: verifies a Bearer JWT and attaches req.user
//
// Expected header format:
//   Authorization: Bearer <token>
// --------------------------------------------------------------
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Reject if Authorization header is missing
    //    or doesn't use the Bearer scheme.
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // 2. Extract the token.
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // 3. Verify the JWT signature and expiration.
    let decoded;

    try {
      decoded = jwt.verify(token, env.jwt.secret);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // 4. Confirm that the user still exists.
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // 5. Attach only the trusted user identity.
    //    Controllers should use req.user.id rather than
    //    trusting user IDs supplied by the client.
    req.user = {
      id: user._id.toString(),
    };

    next();
  } catch (error) {
    next(error);
  }
};