"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase/initFirebase";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/initFirebase";

export default function ProfilePage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [editingJira, setEditingJira] = useState(false);
  const [editingAzure, setEditingAzure] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // const [jiraCreds, setJiraCreds] = useState({ domain: "", email: "", apiToken: "" });
  // const [azureCreds, setAzureCreds] = useState({ tenantId: "", clientId: "", clientSecret: "" })

  const [savingJira, setSavingJira] = useState(false);
  const [savingAzure, setSavingAzure] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");

  const [jiraCreds, setJiraCreds] = useState({
    domain: "",
    email: "",
    apiToken: "",
  });

  const [azureCreds, setAzureCreds] = useState({
    tenantId: "",
    clientId: "",
    clientSecret: "",
  });

  const logout = async () => {
    await auth.signOut();
    router.replace("/login");
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        setDisplayName(user.displayName ?? "");
        const docRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.jira) setJiraCreds(data.jira);
          if (data.azure) setAzureCreds(data.azure);
        }
      }
    };
    fetchData();
  }, [user]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSavingName(true);
      await updateProfile(user, { displayName });
      await setDoc(doc(db, "users", user.uid), { displayName }, { merge: true });
      setEditingName(false);
      showSuccess("Name updated successfully!");
    } catch (err) {
      console.error("Error updating name:", err);
    } finally {
      setSavingName(false);
    }
  };

    // Save Jira credentials
  const handleSaveJira = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSavingJira(true);
      await setDoc(doc(db, "users", user.uid), { jira: jiraCreds }, { merge: true });
      setEditingJira(false);
      showSuccess("Jira credentials saved!");
    } catch (err) {
      console.error("Error saving Jira credentials:", err);
    } finally {
      setSavingJira(false);
    }
  };

  // Save Azure credentials
  const handleSaveAzure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSavingAzure(true);
      await setDoc(doc(db, "users", user.uid), { azure: azureCreds }, { merge: true });
      setEditingAzure(false);
      showSuccess("Azure credentials saved!");
    } catch (err) {
      console.error("Error saving Azure credentials:", err);
    } finally {
      setSavingAzure(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-600">
        Loading profile...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-semibold text-emerald-700">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your account settings</p>

          {/* User Info Section */}
          <div className="mt-6 flex items-center gap-4 border-b border-slate-200 pb-6">
            <img
              src={user.photoURL ?? "/default-avatar.png"}
              alt="Profile"
              className="h-20 w-20 rounded-full border border-slate-300 object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="text-lg font-medium text-slate-900">
                  {user.displayName ?? "@Name"}
                </div>
                <button
                  onClick={() => setEditingName(!editingName)}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  {editingName ? "Cancel" : "Edit"}
                </button>
              </div>
              <div className="text-sm text-slate-600">{user.email}</div>

              <AnimatePresence>
                {editingName && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3 space-y-2 overflow-hidden"
                    onSubmit={handleSaveName}
                  >
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter new name"
                      className="w-full rounded-lg border p-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={savingName}
                      className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {savingName ? "Saving..." : "Save Name"}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Jira Credentials */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Jira Credentials</h2>
              <button
                onClick={() => setEditingJira(!editingJira)}
                className="text-sm text-indigo-600 hover:underline"
              >
                {editingJira ? "Cancel" : "Edit"}
              </button>
            </div>

            <AnimatePresence>
              {editingJira && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 space-y-3 overflow-hidden"
                  onSubmit={handleSaveJira}
                >
                  <input
                    type="text"
                    placeholder="Jira Domain"
                    value={jiraCreds.domain}
                    onChange={(e) =>
                      setJiraCreds({ ...jiraCreds, domain: e.target.value })
                    }
                    className="w-full rounded-lg border p-2 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Jira Email"
                    value={jiraCreds.email}
                    onChange={(e) =>
                      setJiraCreds({ ...jiraCreds, email: e.target.value })
                    }
                    className="w-full rounded-lg border p-2 text-sm"
                  />
                  <input
                    type="password"
                    placeholder="Jira API Token"
                    value={jiraCreds.apiToken}
                    onChange={(e) =>
                      setJiraCreds({ ...jiraCreds, apiToken: e.target.value })
                    }
                    className="w-full rounded-lg border p-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={savingJira}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {savingJira ? "Saving..." : "Save Jira Credentials"}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
            {!editingJira && jiraCreds.domain && (
              <div className="mt-3 text-sm text-slate-500">
                Jira credentials saved ({`Domain: ${jiraCreds.domain}, Email: ${jiraCreds.email}` || "no email set"})
              </div>
            )}
          </div>

         {/* Azure Credentials */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Azure Credentials</h2>
              <button
                onClick={() => setEditingAzure(!editingAzure)}
                className="text-sm text-indigo-600 hover:underline"
              >
                {editingAzure ? "Cancel" : "Edit"}
              </button>
            </div>

            <AnimatePresence>
              {editingAzure && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 space-y-3 overflow-hidden"
                  onSubmit={handleSaveAzure}
                >
                  {/* <input
                    type="text"
                    placeholder="Azure Organization/Tenant ID"
                    value={azureCreds.tenantId}
                    onChange={(e) =>
                      setAzureCreds({ ...azureCreds, tenantId: e.target.value })
                    }
                    className="w-full rounded-lg border p-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Project/Client ID"
                    value={azureCreds.clientId}
                    onChange={(e) =>
                      setAzureCreds({ ...azureCreds, clientId: e.target.value })
                    }
                    className="w-full rounded-lg border p-2 text-sm"
                  /> */}
                  <input
                    type="password"
                    placeholder="PAT/Client Secret"
                    value={azureCreds.clientSecret}
                    onChange={(e) =>
                      setAzureCreds({ ...azureCreds, clientSecret: e.target.value })
                    }
                    className="w-full rounded-lg border p-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={savingAzure}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {savingAzure ? "Saving..." : "Save Azure Credentials"}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {!editingAzure && azureCreds.clientId && (
              <div className="mt-3 text-sm text-slate-500">
                Azure credentials saved ({`Client Id:${azureCreds.clientId.slice(0, 6)}, Tenant Id${azureCreds.tenantId}`}…)
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="mt-10 flex justify-end">
            <button
              onClick={logout}
              className="rounded-md bg-emerald-600 px-4 py-2 text-white text-sm font-medium hover:bg-emerald-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
