import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

import Login from "./components/Login";
import Header from "./components/Header";
import Timer from "./components/Timer";
import Schedule from "./components/Schedule";
import Spinner from "./Spinner";
import Progress from "./components/Progress";
import DailyGreeting from "./components/DailyGreeting";

const db = getFirestore();

export default function App() {
  const [user, setUser] = useState(null);

  // app state
  const [sessions, setSessions] = useState([]);
  const [skips, setSkips] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(null);
  const [dailyDone, setDailyDone] = useState(0);
  const [dailyGoals, setDailyGoals] = useState([]); // <-- NEW

  // listen for auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadUser(u.uid);        // 👈 load skips
        await loadSessions(u.uid);
        await loadDailyGoals(u.uid);
      }
    });
    return () => unsub();
  }, []);

  async function loadUser(uid) {
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setSkips(data.skips || 0);
      }
    } catch (e) {
      console.error("Error loading user:", e);
    }
  }

  async function loadSessions(uid) {
    try {
      const ref = collection(db, "users", uid, "sessions");
      const snap = await getDocs(ref);
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSessions(arr);
    } catch (e) {
      console.error("Error loading sessions:", e);
    }
  }

  async function loadDailyGoals(uid) {
    try {
      const ref = collection(db, "users", uid, "daily");
      const snap = await getDocs(ref);
      const arr = snap.docs.map((d) => ({ dateKey: d.id, ...d.data() }));
      setDailyGoals(arr);

      // 🔑 Find today's goal
      const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
      const today = arr.find((g) => g.dateKey === todayKey);
      if (today?.goalSeconds) {
        setDailyGoal(Math.round(today.goalSeconds / 3600)); // hours
        setDailyDone(today.progressSeconds || 0);
      } else {
        setDailyGoal(null);
        setDailyDone(0);
      }
    } catch (e) {
      console.error("Error loading daily goals:", e);
    }
  }

  async function saveSessionApi(session) {
    const token = await getAuth().currentUser?.getIdToken(true);
    const res = await fetch(import.meta.env.VITE_SAVE_SESSION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ session }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text);
    return JSON.parse(text);
  }

  async function handleFinishSession(session) {
    try {
      console.log("Finishing session:", session);
      await saveSessionApi(session);

      // refresh local state
      if (user) {
        await loadUser(user.uid);
        await loadSessions(user.uid);
        await loadDailyGoals(user.uid);
      }
    } catch (e) {
      console.error("❌ Failed to save session", e);
      alert(`Failed to save session: ${e.message || e}`);
    }
  }

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-2xl space-y-8">
        <Header skips={skips} user={user} />
        <DailyGreeting setSkips={setSkips} /> {/* 👈 pass setter */}
        <Progress user={user} dailyGoal={dailyGoal} dailyDone={dailyDone} />

        {dailyGoal ? (
          <Timer onFinish={handleFinishSession} />
        ) : (
          <div className="bg-white rounded-2xl shadow p-6 text-center text-gray-600">
            Spin the wheel to unlock today’s tasks
          </div>
        )}

        <Spinner
          skips={skips}
          setSkips={setSkips}
          setDailyGoal={setDailyGoal}
          setDailyDone={setDailyDone}
        />

        <Schedule sessions={sessions} dailyGoals={dailyGoals} />
      </div>
    </div>
  );
}
