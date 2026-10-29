export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.',
        data: null,
        error: 'UNAUTHORIZED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' lacks permission for this action. Allowed: [${allowedRoles.join(', ')}]`,
        data: null,
        error: 'FORBIDDEN_ROLE',
      });
    }

    next();
  };
};
