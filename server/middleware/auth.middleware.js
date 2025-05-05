import userModel from "../models/auth.model.js";
import jwt from 'jsonwebtoken';

export const authMiddleware = async(req,res,next)=>{
    try{
        const token = req.cookies.jwt;
        if (!token){
            return res.status(401).json({
                message:"unauthorized"
            })
        };

     const decoded= jwt.verify(token,process.env.JWT_SECRET);
        if(!decoded){
        return res.status(401).json({"message":"token is invalid"});
      };
      console.log(decoded);

      const user= await userModel.findById(decoded.id).select("-password");
      if(!user){
        return res.status(401).json({"message":"User not found"});
      };

      req.user= user;
      user.role= decoded.role;
      console.log("user role",user.role);
      
      next();
    }catch(e){
        console.log("Error:",e);
        return  res.status(500).json({
            message:"Internal server Error"
        });
    }
}