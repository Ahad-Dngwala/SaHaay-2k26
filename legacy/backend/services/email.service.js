const nodemailer = require("nodemailer");
const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM } = require("../config/env");

let transporter = null;

/**
 * Initialize email transporter
 */
const initTransporter = () => {
  if (transporter) {
    return transporter;
  }

  // Check if email configuration exists
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASSWORD) {
    console.warn("⚠️  Email configuration not found. Email service will use console fallback.");
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT || 587,
      secure: EMAIL_PORT === 465, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });

    console.log("✅ Email transporter initialized");
    return transporter;
  } catch (error) {
    console.error("❌ Email transporter initialization error:", error);
    return null;
  }
};

/**
 * Send email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email text content
 * @param {string} html - Email HTML content (optional)
 * @returns {Promise<Object>} Email send result
 */
exports.sendEmail = async (to, subject, text, html = null) => {
  try {
    const emailTransporter = initTransporter();

    // If no email configuration, log to console (for development)
    if (!emailTransporter) {
      console.log("\n" + "=".repeat(60));
      console.log("📧 EMAIL (Console Fallback)");
      console.log("=".repeat(60));
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log("-".repeat(60));
      console.log(text);
      console.log("=".repeat(60) + "\n");

      return {
        success: true,
        provider: "console",
        messageId: `console-${Date.now()}`,
        message: "Email logged to console (no email service configured)",
      };
    }

    const mailOptions = {
      from: EMAIL_FROM || EMAIL_USER,
      to,
      subject,
      text,
      ...(html && { html }),
    };

    const info = await emailTransporter.sendMail(mailOptions);

    console.log(`✅ Email sent to ${to}. Message ID: ${info.messageId}`);

    return {
      success: true,
      provider: "smtp",
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error("❌ Send email error:", error);
    return {
      success: false,
      message: "Failed to send email",
      error: error.message,
    };
  }
};

/**
 * Send HTML email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise<Object>} Email send result
 */
exports.sendHTMLEmail = async (to, subject, html) => {
  // Convert HTML to plain text for text version
  const text = html.replace(/<[^>]*>/g, "").trim();
  return await exports.sendEmail(to, subject, text, html);
};

module.exports = exports;
