import express from 'express';
import protect from '../middleware/authmiddleware.js';
import {
  addToCart,
  clearCart,
  decrementCartItem,
  getCart,
  removeCartItem,
  syncCart,
} from '../controllers/cartController.js';

const router = express.Router();

router.use(protect);

router.get('/', getCart);
router.post('/add', addToCart);
router.patch('/decrement', decrementCartItem);
router.delete('/item/:courseId', removeCartItem);
router.delete('/clear', clearCart);
router.put('/sync', syncCart);

export default router;
