import React, { useState, useEffect } from "react";
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    format,
    isSameMonth,
    isSameDay,
} from "date-fns";

function formatDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [h > 0 ? `${h}h` : null, m > 0 ? `${m}m` : null, s > 0 ? `${s}s` : null]
        .filter(Boolean)
        .join(" ");
}

export default function Schedule({ sessions, dailyGoals }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isMobile, setIsMobile] = useState(window.innerWidth < 500);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 500);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Group sessions by dayKey
    const sessionsByDay = sessions.reduce((acc, s) => {
        const dateKey = new Date(s.startTime).toLocaleDateString("en-CA", {
            timeZone: "Asia/Bangkok",
        });
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(s);
        return acc;
    }, {});

    const goalsByDay = (dailyGoals || []).reduce((acc, g) => {
        acc[g.dateKey] = g;
        return acc;
    }, {});

    // ===== Desktop/Tablet (Month Grid) =====
    const renderHeader = () => (
        <div className="flex items-center justify-between mb-4">
            <button
                onClick={() => setCurrentMonth((prev) => addDays(prev, -30))}
                className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
                {"<"}
            </button>
            <h2 className="text-lg font-bold">{format(currentMonth, "MMMM yyyy")}</h2>
            <button
                onClick={() => setCurrentMonth((prev) => addDays(prev, 30))}
                className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
            >
                {">"}
            </button>
        </div>
    );

    const renderDays = () => {
        const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return (
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map((d) => (
                    <div key={d} className="text-center font-medium text-gray-700">
                        {d}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const dateKey = cloneDay.toLocaleDateString("en-CA", {
                    timeZone: "Asia/Bangkok",
                });

                const sessionsToday = sessionsByDay[dateKey] || [];
                const total = sessionsToday.reduce((sum, s) => sum + s.seconds, 0);
                const hrs = total / 3600;

                const goalDoc = goalsByDay[dateKey];
                const goalHours = goalDoc ? Math.round(goalDoc.goalSeconds / 3600) : null;
                const progressHours = goalDoc
                    ? Math.round((goalDoc.progressSeconds || 0) / 3600)
                    : Math.round(hrs);

                let bg = "bg-gray-200";
                if (goalDoc?.goalMet) {
                    if (goalHours >= 12) bg = "bg-purple-600 text-white";
                    else if (goalHours >= 10) bg = "bg-red-600 text-white";
                    else if (goalHours >= 8) bg = "bg-orange-600 text-white";
                    else if (goalHours >= 6) bg = "bg-green-600 text-white";
                }

                days.push(
                    <div
                        key={cloneDay.toISOString()}
                        onClick={() => setSelectedDate(cloneDay)}
                        className={`p-2 h-20 border rounded cursor-pointer flex flex-col items-center justify-between
              ${!isSameMonth(day, monthStart) ? "bg-gray-100" : ""}
              ${isSameDay(day, new Date()) ? "border-blue-500 border-4" : ""}`}
                    >
                        <span className="text-sm">{format(day, "d")}</span>
                        {goalDoc ? (
                            <span className={`text-xs px-1 rounded ${bg}`}>
                                {progressHours}h / {goalHours}h
                            </span>
                        ) : total > 0 ? (
                            <span className={`text-xs px-1 rounded ${bg}`}>
                                {Math.floor(hrs)}h
                            </span>
                        ) : null}
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div key={day.toISOString()} className="grid grid-cols-7 gap-1 mb-1">
                    {days}
                </div>
            );
            days = [];
        }
        return <div>{rows}</div>;
    };

    const renderSessions = () => {
        const key = selectedDate.toLocaleDateString("en-CA", {
            timeZone: "Asia/Bangkok",
        });
        const daySessions = sessionsByDay[key];
        if (!daySessions) return <p className="text-sm text-gray-500">No sessions</p>;

        return daySessions.map((s) => (
            <div
                key={s.id}
                className="border rounded-xl p-3 mb-2 flex flex-col sm:flex-row sm:items-center justify-between"
            >
                <div>
                    <p className="font-semibold">{s.title}</p>
                    {s.desc && <p className="text-sm text-gray-500">{s.desc}</p>}
                    <p className="text-xs text-gray-400">
                        {format(new Date(s.startTime), "HH:mm")} –{" "}
                        {format(new Date(new Date(s.startTime).getTime() + s.seconds * 1000), "HH:mm")}
                    </p>
                </div>
                <div className="text-sm text-indigo-600 text-right">
                    {formatDuration(s.seconds)}
                </div>
            </div>
        ));
    };

    // ===== Mobile (List View) =====
    const renderListView = () => {
        return Object.keys(goalsByDay)
            .sort((a, b) => new Date(b) - new Date(a))
            .map((dateKey) => {
                const goalDoc = goalsByDay[dateKey];
                const daySessions = sessionsByDay[dateKey] || [];
                const goalHours = goalDoc ? Math.round(goalDoc.goalSeconds / 3600) : null;
                const progressHours = goalDoc
                    ? Math.round((goalDoc.progressSeconds || 0) / 3600)
                    : null;

                return (
                    <div key={dateKey} className="mb-4 border rounded-lg p-3">
                        <h3 className="font-semibold mb-6">
                            {format(new Date(dateKey), "EEE, MMM d")}{" "}
                            {goalDoc && (
                                <span className="ml-2 text-sm">
                                    {progressHours}h / {goalHours}h{" "}
                                    {goalDoc.goalMet ? "✅" : "❌"}
                                </span>
                            )}
                        </h3>
                        {daySessions.length > 0 ? (
                            daySessions.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex justify-between border-b py-1 text-sm"
                                >
                                    <span>
                                        {format(new Date(s.startTime), "HH:mm")} –{" "}
                                        {format(new Date(new Date(s.startTime).getTime() + s.seconds * 1000), "HH:mm")}{" "}
                                        {s.title}
                                    </span>
                                    <span className="text-indigo-600">{formatDuration(s.seconds)}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500">No sessions</p>
                        )}
                    </div>
                );
            });
    };

    return (
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            {isMobile ? (
                <>{renderListView()}</>
            ) : (
                <>
                    {renderHeader()}
                    {renderDays()}
                    {renderCells()}
                    <div className="mt-4">
                        <h3 className="font-semibold mb-2">{selectedDate.toDateString()}</h3>
                        {renderSessions()}
                    </div>
                </>
            )}
        </div>
    );
}
