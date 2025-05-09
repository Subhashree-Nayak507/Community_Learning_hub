import express from 'express';
import {getFeed, saveContent,  getSavedContent, shareContent, reportContent, premiumContent} from '../../controller/user/feed.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const feedRouter = express.Router();

feedRouter.get('/',authMiddleware ,getFeed);
feedRouter.post('/save',authMiddleware , saveContent);
feedRouter.get('/saved',authMiddleware , getSavedContent);
feedRouter.post('/share',authMiddleware , shareContent);
feedRouter.post('/report',authMiddleware , reportContent);
feedRouter.get('/premium',authMiddleware , premiumContent);

export default feedRouter;