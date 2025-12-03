"use client";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { collection, collectionGroup, getDocs, doc, getDoc, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/firebase/AuthContext";
import { db } from "@/lib/firebase/initFirebase";

interface Project {
  id: string;
  projectName: string;
  description: string;
  jiraProjectId ?: string;
  integrationType: string;
  createdAt?: string;
  role?: string;
}

export default function ProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllOwned, setShowAllOwned] = useState(false);
  const [showAllShared, setShowAllShared] = useState(false);

  // Fetch projects owned by or shared with the user
  const fetchProjectsForUser = async (user: any) => {
    const userEmail = user.email;
    const projectsRef = collection(db, "projects");

    const ownedQuery = query(
      projectsRef,
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const ownedSnap = await getDocs(ownedQuery);
    const owned = ownedSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      role: "Owner",
    }));

    const memberQuery = query(
      collectionGroup(db, "members"),
      where("email", "==", userEmail)
    );

    const memberSnap = await getDocs(memberQuery);

    // extract unique project IDs
    const sharedProjectIds = [
      ...new Set(memberSnap.docs.map((m) => m.ref.parent.parent!.id)),
    ].filter((pid) => pid !== user.uid); // avoid duplicates

    // fetch projects in parallel
    const shared = await Promise.all(
      sharedProjectIds.map(async (pid) => {
        const pRef = doc(db, "projects", pid);
        const pSnap = await getDoc(pRef);
        if (!pSnap.exists()) return null;

        return {
          id: pSnap.id,
          ...pSnap.data(),
          role: "Collaborator",
        };
      })
    );

    return {
      owned,
      shared: shared.filter(Boolean),
    };
  };

  // Load projects on mount and when user changes
  useEffect(() => {
    if (!user) return;

    const loadProjects = async () => {
      setLoading(true);
      try {
        const { owned, shared } = await fetchProjectsForUser(user);

        const formatProjects = (projects: any[], role: string) =>
          projects.map((project: any) => ({
            id: project.id,
            projectName: project.projectName,
            description: project.description,
            jiraProjectId: project.jiraProjectId,
            integrationType: project.integrationType,
            createdAt: project.createdAt
              ? new Date(project.createdAt.seconds * 1000).toLocaleString()
              : "N/A",
            role,
          }));

        setOwnedProjects(formatProjects(owned, "Owner"));
        setSharedProjects(formatProjects(shared, "Collaborator"));
      } catch (err) {
        console.error("Error loading projects:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [user]);

  function buildDashboardUrl(p: any) {
    const query: any = {
      projectId: p.id,
      projectName: p.projectName,
      description: p.description,
      integrationType: p.integrationType,
    };

    if (p.integrationType === "Jira") {
      query.jiraProjectKey = p.jiraProjectId || "KAN";
    }

    if (p.integrationType === "Azure") {
      query.azureProjectId = p.azureProjectId || "";
    }

    return `/dashboard?${new URLSearchParams(query).toString()}`;
  }


  const ProjectCardList = ({
    title,
    projects,
    showAll,
    setShowAll,
  }: {
    title: string;
    projects: Project[];
    showAll: boolean;
    setShowAll: (value: boolean) => void;
  }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-emerald-700">{title}</h2>
        {projects.length > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-slate-500 hover:text-emerald-600 transition"
          >
            {showAll ? "▲ Hide" : "▼ Show More"}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAll && projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-3 space-y-3 border-t border-slate-100 pt-3"
          >
            {projects.map((p) => (
              <motion.div
                key={p.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => router.push(buildDashboardUrl(p))}
                className="cursor-pointer p-4 rounded-xl border border-slate-100 hover:bg-emerald-50 transition flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold text-slate-800">
                    {p.projectName}
                  </div>
                  <div className="text-xs text-slate-600">
                    Description: {p.description} | ALM : {p.integrationType}
                    </div>
                  <div className="text-xs text-slate-500">
                    Created At: {p.createdAt}
                  </div>
                  <div
                    className={`text-xs mt-1 italic ${
                      p.role === "Owner" ? "text-emerald-600" : "text-green-600"
                    }`}
                  >
                    {p.role}
                  </div>
                </div>
                <div className="text-emerald-600 text-sm font-medium">
                  → Open
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && projects.length === 0 && (
        <div className="text-slate-500 text-sm italic text-center py-4">
          No {title.toLowerCase()} found.
        </div>
      )}

      {loading && (
        <div className="text-slate-400 text-sm italic text-center py-4">
          Loading...
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-green-100 flex flex-col items-center justify-center py-10 px-4 text-slate-800">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">
          Welcome Back 👋
        </h1>

        {/* New Project Card */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/project/createnew")}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 shadow-md hover:shadow-xl transition-all"
        >
          <h2 className="text-lg font-semibold text-emerald-700">
            Start a New Project
          </h2>
          <p className="mt-2 text-slate-600 text-sm">
            Begin a new test generation session by entering your project
            details.
          </p>
          <div className="mt-4 text-emerald-600 font-medium text-right">
            → Get Started
          </div>
        </motion.div>

        {/* Owned and Shared Projects */}
        <ProjectCardList
          title="Your Projects"
          projects={ownedProjects}
          showAll={showAllOwned}
          setShowAll={setShowAllOwned}
        />

        <ProjectCardList
          title="Shared Projects"
          projects={sharedProjects}
          showAll={showAllShared}
          setShowAll={setShowAllShared}
        />
      </div>
    </div>
  );
}
