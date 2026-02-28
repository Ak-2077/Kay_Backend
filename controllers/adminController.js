import jwt from 'jsonwebtoken';

const generateAdminToken = (username) =>
  jwt.sign(
    {
      username,
      isAdmin: true,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    // DEBUG LOGGING - REMOVE AFTER TESTING
    console.log('DEBUG ADMIN LOGIN:', {
      adminUsername,
      adminPassword,
      receivedUsername: username,
      receivedPassword: password,
    });

    if (!adminUsername || !adminPassword) {
      return res.status(500).json({ message: 'Admin credentials are not configured.' });
    }

    if (username !== adminUsername || password !== adminPassword) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    const token = generateAdminToken(adminUsername);

    return res.status(200).json({
      message: 'Admin login successful.',
      token,
      admin: {
        username: adminUsername,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};
