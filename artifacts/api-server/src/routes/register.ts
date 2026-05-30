import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../db/connection';
import { generateToken, JWTPayload } from '../utils/jwt';
import { hashPassword, generateVerificationToken, getTokenExpiryTime } from '../utils/password';
import { sendVerificationEmail } from '../utils/email';

const router = Router();

/**
 * POST /auth/register
 * User self-registration
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, passwordConfirm, gender, dob, city } = req.body;

    // ✅ VALIDATE INPUT
    if (!name || !email || !phone || !gender || !dob || !city) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Name, email, phone, gender, dob, city are required',
      });
    }

    // ✅ VALIDATE PASSWORD - Optional but if provided must match
    if (password) {
      if (password !== passwordConfirm) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Passwords do not match',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Password must be at least 6 characters',
        });
      }
    }

    const db = await getDatabase();
    
    // ✅ FIX: Use ONLY 'profiles' collection - unified
    const profilesCollection = db.collection('profiles');

    // ✅ CHECK DUPLICATE EMAIL & PHONE
    const existingUser = await profilesCollection.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: existingUser.email === email 
          ? 'Email is already registered'
          : 'Phone number is already registered',
      });
    }

    // ✅ CREATE USER DOCUMENT - SINGLE INSERT
    const verificationToken = generateVerificationToken();
    const tokenExpiry = getTokenExpiryTime();

    const newUser = {
      _id: new ObjectId(),
      
      // IDENTITY
      name,
      email,
      phone,
      gender,
      dob: new Date(dob),
      city,
      
      // ROLE & STATUS
      role: 'applicant',
      profileStatus: 'pending',
      active: true,
      
      // AUTHENTICATION
      password: password ? hashPassword(password) : null,
      emailVerified: password ? false : true,
      
      // PROFILE DATA - REQUIRED FOR MATCHING
      education: '',
      profession: '',
      income: '',
      caste: '',
      height: '',
      houseStatus: '',
      bio: '',
      photo: '',
      
      // COMPLETION & PAYMENT
      profileCompletion: 10,
      paymentStatus: 'pending',
      
      // VERIFICATION
      verificationToken,
      verificationTokenExpiry: tokenExpiry,
      
      // TIMESTAMPS
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ✅ INSERT ONCE - NO DUPLICATION
    const result = await profilesCollection.insertOne(newUser);
    console.log(`✅ User profile created: ${email}`);

    // ✅ SEND VERIFICATION EMAIL
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5175'}/verify-email?token=${verificationToken}&email=${email}`;
    const emailSent = await sendVerificationEmail(email, name, verificationLink);

    // ✅ RETURN SUCCESS
    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      user: {
        _id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      emailSent,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /auth/verify-email
 * Verify email with token
 */
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and token required',
      });
    }

    const db = await getDatabase();
    const profilesCollection = db.collection('profiles');

    // ✅ FIND USER
    const user = await profilesCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with this email',
      });
    }

    // ✅ CHECK TOKEN
    if (user.verificationToken !== token) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Verification token is invalid',
      });
    }

    // ✅ CHECK EXPIRY
    if (new Date() > user.verificationTokenExpiry) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Verification token has expired. Please request a new one.',
      });
    }

    // ✅ MARK EMAIL AS VERIFIED
    await profilesCollection.updateOne(
      { email },
      {
        $set: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
          updatedAt: new Date(),
        },
      }
    );

    console.log(`✅ Email verified: ${email}`);

    // ✅ GENERATE JWT TOKEN
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token_jwt = generateToken(payload);

    return res.json({
      success: true,
      message: 'Email verified successfully!',
      token: token_jwt,
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      expiresIn: '24h',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({
      error: 'Verification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /auth/resend-verification
 * Resend verification email
 */
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email required',
        message: 'Please provide your email address',
      });
    }

    const db = await getDatabase();
    const profilesCollection = db.collection('profiles');

    const user = await profilesCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No user found with this email',
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        error: 'Email already verified',
        message: 'This email is already verified',
      });
    }

    // ✅ GENERATE NEW TOKEN
    const verificationToken = generateVerificationToken();
    const tokenExpiry = getTokenExpiryTime();

    await profilesCollection.updateOne(
      { email },
      {
        $set: {
          verificationToken,
          verificationTokenExpiry: tokenExpiry,
          updatedAt: new Date(),
        },
      }
    );

    // ✅ SEND NEW VERIFICATION EMAIL
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5175'}/verify-email?token=${verificationToken}&email=${email}`;
    const emailSent = await sendVerificationEmail(email, user.name, verificationLink);

    console.log(`✅ Verification email resent to: ${email}`);

    return res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
      emailSent,
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({
      error: 'Failed to resend verification',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;