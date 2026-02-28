import mongoose from 'mongoose';

const upcomingCourseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      default: '1',
      trim: true,
    },
    episode: {
      type: String,
      default: 'one',
      trim: true,
    },
    courseType: {
      type: String,
      default: 'COURSE',
      trim: true,
    },
    audio: {
      type: String,
      default: 'HINDI + ENG CC',
      trim: true,
    },
    status: {
      type: String,
      default: 'NEW EPISODE | OUT NOW',
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const UpcomingCourse = mongoose.model('UpcomingCourse', upcomingCourseSchema);

export default UpcomingCourse;
