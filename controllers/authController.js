import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Cart from '../models/cart.js';
import Order from '../models/order.js';

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
