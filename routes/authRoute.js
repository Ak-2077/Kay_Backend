import express from 'express';
import {
	changePassword,
	deleteAccount,
	getCurrentUser,
	loginWithGoogle,
	loginUser,
	registerUser,
	updateProfile,
} from '../controllers/authController.js';
import protect from '../middleware/authmiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', loginWithGoogle);
router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, updateProfile);
router.patch('/password', protect, changePassword);
router.delete('/account', protect, deleteAccount);

export default router;
