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

export type EmailActionType = 'comment' | 'status_change' | 'claimed' | 'submitted' | 'promoted';
export type EmailRole = 'researcher' | 'triager' | 'company';

export interface ReportEmailOptions {
  recipientName: string;
  recipientRole: EmailRole;
  actorName: string;
  actorRole: EmailRole;
  actionType: EmailActionType;
  reportTitle: string;
  reportId: string;
  severity?: string;
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
  promoted:  (o) => `You are now a participant on: ${o.reportTitle}`,
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
    return `A security report that was triaged by our team has been forwarded to your program for review. As a company participant, you will now receive updates on this report thread.`;
  }
  if (actionType === 'comment') {
    if (recipientRole === 'researcher') {
      return `${actorName} from our ${actorRole} team has left a new comment on your submission. Please review their message and respond if needed.`;
    }
    if (recipientRole === 'triager') {
      return `The researcher has replied to the report thread. Please review their response at your earliest convenience.`;
    }
    if (recipientRole === 'company') {
      return `There is new activity on a report in your program. A participant has posted a comment in the thread.`;
    }
  }
  if (actionType === 'status_change') {
    if (recipientRole === 'researcher') {
      if (newStatus === 'Resolved') {
        return `Great news! ${actorName} has reviewed and resolved your report.${bounty ? ` You have been awarded a bounty of <strong>$${bounty}</strong> for this finding.` : ''} Thank you for your valuable contribution to improving security.`;
      }
      return `${actorName} has reviewed your report and updated its status. Please review the decision below.`;
    }
    if (recipientRole === 'triager') {
      return `The company has reviewed the report you assessed and has made a decision. This is for your awareness as part of the review trail.`;
    }
  }
  return `There has been an activity update on a report you are associated with.`;
};

export const reportEmailTemplate = (opts: ReportEmailOptions): string => {
  const headline = ACTION_HEADLINES[opts.actionType](opts);
  const intro = getRoleIntro(opts);
  const severityColor = getSeverityColor(opts.severity);
  const statusColor = getStatusColor(opts.newStatus);
  const year = new Date().getFullYear();

  const detailRows = [
    opts.reportId ? `<tr><td class="detail-label">Report ID</td><td class="detail-value" style="font-family: monospace; font-size: 12px;">${opts.reportId}</td></tr>` : '',
    opts.severity ? `<tr><td class="detail-label">Severity</td><td class="detail-value"><span style="background:${severityColor}22; color:${severityColor}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${opts.severity}</span></td></tr>` : '',
    opts.newStatus ? `<tr><td class="detail-label">Status</td><td class="detail-value"><span style="background:${statusColor}22; color:${statusColor}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">${opts.newStatus}</span></td></tr>` : '',
    opts.bounty ? `<tr><td class="detail-label">Bounty Awarded</td><td class="detail-value" style="color: #22c55e; font-weight: bold; font-size: 18px;">$${opts.bounty.toLocaleString()}</td></tr>` : '',
  ].filter(Boolean).join('\n');

  const reasonBlock = opts.reason ? `
    <div class="reason-box">
      <div class="section-label">Reason / Decision Note</div>
      <div class="reason-text">${opts.reason}</div>
    </div>` : '';

  const commentBlock = opts.message ? `
    <div class="comment-box">
      <div class="section-label">Message</div>
      <div class="comment-text">${opts.message.replace(/\n/g, '<br/>')}</div>
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

