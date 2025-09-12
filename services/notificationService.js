const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Send OTP email
const sendOTPEmail = async (email, otp, fullName) => {
  try {
    const result = await transporter.sendMail({
      from: `"Smart Tourist Safety" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Your Smart Tourist Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0;">🛡️ Smart Tourist Safety</h1>
              <p style="color: #666; margin: 5px 0;">Your safety is our priority</p>
            </div>
            
            <h2 style="color: #333;">Hello ${fullName}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Welcome to Smart Tourist Safety Monitor! Please use the verification code below to complete your registration:
            </p>
            
            <div style="background: #f0f4ff; border: 2px dashed #2563eb; padding: 20px; margin: 25px 0; text-align: center; border-radius: 8px;">
              <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
              <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">This code expires in 10 minutes</p>
            </div>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>Security Note:</strong> Never share this OTP with anyone. Our team will never ask for this code.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              If you didn't request this verification, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Smart Tourist Safety Monitor - Keeping tourists safe worldwide<br>
              This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      `
    });

    logger.info('OTP email sent successfully:', { 
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      messageId: result.messageId 
    });

    return result;
  } catch (error) {
    logger.error('Failed to send OTP email:', { error: error.message, email });
    throw error;
  }
};

// Send welcome email with Tourist ID (Primary method)
const sendWelcomeEmail = async (email, fullName, touristId) => {
  try {
    const result = await transporter.sendMail({
      from: `"Smart Tourist Safety" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🎉 Welcome to Smart Tourist Safety - Your Tourist ID is Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #16a34a; margin: 0;">🎉 Welcome Aboard!</h1>
              <h2 style="color: #2563eb; margin: 10px 0;">Smart Tourist Safety</h2>
            </div>
            
            <h2 style="color: #333;">Congratulations ${fullName}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Your registration is complete! You are now part of the Smart Tourist Safety network.
            </p>
            
            <div style="background: #f0f9ff; border: 2px solid #2563eb; padding: 25px; margin: 25px 0; text-align: center; border-radius: 10px;">
              <h3 style="color: #2563eb; margin: 0 0 10px 0;">Your Tourist ID</h3>
              <h1 style="color: #1e40af; font-size: 28px; margin: 0; letter-spacing: 2px; font-family: monospace;">${touristId}</h1>
              <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">Keep this ID safe - you'll need it to login</p>
            </div>
            
            <div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 20px; margin: 25px 0;">
              <h4 style="color: #166534; margin: 0 0 10px 0;">🛡️ You're Now Protected By:</h4>
              <ul style="color: #166534; margin: 0; padding-left: 20px;">
                <li>Real-time location tracking</li>
                <li>24/7 emergency SOS system</li>
                <li>Instant emergency contact alerts</li>
                <li>Blockchain-secured identity</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #666;">Download our mobile app to get started:</p>
              <div style="margin: 20px 0;">
                <a href="#" style="display: inline-block; background: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; margin: 0 10px;">📱 Download App</a>
              </div>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Smart Tourist Safety Monitor - Your safety companion worldwide<br>
              For support, contact us at support@smarttourist.com
            </p>
          </div>
        </div>
      `
    });

    logger.info('Welcome email sent successfully:', { 
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      touristId,
      messageId: result.messageId 
    });

    return result;
  } catch (error) {
    logger.error('Failed to send welcome email:', { error: error.message, email });
    throw error;
  }
};

// 🆕 Simple Tourist ID email (Fallback 1)
const sendSimpleTouristIdEmail = async (email, fullName, touristId) => {
  try {
    const result = await transporter.sendMail({
      from: `"Smart Tourist Safety" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Your Tourist ID: ${touristId}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; background: white;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2563eb; margin: 0;">🛡️ Smart Tourist Safety</h1>
          </div>
          
          <h2 style="color: #333;">Hello ${fullName}!</h2>
          <p style="color: #666; line-height: 1.6;">
            Your Smart Tourist Safety registration is complete.
          </p>
          
          <div style="background: #f0f9ff; border: 2px solid #2563eb; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #2563eb; margin: 0 0 10px 0;">Your Tourist ID:</h3>
            <h1 style="color: #1e40af; font-family: monospace; font-size: 24px; margin: 0; letter-spacing: 2px;">${touristId}</h1>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;"><strong>Save this ID for app login!</strong></p>
          </div>
          
          <div style="background: #dcfce7; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="color: #166534; margin: 0; font-size: 14px;">
              ✅ Registration successful<br>
              📱 Download our app and login with Tourist ID: <strong>${touristId}</strong><br>
              🛡️ Your safety is now monitored 24/7
            </p>
          </div>
          
          <p style="color: #666;">
            Stay Safe!<br>
            <strong>Smart Tourist Safety Team</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This is an automated message, please do not reply.
          </p>
        </div>
      `
    });

    logger.info('Simple Tourist ID email sent successfully:', { 
      email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      touristId,
      messageId: result.messageId 
    });

    return result;
  } catch (error) {
    logger.error('Failed to send simple Tourist ID email:', { error: error.message, email });
    throw error;
  }
};

