"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/initFirebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";

export default function Home() {

  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if(!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if(!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

}

