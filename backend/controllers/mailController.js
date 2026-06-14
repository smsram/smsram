const nodemailer = require('nodemailer');

exports.sendContactMail = async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const aliasEmail = process.env.EMAIL_ALIAS || process.env.EMAIL_USER;

    // 📡 Outbound Vector 1: Forward data metrics to your personal inbox
    await transporter.sendMail({
      from: `"${name} (via Web Portal)" <${aliasEmail}>`,
      replyTo: email,
      to: aliasEmail,
      subject: `[Ecosystem Signal] ${subject || 'General Contact Handshake'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0d1117; color: #c9d1d9; border: 1px solid #21262d; border-radius: 6px;">
          <h2 style="color: #f57f15; font-family: monospace; border-bottom: 1px solid #21262d; padding-bottom: 10px; margin-top: 0;">INCOMING TRANSMISSION LOAD</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px 0; color: #8b949e; width: 120px;"><b>Initiator Node:</b></td>
              <td style="padding: 6px 0; color: #58a6ff;"><b>${name}</b></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8b949e;"><b>Return Link:</b></td>
              <td style="padding: 6px 0; color: #58a6ff;"><a href="mailto:${email}" style="color: #58a6ff; text-decoration: none;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8b949e;"><b>Subject Line:</b></td>
              <td style="padding: 6px 0; color: #ffffff;">${subject || '---'}</td>
            </tr>
          </table>
          <div style="background-color: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 16px; font-family: monospace; white-space: pre-wrap; line-height: 1.6; color: #e6edf3; font-size: 14px;">${message}</div>
        </div>
      `
    });

    // 📡 Outbound Vector 2: Send confirmation handshake payload back to the sender
    await transporter.sendMail({
      from: `"Meher Siva Ram S." <${aliasEmail}>`,
      to: email,
      subject: `Handshake Confirmed: ${subject || 'Web Portal Transmission'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; color: #24292f; border: 1px solid #d0d7de; border-radius: 6px;">
          <h2 style="color: #03b5ff; margin-top: 0; font-weight: 600;">Transmission Received</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #57606a;">Hello ${name},</p>
          <p style="font-size: 15px; line-height: 1.6; color: #57606a;">This is an automated handshake sequence confirming that your transmission request has been processed and routed into my personal workspace boundaries.</p>
          <p style="font-size: 15px; line-height: 1.6; color: #57606a;">I will analyze your message payload and return a manual response shortly.</p>
          <hr style="border: none; border-top: 1px solid #d0d7de; margin: 24px 0;" />
          <p style="font-size: 14px; line-height: 1.6; color: #57606a; margin-bottom: 0;">
            Best regards,<br />
            <span style="color: #24292f; font-weight: bold;">Meher Siva Ram Sorampudi</span><br />
            <span style="font-size: 12px; color: #8c959f;">Full-Stack Developer & Aspiring ML Engineer</span>
          </p>
        </div>
      `
    });

    return res.json({ success: true, message: "Mailing handshake committed successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Mailing subsystem transactional failure." });
  }
};