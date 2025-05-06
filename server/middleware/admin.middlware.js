import jwt from 'jsonwebtoken';
import userModel from '../models/auth.model.js';

export const adminMiddleware = async (req, res, next) => {
  try {
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
          
    if ( user.role !== 'admin') {
        return res.status(403).json({"message":"Access denied not an admin"});
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ 
      error: 'Access denied',
    });
  }
};