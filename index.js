import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoute.js';
import cartRoutes from './routes/cartRoute.js';
import orderRoutes from './routes/orderRoute.js';
import courseRoutes from './routes/courseRoute.js';
import adminRoutes from './routes/adminRoute.js';
import upcomingCourseRoutes from './routes/upcomingCourseRoute.js';

dotenv.config();

const app = express();

const allowedOrigins = [
    'https://kay-frontend.vercel.app',
    'http://localhost:3000',
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

const jsonParser = express.json();
app.use((req, res, next) => {
    if (req.originalUrl === '/api/orders/webhook') {
        return next();
    }

    return jsonParser(req, res, next);
});

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Backend API is running' });
});


// Serve uploads folder as static
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(500).json({
            message: 'Database connection failed. Check backend environment variables.',
            error: error.message,
        });
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/upcoming-courses', upcomingCourseRoutes);

if (!process.env.VERCEL) {
    connectDB().catch((error) => {
        console.error('Startup failed:', error.message);
        process.exit(1);
    });

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;