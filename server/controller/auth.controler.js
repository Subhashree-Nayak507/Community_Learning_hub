import userModel from "../models/auth.model.js";
import { generateTokenAndSetCookie } from "../utils/Token.js";
import bcrypt from 'bcryptjs';

export const registerController = async(req,res)=>{
    console.log(req.body);
    try{
        const { fullname,username, email, password} = req.body;
        if (!fullname|| !username || !email || !password){
            return res.status(400).json({
                message:"All fields are required"
            })
        };

        const Email= await userModel.findOne({ email });
        if (Email){
            return res.status(400).json({
                message:"Email already exists"
            })
        };
       
        const user = new userModel({
            fullname,
            username,
            email,
            password
        });
    
        await user.save();
        generateTokenAndSetCookie(res,user._id,user.role);

        return res.status(201).json({
            message:"user created succesfully",
            user
        });
    }catch(e){
        console.log("Error:",e);
        return  res.status(500).json({
            message:"Internal server Error"
        });
    }
};

export const loginController = async(req,res)=>{
    const { email, password} = req.body;
    try{
        if ( !email || !password){
            return res.status(400).json({
                message:"All fields are required"
            })
        };

        const user = await userModel.findOne({ email });
        if (!user){
            return res.status(400).json({
                message:"User not found"
            })
        };

        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log("provided",password);
        console.log("hashed",user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                message: "Invalid credentials"
            });
        };

        generateTokenAndSetCookie(res, user._id,user.role);
    
        return res.status(200).json({
            message:"user found succesfully",
            user
        })

    }catch(e){
        console.log("Error:",e);
        res.status(500).json({
            message:"Internal server Error"
        });
    }
};

export const logoutController = async(req,res)=>{
    try{
     res.clearCookie("jwt");
     res.status(200).json({
        message:"Logout successfully"
     });
    }catch(e){
        console.log("Error:",e);
        res.status(500).json({
            message:"Internal server Error"
        });
    }
};

export const checkAuth = async(req,res)=>{
    try{
        const user= req.user;
        if (!req.user) {
            return res.status(401).json({
                message: "Not authenticated"
            });
        };
        
        res.status(200).json({
            message: "Authenticated user",
            user
        });
    }catch(e){
        console.log("Error:",e);
        res.status(500).json({
            message:"Internal server Error"
        });
    }
};