// web/app/api/auth/send-otp/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import crypto from "crypto";
import { sendMail } from "@/lib/firebase/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const clean = String(email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      return NextResponse.json({ error: "bad_email" }, { status: 400 });
    }

    // Ensure user exists
    try {
      await adminAuth.getUserByEmail(clean);
    } catch {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const code = ("" + Math.floor(100000 + Math.random() * 900000)).slice(-6);
    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    await adminDb.collection("pw_otps").doc(token).set({
      email: clean,
      code,
      expiresAt,
      createdAt: Date.now(),
      verified: false,
      used: false,
    });

    await sendMail({
      to: clean,
      subject: "Orbit AI – Your password reset code",
      html: `<p>Your one-time code:</p>
             <p style="font-size:20px;font-weight:700;letter-spacing:4px;">${code}</p>
             <p>This code expires in 10 minutes.</p>`,
    });

    return NextResponse.json({ token });
  } catch (e) {
    console.error("send-otp error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
