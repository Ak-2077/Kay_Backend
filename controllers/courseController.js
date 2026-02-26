import Course from '../models/course.js';

export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate('instructor', 'name email');
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor', 'name email');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCourse = async (req, res) => {
  try {
    const { code, title, description, price, oldPrice, thumbnail, status, videos, instructor } = req.body;

    if (!code || !title || !price || !thumbnail) {
      return res.status(400).json({ message: 'Missing required fields: code, title, price, thumbnail' });
    }

    const existingCourse = await Course.findOne({ code });
    if (existingCourse) {
      return res.status(400).json({ message: 'Course code must be unique' });
    }

    const newCourse = new Course({
      code,
      title,
      description,
      price,
      oldPrice,
      thumbnail,
      status: status || 'active',
      videos: videos || [],
      instructor: instructor || null,
    });

    const savedCourse = await newCourse.save();
    res.status(201).json(savedCourse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addVideoToCourse = async (req, res) => {
  try {
    const { title, url, duration, description } = req.body;

    if (!title || !url) {
      return res.status(400).json({ message: 'Missing required fields: title, url' });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          videos: { title, url, duration, description },
        },
      },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
