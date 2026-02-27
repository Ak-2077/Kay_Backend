import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    billingAddress: {
      type: String,
      trim: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    items: [
      {
        courseId: {
          type: mongoose.Schema.Types.Mixed,
          ref: 'Course',
          required: true,
        },
        title: {
          type: String,
          required: true,
          trim: true,
        },
        image: {
          type: String,
          trim: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
      },
    ],
    amount: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    paymentId: {
      type: String,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      sparse: true,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      sparse: true,
    },
    razorpaySignature: {
      type: String,
      trim: true,
    },
    paymentType: {
      type: String,
      enum: ['india', 'international'],
      default: 'india',
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'pending'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
orderSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });

const Order = mongoose.model('Order', orderSchema);

export default Order;
