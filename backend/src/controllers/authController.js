import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Driver from '../models/Driver.js';
import { ENV } from '../config/env.js';
import memoryStore, { generateId } from '../models/memoryStore.js';

// Helper to generate access and refresh tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    ENV.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    ENV.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: ENV.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const lowerEmail = email.toLowerCase();
    // Public registration is passenger-only. The client-supplied role is
    // honored exclusively for the very first account on a fresh install so a
    // bootstrap admin can be created; after that it is ignored.
    let assignedRole = 'passenger';
    if (mongoose.connection.readyState === 1) {
      const userCount = await User.countDocuments();
      if (userCount === 0 && role && ['passenger', 'driver', 'operator', 'admin'].includes(role)) {
        assignedRole = role;
      }

      const existingUser = await User.findOne({ email: lowerEmail });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.',
          data: null,
          error: 'EMAIL_ALREADY_IN_USE',
        });
      }

      const passwordHash = await User.hashPassword(password);
      const user = new User({
        name,
        email: lowerEmail,
        passwordHash,
        role: assignedRole,
      });

      const { accessToken, refreshToken } = generateTokens(user);
      user.refreshToken = refreshToken;
      await user.save();

      res.cookie('refreshToken', refreshToken, refreshCookieOptions);

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          accessToken,
        },
        error: null,
      });
    }

    // Memory store fallback
    await memoryStore.initialize();
    if (memoryStore.users.length === 0 && role && ['passenger', 'driver', 'operator', 'admin'].includes(role)) {
      assignedRole = role;
    }
    const existing = memoryStore.users.find((u) => u.email === lowerEmail);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
        data: null,
        error: 'EMAIL_ALREADY_IN_USE',
      });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = {
      _id: generateId(),
      name,
      email: lowerEmail,
      passwordHash,
      role: assignedRole,
      refreshToken: null,
      createdAt: new Date(),
    };

    const { accessToken, refreshToken } = generateTokens(newUser);
    newUser.refreshToken = refreshToken;
    memoryStore.users.push(newUser);

    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
        accessToken,
      },
      error: null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Registration failed due to internal error.',
      data: null,
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const lowerEmail = email.toLowerCase();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: lowerEmail });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
          data: null,
          error: 'INVALID_CREDENTIALS',
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password credentials.',
          data: null,
          error: 'INVALID_CREDENTIALS',
        });
      }

      const { accessToken, refreshToken } = generateTokens(user);
      user.refreshToken = refreshToken;
      await user.save();

      let driverInfo = null;
      if (user.role === 'driver') {
        driverInfo = await Driver.findOne({ userId: user._id })
          .populate('assignedBus')
          .populate('currentTrip');
      }

      res.cookie('refreshToken', refreshToken, refreshCookieOptions);

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            driver: driverInfo,
          },
          accessToken,
          refreshToken,
        },
        error: null,
      });
    }

    // Memory Store
    await memoryStore.initialize();
    const user = memoryStore.users.find((u) => u.email === lowerEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
        data: null,
        error: 'INVALID_CREDENTIALS',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
        data: null,
        error: 'INVALID_CREDENTIALS',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;

    let driverInfo = null;
    if (user.role === 'driver') {
      driverInfo = memoryStore.drivers.find((d) => d.userId.toString() === user._id.toString());
      if (driverInfo) {
        const assignedBus = memoryStore.buses.find((b) => b._id.toString() === driverInfo.assignedBus?.toString());
        const currentTrip = memoryStore.trips.find((t) => t._id.toString() === driverInfo.currentTrip?.toString());
        driverInfo = { ...driverInfo, assignedBus, currentTrip };
      }
    }

    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            driver: driverInfo,
          },
          accessToken,
          refreshToken,
        },
        error: null,
      });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Login failed due to internal error.',
      data: null,
      error: error.message,
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided in request cookie.',
        data: null,
        error: 'REFRESH_TOKEN_REQUIRED',
      });
    }

    jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Refresh token has expired or is invalid.',
          data: null,
          error: 'INVALID_REFRESH_TOKEN',
        });
      }

      if (mongoose.connection.readyState === 1) {
        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== refreshToken) {
          return res.status(403).json({
            success: false,
            message: 'Refresh token revoked or invalid session.',
            data: null,
            error: 'SESSION_REVOKED',
          });
        }

        const tokens = generateTokens(user);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        res.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions);

        return res.status(200).json({
          success: true,
          message: 'Access token refreshed successfully.',
          data: {
            accessToken: tokens.accessToken,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
          },
          error: null,
        });
      }

      // Memory store
      await memoryStore.initialize();
      const user = memoryStore.users.find((u) => u._id.toString() === decoded.id.toString());
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({
          success: false,
          message: 'Refresh token revoked or invalid session.',
          data: null,
          error: 'SESSION_REVOKED',
        });
      }

      const tokens = generateTokens(user);
      user.refreshToken = tokens.refreshToken;

      res.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions);

      return res.status(200).json({
        success: true,
        message: 'Access token refreshed successfully.',
        data: {
          accessToken: tokens.accessToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
        error: null,
      });
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Token refresh failed.',
      data: null,
      error: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (mongoose.connection.readyState === 1) {
      if (refreshToken) {
        await User.updateOne({ refreshToken }, { $set: { refreshToken: null } });
      }
    } else {
      await memoryStore.initialize();
      const u = memoryStore.users.find((user) => user.refreshToken === refreshToken);
      if (u) u.refreshToken = null;
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
      data: null,
      error: null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Logout failed.',
      data: null,
      error: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    let driverInfo = null;

    if (mongoose.connection.readyState === 1) {
      if (req.user.role === 'driver') {
        driverInfo = await Driver.findOne({ userId: req.user._id })
          .populate('assignedBus')
          .populate('currentTrip');
      }
    } else {
      if (req.user.role === 'driver') {
        driverInfo = memoryStore.drivers.find((d) => d.userId.toString() === req.user._id.toString());
        if (driverInfo) {
          const assignedBus = memoryStore.buses.find((b) => b._id.toString() === driverInfo.assignedBus?.toString());
          const currentTrip = memoryStore.trips.find((t) => t._id.toString() === driverInfo.currentTrip?.toString());
          driverInfo = { ...driverInfo, assignedBus, currentTrip };
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Authenticated user profile retrieved.',
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          driver: driverInfo,
        },
      },
      error: null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile.',
      data: null,
      error: error.message,
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const users = await User.find().select('-passwordHash');
      return res.status(200).json({ success: true, data: users, message: 'Users retrieved', error: null });
    }

    await memoryStore.initialize();
    const users = memoryStore.users.map(({ passwordHash, ...u }) => u);
    return res.status(200).json({ success: true, data: users, message: 'Users retrieved', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch users', error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['passenger', 'driver', 'operator', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, data: null, message: 'Invalid role', error: 'INVALID_ROLE' });
    }

    if (mongoose.connection.readyState === 1) {
      const updated = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-passwordHash');
      if (!updated) return res.status(404).json({ success: false, data: null, message: 'User not found', error: 'NOT_FOUND' });
      return res.status(200).json({ success: true, data: updated, message: 'Role updated', error: null });
    }

    await memoryStore.initialize();
    const idx = memoryStore.users.findIndex((u) => u._id.toString() === id.toString());
    if (idx === -1) return res.status(404).json({ success: false, data: null, message: 'User not found', error: 'NOT_FOUND' });

    memoryStore.users[idx].role = role;
    const { passwordHash, ...safeUser } = memoryStore.users[idx];
    return res.status(200).json({ success: true, data: safeUser, message: 'Role updated', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to update role', error: error.message });
  }
};

