import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PLAN_PRICES: Record<string, number> = {
  starter: 50000,
  professional: 150000,
  firm: 400000,
};

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter Plan",
  professional: "Professional Plan",
  firm: "Firm/Corporate Plan",
};

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

// Authenticate with PesaPal and get Bearer Token (token is short-lived, valid for 5 min)
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
  console.log("[PesaPal Auth Response]", data);
  if (!response.ok || !data.token) {
    throw new Error(`Failed to authenticate with PesaPal: ${data.message || response.statusText || JSON.stringify(data)}`);
  }

  return data.token;
}

// Get cached IPN (Instant Payment Notification) ID or register a new one and cache it
async function getOrRegisterIpnId(token: string, origin: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const settingKey = `pesapal_ipn_id_${process.env.PESAPAL_ENV || "sandbox"}`;

  // 1. Check if we already have a registered IPN ID in site_settings
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", settingKey)
    .maybeSingle();

  if (data?.value) {
    return data.value;
  }

  // 2. Otherwise register a new IPN URL
  const webhookUrl = `${origin}/api/payments/webhook`;
  const response = await fetch(`${PESAPAL_BASE_URL}/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      url: webhookUrl,
      ipn_notification_type: "POST",
    }),
  });

  const resData = await response.json();
  const ipnId = resData.ipn_id || resData.notification_id;

  if (!ipnId) {
    throw new Error(`Failed to register IPN with PesaPal: ${JSON.stringify(resData)}`);
  }

  // 3. Cache the IPN ID in the database
  await supabase
    .from("site_settings")
    .upsert({ key: settingKey, value: ipnId });

  return ipnId;
}

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, email, name } = await req.json();

    if (!plan || !userId || !email) {
      return NextResponse.json({ error: "Missing required checkout parameters." }, { status: 400 });
    }

    const normalizedPlan = plan.toLowerCase();
    const amount = PLAN_PRICES[normalizedPlan];

    if (!amount) {
      return NextResponse.json({ error: "Invalid subscription plan selected." }, { status: 400 });
    }

    const txRef = `taxwise-sub-${userId}-${normalizedPlan}-${Date.now()}`;
    const consumerKey = process.env.PESAPAL_CONSUMER_KEY || "";
    const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET || "";

    // Simulation / developer testing mode
    const isSimulation =
      !consumerKey ||
      !consumerSecret ||
      consumerKey.includes("placeholder") ||
      consumerSecret.includes("placeholder");

    if (isSimulation) {
      console.warn("PesaPal API Keys are missing or placeholder. Simulating successful checkout.");
      
      try {
        const supabaseAdmin = getSupabaseAdmin();
        
        // Upgrade user plan directly in the DB
        await supabaseAdmin
          .from("users")
          .update({ plan: normalizedPlan })
          .eq("id", userId);

        const startsAt = new Date();
        const expiresAt = new Date();
        expiresAt.setDate(startsAt.getDate() + 30);

        // Log subscription record
        await supabaseAdmin
          .from("subscriptions")
          .insert({
            user_id: userId,
            plan: normalizedPlan,
            flutterwave_ref: `simulated-pesapal-${Date.now()}`,
            status: "active",
            starts_at: startsAt.toISOString(),
            expires_at: expiresAt.toISOString(),
          });

        console.log(`[Simulation] Direct upgraded user ${userId} to ${normalizedPlan}`);
      } catch (dbErr) {
        console.error("[Simulation] Database upgrade failed:", dbErr);
      }

      const mockCheckoutUrl = `/pricing?status=completed&tx_ref=${txRef}&plan=${normalizedPlan}`;
      return NextResponse.json({
        success: true,
        simulated: true,
        link: mockCheckoutUrl,
      });
    }

    // Call PesaPal API flow
    const token = await getPesapalToken();
    const ipnId = await getOrRegisterIpnId(token, req.nextUrl.origin);

    const nameParts = (name || email.split("@")[0]).trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "User";

    // Call PesaPal submit order API
    const response = await fetch(`${PESAPAL_BASE_URL}/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        id: txRef,
        currency: "UGX",
        amount: amount,
        description: `Subscription for ${PLAN_NAMES[normalizedPlan]}`,
        callback_url: `${req.nextUrl.origin}/pricing?status=completed`,
        notification_id: ipnId,
        billing_address: {
          email_address: email,
          phone_number: "",
          first_name: firstName,
          last_name: lastName,
          country_code: "UG",
        },
      }),
    });

    const resData = await response.json();

    if (response.ok && resData.redirect_url) {
      return NextResponse.json({
        success: true,
        link: resData.redirect_url,
      });
    } else {
      const rawMessage: string = resData.message || resData.error?.message || "";
      console.error("PesaPal API Error Response:", resData);

      // Detect transaction limit errors specifically
      const isLimitError = rawMessage.toLowerCase().includes("exceeds limit");
      const userMessage = isLimitError
        ? "Payment could not be processed: the transaction amount exceeds the limit configured on your PesaPal merchant account. Please log in to your PesaPal dashboard and raise the per-transaction limit, or contact PesaPal support."
        : rawMessage || "Failed to initiate payment gateway with PesaPal.";

      return NextResponse.json({ error: userMessage }, { status: 502 });
    }
  } catch (error: unknown) {
    console.error("Payment initiation API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to process checkout initiation." }, { status: 500 });
  }
}
