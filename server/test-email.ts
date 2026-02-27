import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function testEmail() {
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS set:', !!process.env.EMAIL_PASS);
  
  try {
    const result = await transporter.sendMail({
      from: `"BugChase Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // send to itself as a test
      subject: 'BugChase Email Test',
      html: '<h1>Email test successful!</h1><p>Your email configuration is working correctly.</p>',
    });
    console.log('✅ Email sent successfully!', result.messageId);
  } catch (err) {
    console.error('❌ Email failed:', err);
  }
}

testEmail();
