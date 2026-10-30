import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Driver from '../models/Driver.js';
import { ENV } from '../config/env.js';
import { store, useMongo } from '../config/dbMode.js';
import { generateId } from '../models/memoryStore.js';

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
    if (useMongo()) {
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
    await store.initialize();
    if (store.users.length === 0 && role && ['passenger', 'driver', 'operator', 'admin'].includes(role)) {
      assignedRole = role;
    }
    const existing = store.users.find((u) => u.email === lowerEmail);
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
    store.users.push(newUser);

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

    if (useMongo()) {
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
    await store.initialize();
    const user = store.users.find((u) => u.email === lowerEmail);
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
      driverInfo = store.drivers.find((d) => d.userId.toString() === user._id.toString());
      if (driverInfo) {
        const assignedBus = store.buses.find((b) => b._id.toString() === driverInfo.assignedBus?.toString());
        const currentTrip = store.trips.find((t) => t._id.toString() === driverInfo.currentTrip?.toString());
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

      if (useMongo()) {
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
      await store.initialize();
      const user = store.users.find((u) => u._id.toString() === decoded.id.toString());
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

    if (useMongo()) {
      if (refreshToken) {
        await User.updateOne({ refreshToken }, { $set: { refreshToken: null } });
      }
    } else {
      await store.initialize();
      const u = store.users.find((user) => user.refreshToken === refreshToken);
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

    if (useMongo()) {
      if (req.user.role === 'driver') {
        driverInfo = await Driver.findOne({ userId: req.user._id })
          .populate('assignedBus')
          .populate('currentTrip');
      }
    } else {
      if (req.user.role === 'driver') {
        driverInfo = store.drivers.find((d) => d.userId.toString() === req.user._id.toString());
        if (driverInfo) {
          const assignedBus = store.buses.find((b) => b._id.toString() === driverInfo.assignedBus?.toString());
          const currentTrip = store.trips.find((t) => t._id.toString() === driverInfo.currentTrip?.toString());
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
    if (useMongo()) {
      const users = await User.find().select('-passwordHash');
      return res.status(200).json({ success: true, data: users, message: 'Users retrieved', error: null });
    }

    await store.initialize();
    const users = store.users.map(({ passwordHash, ...u }) => u);
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

    if (useMongo()) {
      const updated = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-passwordHash');
      if (!updated) return res.status(404).json({ success: false, data: null, message: 'User not found', error: 'NOT_FOUND' });
      return res.status(200).json({ success: true, data: updated, message: 'Role updated', error: null });
    }

    await store.initialize();
    const idx = store.users.findIndex((u) => u._id.toString() === id.toString());
    if (idx === -1) return res.status(404).json({ success: false, data: null, message: 'User not found', error: 'NOT_FOUND' });

    store.users[idx].role = role;
    const { passwordHash, ...safeUser } = store.users[idx];
    return res.status(200).json({ success: true, data: safeUser, message: 'Role updated', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to update role', error: error.message });
  }
};


// ─── Google OAuth (Firebase ID token verification) ───────────────────────────

const issueSession = (res, user) => {
  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
  return {
    user: { id: user._id, name: user.name, email: user.email, role: user.role, photoURL: user.photoURL || null },
    accessToken,
  };
};

/**
 * POST /api/auth/google
 * Body/header: Firebase ID token (Authorization: Bearer <idToken> or { idToken }).
 * Verifies the token with Firebase Admin, auto-provisions a passenger account,
 * and issues the same session tokens as email/password login.
 */
export const googleAuth = async (req, res) => {
  try {
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const idToken = headerToken || req.body?.idToken;
    if (!idToken) {
      return res.status(400).json({ success: false, data: null, message: 'Firebase ID token required', error: 'TOKEN_REQUIRED' });
    }

    const { getFirebaseAdmin } = await import('../config/firebaseAdmin.js');
    let admin;
    try {
      admin = await getFirebaseAdmin();
    } catch {
      return res.status(503).json({ success: false, data: null, message: 'Google Sign-In is not configured on this server.', error: 'FIREBASE_UNAVAILABLE' });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      return res.status(401).json({ success: false, data: null, message: 'Invalid or expired Google token.', error: 'INVALID_GOOGLE_TOKEN' });
    }

    const { uid, email, name: displayName, picture } = decoded;
    if (!email) {
      return res.status(400).json({ success: false, data: null, message: 'Google account has no email address.', error: 'EMAIL_MISSING' });
    }

    // Google OAuth never assigns privileged roles — always passenger.
    if (useMongo()) {
      let user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { firebaseUid: uid }] });
      if (!user) {
        user = await User.create({
          name: displayName || email.split('@')[0],
          email: email.toLowerCase(),
          passwordHash: await User.hashPassword(generateId() + generateId()), // unguessable random
          role: 'passenger',
          firebaseUid: uid,
          photoURL: picture || null,
        });
      } else {
        if (!user.firebaseUid) user.firebaseUid = uid;
        if (picture && !user.photoURL) user.photoURL = picture;
        await user.save();
      }
      const payload = issueSession(res, user);
      return res.status(200).json({ success: true, message: 'Google sign-in successful.', data: payload, error: null });
    }

    await store.initialize();
    let user = store.users.find((u) => u.email === email.toLowerCase() || u.firebaseUid === uid);
    if (!user) {
      const salt = await bcrypt.genSalt(12);
      user = {
        _id: generateId(),
        name: displayName || email.split('@')[0],
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(generateId() + generateId(), salt),
        role: 'passenger',
        firebaseUid: uid,
        photoURL: picture || null,
        refreshToken: null,
        favorites: [],
        createdAt: new Date(),
      };
      store.users.push(user);
      if (store.persistNow) await store.persistNow();
    } else {
      if (!user.firebaseUid) user.firebaseUid = uid;
      if (picture && !user.photoURL) user.photoURL = picture;
    }

    const payload = issueSession(res, user);
    return res.status(200).json({ success: true, message: 'Google sign-in successful.', data: payload, error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Google sign-in failed.', error: error.message });
  }
};

// ─── Favorite routes (passengers) ────────────────────────────────────────────

export const getFavorites = async (req, res) => {
  try {
    if (useMongo()) {
      const user = await User.findById(req.user._id).select('favorites');
      return res.status(200).json({ success: true, data: { favorites: user?.favorites || [] }, message: 'Favorites retrieved', error: null });
    }
    await store.initialize();
    const user = store.users.find((u) => u._id.toString() === req.user._id.toString());
    return res.status(200).json({ success: true, data: { favorites: user?.favorites || [] }, message: 'Favorites retrieved', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to fetch favorites', error: error.message });
  }
};

export const addFavorite = async (req, res) => {
  try {
    const { routeId } = req.body;
    if (!routeId) return res.status(400).json({ success: false, data: null, message: 'routeId required', error: 'ROUTE_ID_REQUIRED' });

    if (useMongo()) {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { favorites: routeId } });
      return res.status(200).json({ success: true, data: { routeId }, message: 'Route added to favorites', error: null });
    }
    await store.initialize();
    const user = store.users.find((u) => u._id.toString() === req.user._id.toString());
    if (!user) return res.status(404).json({ success: false, data: null, message: 'User not found', error: 'NOT_FOUND' });
    user.favorites = user.favorites || [];
    if (!user.favorites.includes(routeId)) user.favorites.push(routeId);
    if (store.persistNow) await store.persistNow();
    return res.status(200).json({ success: true, data: { favorites: user.favorites }, message: 'Route added to favorites', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to add favorite', error: error.message });
  }
};

export const removeFavorite = async (req, res) => {
  try {
    const { routeId } = req.params;
    if (useMongo()) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { favorites: routeId } });
      return res.status(200).json({ success: true, data: { routeId }, message: 'Route removed from favorites', error: null });
    }
    await store.initialize();
    const user = store.users.find((u) => u._id.toString() === req.user._id.toString());
    if (user) {
      user.favorites = (user.favorites || []).filter((id) => id !== routeId && id?.toString() !== routeId?.toString());
      if (store.persistNow) await store.persistNow();
    }
    return res.status(200).json({ success: true, data: { routeId }, message: 'Route removed from favorites', error: null });
  } catch (error) {
    return res.status(500).json({ success: false, data: null, message: 'Failed to remove favorite', error: error.message });
  }
};
