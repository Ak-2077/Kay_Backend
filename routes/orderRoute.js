import express from 'express';
import protect from '../middleware/authmiddleware.js';
import {
	createCheckoutOrder,
	getMyCourseAccess,
	getMyOrders,
	handleRazorpayWebhook,
	verifyCheckoutPayment,
} from '../controllers/orderController.js';

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

router.use(protect);
router.get('/my', getMyOrders);
router.get('/access', getMyCourseAccess);
router.post('/checkout/create', createCheckoutOrder);
router.post('/checkout/verify', verifyCheckoutPayment);

export default router;
