import mongoose from "mongoose";

export const connectDB= async()=>{
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`mongodb is connected ${conn.connection.host}`);

    }catch(e){
        console.log("Error:",e);
    }

}