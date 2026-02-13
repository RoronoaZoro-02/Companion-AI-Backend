// EMAIL SERVICE MODULE
// Handles: Welcome email, Payment receipt, Password reset, Email verification

const nodemailer = require('nodemailer');
require('dotenv').config();

// ============================================
// EMAIL CONFIGURATION
// ============================================

// Using Gmail SMTP (free, reliable)
// For production, use SendGrid, Mailgun, or AWS SES

const emailConfig = {
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
};

let transporter;

try {
  transporter = nodemailer.createTransport(emailConfig);
  console.log('✅ Email service configured');
} catch (error) {
  console.warn('⚠️ Email service not configured. Emails will be logged only.');
  transporter = null;
}

// ============================================
// EMAIL TEMPLATES
// ============================================

const emailTemplates = {
  welcome: (name) => ({
    subject: '🎉 Welcome to Mental Health Companion!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome, ${name}!</h2>
        
        <p>Your Mental Health Companion account is ready.</p>
        
        <p><strong>What you can do:</strong></p>
        <ul>
          <li>Chat about anxiety, depression, stress, and more</li>
          <li>Get personalized mental health guidance</li>
          <li>Toggle "Detailed Mode" for in-depth analysis</li>
          <li>Access support 24/7</li>
        </ul>
        
        <p><strong>Getting started:</strong></p>
        <ol>
          <li>Log in to your account</li>
          <li>Select "Mental Health Support"</li>
          <li>Share what's on your mind</li>
          <li>Get immediate, thoughtful responses</li>
        </ol>
        
        <p>Remember: This is a supportive tool. For emergencies, contact a mental health professional or call 988 (Suicide & Crisis Lifeline).</p>
        
        <p>Best,<br/>
        <strong>Companion AI Team</strong></p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">If you didn't create this account, please ignore this email.</p>
      </div>
    `
  }),

  paymentReceipt: (name, orderId, amount, email) => ({
    subject: '✅ Payment Received - Premium Activated',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Payment Successful!</h2>
        
        <p>Hi ${name},</p>
        
        <p>Thank you for upgrading to <strong>Premium</strong>. Your payment has been processed.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Receipt Details:</strong></p>
          <p>Order ID: <code>${orderId}</code></p>
          <p>Amount: ₹${amount}</p>
          <p>Email: ${email}</p>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p><strong>Your Premium Benefits:</strong></p>
        <ul>
          <li>✅ All mental health categories unlocked</li>
          <li>✅ Unlimited conversations</li>
          <li>✅ Cloud sync across devices</li>
          <li>✅ Priority response quality</li>
        </ul>
        
        <p>Your premium access is active immediately. Enjoy!</p>
        
        <p>Questions? Reply to this email or contact support.</p>
        
        <p>Best,<br/>
        <strong>Companion AI Team</strong></p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">Keep this receipt for your records.</p>
      </div>
    `
  }),

  passwordReset: (name, resetLink) => ({
    subject: '🔑 Reset Your Password - Companion AI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        
        <p>Hi ${name},</p>
        
        <p>We received a request to reset your password. Click the button below to create a new password.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: #000; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p><strong>Or copy this link:</strong></p>
        <p><code style="background: #f5f5f5; padding: 10px; display: block; word-break: break-all;">${resetLink}</code></p>
        
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
        
        <p style="color: #666; font-size: 14px;">If you didn't request this, ignore this email. Your password hasn't changed.</p>
        
        <p>Best,<br/>
        <strong>Companion AI Team</strong></p>
      </div>
    `
  }),

  emailVerification: (name, verificationLink) => ({
    subject: '✉️ Verify Your Email - Companion AI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email</h2>
        
        <p>Hi ${name},</p>
        
        <p>Thanks for signing up! Please verify your email address to activate your account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background: #000; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email
          </a>
        </div>
        
        <p><strong>Or copy this link:</strong></p>
        <p><code style="background: #f5f5f5; padding: 10px; display: block; word-break: break-all;">${verificationLink}</code></p>
        
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
        
        <p style="color: #666; font-size: 14px;">If you didn't create this account, please ignore this email.</p>
        
        <p>Best,<br/>
        <strong>Companion AI Team</strong></p>
      </div>
    `
  })
};

// ============================================
// EMAIL SENDING FUNCTIONS
// ============================================

async function sendWelcomeEmail(email, name) {
  try {
    const template = emailTemplates.welcome(name);
    
    if (!transporter) {
      console.log(`📧 [MOCK] Welcome email to ${email}:`, template.subject);
      return { success: true, message: 'Email logged (not configured)', emailId: 'mock_' + Date.now() };
    }

    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: template.subject,
      html: template.html
    });

    console.log(`✅ Welcome email sent to ${email}`, result.messageId);
    return { success: true, emailId: result.messageId };
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function sendPaymentReceiptEmail(email, name, orderId, amount) {
  try {
    const template = emailTemplates.paymentReceipt(name, orderId, amount, email);
    
    if (!transporter) {
      console.log(`📧 [MOCK] Payment receipt to ${email}:`, template.subject);
      return { success: true, message: 'Email logged (not configured)', emailId: 'mock_' + Date.now() };
    }

    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: template.subject,
      html: template.html
    });

    console.log(`✅ Payment receipt email sent to ${email}`, result.messageId);
    return { success: true, emailId: result.messageId };
  } catch (error) {
    console.error(`❌ Failed to send payment receipt to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function sendPasswordResetEmail(email, name, resetToken) {
  try {
    const resetLink = `${process.env.FRONTEND_URL || 'https://yourapp.com'}/reset-password?token=${resetToken}`;
    const template = emailTemplates.passwordReset(name, resetLink);
    
    if (!transporter) {
      console.log(`📧 [MOCK] Password reset to ${email}:`, template.subject);
      return { success: true, message: 'Email logged (not configured)', emailId: 'mock_' + Date.now() };
    }

    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: template.subject,
      html: template.html
    });

    console.log(`✅ Password reset email sent to ${email}`, result.messageId);
    return { success: true, emailId: result.messageId };
  } catch (error) {
    console.error(`❌ Failed to send password reset to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function sendEmailVerificationEmail(email, name, verificationToken) {
  try {
    const verificationLink = `${process.env.FRONTEND_URL || 'https://yourapp.com'}/verify-email?token=${verificationToken}`;
    const template = emailTemplates.emailVerification(name, verificationLink);
    
    if (!transporter) {
      console.log(`📧 [MOCK] Email verification to ${email}:`, template.subject);
      return { success: true, message: 'Email logged (not configured)', emailId: 'mock_' + Date.now() };
    }

    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: template.subject,
      html: template.html
    });

    console.log(`✅ Email verification sent to ${email}`, result.messageId);
    return { success: true, emailId: result.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email verification to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

module.exports = {
  sendWelcomeEmail,
  sendPaymentReceiptEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail
};
