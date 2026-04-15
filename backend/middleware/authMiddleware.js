const jwt = require('jsonwebtoken');

// 1. Verify the User is Logged In
exports.verifyToken = (req, res, next) => {
  // Get token from header (Supports "Bearer <token>" format)
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  try {
    // 🔍 KEY FIX: Use 'secretkey123' to match the Login Controller
    const decoded = jwt.verify(token, 'secretkey123');
    
    req.user = decoded; // Attach user info to the request
    next(); // Let them pass
  } catch (err) {
    console.error("Token Verification Failed:", err.message);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

// 2. Check User Role
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Wrong role' });
    }
    next();
  };
};