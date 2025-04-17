import User from "../models/user.model.js";
import Employee from "../models/employee.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { generateToken } from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, mobile } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ $or: [{ email }, { mobile }] });

  if (userExists) {
    throw new ApiError("User already exists", 400);
  }

  // Create user
  const user = await User.create({
    name,
    email,
    mobile,
  });

  // Generate email verification token
  const emailVerificationToken = user.generateEmailVerificationToken();
  await user.save();

  // Create verification URL
  const verificationURL = `${process.env.FRONTEND_URL}/verify-email/${emailVerificationToken}`;

  // Send email
  const message = `
    <h1>Email Verification</h1>
    <p>Please click on the link below to verify your email:</p>
    <a href="${verificationURL}" target="_blank">Verify Email</a>
  `;

  await sendEmail({
    email: user.email,
    subject: "Email Verification",
    message,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully. Please verify your email.",
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      isEmailVerified: user.isEmailVerified,
      isMobileVerified: user.isMobileVerified,
    },
  });
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = asyncHandler(async (req, res) => {
  // Get hashed token
  const emailVerificationToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError("Invalid or expired token", 400);
  }

  // Set email as verified
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
  });
});

// @desc    Send OTP for mobile verification
// @route   POST /api/auth/send-mobile-otp
// @access  Public
export const sendMobileOTP = asyncHandler(async (req, res) => {
  const { mobile } = req.body;

  // Check if user exists - check both User and Employee models
  const foundUser = await User.findOne({ mobile });
  let foundEmployee = null;
  let entityType = "user";

  if (!foundUser) {
    // If not found in User model, check Employee model
    foundEmployee = await Employee.findOne({ mobile });
    if (foundEmployee) {
      entityType = "employee";
    } else {
      throw new ApiError("User not found", 404);
    }
  }

  // Generate OTP for the found entity (user or employee)
  let otp;

  if (entityType === "user") {
    otp = foundUser.generateMobileVerificationOTP();
    await foundUser.save();
  } else {
    // If the entity is an employee, generate OTP for them
    otp = await generateEmployeeOTP(foundEmployee);
  }

  console.log("🚀 ~ sendMobileOTP ~ otp:", otp);

  // Send OTP via SMS
  // await sendSMS({
  //   phone: mobile,
  //   message: `Your OTP for HappyGo is: ${otp}. Valid for 10 minutes.`,
  // });

  res.status(200).json({
    success: true,
    message: "OTP sent successfully",
  });
});

// Helper function to generate OTP for employee
const generateEmployeeOTP = async (employee) => {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Set OTP and expiry time in employee document
  employee.mobileVerificationOTP = otp;
  employee.mobileVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  await employee.save();

  return otp;
};

// @desc    Verify mobile OTP
// @route   POST /api/auth/verify-mobile-otp
// @access  Public
export const verifyMobileOTP = asyncHandler(async (req, res) => {
  const { mobile, otp } = req.body;

  // First check in User model
  const user = await User.findOne({
    mobile,
    mobileVerificationOTP: otp,
    mobileVerificationExpire: { $gt: Date.now() },
  });

  // If found in User model
  if (user) {
    // Set mobile as verified
    user.isMobileVerified = true;
    user.mobileVerificationOTP = undefined;
    user.mobileVerificationExpire = undefined;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Mobile verified successfully",
      token,
      userType: user.role === "admin" ? "admin" : "user",
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        isEmailVerified: user.isEmailVerified,
        isMobileVerified: user.isMobileVerified,
        walletBalance: user.walletBalance,
        referralCode: user.referralCode,
        role: user.role,
      },
    });
  }

  // If not found in User model, check in Employee model
  const employee = await Employee.findOne({
    mobile,
    mobileVerificationOTP: otp,
    mobileVerificationExpire: { $gt: Date.now() },
  });

  // If found in Employee model
  if (employee) {
    // Clear OTP
    employee.mobileVerificationOTP = undefined;
    employee.mobileVerificationExpire = undefined;
    await employee.save();

    // Generate token
    const token = generateToken(employee._id);

    return res.status(200).json({
      success: true,
      message: "Mobile verified successfully",
      token,
      userType: "employee",
      data: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        mobile: employee.mobile,
        role: employee.role,
        assignedModules: employee.assignedModules,
      },
    });
  }

  // If not found in either model
  throw new ApiError("Invalid or expired OTP", 400);
});

// @desc    Login user with mobile OTP (works for users, admins, and employees)
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { mobile, email, password } = req.body;

  // If mobile is provided, treat it as OTP-based login
  if (mobile) {
    // Check if user exists in User model
    const foundUser = await User.findOne({ mobile });
    let foundEmployee = null;
    let entityType = "user";

    if (!foundUser) {
      // If not found in User model, check Employee model
      foundEmployee = await Employee.findOne({ mobile });
      if (foundEmployee) {
        entityType = "employee";
      } else {
        throw new ApiError("User not found", 404);
      }
    }

    // Generate OTP for the found entity (user or employee)
    let otp;

    if (entityType === "user") {
      otp = foundUser.generateMobileVerificationOTP();
      await foundUser.save();
    } else {
      // If the entity is an employee, generate OTP for them
      otp = await generateEmployeeOTP(foundEmployee);
    }

    console.log("🚀 ~ loginUser ~ otp:", otp);

    // Send OTP via SMS
    // await sendSMS({
    //   phone: mobile,
    //   message: `Your OTP for HappyGo login is: ${otp}. Valid for 10 minutes.`,
    // });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  }

  // If email and password are provided, check for employee login
  if (email && password) {
    // Check if it's a user (admin)
    const admin = await User.findOne({ email, role: "admin" });

    if (admin) {
      // For now, we don't have password auth for regular users/admins
      // Will need to add password field and validation to User model
      throw new ApiError(
        "Admin authentication with password not implemented yet",
        501
      );
    }

    // Check if it's an employee
    const employee = await Employee.findOne({ email }).select("+password");

    if (!employee) {
      throw new ApiError("Invalid credentials", 401);
    }

    // Check if employee is active
    if (!employee.isActive) {
      throw new ApiError(
        "Your account has been deactivated. Please contact admin.",
        401
      );
    }

    // Check if password matches
    const isMatch = await employee.matchPassword(password);

    if (!isMatch) {
      throw new ApiError("Invalid credentials", 401);
    }

    // Generate token
    const token = generateToken(employee._id);

    return res.status(200).json({
      success: true,
      token,
      userType: "employee",
      data: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        mobile: employee.mobile,
        role: employee.role,
        assignedModules: employee.assignedModules,
      },
    });
  }

  // If neither mobile nor email/password provided
  throw new ApiError(
    "Please provide either mobile number for OTP or email/password for direct login",
    400
  );
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
  console.log("🚀 ~ getMe ~ req:", req?.user);
  const user = await User.findById(req?.user?.id);
  res.status(404).json({
    message: "user id not found",
  });

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      isEmailVerified: user.isEmailVerified,
      isMobileVerified: user.isMobileVerified,
      walletBalance: user.walletBalance,
      referralCode: user.referralCode,
    },
  });
});
