// web/app/api/auth/verify-otp/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(req: Request) {
  const { token, code } = await req.json();

  if (!token || !code) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const ref = adminDb.collection("pw_otps").doc(String(token));
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const data = snap.data()!;
  if (data.used) return NextResponse.json({ error: "already_used" }, { status: 400 });
  if (Date.now() > data.expiresAt) return NextResponse.json({ error: "expired" }, { status: 400 });
  if (!data.verified && String(code) !== String(data.code)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  await ref.update({ verified: true, verifiedAt: Date.now() });
  return NextResponse.json({ ok: true });
}
