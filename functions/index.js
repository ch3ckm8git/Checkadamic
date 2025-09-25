import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();
const db = getFirestore();
const adminAuth = getAuth();

// allow all in dev; restrict in prod
const corsCfg = { cors: true };

// Helpers
const TZ = "Asia/Bangkok";
const todayKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: TZ }); // "YYYY-MM-DD"
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getIdToken = (req) => {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
};
const dateKeyForTZ = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
};

// INIT USER
export const initUser = onRequest(corsCfg, async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
    const idToken = getIdToken(req);
    if (!idToken) return res.status(401).json({ error: "Missing token" });
    const { uid, email, name, picture } = await adminAuth.verifyIdToken(idToken);

    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      await userRef.set({
        email: email || "",
        name: name || "",
        photoURL: picture || "",
        createdAt: new Date().toISOString(),
        totalSeconds: 0,
        level: 1,
        skips: 3,
        additionalCounter: 0,
        dailyDone: 0,
        dailyDateKey: todayKey(),
      });
    }
    res.json({ success: true });
  } catch (e) {
    console.error("initUser error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// READ-ONLY STATUS
export const getDailyGoal = onRequest(corsCfg, async (req, res) => {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });
    const idToken = getIdToken(req);
    if (!idToken) return res.status(401).json({ error: "Missing token" });
    const { uid } = await adminAuth.verifyIdToken(idToken);

    const dateKey = todayKey();
    const userRef = db.collection("users").doc(uid);
    const dailyRef = userRef.collection("daily").doc(dateKey);

    const [uSnap, dSnap] = await Promise.all([userRef.get(), dailyRef.get()]);
    const u = uSnap.exists ? uSnap.data() : {};
    if (!dSnap.exists) {
      return res.json({ exists: false, dateKey });
    }
    const d = dSnap.data();
    const progressSeconds = (d.progressSeconds ?? (u.dailyDateKey === dateKey ? (u.dailyDone || 0) : 0));
    res.json({
      exists: true,
      dateKey,
      goalSeconds: d.goalSeconds,
      progressSeconds,
      locked: true,
    });
  } catch (e) {
    console.error("getDailyGoal error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// SPIN & LOCK
export const spinDailyGoal = onRequest(corsCfg, async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
    const idToken = getIdToken(req);
    if (!idToken) return res.status(401).json({ error: "Missing token" });
    const { uid } = await adminAuth.verifyIdToken(idToken);

    const pool = Array.isArray(req.body?.segments) && req.body.segments.length
      ? req.body.segments.map(Number)
      : [15 * 60, 20 * 60, 25 * 60, 30 * 60, 45 * 60, 60 * 60];

    const dateKey = todayKey();
    const userRef = db.collection("users").doc(uid);
    const dailyRef = userRef.collection("daily").doc(dateKey);

    let payload;
    await db.runTransaction(async (tx) => {
      const [uSnap, dSnap] = await Promise.all([tx.get(userRef), tx.get(dailyRef)]);
      const u = uSnap.exists ? uSnap.data() : {};
      const baseDailyDone = (u.dailyDateKey === dateKey) ? (u.dailyDone || 0) : 0;

      if (dSnap.exists) {
        const d = dSnap.data();
        payload = {
          dateKey,
          goalSeconds: d.goalSeconds,
          progressSeconds: d.progressSeconds ?? baseDailyDone,
          locked: true,
        };
        tx.set(userRef, { dailyDateKey: dateKey }, { merge: true });
        return;
      }

      const goalSeconds = pick(pool);
      tx.set(dailyRef, {
        goalSeconds,
        progressSeconds: baseDailyDone,
        goalMet: baseDailyDone >= goalSeconds,
        method: "wheel",
        tz: TZ,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(userRef, {
        dailyGoalSeconds: goalSeconds,
        dailyGoalDateKey: dateKey,
        dailyDateKey: dateKey,
      }, { merge: true });

      payload = { dateKey, goalSeconds, progressSeconds: baseDailyDone, locked: true };
    });

    res.json(payload);
  } catch (e) {
    console.error("spinDailyGoal error:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// SAVE SESSION
export const saveSession = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method Not Allowed" });

    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Missing token" });

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      console.error("verifyIdToken failed:", e);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    const userId = decoded.uid;

    const body = typeof req.body === "object" ? req.body : {};
    const session = body.session || null;
    if (!session || typeof session !== "object") {
      return res.status(400).json({ error: "Missing session in body" });
    }
    const mode = String(session.mode || "");
    const seconds = Number(session.seconds);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return res.status(400).json({ error: "Invalid 'seconds'" });
    }

    const rawId = session.id != null ? String(session.id) : String(Date.now());
    const safeId = rawId.replace(/[/#?%\s]+/g, "_") || String(Date.now());
    const cleanSession = { ...session, id: safeId, mode, seconds };

    const userRef = db.collection("users").doc(userId);
    const sessionRef = userRef.collection("sessions").doc(safeId);
    const dateKey = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    const dailyRef = userRef.collection("daily").doc(dateKey);

    await db.runTransaction(async (tx) => {
      const [snap, dailySnap] = await Promise.all([tx.get(userRef), tx.get(dailyRef)]);
      const prev = snap.exists ? snap.data() : {};

      tx.set(sessionRef, cleanSession);

      if (mode === "sub") return;

      let dailyDone = prev.dailyDone || 0;
      if (prev.dailyDateKey !== dateKey) dailyDone = 0;

      let contributed = seconds;
      if (mode === "school") contributed /= 2;
      if (mode === "reading") contributed /= 2;
      if (mode === "manga") contributed /= 4;

      let totalSeconds = (prev.totalSeconds || 0) + contributed;
      dailyDone += contributed;

      let level = prev.level || 1;
      let skips = prev.skips || 3;
      let additionalCounter = prev.additionalCounter || 0;

      let needed = level < 30 ? 8 * 3600 : level < 50 ? 9 * 3600 : 10 * 3600;
      if (totalSeconds >= needed) {
        level += Math.floor(totalSeconds / needed);
        totalSeconds = totalSeconds % needed;
      }

      let goalSeconds = null;
      let newProgress = contributed;

      if (dailySnap.exists) {
        const d = dailySnap.data();
        goalSeconds = d.goalSeconds || null;
        newProgress = (d.progressSeconds || 0) + contributed;

        tx.update(dailyRef, {
          progressSeconds: newProgress,
          goalMet: goalSeconds ? newProgress >= goalSeconds : false,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        tx.set(
          dailyRef,
          {
            goalSeconds: null,
            progressSeconds: contributed,
            goalMet: false,
            method: "none",
            tz: "Asia/Bangkok",
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (goalSeconds && newProgress > goalSeconds) {
        const spillover = newProgress - goalSeconds;
        additionalCounter += spillover;
      }

      if (additionalCounter >= 16 * 3600) {
        const earned = Math.floor(additionalCounter / (16 * 3600));
        skips += earned;
        additionalCounter = additionalCounter % (16 * 3600);
      }

      tx.set(
        userRef,
        {
          totalSeconds,
          level,
          skips,
          additionalCounter,
          dailyDone,
          dailyDateKey: dateKey,
        },
        { merge: true }
      );
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("saveSession error (top-level):", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// FINALIZE CRON (auto burn skip)
export const finalizeDailyCron = onSchedule(
  { schedule: "5 0 * * *", timeZone: TZ },
  async () => {
    const yesterdayKey = dateKeyForTZ(-1);
    console.log("Auto-finalize (burn skip if not finished) for", yesterdayKey);

    const usersSnap = await db.collection("users").get();
    let processed = 0;

    for (const userDoc of usersSnap.docs) {
      const userRef = userDoc.ref;
      const dailyRef = userRef.collection("daily").doc(yesterdayKey);

      try {
        await db.runTransaction(async (tx) => {
          const [uSnap, dSnap] = await Promise.all([tx.get(userRef), tx.get(dailyRef)]);
          const u = uSnap.exists ? uSnap.data() : {};

          let goalMet = false;
          let hadDaily = false;
          let goalSeconds = null;
          let progressSeconds = 0;

          if (dSnap.exists) {
            hadDaily = true;
            const d = dSnap.data();
            goalSeconds = d.goalSeconds ?? null;
            progressSeconds = d.progressSeconds || 0;
            goalMet = !!(goalSeconds && progressSeconds >= goalSeconds);
            if (d.finalized) return;
          }

          if (goalMet) {
            tx.set(
              dailyRef,
              {
                dateKey: yesterdayKey,
                goalSeconds: goalSeconds ?? null,
                progressSeconds,
                goalMet: true,
                finalized: true,
                autoFinalized: true,
                skipSpent: false,
                finalizeReason: "goal_met",
                tz: TZ,
                finalizedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            processed++;
            return;
          }

          const before = Number(u.skips ?? 0);
          const after = before - 1;

          tx.update(userRef, { skips: after });
          tx.set(
            dailyRef,
            {
              dateKey: yesterdayKey,
              goalSeconds: goalSeconds ?? null,
              progressSeconds,
              goalMet: false,
              finalized: true,
              autoFinalized: true,
              skipSpent: true,
              finalizeReason: hadDaily ? "not_met" : "no_spin",
              skipsBefore: before,
              skipsAfter: after,
              penaltyGoal: 0,
              penaltyExercise: 0,
              penaltyTotal: 0,
              tz: TZ,
              finalizedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          processed++;
        });
      } catch (err) {
        console.error(`Auto-finalize failed for user ${userDoc.id}`, err);
      }
    }

    console.log("Auto-finalize complete. Docs processed:", processed);
  }
);

// CLAIM SUNDAY SKIP
export const claimSundaySkip = onRequest(corsCfg, async (req, res) => {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method Not Allowed" });

    const idToken = getIdToken(req);
    if (!idToken) return res.status(401).json({ error: "Missing token" });
    const { uid } = await adminAuth.verifyIdToken(idToken);

    const userRef = db.collection("users").doc(uid);

    let newSkips;
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new Error("User not found");
      const data = snap.data();

      const now = new Date().toLocaleString("en-US", { timeZone: TZ });
      const day = new Date(now).getDay(); // 0 = Sunday
      if (day !== 0) {
        throw new Error("Can only claim skip on Sunday");
      }

      const todayKey = new Date(now).toLocaleDateString("en-CA", { timeZone: TZ });
      if (data.lastSundayClaim === todayKey) {
        throw new Error("Already claimed today");
      }

      newSkips = (data.skips || 0) + 1;
      tx.update(userRef, {
        skips: newSkips,
        lastSundayClaim: todayKey,
      });
    });

    res.json({ success: true, message: "Skip granted!", skips: newSkips });
  } catch (err) {
    console.error("claimSundaySkip error:", err);
    res.status(400).json({ error: err.message || "Failed to claim skip" });
  }
});
