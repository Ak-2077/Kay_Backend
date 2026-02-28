import UpcomingCourse from '../models/upcomingCourse.js';

export const getPublicUpcomingCourses = async (req, res) => {
  try {
    const courses = await UpcomingCourse.find({ active: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(20);

    return res.status(200).json({ courses });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getAdminUpcomingCourses = async (req, res) => {
  try {
    const courses = await UpcomingCourse.find().sort({ sortOrder: 1, createdAt: -1 });
    return res.status(200).json({ courses });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const createUpcomingCourse = async (req, res) => {
  try {
    const {
      title,
      level,
      episode,
      courseType,
      audio,
      status,
      active,
      sortOrder,
    } = req.body;


    if (!title || !image) {
      return res.status(400).json({ message: 'Title and image are required.' });
    }

    const course = await UpcomingCourse.create({
      title,
      level,
      episode,
      courseType,
      audio,
      status,
      image,
      active: typeof active === 'boolean' ? active : true,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    });

    return res.status(201).json({ message: 'Upcoming course created.', course });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const updateUpcomingCourse = async (req, res) => {
  try {
    const course = await UpcomingCourse.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({ message: 'Upcoming course not found.' });
    }

    return res.status(200).json({ message: 'Upcoming course updated.', course });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const deleteUpcomingCourse = async (req, res) => {
  try {
    const course = await UpcomingCourse.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Upcoming course not found.' });
    }

    return res.status(200).json({ message: 'Upcoming course deleted.' });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};
