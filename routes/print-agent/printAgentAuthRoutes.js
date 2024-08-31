const PrintAgent = require("../../models/print-agent-schema.js");
const mailOptions = require("../../utils/mailOptions.js");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const router = express.Router();

// POST /api/auth/print-agent/signup (print-agent)
/**
 *
 * @class
 * @classdesc  PERF: enums for business_type but hishmat could be chutiya
 */
router.post("/signup", async (req, res) => {
  try {
    const { email, password, full_name, business_name, business_type } =
      req.body;

    let printAgent = await PrintAgent.findOne({ email });
    if (printAgent) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = otpGenerator.generate(6, {
      digits: true,
      alphabets: true,
      upperCase: true,
      specialChars: false,
    });
    const otp_expiry = new Date(Date.now() + 300000);

    printAgent = new PrintAgent({
      email,
      password,
      full_name,
      business_name,
      business_type,
      otp,
      otp_expiry,
    });

    await printAgent.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "infosynthseer@gmail.com",
        pass: "kegj ytci koqp dveq",
      },
    });

    transporter.sendMail(mailOptions(email, otp), (error) => {
      if (error) {
        return res.status(500).json({ message: "Error sending email" });
      }
      res.status(200).json({ message: "OTP sent to your email" });
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/customer/verify-otp (customer)
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const printAgent = await PrintAgent.findOne({ email });

    if (!printAgent) {
      return res.status(400).json({ message: "User not found" });
    }

    const current = new Date();
    if (current > printAgent.otp_expiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (printAgent.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    printAgent.verified_email = true;
    printAgent.otp = null;
    printAgent.otp_expiry = null;
    await printAgent.save();
    const payload = {
      user: {
        id: printAgent.id,
      },
    };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      //INFO: revert it back after dev to 5h
      { expiresIn: "10 days" },
      (err, token) => {
        if (err) throw err;
        res.json({ message: "email verified successfully", token });
      },
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/print-agent/login (print-agent)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const printAgent = await PrintAgent.findOne({ email });
    if (!printAgent) {
      return res.status(400).json({ message: "User not found" });
    }
    if (!printAgent.verified_email) {
      return res.status(400).json({ message: "Email not verified" });
    }
    if (!printAgent.password) {
      return res.status(400).json({ message: "Password not set" });
    }
    const isMatch = await bcrypt.compare(password, printAgent.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }
    const payload = {
      user: {
        id: printAgent.id,
      },
    };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      //INFO: revert it back after dev to 5h
      { expiresIn: "10 days" },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({ message: "Logged in successfully", token });
      },
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;