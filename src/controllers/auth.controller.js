import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Users from '../models/Users.js';
import Doctors from '../models/Doctors.js';
import dotenv from 'dotenv';

dotenv.config();

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET;

// User Registration
export const registerUser = async (req, res) => {
    const { fullname, email, phone, password, ...otherDetails } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new Users({
            fullname,
            email,
            phone,
            password: hashedPassword,
            ...otherDetails
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Doctor Registration
export const registerDoctor = async (req, res) => {
    const { fullname, email, phone, password, ...otherDetails } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newDoctor = new Doctors({
            fullname,
            email,
            phone,
            password: hashedPassword,
            ...otherDetails
        });

        await newDoctor.save();
        res.status(201).json({ message: 'Doctor registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// User/Doctor Login
export const login = async (req, res) => {
    const { email, password, role } = req.body; // Role determines if User or Doctor
    const Model = role === 'doctor' ? Doctors : Users;

    try {
        const user = await Model.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role }, JWT_SECRET, { expiresIn: '1d' });
        res.status(200).json({ token, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};