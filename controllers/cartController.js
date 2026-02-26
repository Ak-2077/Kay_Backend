import Cart from '../models/cart.js';

const isValidCoursePayload = (course) => {
  if (!course || typeof course !== 'object') {
    return false;
  }

  return (
    typeof course.id === 'number' &&
    typeof course.title === 'string' &&
    typeof course.oldPrice === 'string' &&
    typeof course.newPrice === 'string' &&
    typeof course.status === 'string' &&
    typeof course.image === 'string'
  );
};

const sanitizeIncomingItem = (item) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const quantity = Number(item.quantity);
  if (
    typeof item.courseId !== 'number' ||
    typeof item.title !== 'string' ||
    typeof item.oldPrice !== 'string' ||
    typeof item.newPrice !== 'string' ||
    typeof item.status !== 'string' ||
    typeof item.image !== 'string' ||
    Number.isNaN(quantity) ||
    quantity < 1
  ) {
    return null;
  }

  return {
    courseId: item.courseId,
    title: item.title,
    oldPrice: item.oldPrice,
    newPrice: item.newPrice,
    status: item.status,
    image: item.image,
    quantity,
  };
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  return cart;
};

export const getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);

    return res.status(200).json({ items: cart.items });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { course } = req.body;

    if (!isValidCoursePayload(course)) {
      return res.status(400).json({ message: 'Invalid course payload.' });
    }

    const cart = await getOrCreateCart(req.user._id);
    const existingIndex = cart.items.findIndex((item) => item.courseId === course.id);

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += 1;
    } else {
      cart.items.push({
        courseId: course.id,
        title: course.title,
        oldPrice: course.oldPrice,
        newPrice: course.newPrice,
        status: course.status,
        image: course.image,
        quantity: 1,
      });
    }

    await cart.save();

    return res.status(200).json({ items: cart.items });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const decrementCartItem = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (typeof courseId !== 'number' && typeof courseId !== 'string') {
      return res.status(400).json({ message: 'courseId is required.' });
    }

    const normalizedCourseId = String(courseId);

    const cart = await getOrCreateCart(req.user._id);
    const itemIndex = cart.items.findIndex((item) => String(item.courseId) === normalizedCourseId);

    if (itemIndex < 0) {
      return res.status(404).json({ message: 'Cart item not found.' });
    }

    cart.items[itemIndex].quantity -= 1;

    if (cart.items[itemIndex].quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    }

    await cart.save();

    return res.status(200).json({ items: cart.items });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const courseId = req.params.courseId;

    if (!courseId) {
      return res.status(400).json({ message: 'Invalid courseId.' });
    }

    const cart = await getOrCreateCart(req.user._id);
    cart.items = cart.items.filter((item) => String(item.courseId) !== String(courseId));

    await cart.save();

    return res.status(200).json({ items: cart.items });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const syncCart = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'items must be an array.' });
    }

    const sanitizedItems = items
      .map(sanitizeIncomingItem)
      .filter(Boolean);

    const cart = await getOrCreateCart(req.user._id);
    cart.items = sanitizedItems;
    await cart.save();

    return res.status(200).json({ items: cart.items });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();

    return res.status(200).json({ items: [] });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};
