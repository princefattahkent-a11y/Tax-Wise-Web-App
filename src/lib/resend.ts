import { Resend } from "resend";
import fs from "fs";
import path from "path";

// Helper to manually load .env / .env.example files to bypass system-level placeholder variables
function loadEnvVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  try {
    const rootPath = process.cwd();
    const envPaths = [
      path.join(rootPath, ".env"),
      path.join(rootPath, ".env.example")
    ];

    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf-8");
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            const index = trimmed.indexOf("=");
            const key = trimmed.substring(0, index).trim();
            let value = trimmed.substring(index + 1).trim();
            // Strip wrapping quotes
            if (
              (value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))
            ) {
              value = value.substring(1, value.length - 1);
            }
            if (key) {
              vars[key] = value;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[Email Service] Error manually parsing env files:", err);
  }
  return vars;
}

const localVars = loadEnvVariables();

// Prefer manually loaded .env values, fallback to process.env
const apiKey = localVars.RESEND_API_KEY || process.env.RESEND_API_KEY;
const isPlaceholderKey = !apiKey || apiKey.includes("placeholder") || apiKey === "your_resend_api_key_here";

// Default "from" address
const DEFAULT_FROM = localVars.EMAIL_FROM || process.env.EMAIL_FROM || "taxwiseplatform@gmail.com";

export const resend = !isPlaceholderKey ? new Resend(apiKey) : null;


interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using Resend, with a graceful console fallback in development.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const from = DEFAULT_FROM;

  console.log(`[Email Service] Attempting to send email:
  - From: ${from}
  - To: ${to}
  - Subject: ${subject}
  `);

  if (!resend) {
    console.warn(`[Email Service] Resend is NOT fully configured (API key is missing or a placeholder).
========================================================================
EMAIL CONTENT PREVIEW (LOGGED FOR DEV/DEBUGGING):
------------------------------------------------------------------------
To: ${to}
Subject: ${subject}
From: ${from}

HTML Body:
${html}
========================================================================`);
    return { success: true, mocked: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[Email Service] Resend API Error:", error);
      throw error;
    }

    console.log("[Email Service] Email sent successfully via Resend. ID:", data?.id);
    return { success: true, id: data?.id };
  } catch (error: unknown) {
    console.error("[Email Service] Failed to send email via Resend:", error);
    // Return success: false but do not crash the caller (graceful failure)
    let errMsg = "Unknown error";
    if (error && typeof error === "object") {
      if ("message" in error) {
        errMsg = String(error.message);
      } else {
        errMsg = JSON.stringify(error);
      }
    } else {
      errMsg = error instanceof Error ? error.message : String(error);
    }
    return { success: false, error: errMsg };
  }
}

// ── Email Styling Helper Constants ──
const EMAIL_STYLES = {
  body: `margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; -webkit-font-smoothing: antialiased;`,
  container: `max-width: 600px; margin: 40px auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);`,
  headerBanner: `background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #6366f1 100%); padding: 40px 20px; text-align: center;`,
  headerLogo: `font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.025em; text-decoration: none; display: inline-block; margin-bottom: 8px;`,
  headerSub: `font-size: 14px; color: #c7d2fe; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;`,
  content: `padding: 40px 30px;`,
  h1: `font-size: 24px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 20px;`,
  p: `font-size: 16px; line-height: 1.6; color: #9ca3af; margin-top: 0; margin-bottom: 24px;`,
  highlightText: `color: #818cf8; font-weight: 600;`,
  card: `background-color: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 24px; margin-bottom: 30px;`,
  cardTitle: `font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid #374151; padding-bottom: 10px;`,
  gridRow: `display: table; width: 100%; margin-bottom: 12px; font-size: 14px;`,
  gridLabel: `display: table-cell; width: 40%; color: #9ca3af; font-weight: 500;`,
  gridValue: `display: table-cell; width: 60%; color: #f3f4f6; font-weight: 600; text-align: right;`,
  btnContainer: `text-align: center; margin: 32px 0;`,
  button: `display: inline-block; background: linear-gradient(90deg, #4f46e5 0%, #6366f1 100%); color: #ffffff; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 9999px; text-decoration: none; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4); transition: transform 0.2s;`,
  divider: `height: 1px; background-color: #1f2937; margin: 30px 0;`,
  footer: `background-color: #0b0f19; padding: 30px; text-align: center; border-top: 1px solid #1f2937;`,
  footerText: `font-size: 13px; line-height: 1.5; color: #6b7280; margin: 0 0 12px 0;`,
  footerLink: `color: #818cf8; text-decoration: none; font-weight: 500;`,
};

/**
 * Generates a premium HTML email template for subscription confirmations.
 */
