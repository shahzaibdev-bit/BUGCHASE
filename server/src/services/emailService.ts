import nodemailer from 'nodemailer';
import juice from 'juice';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  const mailOptions = {
    from: `"BugChase Security" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

export const otpTemplate = (otp: string) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>BugChase Verification Code</title>
<style>
body { margin: 0; padding: 0; background-color: #000000; }
.wrapper { width: 100%; table-layout: fixed; background-color: #000000; padding-bottom: 40px; }
.container { background-color: #09090b; margin: 0 auto; width: 100%; max-width: 800px; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; }
.header { background-color: #18181b; padding: 20px; text-align: center; border-bottom: 1px solid #27272a; }
.logo { color: #ffffff; font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; }
.content { padding: 40px 20px; text-align: center; font-family: 'Courier New', Courier, monospace; }
.title { font-size: 24px; margin: 0 0 20px; color: #ffffff; }
.text { font-size: 16px; color: #a1a1aa; line-height: 1.5; margin: 0 0 30px; }
.otp-box { background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px; display: inline-block; min-width: 200px; }
.otp { font-size: 36px; letter-spacing: 8px; font-weight: bold; color: #ffffff; margin: 0; }
.footer { padding: 20px; text-align: center; color: #52525b; font-size: 12px; font-family: 'Courier New', Courier, monospace; border-top: 1px solid #27272a; background-color: #09090b; }
@media only screen and (max-width: 800px) {
    .content { padding: 30px 15px; }
    .otp { font-size: 28px; }
}
</style>
</head>
<body>
<div class="wrapper">
    <div style="height: 40px;"></div>
    <div class="container">
      <div class="header">
        <a href="#" class="logo">BugChase Security</a>
      </div>
      <div class="content">
        <h1 class="title">Verify Your Identity</h1>
        <p class="text">Enter the following code to complete your secure login verification.</p>
        <div class="otp-box">
          <div class="otp">${otp}</div>
        </div>
        <p class="text" style="font-size: 14px; margin-bottom: 0;">Code helps verify your account. Valid for 10 minutes.</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} BugChase. All rights reserved.
      </div>
    </div>
</div>
</body>
</html>
  `;
  return juice(html);
};

