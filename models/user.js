import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
	{
		code: {
			type: String,
			unique: true,
			trim: true,
		},
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: false,
			minlength: 6,
			select: false,
		},
		provider: {
			type: String,
			enum: ['local', 'google'],
			default: 'local',
		},
		googleId: {
			type: String,
			trim: true,
			sparse: true,
		},
		purchasedCourses: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Course',
			},
		],
	},
	{
		timestamps: true,
	}
);

userSchema.pre('save', async function hashPassword() {
	if (!this.isModified('password')) return;

	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
	if (!this.password) {
		return false;
	}

	return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
