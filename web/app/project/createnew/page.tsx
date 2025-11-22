"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/initFirebase";
import { useAuthState } from "react-firebase-hooks/auth";

export default function NewProjectPage() {
  const [projectName, setProjectName] = useState("");
  const [jiraProject, setJiraProject] = useState("");
  const [description, setDescription] = useState("");
  const [azureProject, setAzureProject] = useState("");
  const [integrationType, setIntegrationType] = useState("Jira");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [user] = useAuthState(auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("You must be logged in!");

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "projects"), {
        uid: user.uid,
        projectName: projectName,
        jiraProjectId: jiraProject,
        azureProjectId: azureProject,
        description,
        integrationType,
        createdAt: Timestamp.now(),
      });

      const newProjectId = docRef.id;

      router.push(`/dashboard?projectName=${encodeURIComponent(projectName)}&description=${encodeURIComponent(description)}&projectId=${newProjectId}&jiraProjectKey=${encodeURIComponent(jiraProject)}&integrationType=${encodeURIComponent(integrationType)}&azureProjectId=${encodeURIComponent(azureProject)}`);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow">
        <h1 className="text-xl font-semibold text-slate-900 mb-6">
          Create a New Project
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Integration Type Radio Group */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Integration Type
            </label>
            <div className="flex gap-6">
              {["Jira", "Azure", "Polarion"].map((option) => (
                <label key={option} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="integrationType"
                    value={option}
                    checked={integrationType === option}
                    onChange={() => setIntegrationType(option)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <span className="text-sm text-slate-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        {integrationType === "Jira" && (
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Jira Project ID
            </label>
            <input
              type="text"
              value={jiraProject}
              onChange={(e) => setJiraProject(e.target.value)}
              required={integrationType === "Jira"}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )} 

        {integrationType === "Azure" && (
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Azure Project URL
            </label>
            <input
              type="text"
              value={azureProject}
              onChange={(e) => setAzureProject(e.target.value)}
              required={integrationType === "Azure"}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 text-white rounded-md py-2 text-sm font-medium hover:bg-emerald-700 transition"
          >
            Create Project
          </button>
        </form>
      </div>
    </div>
  );
}
