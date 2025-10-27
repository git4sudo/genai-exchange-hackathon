// web/lib/firebase/admin.ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * We support TWO env layouts:
 *
 * A) Single JSON string (preferred):
 *    FIREBASE_SERVICE_ACCOUNT={"type":"service_account", ... "private_key":"-----BEGIN PRIVATE KEY-----\n....\n-----END PRIVATE KEY-----\n", ...}
 *
 * B) Three separate vars:
 *    FIREBASE_PROJECT_ID=orbit-ai-3d3a5
 *    FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@orbit-ai-3d3a5.iam.gserviceaccount.com
 *    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *    (Note: keep the \n escapes in the .env file)
 */

function getCredentialFromEnv() {
  // Try the single JSON blob first
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      const json = JSON.parse(raw);
      const projectId = json.project_id;
      const clientEmail = json.client_email;
      const privateKey = String(json.private_key || "").replace(/\\n/g, "\n");
      if (projectId && clientEmail && privateKey) {
        return { projectId, clientEmail, privateKey };
      }
      console.error(
        "[admin] FIREBASE_SERVICE_ACCOUNT JSON is missing required fields (project_id, client_email, private_key)."
      );
    } catch (e) {
      console.error("[admin] Could not parse FIREBASE_SERVICE_ACCOUNT JSON:", e);
    }
  }

  // Fallback: separate env vars
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  // Nothing usable — don’t throw here; let caller handle gracefully.
  return null;
}

function ensureAdminInitialized() {
  if (getApps().length) return;

  const creds = getCredentialFromEnv();
  if (!creds) {
    console.error(
      "[admin] Firebase Admin credentials are not configured.\n" +
        "Provide either FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
    );
    // Initialize without credentials only to avoid import-time crashes;
    // calls to adminAuth/adminDb will still fail later if used.
    initializeApp();
    return;
  }

  initializeApp({
    credential: cert({
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
      privateKey: creds.privateKey,
    }),
  });
}

ensureAdminInitialized();

export const adminAuth = getAuth();
export const adminDb = getFirestore();
