import express from 'express';
import {
  getReportedContent,
  handleReport
} from '../../controller/admin/report.controller.js';
import {
  getContent,
  deleteContent
} from '../../controller/admin/content.controller.js';
import { getPlatformStats } from '../../controller/admin/stats.controller.js';
import { adminMiddleware } from '../../middleware/admin.middlware.js';

const adminRouter = express.Router();

adminRouter.get('/reports', adminMiddleware, getReportedContent);
adminRouter.patch('/reports/:reportId', adminMiddleware, handleReport);//see

adminRouter.get('/content', adminMiddleware, getContent);
adminRouter.delete('/content/:contentId', adminMiddleware, deleteContent);

adminRouter.get('/stats', adminMiddleware, getPlatformStats);

export default adminRouter;