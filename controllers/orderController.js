import Cart from '../models/cart.js';
import Order from '../models/order.js';
import Course from '../models/course.js';
import mongoose from 'mongoose';

const parsePrice = (price) => {
  const numeric = Number(String(price).replace(/[^\d.]/g, ''));
  return Number.isNaN(numeric) ? 0 : numeric;
};

const generateOrderCode = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 900 + 100);
  return `ORD-${timestamp}-${random}`;
};

export const placeOrder = async (req, res) => {
  try {
    const { name, email, billingAddress, whatsapp, paymentType } = req.body;

    if (!billingAddress || !whatsapp) {
      return res.status(400).json({ message: 'Billing address and whatsapp are required.' });
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
      items: orderItems,
      amount,
      tax,
      status: 'paid',
    });

    cart.items = [];
    await cart.save();

    return res.status(201).json({
      message: 'Order placed successfully.',
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
        downloadUrl: primaryVideoUrl,
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
