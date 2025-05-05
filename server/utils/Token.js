import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (res, userId, userRole) => {
    const token = jwt.sign(
        { id: userId, role: userRole }, 
        process.env.JWT_SECRET, 
        { expiresIn: "1d" }
    );

    res.cookie("jwt", token, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    return token;
};