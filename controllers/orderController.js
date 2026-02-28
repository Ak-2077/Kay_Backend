import Cart from '../models/cart.js';
import Order from '../models/order.js';
import Course from '../models/course.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Razorpay from 'razorpay';

const parsePrice = (price) => {
  const numeric = Number(String(price).replace(/[^\d.]/g, ''));
  return Number.isNaN(numeric) ? 0 : numeric;
};

const generateOrderCode = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 900 + 100);
  return `ORD-${timestamp}-${random}`;
};

const mapPaymentMethod = (method) => {
  const map = {
    card: 'credit_card',
    upi: 'upi',
    netbanking: 'net_banking',
    wallet: 'wallet',
  };

  return map[method] || 'pending';
};

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!webhookSecret) {
      return res.status(500).json({ message: 'RAZORPAY_WEBHOOK_SECRET is not configured.' });
    }

    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ message: 'Missing webhook signature.' });
    }

    const payloadBuffer = req.body;
    if (!Buffer.isBuffer(payloadBuffer)) {
      return res.status(400).json({ message: 'Invalid webhook payload.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadBuffer)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: 'Invalid webhook signature.' });
    }

    const eventData = JSON.parse(payloadBuffer.toString('utf8'));
    const event = eventData?.event;
    const paymentEntity = eventData?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (!orderId) {
      return res.status(200).json({ message: 'Webhook received without order_id.' });
    }

    const order = await Order.findOne({ razorpayOrderId: orderId });
    if (!order) {
      return res.status(200).json({ message: 'Webhook received for unknown order.' });
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      order.status = 'paid';
      order.paymentId = paymentId || order.paymentId;
      order.razorpayPaymentId = paymentId || order.razorpayPaymentId;
      order.paymentMethod = mapPaymentMethod(paymentEntity?.method);
      await order.save();
      await Cart.updateOne({ user: order.user }, { $set: { items: [] } });
    } else if (event === 'payment.failed') {
      order.status = 'failed';
      order.paymentId = paymentId || order.paymentId;
      order.razorpayPaymentId = paymentId || order.razorpayPaymentId;
      await order.save();
    } else if (event === 'refund.processed') {
      order.status = 'refunded';
      await order.save();
    }

    return res.status(200).json({ message: 'Webhook processed successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Webhook processing failed.' });
  }
};

export const createCheckoutOrder = async (req, res) => {
  try {
    const { name, email, billingAddress, whatsapp, paymentType } = req.body;
    const idempotencyKey = req.headers['x-idempotency-key'];

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return res.status(400).json({ message: 'Idempotency key is required.' });
    }

    if (!billingAddress || !whatsapp) {
      return res.status(400).json({ message: 'Billing address and whatsapp are required.' });
    }

    const existingOrder = await Order.findOne({
      user: req.user._id,
      idempotencyKey,
    });

    if (existingOrder) {
      return res.status(200).json({
        message: 'Checkout order already created.',
        order: existingOrder,
        razorpayOrder: {
          id: existingOrder.razorpayOrderId,
          amount: Math.round(existingOrder.amount * 100),
          currency: 'INR',
        },
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    const amount = cart.items.reduce(
      (sum, item) => sum + parsePrice(item.newPrice) * item.quantity,
      0
    );
    const tax = amount - amount / 1.18;

    const orderItems = cart.items.map((item) => ({
      courseId: item.courseId,
      title: item.title,
      image: item.image,
      price: parsePrice(item.newPrice),
      quantity: item.quantity,
    }));

    const order = await Order.create({
      code: generateOrderCode(),
      user: req.user._id,
      name,
      email,
      billingAddress,
      whatsapp,
      paymentType,
      idempotencyKey,
      items: orderItems,
      amount,
      tax,
      paymentMethod: 'pending',
      status: 'pending',
    });

    const razorpayClient = getRazorpayClient();
    const razorpayOrder = await razorpayClient.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: order.code,
      notes: {
        appOrderId: String(order._id),
        userId: String(req.user._id),
      },
      payment_capture: true,
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    return res.status(201).json({
      message: 'Checkout order created.',
      order,
      razorpayOrder,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const verifyCheckoutPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Incomplete payment verification payload.' });
    }

    const order = await Order.findOne({
      user: req.user._id,
      razorpayOrderId: razorpay_order_id,
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found for verification.' });
    }

    if (order.status === 'paid' && order.razorpayPaymentId === razorpay_payment_id) {
      return res.status(200).json({ message: 'Order already verified.', order });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      order.status = 'failed';
      await order.save();
      return res.status(400).json({ message: 'Invalid Razorpay payment signature.' });
    }

    const razorpayClient = getRazorpayClient();
    const payment = await razorpayClient.payments.fetch(razorpay_payment_id);

    if (!payment || payment.order_id !== razorpay_order_id) {
      return res.status(400).json({ message: 'Razorpay payment does not match order.' });
    }

    const expectedAmountInPaise = Math.round(order.amount * 100);
    if (Number(payment.amount) !== expectedAmountInPaise) {
      return res.status(400).json({ message: 'Payment amount mismatch.' });
    }

    if (payment.status === 'authorized') {
      await razorpayClient.payments.capture(razorpay_payment_id, expectedAmountInPaise, 'INR');
    }

    order.status = 'paid';
    order.paymentId = razorpay_payment_id;
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paymentMethod = mapPaymentMethod(payment.method);
    await order.save();

    await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });

    return res.status(200).json({
      message: 'Payment verified and order placed successfully.',
      order,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'Orders fetched successfully.',
      orders,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getMyCourseAccess = async (req, res) => {
  try {
    const paidOrders = await Order.find({ user: req.user._id, status: 'paid' })
      .sort({ createdAt: -1 })
      .select('items createdAt');

    const purchasedItems = paidOrders.flatMap((order) =>
      (order.items || []).map((item) => ({
        courseId: item.courseId,
        title: item.title,
        image: item.image,
        purchasedAt: order.createdAt,
      }))
    );

    const objectIdCourseIds = purchasedItems
      .map((item) => item.courseId)
      .filter((courseId) => mongoose.Types.ObjectId.isValid(String(courseId)))
      .map((courseId) => new mongoose.Types.ObjectId(String(courseId)));

    const courses = objectIdCourseIds.length
      ? await Course.find({ _id: { $in: objectIdCourseIds } }).select('videos thumbnail')
      : [];

    const courseMap = new Map(courses.map((course) => [String(course._id), course]));

    const uniqueMap = new Map();

    purchasedItems.forEach((item) => {
      const key = String(item.courseId);
      if (uniqueMap.has(key)) {
        return;
      }

      const matchedCourse = courseMap.get(key);
      const primaryVideoUrl = matchedCourse?.videos?.[0]?.url || '/Showreel_trim.mp4';

      uniqueMap.set(key, {
        id: item.courseId,
        title: item.title,
        image: item.image || matchedCourse?.thumbnail || '/courses.png',
        purchasedAt: item.purchasedAt,
        paymentStatus: 'paid',
        videoUrl: primaryVideoUrl,
      });
    });

    return res.status(200).json({
      message: 'Course access fetched successfully.',
      courses: Array.from(uniqueMap.values()),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};
