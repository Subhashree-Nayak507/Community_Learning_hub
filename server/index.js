import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB  } from './db/connectDB.js';
import authRouter from './routes/auth.route.js';
import cron from 'node-cron';
import { initializeFeed, refreshFeed } from './services/feed.service.js';
import feedRouter from './routes/user/feed.routes.js';
import TransactionRouter from './routes/user/transactions.rooute.js';

dotenv.config();
const app= express();

app.use(express.json({ limit: "5mb" })); 
app.use(express.urlencoded({ extended:true}));
app.use(cookieParser());


app.use('/api/v1/auth',authRouter);
app.use('/api/v1/feed',feedRouter);
app.use('/api/v1/transaction',TransactionRouter);

cron.schedule('0 */2 * * *', () => {
    console.log('Refreshing feeds...');
    refreshFeed();
  });  

const PORT= process.env.PORT || 4000;
app.listen(PORT,()=>{
    initializeFeed();
    connectDB();
    console.log("http://localhost:4000");
});