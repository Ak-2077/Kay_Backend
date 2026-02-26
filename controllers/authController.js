import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user.js';
import Cart from '../models/cart.js';
import Order from '../models/order.js';

const googleClient = new OAuth2Client();

const generateToken = (userId) =>
	jwt.sign({ id: userId }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN || '7d',
	});

export const registerUser = async (req, res) => {
	try {
		const { name, email, password } = req.body;

		if (!name || !email || !password) {
			return res.status(400).json({ message: 'Name, email and password are required.' });
		}

		const existingUser = await User.findOne({ email: email.toLowerCase() });
		if (existingUser) {
			return res.status(409).json({ message: 'User already exists with this email.' });
		}

		const user = await User.create({ name, email, password });

		const token = generateToken(user._id);

		return res.status(201).json({
			message: 'User registered successfully.',
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: error.message || 'Server error' });
	}
};

export const loginUser = async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({ message: 'Email and password are required.' });
		}

		const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
		if (!user) {
			return res.status(401).json({ message: 'Invalid email or password.' });
		}

		if (!user.password) {
			return res.status(400).json({ message: 'This account uses Google login. Please continue with Google.' });
		}

		const isMatch = await user.comparePassword(password);
		if (!isMatch) {
			return res.status(401).json({ message: 'Invalid email or password.' });
		}

		const token = generateToken(user._id);

		return res.status(200).json({
			message: 'Login successful.',
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: error.message || 'Server error' });
	}
};

export const loginWithGoogle = async (req, res) => {
	try {
		const { credential } = req.body;
		const clientId = process.env.GOOGLE_CLIENT_ID;

		if (!clientId) {
			return res.status(500).json({ message: 'GOOGLE_CLIENT_ID is not configured on server.' });
		}

		if (!credential || typeof credential !== 'string') {
			return res.status(400).json({ message: 'Google credential token is required.' });
		}

		const ticket = await googleClient.verifyIdToken({
			idToken: credential,
			audience: clientId,
		});

		const payload = ticket.getPayload();
		if (!payload || !payload.email) {
			return res.status(400).json({ message: 'Invalid Google token payload.' });
		}

		if (!payload.email_verified) {
			return res.status(400).json({ message: 'Google email is not verified.' });
		}

		const email = payload.email.toLowerCase();
		const googleId = payload.sub;
		const name = payload.name || email.split('@')[0] || 'Google User';

		let user = await User.findOne({ email });

		if (!user) {
			user = await User.create({
				name,
				email,
				googleId,
				provider: 'google',
			});
		} else {
			let shouldSave = false;

			if (!user.googleId) {
				user.googleId = googleId;
				shouldSave = true;
			}

			if (!user.provider) {
				user.provider = 'google';
				shouldSave = true;
			}

			if (shouldSave) {
				await user.save();
			}
		}

		const token = generateToken(user._id);

		return res.status(200).json({
			message: 'Google login successful.',
			token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
		});
	} catch (error) {
		return res.status(401).json({ message: 'Google authentication failed.' });
	}
};

export const getCurrentUser = async (req, res) => {
	try {
		return res.status(200).json({ user: req.user });
	} catch (error) {
		return res.status(500).json({ message: error.message || 'Server error' });
	}
};

export const updateProfile = async (req, res) => {
	try {
		const { name, email } = req.body;

		const nextName = typeof name === 'string' ? name.trim() : '';
		const nextEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

		if (!nextName || !nextEmail) {
			return res.status(400).json({ message: 'Name and email are required.' });
		}

		const existingUser = await User.findOne({ email: nextEmail, _id: { $ne: req.user._id } });
		if (existingUser) {
			return res.status(409).json({ message: 'Email is already in use.' });
		}

		const user = await User.findByIdAndUpdate(
			req.user._id,
			{ name: nextName, email: nextEmail },
			{ new: true, runValidators: true }
		);

		if (!user) {
			return res.status(404).json({ message: 'User not found.' });
		}

		return res.status(200).json({
			message: 'Profile updated successfully.',
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
		});
	} catch (error) {
		return res.status(500).json({ message: error.message || 'Server error' });
	}
};

export const changePassword = async (req, res) => {
	try {
		const { currentPassword, newPassword } = req.body;

		if (!currentPassword || !newPassword) {
			return res.status(400).json({ message: 'Current and new password are required.' });
		}

		if (String(newPassword).length < 6) {
			return res.status(400).json({ message: 'New password must be at least 6 characters.' });
		}

		const user = await User.findById(req.user._id).select('+password');
		if (!user) {
			return res.status(404).json({ message: 'User not found.' });
		}

		const isMatch = await user.comparePassword(currentPassword);
		if (!isMatch) {
			return res.status(401).json({ message: 'Current password is incorrect.' });
		}

		user.password = newPassword;
		await user.save();

		return res.status(200).json({ message: 'Password changed successfully.' });
	} catch (error) {
		return res.status(500).json({ message: error.message || 'Server error' });
	}
};

export const deleteAccount = async (req, res) => {
	try {
		await Promise.all([
			Cart.deleteOne({ user: req.user._id }),
			Order.deleteMany({ user: req.user._id }),
			User.findByIdAndDelete(req.user._id),
		]);

		return res.status(200).json({ message: 'Account deleted successfully.' });
	} catch (error) {
		return res.status(500).json({ message: error.message || 'Server error' });
	}
};
