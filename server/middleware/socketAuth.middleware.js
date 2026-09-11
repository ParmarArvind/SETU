import jwt from 'jsonwebtoken';

import env from '../config/env.js';
import User from '../models/User.js';

// ============================================================
// Socket.IO Authentication Middleware
//
// Socket clients send:
//
// auth: {
//   token: "<JWT>"
// }
//
// This middleware verifies the JWT before allowing the socket
// connection to continue.
// ============================================================

const socketAuth = async (
  socket,
  next,
) => {
  try {
    // --------------------------------------------------------
    // Get token from Socket.IO handshake
    // --------------------------------------------------------

    const token =
      socket.handshake.auth?.token;

    if (!token) {
      return next(
        new Error(
          'Authentication required',
        ),
      );
    }

    // --------------------------------------------------------
    // Verify JWT
    // --------------------------------------------------------

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        env.jwt.secret,
      );
    } catch {
      return next(
        new Error(
          'Invalid or expired token',
        ),
      );
    }

    // --------------------------------------------------------
    // Confirm user still exists
    // --------------------------------------------------------

    const user =
      await User.findById(
        decoded.id,
      ).select(
        '_id name email',
      );

    if (!user) {
      return next(
        new Error(
          'User account no longer exists',
        ),
      );
    }

    // --------------------------------------------------------
    // Attach trusted user information
    // --------------------------------------------------------

    socket.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error(
      '[Socket Auth] Error:',
      error.message,
    );

    next(
      new Error(
        'Socket authentication failed',
      ),
    );
  }
};

export default socketAuth;