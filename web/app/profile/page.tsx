"use client";

import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase/initFirebase";

export default function ProfilePage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  if (!loading && !user) router.replace("/login");

  const logout = async () => {
    await auth.signOut();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_6px_24px_rgba(10,20,40,0.06)]">
          <h1 className="text-xl font-semibold">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Basic account information</p>

          <div className="mt-6 space-y-3 text-sm">
            <div>
              <div className="text-slate-500">Email</div>
              <div className="font-medium text-slate-900">{user?.email ?? "—"}</div>
            </div>
            <div>
              <div className="text-slate-500">UID</div>
              <div className="text-slate-800">{user?.uid ?? "—"}</div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-md bg-emerald-600 px-4 py-2 text-white text-sm hover:bg-emerald-700"
            >
              Open Dashboard
            </button>
            <button
              onClick={logout}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
