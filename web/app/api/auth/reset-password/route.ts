// web/app/api/auth/reset-password/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { sendMail } from "@/lib/firebase/email";

function strong(pw: string) {
  return (
    pw.length >= 8 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[!@#$%^&*()[\]{}\-_=+,.?;:<>|/~`]/.test(pw)
  );
}

export async function POST(req: Request) {
  try {
    const { token, email, newPassword } = await req.json();
    const clean = String(email || "").trim().toLowerCase();

    if (!token || !clean || !newPassword) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    if (!strong(newPassword)) {
      return NextResponse.json({ error: "weak_password" }, { status: 400 });
    }

    const ref = adminDb.collection("pw_otps").doc(String(token));
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const data = snap.data()!;
    if (data.used) return NextResponse.json({ error: "already_used" }, { status: 400 });
    if (!data.verified) return NextResponse.json({ error: "not_verified" }, { status: 400 });
    if (Date.now() > data.expiresAt) return NextResponse.json({ error: "expired" }, { status: 400 });
    if (data.email !== clean) return NextResponse.json({ error: "email_mismatch" }, { status: 400 });

    const user = await adminAuth.getUserByEmail(clean);
    await adminAuth.updateUser(user.uid, { password: newPassword });
    await ref.update({ used: true, usedAt: Date.now() });

    await sendMail({
      to: clean,
      subject: "Orbit AI – Password changed",
      html: `<p>Your password was changed successfully.</p>
             <p>If this wasn’t you, please reset it again immediately.</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("reset-password error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
