import express from 'express';
import adminProtect from '../middleware/adminMiddleware.js';

import {
  createUpcomingCourse,
  deleteUpcomingCourse,
  getAdminUpcomingCourses,
  getPublicUpcomingCourses,
  updateUpcomingCourse,
} from '../controllers/upcomingCourseController.js';

const router = express.Router();

router.get('/', getPublicUpcomingCourses);
router.get('/admin', adminProtect, getAdminUpcomingCourses);
router.post('/admin', adminProtect, createUpcomingCourse);
router.put('/admin/:id', adminProtect, updateUpcomingCourse);
router.delete('/admin/:id', adminProtect, deleteUpcomingCourse);

export default router;
