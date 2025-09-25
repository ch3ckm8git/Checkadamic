// import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { useState, useEffect } from "react";
const db = getFirestore();
const TZ = "Asia/Bangkok";
const todayKey = () =>
    new Date().toLocaleDateString("en-CA", { timeZone: TZ });

function formatDuration(sec = 0) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h > 0 ? `${h}h` : null, m > 0 ? `${m}m` : null, `${s}s`]
        .filter(Boolean)
        .join(" ");
}

export default function Progress({ user }) {
    const [totalSeconds, setTotalSeconds] = useState(0);
    const [level, setLevel] = useState(1);
    const [skips, setSkips] = useState(3);
    const [additionalCounter, setAdditionalCounter] = useState(0);
    const [dailyDone, setDailyDone] = useState(0);
    const [dailyGoal, setDailyGoal] = useState(null);

    useEffect(() => {
        if (!user) return;

        // subscribe to user aggregate
        const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setTotalSeconds(data.totalSeconds || 0);
                setLevel(data.level || 1);
                setSkips(data.skips || 3);
                setAdditionalCounter(data.additionalCounter || 0);
                // fallback dailyDone if no daily doc
                if (dailyGoal === null) {
                    setDailyDone(data.dailyDone || 0);
                }
            }
        });

        // subscribe to today’s daily doc
        const unsubDaily = onSnapshot(
            doc(db, "users", user.uid, "daily", todayKey()),
            (snap) => {
                if (snap.exists()) {
                    const d = snap.data();
                    setDailyGoal(
                        d.goalSeconds ? Math.round(d.goalSeconds / 3600) : null
                    );
                    setDailyDone(d.progressSeconds || 0);
                }
            }
        );

        return () => {
            unsubUser();
            unsubDaily();
        };
    }, [user]);

    // XP progress
    const needed =
        level < 30 ? 8 * 3600 : level < 50 ? 9 * 3600 : 10 * 3600;
    const progress = (totalSeconds % needed) / needed;
    const barPercent = Math.min(progress * 100, 100);

    // Daily goal progress
    const dailySecGoal = dailyGoal ? dailyGoal * 3600 : 0;
    const dailyPercent =
        dailySecGoal > 0
            ? Math.min((dailyDone / dailySecGoal) * 100, 100)
            : 0;

    return (
        <div className="bg-white rounded-3xl shadow-md p-4 sm:p-6 space-y-3">
            <h2 className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                Progress
            </h2>

            <p className="text-sm sm:text-base">
                Total Main Task Time: <b>{formatDuration(totalSeconds)}</b>
            </p>

            <p className="text-sm sm:text-base">
                Level: <b>{level}</b>
            </p>

            {/* XP Progress Bar */}
            <div className="w-full bg-gray-200 rounded-[10px] h-8 overflow-hidden">
                <div
                    className="bg-indigo-600 h-8 transition-all duration-500"
                    style={{ width: `${barPercent}%` }}
                />
            </div>

            {/* Daily Goal Progress Bar */}
            {dailyGoal !== null && (
                <div>
                    <p className="text-sm sm:text-base my-3 mt-8">
                        Today’s Goal: <b>{dailyGoal}h</b> | Done:{" "}
                        <b>{formatDuration(dailyDone)}</b>
                    </p>
                    <Tooltip.Provider delayDuration={0}>
                        <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                                <div className="w-full bg-gray-200 rounded-[10px] h-8 overflow-hidden cursor-pointer">
                                    <div
                                        className="bg-orange-500 h-8 transition-all duration-500"
                                        style={{ width: `${dailyPercent}%` }}
                                    />
                                </div>
                            </Tooltip.Trigger>
                            <Tooltip.Content
                                className="bg-black text-white px-2 py-1 rounded text-xs shadow-lg"
                                side="top"
                                sideOffset={5}
                            >
                                {dailyPercent.toFixed(1)}%
                                <Tooltip.Arrow className="fill-black" />
                            </Tooltip.Content>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                </div>
            )}

            <p className="text-sm sm:text-base mt-8">
                Extra Time: {formatDuration(additionalCounter)} / 16h → +1 Skip
            </p>
        </div>
    );
}
