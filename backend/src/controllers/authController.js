import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Calendar from "../models/Calendar.js";
import { generateToken } from "../utils/generateToken.js";

/** POST /api/auth/register */
export const register = async (req, res) => 
{
    const { name, email, password } = req.body;
    if (!email || !password) 
    {
        res.status(400);
        throw new Error("Email and password are required");
    }
    const existing = await User.findOne({ email });
    if (existing) 
    {
        res.status(400);
        throw new Error("User already exists");
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed});

    // create default calendar for this user
    await Calendar.create({ userId: user._id, name: "Main Calendar", color: "#6c6cff", owner: user._id });

    res.json({ token: generateToken(user), user: user});
};

/** POST /api/auth/login */
export const login = async (req, res) => 
{
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) 
    {
        res.status(401);
        throw new Error("Invalid credentials");
    }
    res.json({ token: generateToken(user), user: user});
};