// 🆕 SMS welcome message (Fallback 2)
const sendWelcomeSMS = async (mobileNumber, fullName, touristId) => {
  try {
    // In production, integrate with SMS service like Twilio
    // For now, we'll simulate and log
    const message = `Welcome ${fullName}! Your Smart Tourist Safety ID: ${touristId}. Save this for app login. Download app: bit.ly/smart-tourist-app Stay Safe! 🛡️`;
    
    logger.info('SMS notification sent (simulated):', { 
      mobile: mobileNumber.replace(/(\d{2}).*(\d{2})/, '$1****$2'),
      touristId,
      message: message.substring(0, 50) + '...'
    });

    // Simulate successful SMS delivery
    return {
      messageId: `SMS_${Date.now()}`,
      status: 'sent',
      recipient: mobileNumber,
      message: message,
      sentAt: new Date(),
      service: 'SMS_SIMULATION'
    };

    /* 
    // PRODUCTION SMS CODE (Uncomment when ready to integrate Twilio)
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: mobileNumber
    });
    
    return result;
    */
  } catch (error) {
    logger.error('Failed to send welcome SMS:', { error: error.message, mobile: mobileNumber });
    throw error;
  }
};

// Send emergency notification (existing)
const sendEmergencyNotification = async ({ type, recipient, message, sosId }) => {
  try {
    let result = null;

    switch (type) {
      case 'EMAIL':
        result = await transporter.sendMail({
          from: `"Smart Tourist Alert" <${process.env.EMAIL_USER}>`,
          to: recipient,
          subject: '🚨 EMERGENCY ALERT - Smart Tourist Safety',
          text: message,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
                <h1>🚨 EMERGENCY ALERT</h1>
              </div>
              <div style="padding: 20px; background: #f9fafb;">
                <p style="font-size: 16px; line-height: 1.6;">${message}</p>
                <div style="background: #fee2e2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <strong>SOS ID:</strong> ${sosId}<br>
                  <strong>Time:</strong> ${new Date().toLocaleString()}<br>
                  <strong>System:</strong> Smart Tourist Safety Monitor
                </div>
                <p style="color: #666; font-size: 12px;">
                  This is an automated emergency notification. Please respond immediately.
                </p>
              </div>
            </div>
          `
        });
        break;

      case 'SMS':
        logger.info('SMS emergency notification simulated:', { recipient, sosId });
        result = { messageId: 'SMS_EMERGENCY_SIMULATED', status: 'sent' };
        break;

      default:
        throw new Error(`Unsupported notification type: ${type}`);
    }

    logger.info('Emergency notification sent:', { 
      type, 
      recipient: recipient.replace(/(.{2}).*(.{2})/, '$1***$2'),
      sosId 
    });

    return result;
  } catch (error) {
    logger.error('Failed to send emergency notification:', { 
      error: error.message, 
      type, 
      recipient: recipient.replace(/(.{2}).*(.{2})/, '$1***$2'),
      sosId 
    });
    throw error;
  }
};

// 🛠️ Verify email configuration
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    logger.info('Email configuration verified successfully');
    return true;
  } catch (error) {
    logger.error('Email configuration verification failed:', { error: error.message });
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendSimpleTouristIdEmail,  // 🆕 NEW
  sendWelcomeSMS,            // 🆕 NEW
  sendEmergencyNotification,
  verifyEmailConfig          // 🆕 NEW
};
