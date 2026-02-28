import express from 'express';
import adminProtect from '../middleware/adminMiddleware.js';
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  addVideoToCourse,
} from '../controllers/courseController.js';

const router = express.Router();

// Public routes
router.get('/', getAllCourses);
router.get('/:id', getCourseById);

// Admin protected routes
router.post('/', adminProtect, createCourse);
router.put('/:id', adminProtect, updateCourse);
router.delete('/:id', adminProtect, deleteCourse);
router.post('/:id/videos', adminProtect, addVideoToCourse);

export default router;