export function getSubscriptionEmailHtml(
  fullName: string,
  planName: string,
  price: string,
  expiresAt: string
): string {
  const formattedPlan = planName.charAt(0).toUpperCase() + planName.slice(1);
  const formattedDate = new Date(expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to TaxWise Premium</title>
</head>
<body style="${EMAIL_STYLES.body}">
  <div style="${EMAIL_STYLES.container}">
    <!-- Header Banner -->
    <div style="${EMAIL_STYLES.headerBanner}">
      <a href="https://taxwise.cloud" style="${EMAIL_STYLES.headerLogo}">TaxWise</a>
      <div style="${EMAIL_STYLES.headerSub}">Subscription Activated</div>
    </div>

    <!-- Content -->
    <div style="${EMAIL_STYLES.content}">
      <h1 style="${EMAIL_STYLES.h1}">Hello ${fullName || "Taxpayer"},</h1>
      <p style="${EMAIL_STYLES.p}">
        Thank you for upgrading! Your subscription to <span style="${EMAIL_STYLES.highlightText}">TaxWise ${formattedPlan}</span> is now active. You have unlocked unlimited access to the case analyzer, the TAT Case Library, and premium educational modules.
      </p>

      <!-- Details Card -->
      <div style="${EMAIL_STYLES.card}">
        <div style="${EMAIL_STYLES.cardTitle}">Subscription Overview</div>
        <div style="${EMAIL_STYLES.gridRow}">
          <div style="${EMAIL_STYLES.gridLabel}">Plan Tier</div>
          <div style="${EMAIL_STYLES.gridValue}">${formattedPlan}</div>
        </div>
        <div style="${EMAIL_STYLES.gridRow}">
          <div style="${EMAIL_STYLES.gridLabel}">Billing Interval</div>
          <div style="${EMAIL_STYLES.gridValue}">Monthly</div>
        </div>
        <div style="${EMAIL_STYLES.gridRow}">
          <div style="${EMAIL_STYLES.gridLabel}">Amount Paid</div>
          <div style="${EMAIL_STYLES.gridValue}">${price} UGX</div>
        </div>
        <div style="${EMAIL_STYLES.gridRow}">
          <div style="${EMAIL_STYLES.gridLabel}">Renewal Date</div>
          <div style="${EMAIL_STYLES.gridValue}">${formattedDate}</div>
        </div>
      </div>

      <p style="${EMAIL_STYLES.p}">
        You can now upload massive tax filings, run deep analysis on Ugandan rulings, and query our intelligent AI tutor with complex compliance scenarios.
      </p>

      <!-- CTA Button -->
      <div style="${EMAIL_STYLES.btnContainer}">
        <a href="https://taxwise.cloud/dashboard" style="${EMAIL_STYLES.button}">Launch TaxWise Dashboard</a>
      </div>

      <div style="${EMAIL_STYLES.divider}"></div>

      <p style="${EMAIL_STYLES.p}">
        Need help getting started or have questions about your billing? Simply reply to this email or reach out to our billing team at <a href="mailto:support@taxwise.cloud" style="${EMAIL_STYLES.footerLink}">support@taxwise.cloud</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="${EMAIL_STYLES.footer}">
      <p style="${EMAIL_STYLES.footerText}">© ${new Date().getFullYear()} TaxWise Uganda. All rights reserved.</p>
      <p style="${EMAIL_STYLES.footerText}">
        Delivered with passion for modern tax compliance in East Africa.
      </p>
      <p style="${EMAIL_STYLES.footerText}">
        <a href="https://taxwise.cloud/privacy" style="${EMAIL_STYLES.footerLink}">Privacy Policy</a> | 
        <a href="https://taxwise.cloud/terms" style="${EMAIL_STYLES.footerLink}">Terms of Service</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generates a premium HTML email template for account deletion confirmations.
 */
export function getAccountDeletionEmailHtml(fullName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Deleted - TaxWise</title>
</head>
<body style="${EMAIL_STYLES.body}">
  <div style="${EMAIL_STYLES.container}">
    <!-- Header Banner -->
    <div style="${EMAIL_STYLES.headerBanner}">
      <a href="https://taxwise.cloud" style="${EMAIL_STYLES.headerLogo}">TaxWise</a>
      <div style="${EMAIL_STYLES.headerSub}">Account Deactivated</div>
    </div>

    <!-- Content -->
    <div style="${EMAIL_STYLES.content}">
      <h1 style="${EMAIL_STYLES.h1}">Goodbye ${fullName || "User"},</h1>
      <p style="${EMAIL_STYLES.p}">
        This email confirms that your TaxWise account has been successfully deleted. As requested, all of your analyzed tax cases, uploaded documents, compliance history, and personal profile information have been permanently removed from our databases.
      </p>

      <div style="${EMAIL_STYLES.card}">
        <div style="${EMAIL_STYLES.cardTitle}">Deactivation Complete</div>
        <p style="${EMAIL_STYLES.p}; margin-bottom: 0;">
          All recurring subscriptions associated with this account have been canceled, and no further charges will be made.
        </p>
      </div>

      <p style="${EMAIL_STYLES.p}">
        We are sad to see you go! We are always striving to improve the TaxWise platform. If you have a moment, we would highly appreciate any feedback you can share regarding why you decided to leave, so we can make the platform better for other Ugandan tax professionals.
      </p>

      <div style="${EMAIL_STYLES.btnContainer}">
        <a href="https://forms.gle/placeholder" style="${EMAIL_STYLES.button}">Share Your Feedback</a>
      </div>

      <div style="${EMAIL_STYLES.divider}"></div>

      <p style="${EMAIL_STYLES.p}">
        Should you ever need professional AI tax analysis in the future, you are always welcome to sign up again. Thank you for using TaxWise!
      </p>
    </div>

    <!-- Footer -->
    <div style="${EMAIL_STYLES.footer}">
      <p style="${EMAIL_STYLES.footerText}">© ${new Date().getFullYear()} TaxWise Uganda. All rights reserved.</p>
      <p style="${EMAIL_STYLES.footerText}">
        <a href="https://taxwise.cloud" style="${EMAIL_STYLES.footerLink}">TaxWise Platform</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generates an OTP HTML email template for new signups.
 */
export function getSignupOtpEmailHtml(fullName: string, code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - TaxWise</title>
</head>
<body style="${EMAIL_STYLES.body}">
  <div style="${EMAIL_STYLES.container}">
    <!-- Header Banner -->
    <div style="${EMAIL_STYLES.headerBanner}">
      <a href="https://taxwise.cloud" style="${EMAIL_STYLES.headerLogo}">TaxWise</a>
      <div style="${EMAIL_STYLES.headerSub}">Email Verification</div>
    </div>

    <!-- Content -->
    <div style="${EMAIL_STYLES.content}">
      <h1 style="${EMAIL_STYLES.h1}">Welcome to TaxWise, ${fullName || "User"}!</h1>
      <p style="${EMAIL_STYLES.p}">
        Thank you for choosing TaxWise — Uganda's premier AI-powered tax intelligence platform. To complete your registration and activate your account, please verify your email address.
      </p>

      <div style="${EMAIL_STYLES.card}">
        <div style="${EMAIL_STYLES.cardTitle}">Your Verification Code</div>
        <p style="${EMAIL_STYLES.p}">
          Please use the following 5-digit verification code to activate your account:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #818cf8; background-color: #0b0f19; padding: 12px 24px; border-radius: 8px; border: 1px dashed #374151; display: inline-block;">
            ${code}
          </span>
        </div>
        <p style="${EMAIL_STYLES.p}; font-size: 13px; color: #6b7280; text-align: center; margin-bottom: 0;">
          This code will expire in 15 minutes. If you did not request this code, you can safely ignore this email.
        </p>
      </div>

      <div style="${EMAIL_STYLES.divider}"></div>

      <p style="${EMAIL_STYLES.p}">
        Our platform puts an advanced tax law research database, automated tribunal ruling parsers, and a powerful AI analysis engine at your fingertips.
      </p>
    </div>

    <!-- Footer -->
    <div style="${EMAIL_STYLES.footer}">
      <p style="${EMAIL_STYLES.footerText}">© ${new Date().getFullYear()} TaxWise Uganda. All rights reserved.</p>
      <p style="${EMAIL_STYLES.footerText}">
        <a href="https://taxwise.cloud" style="${EMAIL_STYLES.footerLink}">TaxWise Platform</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generates an OTP HTML email template for password resets.
 */
export function getResetOtpEmailHtml(email: string, code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - TaxWise</title>
</head>
<body style="${EMAIL_STYLES.body}">
  <div style="${EMAIL_STYLES.container}">
    <!-- Header Banner -->
    <div style="${EMAIL_STYLES.headerBanner}">
      <a href="https://taxwise.cloud" style="${EMAIL_STYLES.headerLogo}">TaxWise</a>
      <div style="${EMAIL_STYLES.headerSub}">Password Recovery</div>
    </div>

    <!-- Content -->
    <div style="${EMAIL_STYLES.content}">
      <h1 style="${EMAIL_STYLES.h1}">Password Reset Request</h1>
      <p style="${EMAIL_STYLES.p}">
        We received a request to reset the password for your TaxWise account associated with <strong style="color: #ffffff;">${email}</strong>.
      </p>

      <div style="${EMAIL_STYLES.card}">
        <div style="${EMAIL_STYLES.cardTitle}">Your Reset Code</div>
        <p style="${EMAIL_STYLES.p}">
          Please enter the following 5-digit password recovery code on the password reset page:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 4px; color: #f43f5e; background-color: #0b0f19; padding: 12px 24px; border-radius: 8px; border: 1px dashed #374151; display: inline-block;">
            ${code}
          </span>
        </div>
        <p style="${EMAIL_STYLES.p}; font-size: 13px; color: #6b7280; text-align: center; margin-bottom: 0;">
          For security reasons, this code will expire in 15 minutes. If you did not make this request, please secure your account.
        </p>
      </div>

      <div style="${EMAIL_STYLES.divider}"></div>

      <p style="${EMAIL_STYLES.p}">
        If you have any questions or did not authorize this, please contact support immediately at <a href="mailto:support@taxwise.cloud" style="${EMAIL_STYLES.footerLink}">support@taxwise.cloud</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="${EMAIL_STYLES.footer}">
      <p style="${EMAIL_STYLES.footerText}">© ${new Date().getFullYear()} TaxWise Uganda. All rights reserved.</p>
      <p style="${EMAIL_STYLES.footerText}">
        <a href="https://taxwise.cloud" style="${EMAIL_STYLES.footerLink}">TaxWise Platform</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
