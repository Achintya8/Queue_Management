import { Request, Response } from 'express';
import { pool } from '../config/database';
import {
hashPassword,
comparePassword,
generateToken,
validatePhone,
validateEmail,
validatePassword,
} from '../utils/auth';

/**
* User Registration
*/
export const registerUser = async (req: Request, res: Response) => {
try {
const { name, phone, email, password } = req.body;

// Validation
if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, phone, and password are required',
      });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
      });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        success: false,
        error: passwordCheck.message,
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT user_id FROM users WHERE phone = $1',
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this phone number already exists',
      });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (name, phone, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, name, phone, email, created_at`,
      [name, phone, email || null, password_hash]
    );

    const user = result.rows[0];

    // Generate token
    const token = generateToken({
      id: user.user_id,
      phone: user.phone,
      type: 'user',
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user.user_id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          createdAt: user.created_at,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * User Login
 */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    // Validation
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Phone and password are required',
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT user_id, name, phone, email, password_hash FROM users WHERE phone = $1',
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid phone or password',
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid phone or password',
      });
    }

    // Generate token
    const token = generateToken({
      id: user.user_id,
      phone: user.phone,
      type: 'user',
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.user_id,
          name: user.name,
          phone: user.phone,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Staff Login (Admin/Operator)
 */
export const loginStaff = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Find staff
    const result = await pool.query(
      `SELECT staff_id, name, email, password_hash, role, is_active
       FROM staff WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const staff = result.rows[0];

    // Check if staff is active
    if (!staff.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, staff.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate token
    const token = generateToken({
      id: staff.staff_id,
      email: staff.email,
      role: staff.role,
      type: 'staff',
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        staff: {
          id: staff.staff_id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
        },
      },
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Get Current User Profile
 */
export const getProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const userType = req.user.type;

    if (userType === 'user') {
      const result = await pool.query(
        `SELECT user_id, name, phone, email, created_at, notification_preferences
         FROM users WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const user = result.rows[0];
      return res.json({
        success: true,
        data: {
          id: user.user_id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          createdAt: user.created_at,
          notificationPreferences: user.notification_preferences,
        },
      });
    } else if (userType === 'staff') {
      const result = await pool.query(
        `SELECT staff_id, name, email, role, is_active, created_at
         FROM staff WHERE staff_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Staff not found',
        });
      }

      const staff = result.rows[0];
      return res.json({
        success: true,
        data: {
          id: staff.staff_id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          isActive: staff.is_active,
          createdAt: staff.created_at,
        },
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};