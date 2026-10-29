import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import User from '../models/User.js';
import memoryStore from '../models/memoryStore.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.',
        data: null,
        error: 'UNAUTHORIZED',
      });
    }

    jwt.verify(token, ENV.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired access token.',
          data: null,
          error: 'TOKEN_EXPIRED_OR_INVALID',
        });
      }

      let user = null;
      if (mongoose.connection.readyState === 1) {
        user = await User.findById(decoded.id).select('-passwordHash');
      } else {
        await memoryStore.initialize();
        const found = memoryStore.users.find((u) => u._id.toString() === decoded.id.toString());
        if (found) {
          const { passwordHash, ...rest } = found;
          user = rest;
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User account no longer exists.',
          data: null,
          error: 'USER_NOT_FOUND',
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server authentication error.',
      data: null,
      error: error.message,
    });
  }
};
