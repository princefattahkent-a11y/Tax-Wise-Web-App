import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, getSubscriptionEmailHtml } from "@/lib/resend";

const isProduction = process.env.PESAPAL_ENV === "production";
const PESAPAL_BASE_URL = isProduction
  ? "https://pay.pesapal.com/v3/api"
  : "https://cybqa.pesapal.com/pesapalv3/api";

// Helper to get Supabase Admin client dynamically at request time
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase URL or Service Role Key is missing from environment variables.");
  }
  return createClient(url, serviceKey);
}

// Authenticate with PesaPal and get Bearer Token
async function getPesapalToken(): Promise<string> {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY || "";
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET || "";

  if (!consumerKey || !consumerSecret) {
    throw new Error("PesaPal Consumer Key or Consumer Secret is missing.");
  }

  const response = await fetch(`${PESAPAL_BASE_URL}/Auth/RequestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.token) {
    throw new Error(`Failed to authenticate with PesaPal: ${data.message || response.statusText}`);
  }

  return data.token;
}

export async function POST(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    let orderTrackingId = searchParams.get("OrderTrackingId") || searchParams.get("ordertrackingid");
    let merchantReference = searchParams.get("OrderMerchantReference") || searchParams.get("ordermerchantreference");
    let notificationType = searchParams.get("OrderNotificationType") || searchParams.get("ordernotificationtype");

    interface PesaPalStatusResponse {
      payment_status_description?: string;
      status?: string;
      merchant_reference?: string;
      amount?: number;
      payment_method?: string;
    }

    // Check request body in case parameters are sent in a POST JSON body
    try {
      const body = await req.json();
      if (body) {
        orderTrackingId = orderTrackingId || body.OrderTrackingId || body.orderTrackingId;
        merchantReference = merchantReference || body.OrderMerchantReference || body.orderMerchantReference;
        notificationType = notificationType || body.OrderNotificationType || body.orderNotificationType;
      }
    } catch {
      // Body may not be parsed as JSON or might be empty, which is normal for standard Webhook pings
    }

    if (!orderTrackingId) {
      console.error("PesaPal Webhook: Missing orderTrackingId.");
      return NextResponse.json({ error: "Missing orderTrackingId parameter" }, { status: 400 });
    }

    const consumerKey = process.env.PESAPAL_CONSUMER_KEY || "";
    const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET || "";

    const isSimulation =
      !consumerKey ||
      !consumerSecret ||
      consumerKey.includes("placeholder") ||
      consumerSecret.includes("placeholder");

    let verifyData: PesaPalStatusResponse | null = null;

    if (isSimulation) {
      console.warn(`[Webhook Simulation] Mocking validation for Order ID: ${orderTrackingId}`);
      // Simulate successful payment payload from PesaPal status query
      verifyData = {
        payment_status_description: "COMPLETED",
        amount: 150000,
        merchant_reference: merchantReference || `taxwise-sub-simulated-professional-${Date.now()}`,
        payment_method: "Simulated",
      };
    } else {
      // Fetch official status from PesaPal API to prevent spoofing
      const token = await getPesapalToken();
      const statusResponse = await fetch(
        `${PESAPAL_BASE_URL}/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      const jsonResponse = await statusResponse.json();
      verifyData = jsonResponse as PesaPalStatusResponse;
      if (!statusResponse.ok || !verifyData) {
        console.error("Failed to query transaction status from PesaPal:", verifyData);
        return NextResponse.json({ error: "Failed to verify transaction status" }, { status: 502 });
      }
    }

    const paymentStatus = verifyData.payment_status_description || verifyData.status;

    // If transaction is not completed yet, acknowledge receipt of notification but do not award value
    if (String(paymentStatus).toUpperCase() !== "COMPLETED") {
      console.log(`PesaPal transaction ${orderTrackingId} is in status: ${paymentStatus}. Acknowledging only.`);
      return NextResponse.json({
        orderNotificationType: notificationType || "IPNCHANGE",
        orderTrackingId,
        orderMerchantReference: merchantReference || verifyData.merchant_reference,
        status: 200,
      });
    }

    // Process completed transaction
    const finalRef = merchantReference || verifyData.merchant_reference || "";
    const refParts = finalRef.split("-");
    const userId = refParts[2];
    const planName = refParts[3] || "professional";
    const amount = verifyData.amount;

    if (!userId) {
      console.error("PesaPal Webhook: Could not extract user ID from reference:", finalRef);
      return NextResponse.json({ error: "Invalid merchant reference format" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Idempotency check: see if we already processed this order tracking ID
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("flutterwave_ref", orderTrackingId)
      .maybeSingle();

    if (existingSub) {
      console.log(`PesaPal transaction ${orderTrackingId} already processed. Skipping database updates.`);
      return NextResponse.json({
        orderNotificationType: notificationType || "IPNCHANGE",
        orderTrackingId,
        orderMerchantReference: finalRef,
        status: 200,
      });
    }

    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(startsAt.getDate() + 30); // 30-day billing cycle

    // Update User Profile Plan
    const { error: userUpdateError } = await supabaseAdmin
      .from("users")
      .update({ plan: planName })
      .eq("id", userId);

    if (userUpdateError) {
      console.error("DB error updating user plan in webhook:", userUpdateError);
      return NextResponse.json({ error: "Failed to update user billing profile" }, { status: 500 });
    }

    // Insert Subscription Record
    const { error: subInsertError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan: planName,
        flutterwave_ref: orderTrackingId, // Column named flutterwave_ref is reused for PesaPal tracking reference
        status: "active",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

    if (subInsertError) {
      console.error("DB error writing subscription record in webhook:", subInsertError);
    }

    // Send confirmation email via Resend
    try {
      const { data: userProfile, error: fetchError } = await supabaseAdmin
        .from("users")
        .select("email, full_name")
        .eq("id", userId)
        .single();

      if (fetchError || !userProfile || !userProfile.email) {
        console.error(`Could not retrieve user profile for email confirmation:`, fetchError || "Missing email");
      } else {
        const emailHtml = getSubscriptionEmailHtml(
          userProfile.full_name || "Valued Customer",
          planName,
          String(amount),
          expiresAt.toISOString()
        );

        await sendEmail({
          to: userProfile.email,
          subject: `Your TaxWise ${planName.charAt(0).toUpperCase() + planName.slice(1)} Subscription is Active!`,
          html: emailHtml,
        });
      }
    } catch (emailErr) {
      console.error("Failed to send subscription confirmation email:", emailErr);
    }

    console.log(`Successfully processed PesaPal payment for User ${userId}. Plan upgraded to ${planName}.`);

    // Acknowledge webhook back to PesaPal in the correct format
    return NextResponse.json({
      orderNotificationType: notificationType || "IPNCHANGE",
      orderTrackingId,
      orderMerchantReference: finalRef,
      status: 200,
    });
  } catch (error: unknown) {
    console.error("PesaPal Webhook Handler Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing error." }, { status: 500 });
  }
}
