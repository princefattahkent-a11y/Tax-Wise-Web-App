import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, getAccountDeletionEmailHtml } from "@/lib/resend";

export async function POST(req: NextRequest) {
  try {
    // 1. Extract the user's access token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing session token." }, { status: 401 });
    }
    const accessToken = authHeader.slice(7);

    // 2. Use anon client to verify the token and get the user's ID
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    // 3. Retrieve user profile details (such as full name) before deletion
    let fullName = "Valued Customer";
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    try {
      const { data: profile } = await adminClient
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) {
        fullName = profile.full_name;
      }
    } catch (profileErr) {
      console.error("Could not fetch user name before deletion:", profileErr);
    }

    // Delete from public.users table first (in case cascade isn't configured)
    await adminClient.from("users").delete().eq("id", user.id);

    // Delete from Supabase Auth
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Failed to delete user from Supabase Auth:", deleteError);
      return NextResponse.json({ error: deleteError.message || "Failed to delete account." }, { status: 500 });
    }

    // 4. Send account deletion confirmation email
    if (user.email) {
      try {
        const emailHtml = getAccountDeletionEmailHtml(fullName);
        await sendEmail({
          to: user.email,
          subject: "Your TaxWise Account Has Been Deleted",
          html: emailHtml,
        });
      } catch (emailErr) {
        console.error("Failed to send account deletion email:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete account API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "An unexpected error occurred." }, { status: 500 });
  }
}