export const inviteMemberTemplate = (name: string, email: string, username: string, password: string, loginUrl: string, expertise: string[] = []) => {
  const skillsList = expertise.length > 0 ? expertise.map(s => `<span style="background: #27272a; color: #fff; padding: 2px 6px; border-radius: 4px; border: 1px solid #3f3f46; font-size: 10px; margin-right: 4px; text-transform: uppercase;">${s}</span>`).join('') : '<span style="color: #52525b; font-style: italic;">General Support</span>';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>You've been invited to BugChase</title>
<style>
body { margin: 0; padding: 0; background-color: #000000; }
.wrapper { width: 100%; table-layout: fixed; background-color: #000000; padding-bottom: 40px; }
.container { background-color: #09090b; margin: 0 auto; width: 100%; max-width: 800px; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; }
.header { background-color: #18181b; padding: 20px; text-align: center; border-bottom: 1px solid #27272a; }
.logo { color: #ffffff; font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; }
.content { padding: 40px 20px; text-align: center; font-family: 'Courier New', Courier, monospace; }
.title { font-size: 24px; margin: 0 0 20px; color: #ffffff; }
.text { font-size: 16px; color: #a1a1aa; line-height: 1.5; margin: 0 0 30px; }
.box { background-color: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 20px; text-align: left; margin: 0 auto 30px auto; display: block; width: 85%; }
.label { font-size: 12px; color: #71717a; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
.value { font-size: 16px; color: #ffffff; margin-bottom: 15px; font-weight: bold; font-family: monospace; display: block; word-break: break-all; }
.button { display: inline-block; background-color: #ffffff; color: #000000; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; font-family: 'Courier New', Courier, monospace; text-transform: uppercase; }
.footer { padding: 20px; text-align: center; color: #52525b; font-size: 12px; font-family: 'Courier New', Courier, monospace; border-top: 1px solid #27272a; background-color: #09090b; }
@media only screen and (max-width: 800px) {
    .content { padding: 30px 15px; }
    .box { width: 100%; box-sizing: border-box; }
}
</style>
</head>
<body>
<div class="wrapper">
    <div style="height: 40px;"></div>
    <div class="container">
      <div class="header">
        <a href="#" class="logo">BugChase Security</a>
      </div>
      <div class="content">
        <h1 class="title">Triager Access Granted</h1>
        <p class="text">Hello ${name},<br/>You have been authorized as a technical triager for BugChase.</p>
        
        <div class="box">
          <div class="label">Assigned Expertise</div>
          <div class="value" style="margin-bottom: 20px;">
            ${skillsList}
          </div>

          <div class="label">Username</div>
          <div class="value" style="color: #d4d4d8;">${username}</div>

          <div class="label">Email</div>
          <div class="value" style="color: #d4d4d8;">${email}</div>
          
          <div class="label" style="color: #10b981;">Triager Access Credential</div>
          <div class="value" style="font-size: 20px; letter-spacing: 2px;">${password}</div>
        </div>

        <p class="text">These are your credentials for triager login.<br/>Please log in and secure your account immediately.</p>
        <a href="${loginUrl}" class="button">Access Triager Portal</a>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} BugChase. All rights reserved.
      </div>
    </div>
</div>
</body>
</html>
  `;
  return juice(html);
};

export const broadcastTemplate = (message: string) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>BugChase Announcement</title>
<style>
body { margin: 0; padding: 0; background-color: #000000; }
.wrapper { width: 100%; table-layout: fixed; background-color: #000000; padding-bottom: 40px; }
.container { background-color: #09090b; margin: 0 auto; width: 100%; max-width: 800px; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; }
.header { background-color: #18181b; padding: 20px; text-align: center; border-bottom: 1px solid #27272a; }
.logo { color: #ffffff; font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; }
.content { padding: 40px 20px; text-align: left; font-family: 'Courier New', Courier, monospace; }
.title { font-size: 24px; margin: 0 0 20px; color: #ffffff; text-align: center; }
.text { font-size: 16px; color: #a1a1aa; line-height: 1.6; margin: 0 0 30px; }
.footer { padding: 20px; text-align: center; color: #52525b; font-size: 12px; font-family: 'Courier New', Courier, monospace; border-top: 1px solid #27272a; background-color: #09090b; }
@media only screen and (max-width: 800px) {
    .content { padding: 30px 15px; }
}
</style>
</head>
<body>
<div class="wrapper">
    <div style="height: 40px;"></div>
    <div class="container">
      <div class="header">
        <a href="#" class="logo">BugChase Security</a>
      </div>
      <div class="content">
        <h1 class="title">Platform Announcement</h1>
        <div class="text">
          ${message}
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} BugChase. All rights reserved. <br/>
        You received this email because you are a registered user.
      </div>
    </div>
</div>
</body>
</html>
  `;
  return juice(html);
};

export const programSuspendedTemplate = (programName: string, reason: string) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Program Suspended</title>
<style>
body { margin: 0; padding: 0; background-color: #000000; }
.wrapper { width: 100%; table-layout: fixed; background-color: #000000; padding-bottom: 40px; }
.container { background-color: #09090b; margin: 0 auto; width: 100%; max-width: 800px; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; }
.header { background-color: #18181b; padding: 20px; text-align: center; border-bottom: 1px solid #27272a; }
.logo { color: #ffffff; font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; }
.content { padding: 40px 20px; text-align: left; font-family: 'Courier New', Courier, monospace; }
.title { font-size: 24px; margin: 0 0 20px; color: #ef4444; text-align: center; text-transform: uppercase; }
.text { font-size: 16px; color: #a1a1aa; line-height: 1.6; margin: 0 0 30px; }
.reason-box { background-color: #2f1212; border: 1px solid #7f1d1d; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
.label { font-size: 12px; color: #ef4444; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
.value { font-size: 16px; color: #ffffff; font-weight: bold; font-family: monospace; }
.button { display: inline-block; background-color: #27272a; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; border: 1px solid #3f3f46; font-family: 'Courier New', Courier, monospace; text-transform: uppercase; }
.footer { padding: 20px; text-align: center; color: #52525b; font-size: 12px; font-family: 'Courier New', Courier, monospace; border-top: 1px solid #27272a; background-color: #09090b; }
@media only screen and (max-width: 800px) {
    .content { padding: 30px 15px; }
}
</style>
</head>
<body>
<div class="wrapper">
    <div style="height: 40px;"></div>
    <div class="container">
      <div class="header">
        <a href="#" class="logo">BugChase Security</a>
      </div>
      <div class="content">
        <h1 class="title">Program Suspended</h1>
        <p class="text">
          This is a notification that your security program <strong>"${programName}"</strong> has been suspended by the administration.
        </p>
        
        <div class="reason-box">
          <div class="label">Suspension Reason</div>
          <div class="value">${reason}</div>
        </div>

        <p class="text">
          While suspended, no new reports can be submitted to this program. If you believe this is an error or wish to resolve the dispute, please contact support immediately.
        </p>

        <div style="text-align: center;">
          <a href="mailto:support@bugchase.com" class="button">Contact Support</a>
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} BugChase. All rights reserved.
      </div>
    </div>
</div>
</body>
</html>
  `;
  return juice(html);
};

export const userStatusChangedTemplate = (userName: string, status: string, reason: string) => {
  const isBanned = status === 'Banned';
  const color = isBanned ? '#ef4444' : '#eab308';
  const title = isBanned ? 'Account Banned' : 'Account Suspended';
  const message = isBanned 
    ? `Your account has been permanently <strong>BANNED</strong> from the BugChase platform.` 
    : `Your account has been temporarily <strong>SUSPENDED</strong> from the BugChase platform.`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
body { margin: 0; padding: 0; background-color: #000000; }
.wrapper { width: 100%; table-layout: fixed; background-color: #000000; padding-bottom: 40px; }
.container { background-color: #09090b; margin: 0 auto; width: 100%; max-width: 800px; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; }
.header { background-color: #18181b; padding: 20px; text-align: center; border-bottom: 1px solid #27272a; }
.logo { color: #ffffff; font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; }
.content { padding: 40px 20px; text-align: left; font-family: 'Courier New', Courier, monospace; }
.title { font-size: 24px; margin: 0 0 20px; color: ${color}; text-align: center; text-transform: uppercase; }
.text { font-size: 16px; color: #a1a1aa; line-height: 1.6; margin: 0 0 30px; }
.reason-box { background-color: ${isBanned ? '#2f1212' : '#2a2005'}; border: 1px solid ${isBanned ? '#7f1d1d' : '#854d0e'}; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
.label { font-size: 12px; color: ${color}; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
.value { font-size: 16px; color: #ffffff; font-weight: bold; font-family: monospace; }
.button { display: inline-block; background-color: #27272a; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; border: 1px solid #3f3f46; font-family: 'Courier New', Courier, monospace; text-transform: uppercase; }
.footer { padding: 20px; text-align: center; color: #52525b; font-size: 12px; font-family: 'Courier New', Courier, monospace; border-top: 1px solid #27272a; background-color: #09090b; }
@media only screen and (max-width: 800px) {
    .content { padding: 30px 15px; }
}
</style>
</head>
<body>
<div class="wrapper">
    <div style="height: 40px;"></div>
    <div class="container">
      <div class="header">
        <a href="#" class="logo">BugChase Security</a>
      </div>
      <div class="content">
        <h1 class="title">${title}</h1>
        <p class="text">
          Hello ${userName},<br/><br/>
          ${message}
        </p>
        
        <div class="reason-box">
          <div class="label">Action Reason</div>
          <div class="value">${reason}</div>
        </div>

        <p class="text">
          During this period, you will not be able to access your dashboard or perform any actions.
          If you believe this is a mistake, you may contact support for an appeal.
        </p>

        <div style="text-align: center;">
          <a href="mailto:support@bugchase.com" class="button">Contact Support</a>
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} BugChase. All rights reserved.
      </div>
    </div>
</div>
</body>
</html>
  `;
  return juice(html);
};
