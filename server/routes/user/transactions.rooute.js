import express from 'express';
import { getBalance, spendCredits, getTransactionHistory } from '../../controller/user/transaction.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const transactionRouter = express.Router();

transactionRouter.get('/balance', authMiddleware, getBalance);
transactionRouter.post('/spend', authMiddleware, spendCredits);
transactionRouter.get('/history', authMiddleware, getTransactionHistory);

export default transactionRouter;