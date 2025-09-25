// spinner.jsx (plain JS)
import React, { useEffect, useRef, useState } from "react";
import { Wheel } from "react-custom-roulette";
import { getAuth } from "firebase/auth";

const data = [
    { option: "6 hours", hours: 6, style: { backgroundColor: "#22c55e", textColor: "#fff" } },
    { option: "8 hours", hours: 8, style: { backgroundColor: "#f97316", textColor: "#fff" } },
    { option: "10 hours", hours: 10, style: { backgroundColor: "#ef4444", textColor: "#fff" } },
    { option: "12 hours", hours: 12, style: { backgroundColor: "#a855f7", textColor: "#fff" } },
];
const SEGMENTS_SECONDS = data.map((d) => d.hours * 3600);
const indexForGoalSeconds = (goalSeconds) => {
    let bestIdx = 0, bestDiff = Infinity;
    SEGMENTS_SECONDS.forEach((s, i) => {
        const diff = Math.abs(s - goalSeconds);
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    });
    return bestIdx;
};

export default function Spinner({ setDailyGoal, setDailyDone }) {
    const [mustSpin, setMustSpin] = useState(false);
    const [prizeNumber, setPrizeNumber] = useState(0);
    const [result, setResult] = useState(null);
    const [spunToday, setSpunToday] = useState(false);
    const [loading, setLoading] = useState(false);
    const pendingGoalRef = useRef(null);

    async function authHeader() {
        const token = await getAuth().currentUser?.getIdToken();
        if (!token) throw new Error("Not logged in");
        return { Authorization: `Bearer ${token}` };
    }

    // On mount: check today's goal (READ-ONLY, GET /getDailyGoal)
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(import.meta.env.VITE_GET_GOAL, {
                    method: "GET",
                    headers: { ...(await authHeader()) },
                });
                if (!res.ok) {
                    const txt = await res.text();
                    console.error("getDailyGoal failed", res.status, txt);
                    return;
                }
                const dataRes = await res.json();
                console.log(dataRes)
                if (dataRes.exists) {
                    const idx = indexForGoalSeconds(dataRes.goalSeconds);
                    setPrizeNumber(idx);
                    const hours = Math.round(dataRes.goalSeconds / 3600);
                    setResult(`${hours} hours`);
                    setDailyGoal(hours);
                    if (typeof setDailyDone === "function" && typeof dataRes.progressSeconds === "number") {
                        // convert seconds -> hours if your UI expects hours
                        setDailyDone(Math.round((dataRes.progressSeconds / 3600) * 10) / 10);
                    }
                    setSpunToday(true); // lock the button
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // On click: lock today's goal (POST /spinDailyGoal)
    async function handleSpinClick() {
        if (spunToday || loading || mustSpin) return;
        try {
            setLoading(true);
            const res = await fetch(import.meta.env.VITE_SPIN, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(await authHeader()) },
                body: JSON.stringify({ segments: SEGMENTS_SECONDS }),
            });
            if (!res.ok) {
                const txt = await res.text();
                console.error("spinDailyGoal failed", res.status, txt);
                throw new Error(txt);
            }
            const { goalSeconds } = await res.json();

            const idx = indexForGoalSeconds(goalSeconds);
            pendingGoalRef.current = { goalSeconds };
            setPrizeNumber(idx);
            setMustSpin(true);
        } catch (e) {
            console.error(e);
            alert(`Spin failed: ${e.message || e}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
            <h2 className="text-xl font-semibold mb-4">Spinner</h2>

            <Wheel
                mustStartSpinning={mustSpin}
                prizeNumber={prizeNumber}
                data={data}
                onStopSpinning={() => {
                    setMustSpin(false);
                    setSpunToday(true); // lock for today

                    const chosenSeconds = pendingGoalRef.current?.goalSeconds ?? SEGMENTS_SECONDS[prizeNumber];
                    const hours = Math.round(chosenSeconds / 3600);
                    setResult(`${hours} hours`);
                    setDailyGoal(hours);
                    if (typeof setDailyDone === "function") setDailyDone(0);

                    pendingGoalRef.current = null;
                    alert(`Your goal today: ${hours} hours`);
                }}
                outerBorderColor={["#111"]}
                outerBorderWidth={4}
                innerBorderColor={["#111"]}
                radiusLineColor={["#fff"]}
                radiusLineWidth={2}
                textDistance={80}
                fontSize={18}
                spinDuration={0.6}
            />

            <div className="mt-6 flex gap-3 items-center flex-wrap justify-center">
                <button
                    onClick={handleSpinClick}
                    disabled={mustSpin || loading || spunToday}
                    className={`px-5 py-2 rounded-xl text-white font-semibold transition ${mustSpin || loading || spunToday
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-700"
                        }`}
                >
                    {spunToday ? "Come back tomorrow" : loading ? "Contacting server..." : mustSpin ? "Spinning..." : "Spin"}
                </button>

                {result && (
                    <span className="font-medium">
                        Result:&nbsp;
                        <span className="px-2 py-1 rounded bg-gray-100">{result}</span>
                    </span>
                )}
            </div>
        </div>
    );
}
