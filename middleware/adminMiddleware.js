import jwt from 'jsonwebtoken';

const adminProtect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, admin token missing.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.isAdmin) {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    req.admin = {
      username: decoded.username,
      isAdmin: true,
    };

    return next();
  } catch {
    return res.status(401).json({ message: 'Not authorized, invalid admin token.' });
  }
};

export default adminProtect;
