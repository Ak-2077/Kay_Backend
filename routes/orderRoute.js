import express from 'express';
import protect from '../middleware/authmiddleware.js';
import { getMyCourseAccess, getMyOrders, placeOrder } from '../controllers/orderController.js';

const router = express.Router();

router.use(protect);
router.get('/my', getMyOrders);
router.get('/access', getMyCourseAccess);
router.post('/checkout', placeOrder);

export default router;
