import express from 'express';
import {  checkAuth, loginController, logoutController, registerController } from '../controller/auth.controler.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const AuthRouter = express.Router();

AuthRouter.post('/signup', registerController);
AuthRouter.post('/login',loginController);
AuthRouter.post('/logout',logoutController);
AuthRouter.get('/check-auth',authMiddleware,checkAuth);

export default AuthRouter;