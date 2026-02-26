import mongoose from 'mongoose';

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected successfully');
        return mongoose.connection;
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        if (!process.env.VERCEL) {
            process.exit(1);
        }

        throw error;
    }
};

export default connectDB;