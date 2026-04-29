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

export const cardDeletionOtpTemplate = (otp: string) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>BugChase - Payment Method Removal</title>
<style>
body { margin: 0; padding: 0; background-color: #000000; }
.wrapper { width: 100%; table-layout: fixed; background-color: #000000; padding-bottom: 40px; }
.container { background-color: #09090b; margin: 0 auto; width: 100%; max-width: 800px; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; }
.header { background-color: #18181b; padding: 20px; text-align: center; border-bottom: 1px solid #27272a; }
.logo { color: #ffffff; font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; }
.content { padding: 40px 20px; text-align: center; font-family: 'Courier New', Courier, monospace; }
.title { font-size: 24px; margin: 0 0 20px; color: #ffffff; }
.text { font-size: 16px; color: #a1a1aa; line-height: 1.5; margin: 0 0 30px; }
.otp-box { background-color: #18181b; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px; display: inline-block; min-width: 200px; }
.otp { font-size: 36px; letter-spacing: 8px; font-weight: bold; color: #ef4444; margin: 0; }
.warning { background-color: #1a0000; border: 1px solid #7f1d1d; border-radius: 8px; padding: 16px; margin-bottom: 24px; color: #fca5a5; font-size: 13px; line-height: 1.5; }
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
        <h1 class="title">Payment Method Removal</h1>
        <p class="text">You have requested to remove a linked payment method from your BugChase account. Use the code below to confirm this action.</p>
        <div class="otp-box">
          <div class="otp">${otp}</div>
        </div>
        <div class="warning">
          ⚠️ If you did not request this, please ignore this email and contact our support team immediately. This code is valid for 10 minutes.
        </div>
        <p class="text" style="font-size: 13px; margin-bottom: 0;">This is a sensitive action. Once the card is removed, it cannot be undone.</p>
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

const escapeEmailText = (s: string) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const programBannedTemplate = (programName: string, reason: string, expiryNote: string) => {
  const safeReason = escapeEmailText(reason);
  const safeExpiry = escapeEmailText(expiryNote);
  const safeName = escapeEmailText(programName);
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Program Banned</title>
<style>
body { margin: 0; padding: 0; background-color: #000000; }
.wrapper { width: 100%; table-layout: fixed; background-color: #000000; padding-bottom: 40px; }
.container { background-color: #09090b; margin: 0 auto; width: 100%; max-width: 800px; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; }
.header { background-color: #18181b; padding: 20px; text-align: center; border-bottom: 1px solid #27272a; }
.logo { color: #ffffff; font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; }
.content { padding: 40px 20px; text-align: left; font-family: 'Courier New', Courier, monospace; }
.title { font-size: 24px; margin: 0 0 20px; color: #dc2626; text-align: center; text-transform: uppercase; }
.text { font-size: 16px; color: #a1a1aa; line-height: 1.6; margin: 0 0 30px; }
.reason-box { background-color: #2f1212; border: 1px solid #7f1d1d; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
.label { font-size: 12px; color: #ef4444; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
.value { font-size: 16px; color: #ffffff; font-weight: bold; font-family: monospace; white-space: pre-wrap; }
.expiry { font-size: 14px; color: #fbbf24; margin-top: 16px; padding: 12px; background: #1c1917; border-radius: 6px; border: 1px solid #44403c; }
.footer { padding: 20px; text-align: center; color: #52525b; font-size: 12px; font-family: 'Courier New', Courier, monospace; border-top: 1px solid #27272a; background-color: #09090b; }
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
        <h1 class="title">Program Banned</h1>
        <p class="text">
          Your program <strong>"${safeName}"</strong> has been banned by the administration.
        </p>
        <div class="reason-box">
          <div class="label">Reason</div>
          <div class="value">${safeReason}</div>
        </div>
        <p class="expiry">${safeExpiry}</p>
        <p class="text">
          While banned, the program cannot accept submissions. If you believe this is an error, contact support.
        </p>
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

const escapeHtml = (value: string) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const userStatusChangedTemplate = (userName: string, status: string, reason?: string) => {
  const normalized = String(status || '').toLowerCase();
  const isBanned = normalized === 'banned';
  const isSuspended = normalized === 'suspended';
  const isActive = normalized === 'active';
  const color = isBanned ? '#ef4444' : isSuspended ? '#eab308' : '#22c55e';
  const title = isBanned ? 'Account Banned' : isSuspended ? 'Account Suspended' : 'Account Activated';
  const message = isBanned
    ? `Your account has been set to <strong>BANNED</strong> on the BugChase platform.`
    : isSuspended
      ? `Your account has been set to <strong>SUSPENDED</strong> on the BugChase platform.`
      : `Your account has been <strong>ACTIVATED</strong> and access has been restored.`;
  const safeReason = escapeHtml(reason || (isActive ? 'Your account is now active and fully operational.' : 'Administrative policy enforcement.'));

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
.reason-box { background-color: ${isBanned ? '#2f1212' : isSuspended ? '#2a2005' : '#0f2415'}; border: 1px solid ${isBanned ? '#7f1d1d' : isSuspended ? '#854d0e' : '#166534'}; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
.label { font-size: 12px; color: ${color}; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
.value { font-size: 15px; color: #ffffff; font-weight: bold; font-family: monospace; white-space: pre-wrap; }
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
          Hello ${escapeHtml(userName)},<br/><br/>
          ${message}
        </p>
        
        <div class="reason-box">
          <div class="label">Action Reason</div>
          <div class="value">${safeReason}</div>
        </div>

        <p class="text">
          ${isActive
            ? 'You can now sign in and continue normal activity. Please maintain compliance with BugChase policy requirements.'
            : 'During this period, your account actions may be restricted. If you believe this decision is incorrect, you may contact support for review.'}
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

export const adminDirectMessageTemplate = (userName: string, subject: string, message: string) => {
  const safeName = escapeHtml(userName);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${safeSubject}</title>
<style>
body { margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', Courier, monospace; }
.wrapper { width: 100%; table-layout: fixed; background-color: #000000; padding: 40px 0; }
.container { background-color: #09090b; margin: 0 auto; width: 100%; max-width: 620px; border: 1px solid #27272a; border-radius: 10px; overflow: hidden; }
.header { background-color: #09090b; padding: 24px 32px; border-bottom: 1px solid #27272a; }
.logo { color: #ffffff; font-weight: bold; font-size: 18px; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; }
.hero { background: linear-gradient(135deg, #18181b 0%, #09090b 100%); padding: 40px 32px; border-bottom: 1px solid #27272a; }
.hero-label { font-size: 11px; color: #a1a1aa; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
.hero-title { font-size: 22px; font-weight: bold; color: #ffffff; line-height: 1.4; margin: 0; }
.content { padding: 32px; }
.greeting { font-size: 14px; color: #a1a1aa; line-height: 1.7; margin-bottom: 20px; }
.greeting strong { color: #ffffff; }
.message-box { background: #18181b; border: 1px solid #27272a; border-left: 3px solid #ffffff; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; }
.message-text { font-size: 14px; color: #d4d4d8; line-height: 1.7; white-space: pre-wrap; }
.footer { padding: 24px 32px; text-align: center; color: #52525b; font-size: 11px; border-top: 1px solid #27272a; background: #09090b; line-height: 1.7; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="header"><a href="#" class="logo">BugChase Security</a></div>
    <div class="hero">
      <div class="hero-label">Admin Message</div>
      <h1 class="hero-title">${safeSubject}</h1>
    </div>
    <div class="content">
      <p class="greeting">Hello <strong>${safeName}</strong>,</p>
      <div class="message-box"><div class="message-text">${safeMessage}</div></div>
      <p class="greeting">Regards,<br/>BugChase Admin Team</p>
    </div>
    <div class="footer">&copy; ${new Date().getFullYear()} BugChase Security Platform. All rights reserved.</div>
  </div>
</div>
</body>
</html>
  `;
  return juice(html);
};

export type EmailActionType = 'comment' | 'status_change' | 'claimed' | 'submitted' | 'promoted' | 'bounty_awarded';
export type EmailRole = 'researcher' | 'triager' | 'company' | 'admin';

export interface ReportEmailOptions {
  recipientName: string;
  recipientRole: EmailRole;
  actorName: string;
  actorRole: EmailRole;
  actionType: EmailActionType;
  reportTitle: string;
  reportId: string;
  severity?: string;
  vulnerabilityCategory?: string;
  cvssScore?: number;
  oldStatus?: string;
  newStatus?: string;
  reason?: string;
  message?: string; // Comment content
  bounty?: number;
  link: string;
}

const ACTION_HEADLINES: Record<EmailActionType, (opts: ReportEmailOptions) => string> = {
  submitted: (o) => `New Report Submitted: ${o.reportTitle}`,
  claimed:   (o) => `${o.actorName} has started reviewing your report`,
  comment:   (o) => `New comment on: ${o.reportTitle}`,
  status_change: (o) => `Report status changed to ${o.newStatus}`,
  promoted:  (o) => o.recipientRole === 'researcher'
    ? `Your Report Has Been Accepted: ${o.reportTitle}`
    : `New Security Report Assigned to Your Program: ${o.reportTitle}`,
  bounty_awarded: (o) => `Bounty Awarded: PKR ${o.bounty?.toLocaleString()}`,
};

const getSeverityColor = (severity?: string) => {
  if (!severity) return '#71717a';
  const s = severity.toLowerCase();
  if (s === 'critical') return '#a855f7';
  if (s === 'high') return '#ef4444';
  if (s === 'medium') return '#f97316';
  if (s === 'low') return '#eab308';
  return '#71717a';
};

const getStatusColor = (status?: string) => {
  if (!status) return '#71717a';
  const s = status.toLowerCase();
  if (s === 'resolved') return '#22c55e';
  if (s === 'triaged') return '#3b82f6';
  if (s.includes('pending')) return '#f97316';
  if (['spam','duplicate','na','out-of-scope','closed'].includes(s)) return '#ef4444';
  return '#a1a1aa';
};

const getRoleIntro = (opts: ReportEmailOptions): string => {
  const { recipientRole, actorRole, actionType, actorName, newStatus, bounty } = opts;

  if (actionType === 'submitted') {
    return `Thank you for your submission. We have received your report and it is now in our review queue. Our security team will assess it and get back to you with an update.`;
  }
  if (actionType === 'claimed') {
    if (recipientRole === 'researcher') {
      return `Great news! A member of our triage team has picked up your submission and has begun the review process. You will be notified as there are updates to your report.`;
    }
  }
  if (actionType === 'promoted') {
    if (recipientRole === 'researcher') {
      return `Great news! Your vulnerability report has been reviewed and validated by our security triage team. It has been <strong>accepted and forwarded</strong> to the affected company's security program. You will receive further updates as the company reviews and addresses the issue.`;
    }
    // Company recipient
    return `A security report submitted through your bug bounty program has been reviewed and validated by our triage team. It has been <strong>officially assigned to your program</strong>. Please review the report thread and take appropriate action to remediate the described vulnerability.`;
  }
  if (actionType === 'comment') {
    const actorLabel = actorRole === 'researcher' ? 'Security Researcher'
      : actorRole === 'triager' ? 'Triage Team'
      : actorRole === 'company' ? 'Security Program' : 'Participant';

    if (recipientRole === 'researcher') {
      return `<strong>${actorName}</strong> (${actorLabel}) has left a new comment on your submission. Please review their message and respond if needed.`;
    }
    if (recipientRole === 'triager') {
      if (actorRole === 'researcher') {
        return `The security researcher has replied to the report thread. Please review their response at your earliest convenience.`;
      }
      if (actorRole === 'company') {
        return `<strong>${actorName}</strong> (Security Program) has posted a new comment on the report thread. Please review their message and follow up as needed.`;
      }
      return `A new comment has been posted on the report thread. Please review it at your earliest convenience.`;
    }
    if (recipientRole === 'company') {
      if (actorRole === 'researcher') {
        return `The security researcher has replied to the report thread in your program. Please review their message.`;
      }
      return `There is new activity on a report in your security program. <strong>${actorName}</strong> has posted a comment in the report thread.`;
    }
  }
  if (actionType === 'status_change') {
    if (recipientRole === 'researcher') {
      if (newStatus === 'Resolved') {
        return `Great news! ${actorName} has reviewed and resolved your report. Thank you for your valuable contribution to improving security.`;
      }
      return `${actorName} has reviewed your report and updated its status. Please review the decision below.`;
    }
    if (recipientRole === 'triager') {
      return `The company has reviewed the report you assessed and has made a decision. This is for your awareness as part of the review trail.`;
    }
  }
  if (actionType === 'bounty_awarded') {
    if (recipientRole === 'researcher') {
      return `Congratulations! ${actorName} has rewarded you with a bounty of <strong>PKR ${bounty?.toLocaleString()}</strong> for your finding. The funds have been credited to your wallet.`;
    }
  }
  return `There has been an activity update on a report you are associated with.`;
};

/** Convert a subset of markdown to HTML suitable for email */
const mdToHtml = (text: string): string => {
  return text
    // Escape raw HTML entities first to avoid XSS from free-text
    .replace(/&(?![a-z#0-9]+;)/gi, '&amp;')
    // Bold/italic combinations
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:#27272a;color:#e4e4e7;padding:2px 5px;border-radius:3px;font-family:monospace;font-size:12px;">$1</code>')
    // Numbered list items (1. 2. etc)
    .replace(/^\d+\.\s+(.+)$/gm, '<li style="margin-bottom:6px;">$1</li>')
    // Bullet list items (* or -)
    .replace(/^[*\-]\s+(.+)$/gm, '<li style="margin-bottom:6px;">$1</li>')
    // Wrap consecutive <li> groups in <ul>
    .replace(/(<li[^>]*>.*<\/li>\n?)+/gs, (match) => `<ul style="margin:10px 0;padding-left:20px;color:#fca5a5;">${match}</ul>`)
    // Line breaks — double newlines become paragraph breaks
    .replace(/\n\n+/g, '</p><p style="margin:8px 0;">')
    // Single newlines
    .replace(/\n/g, '<br/>');
};

export const reportEmailTemplate = (opts: ReportEmailOptions): string => {
  const headline = ACTION_HEADLINES[opts.actionType](opts);
  const intro = getRoleIntro(opts);
  const severityColor = getSeverityColor(opts.severity);
  const statusColor = getStatusColor(opts.newStatus);
  const year = new Date().getFullYear();

  const detailRows = [
    opts.reportId ? `<tr><td class="detail-label">Report ID</td><td class="detail-value" style="font-family: monospace; font-size: 12px;">${opts.reportId}</td></tr>` : '',
    opts.vulnerabilityCategory ? `<tr><td class="detail-label">Vulnerability Type</td><td class="detail-value">${opts.vulnerabilityCategory}</td></tr>` : '',
    opts.severity ? `<tr><td class="detail-label">Severity</td><td class="detail-value"><span style="background:${severityColor}22; color:${severityColor}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${opts.severity}</span></td></tr>` : '',
    opts.cvssScore !== undefined ? `<tr><td class="detail-label">CVSS Score</td><td class="detail-value" style="font-weight: bold;">${opts.cvssScore.toFixed(1)}</td></tr>` : '',
    opts.newStatus ? `<tr><td class="detail-label">Status</td><td class="detail-value"><span style="background:${statusColor}22; color:${statusColor}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${opts.newStatus}</span></td></tr>` : '',
    opts.bounty ? `<tr><td class="detail-label">Bounty Awarded</td><td class="detail-value" style="color: #22c55e; font-weight: bold; font-size: 18px;">PKR ${opts.bounty.toLocaleString()}</td></tr>` : '',
  ].filter(Boolean).join('\n');

  // Convert markdown in reason/message to HTML before embedding
  const reasonHtml = opts.reason ? mdToHtml(opts.reason) : '';
  const messageHtml = opts.message ? mdToHtml(opts.message) : '';

  const reasonBlock = opts.reason ? `
    <div class="reason-box">
      <div class="section-label">Triage Note</div>
      <div class="reason-text"><p style="margin:8px 0;">${reasonHtml}</p></div>
    </div>` : '';

  const commentBlock = opts.message ? `
    <div class="comment-box">
      <div class="section-label">Message</div>
      <div class="comment-text"><p style="margin:8px 0;">${messageHtml}</p></div>
    </div>` : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${headline}</title>
<style>
body { margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', Courier, monospace; }
.wrapper { width: 100%; table-layout: fixed; background-color: #000000; padding: 40px 0; }
.container { background-color: #09090b; margin: 0 auto; width: 100%; max-width: 620px; border: 1px solid #27272a; border-radius: 10px; overflow: hidden; }
.header { background-color: #09090b; padding: 24px 32px; border-bottom: 1px solid #27272a; }
.logo { color: #ffffff; font-weight: bold; font-size: 18px; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; }
.logo-dot { color: #71717a; }
.hero { background: linear-gradient(135deg, #18181b 0%, #09090b 100%); padding: 40px 32px; border-bottom: 1px solid #27272a; }
.hero-label { font-size: 11px; color: #71717a; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
.hero-title { font-size: 22px; font-weight: bold; color: #ffffff; line-height: 1.4; margin: 0; }
.hero-title .highlight { color: #ffffff; border-bottom: 2px solid #3f3f46; }
.content { padding: 32px; }
.greeting { font-size: 14px; color: #a1a1aa; line-height: 1.7; margin-bottom: 28px; }
.greeting strong { color: #ffffff; }
.details-table { width: 100%; border-collapse: collapse; background: #18181b; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
.detail-label { padding: 12px 16px; font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px; width: 40%; border-bottom: 1px solid #27272a; }
.detail-value { padding: 12px 16px; font-size: 13px; color: #e4e4e7; font-weight: 600; border-bottom: 1px solid #27272a; }
.reason-box { background: #1c1214; border: 1px solid #3f1f27; border-left: 3px solid #ef4444; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; }
.reason-text { font-size: 14px; color: #fca5a5; line-height: 1.6; margin-top: 8px; }
.comment-box { background: #18181b; border: 1px solid #27272a; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; }
.comment-text { font-size: 14px; color: #d4d4d8; line-height: 1.7; margin-top: 8px; white-space: pre-wrap; }
.section-label { font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold; }
.cta-wrap { text-align: center; margin: 32px 0 8px; }
.cta-btn { display: inline-block; background: #ffffff; color: #000000; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; }
.footer { padding: 24px 32px; text-align: center; color: #52525b; font-size: 11px; border-top: 1px solid #27272a; background: #09090b; line-height: 1.7; }
.footer a { color: #71717a; text-decoration: none; }
@media (max-width: 640px) { .hero { padding: 28px 20px; } .content { padding: 24px 20px; } .hero-title { font-size: 18px; } }
</style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="header">
      <a href="#" class="logo">BugChase<span class="logo-dot">.</span>Security</a>
    </div>

    <div class="hero">
      <div class="hero-label">Report Activity</div>
      <h1 class="hero-title">${headline}</h1>
    </div>

    <div class="content">
      <p class="greeting">
        Hi <strong>${opts.recipientName}</strong>,<br/><br/>
        ${intro}
      </p>

      ${detailRows ? `<table class="details-table">${detailRows}</table>` : ''}
      ${reasonBlock}
      ${commentBlock}

      <div class="cta-wrap">
        <a href="${opts.link}" class="cta-btn">View Report Thread &rarr;</a>
      </div>
    </div>

    <div class="footer">
      &copy; ${year} BugChase Security Platform. All rights reserved.<br/>
      You are receiving this email because you are a participant in this report thread.<br/>
      <a href="#">Manage Notifications</a>
    </div>
  </div>
</div>
</body>
</html>
`;
  return juice(html);
};

// Keep backward-compat alias for any old call sites still using the old signature
export const threadNotificationTemplate = (
  recipientName: string, senderName: string, actionType: string,
  reportTitle: string, content: string, link: string
) => reportEmailTemplate({
  recipientName,
  recipientRole: 'researcher',
  actorName: senderName,
  actorRole: 'triager',
  actionType: 'comment',
  reportTitle,
  reportId: '',
  message: content,
  link
});

export const walletTopUpTemplate = (companyName: string, amount: number, newBalance: number) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Wallet Top-Up Successful</title>
<style>
body { margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', Courier, monospace; }
.wrapper { width: 100%; table-layout: fixed; background-color: #000000; padding: 40px 0; }
.container { background-color: #09090b; margin: 0 auto; width: 100%; max-width: 620px; border: 1px solid #27272a; border-radius: 10px; overflow: hidden; }
.header { background-color: #09090b; padding: 24px 32px; border-bottom: 1px solid #27272a; }
.logo { color: #ffffff; font-weight: bold; font-size: 18px; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; }
.logo-dot { color: #71717a; }
.hero { background: linear-gradient(135deg, #18181b 0%, #09090b 100%); padding: 40px 32px; border-bottom: 1px solid #27272a; }
.hero-label { font-size: 11px; color: #22c55e; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; font-weight: bold; }
.hero-title { font-size: 22px; font-weight: bold; color: #ffffff; line-height: 1.4; margin: 0; }
.content { padding: 32px; }
.greeting { font-size: 14px; color: #a1a1aa; line-height: 1.7; margin-bottom: 28px; }
.greeting strong { color: #ffffff; }
.details-table { width: 100%; border-collapse: collapse; background: #18181b; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
.detail-label { padding: 12px 16px; font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 1px; width: 40%; border-bottom: 1px solid #27272a; }
.detail-value { padding: 12px 16px; font-size: 14px; color: #e4e4e7; font-weight: 600; border-bottom: 1px solid #27272a; font-family: monospace; }
.footer { padding: 24px 32px; text-align: center; color: #52525b; font-size: 11px; border-top: 1px solid #27272a; background: #09090b; line-height: 1.7; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="header">
      <a href="#" class="logo">BugChase<span class="logo-dot">.</span>Security</a>
    </div>

    <div class="hero">
      <div class="hero-label">Transaction Success</div>
      <h1 class="hero-title">Wallet Top-Up Confirmed</h1>
    </div>

    <div class="content">
      <p class="greeting">
        Hi <strong>${companyName}</strong>,<br/><br/>
        We successfully processed your payment. Your BugChase escrow wallet has been credited and is ready to be used for bounty payouts.
      </p>

      <table class="details-table">
        <tr>
          <td class="detail-label">Amount Added</td>
          <td class="detail-value" style="color: #22c55e;">+ PKR ${amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td class="detail-label">New Wallet Balance</td>
          <td class="detail-value">PKR ${newBalance.toLocaleString()}</td>
        </tr>
        <tr>
          <td class="detail-label">Date</td>
          <td class="detail-value">${new Date().toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} BugChase Security Platform. All rights reserved.<br/>
      This is an automated notification regarding your account balance.
    </div>
  </div>
</div>
</body>
</html>
  `;
  return juice(html);
};

export const payoutSuccessTemplate = (name: string, pkrAmount: number, newBalance: number, methodDesc: string) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Withdrawal Successful</title>
<style>
body { margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', Courier, monospace; }
.wrapper { width: 100%; background-color: #000000; padding: 40px 0; }
.container { background-color: #09090b; margin: 0 auto; width: 100%; max-width: 600px; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; }
.header { background-color: #18181b; padding: 20px; text-align: center; border-bottom: 1px solid #27272a; }
.logo { color: #10b981; font-weight: bold; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; text-decoration: none; }
.content { padding: 40px 30px; text-align: left; }
.title { font-size: 20px; color: #ffffff; margin-top: 0; margin-bottom: 20px; text-align: center; }
.message { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 30px; }
.highlight { color: #ffffff; font-weight: bold; }
.details-box { background-color: #18181b; border: 1px dashed #3f3f46; border-radius: 6px; padding: 20px; margin-bottom: 30px; }
.detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
.detail-label { color: #71717a; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; }
.detail-value { color: #ffffff; font-weight: bold; }
.footer { padding: 20px; text-align: center; color: #52525b; font-size: 12px; border-top: 1px solid #27272a; background-color: #09090b; }
table { width: 100%; border-collapse: collapse; }
td { padding: 8px 0; }
.text-right { text-align: right; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="header">
      <a href="#" class="logo">BugChase Ledger</a>
    </div>
    
    <div class="content">
      <h1 class="title">Withdrawal Processed</h1>
      
      <p class="message">
        Hello <span class="highlight">${name}</span>,<br><br>
        Your withdrawal request has been successfully processed. The funds have been transferred to your connected payout method.
      </p>

      <div class="details-box">
        <table>
          <tr>
            <td class="detail-label">Amount Withdrawn</td>
            <td class="detail-value text-right" style="color: #10b981;">PKR ${pkrAmount.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="detail-label">Destination</td>
            <td class="detail-value text-right">${methodDesc}</td>
          </tr>
          <tr>
            <td class="detail-label" style="padding-top: 15px; border-top: 1px dashed #3f3f46;">Remaining Balance</td>
            <td class="detail-value text-right" style="padding-top: 15px; border-top: 1px dashed #3f3f46;">PKR ${newBalance.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="detail-label">Transaction Time</td>
            <td class="detail-value text-right" style="font-size: 12px; font-weight: normal;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <p class="message" style="font-size: 12px; text-align: center;">
        Transfers typically take 1-3 business days to reflect in your account depending on your financial institution.
      </p>
    </div>

    <div class="footer">
      &copy; ${new Date().getFullYear()} BugChase Security Platform. All rights reserved.<br/>
      This is an automated notification regarding your account balance.
    </div>
  </div>
</div>
</body>
</html>
  `;
  return juice(html);
};

export const adminProfileUpdateTemplate = (
  userName: string,
  section: string,
  changes: Array<{ field: string; before: string; after: string }>
) => {
  const rows = changes
    .map(
      (c) => `
      <tr>
        <td class="detail-label">${c.field}</td>
        <td class="detail-value">${c.before || '-'}</td>
        <td class="detail-value">${c.after || '-'}</td>
      </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Admin Profile Update</title>
<style>
body { margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', Courier, monospace; }
.wrapper { width: 100%; table-layout: fixed; background-color: #000000; padding: 40px 0; }
.container { background-color: #09090b; margin: 0 auto; width: 100%; max-width: 700px; border: 1px solid #27272a; border-radius: 10px; overflow: hidden; }
.header { background-color: #18181b; padding: 20px; border-bottom: 1px solid #27272a; text-align: center; }
.logo { color: #ffffff; font-weight: bold; font-size: 20px; letter-spacing: 1px; text-transform: uppercase; }
.content { padding: 28px 22px; color: #d4d4d8; }
.title { color: #ffffff; font-size: 22px; margin: 0 0 10px; }
.sub { color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0 0 18px; }
.badge { display: inline-block; padding: 6px 10px; border: 1px solid #3f3f46; border-radius: 999px; font-size: 12px; color: #f4f4f5; margin-bottom: 14px; }
.details-table { width: 100%; border-collapse: collapse; background: #18181b; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; }
.detail-label { padding: 10px 12px; font-size: 11px; color: #a1a1aa; text-transform: uppercase; border-bottom: 1px solid #27272a; width: 28%; }
.detail-value { padding: 10px 12px; font-size: 12px; color: #ffffff; border-bottom: 1px solid #27272a; width: 36%; }
.footer { padding: 20px; text-align: center; color: #52525b; font-size: 12px; border-top: 1px solid #27272a; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="header">
      <div class="logo">BugChase Security</div>
    </div>
    <div class="content">
      <h1 class="title">Profile Update Notice</h1>
      <p class="sub">Hello ${userName}, an administrator updated your account details.</p>
      <div class="badge">Section: ${section}</div>
      <table class="details-table">
        <tr>
          <td class="detail-label">Field</td>
          <td class="detail-label">Previous</td>
          <td class="detail-label">Updated</td>
        </tr>
        ${rows}
      </table>
      <p class="sub" style="margin-top:18px;">If you did not expect this change, contact support immediately.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} BugChase Security Platform. All rights reserved.
    </div>
  </div>
</div>
</body>
</html>`;

  return juice(html);
};
