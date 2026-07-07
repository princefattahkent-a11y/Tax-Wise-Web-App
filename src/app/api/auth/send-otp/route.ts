import { NextRequest, NextResponse } from "next/server";
import { sendEmail, getSignupOtpEmailHtml, getResetOtpEmailHtml } from "@/lib/resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const type = typeof body.type === "string" ? body.type : "signup";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Generate a 5-digit numeric code
    const chars = "0123456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    let subject = "";
    let html = "";

    if (type === "signup") {
      subject = "Verify Your Email - TaxWise Uganda";
      html = getSignupOtpEmailHtml(fullName, code);
    } else {
      subject = "Reset Your Password - TaxWise Uganda";
      html = getResetOtpEmailHtml(email, code);
    }

    console.log(`[Send OTP API] Sending ${type} OTP to ${email}. Code: ${code}`);

    const emailResult = await sendEmail({
      to: email,
      subject,
      html,
    });

    return NextResponse.json({
      success: true,
      code,
      mocked: !!emailResult.mocked || !emailResult.success,
      warning: emailResult.success ? null : emailResult.error,
      message: emailResult.success
        ? `Verification email sent successfully to ${email}.`
        : `Email delivery failed (${emailResult.error}). Please use verification code ${code} for development.`,
    });
  } catch (error: unknown) {
    console.error("[Send OTP API] Error sending OTP:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed to send verification email."
    }, { status: 500 });
  }
}
