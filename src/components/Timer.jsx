import React, { useState, useEffect } from "react";
import { TimerIcon, Pause, Play, StopCircle, Repeat } from "lucide-react";
import Dropdown from "./Dropdown";

const mainTasks = [
    "Web Development",
    "Data Structure and Algorithm",
    "Finance",
    "English Language",
    "Competitive Programming",
    "Database",
    "School",
    "Reading",
    "Reading Manga",
    "Custom...",
];

const subtasks = [
    { name: "Typing", minutes: 15 },
    { name: "Hand Writing", minutes: 15 },
    { name: "Fast Math", minutes: 15 },
    { name: "Exercise (Cardio + Weight)", minutes: 45 },
    { name: "Custom..." },
];

const countdownOptions = [15, 30, 45, 60];

export default function Timer({ onFinish }) {
    const [mode, setMode] = useState("main");
    const [active, setActive] = useState(false);
    const [paused, setPaused] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [goalMinutes, setGoalMinutes] = useState(15);

    // session tracking
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [mainTask, setMainTask] = useState("");
    const [subTask, setSubTask] = useState("");
    const [startTime, setStartTime] = useState(null);
    const [pauseStart, setPauseStart] = useState(null);
    const [pausedTotal, setPausedTotal] = useState(0);

    /* ---------- Restore from localStorage ---------- */
    useEffect(() => {
        const saved = localStorage.getItem("activeSession");
        if (saved) {
            try {
                const s = JSON.parse(saved);
                setMode(s.mode);
                setMainTask(s.mainTask);
                setSubTask(s.subTask);
                setTitle(s.title);
                setDesc(s.desc);
                setSeconds(s.seconds);
                setGoalMinutes(s.goalMinutes);
                setStartTime(s.startTime ? new Date(s.startTime) : null);
                setPaused(s.paused);
                setPausedTotal(s.pausedTotal);
                setPauseStart(s.pauseStart ? new Date(s.pauseStart) : null);
                setActive(true);
            } catch (e) {
                console.error("Failed to restore session:", e);
                localStorage.removeItem("activeSession");
            }
        }
    }, []);

    /* ---------- Save to localStorage whenever state changes ---------- */
    useEffect(() => {
        if (active) {
            const state = {
                mode,
                mainTask,
                subTask,
                title,
                desc,
                seconds,
                goalMinutes,
                startTime,
                paused,
                pausedTotal,
                pauseStart,
            };
            localStorage.setItem("activeSession", JSON.stringify(state));
        } else {
            localStorage.removeItem("activeSession");
        }
    }, [
        active,
        mode,
        mainTask,
        subTask,
        title,
        desc,
        seconds,
        goalMinutes,
        startTime,
        paused,
        pausedTotal,
        pauseStart,
    ]);

    /* ---------- Countdown effect ---------- */
    useEffect(() => {
        let timer;
        if (active && !paused && seconds > 0) {
            timer = setInterval(() => setSeconds((s) => s - 1), 1000);
        }
        if (active && seconds === 0) {
            stop(); // auto-stop
        }
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, paused, seconds]);

    /* ---------- Auto-set title/goal from subtask ---------- */
    useEffect(() => {
        if (mode === "sub" && subTask && subTask !== "Custom...") {
            const found = subtasks.find((s) => s.name === subTask);
            if (found && found.minutes) {
                setGoalMinutes(found.minutes);
                setTitle(found.name);
            }
        }
    }, [subTask, mode]);

    const start = () => {
        if (!title.trim() && !mainTask && !subTask) {
            alert("Pick a task or type a title!");
            return;
        }
        setActive(true);
        setPaused(false);
        setSeconds(goalMinutes * 60);
        setStartTime(new Date());
        setPausedTotal(0);
        setPauseStart(null);
    };

    const togglePause = () => {
        if (!paused) {
            setPauseStart(new Date());
        } else {
            if (pauseStart) {
                const delta = Math.floor((new Date() - pauseStart) / 1000);
                setPausedTotal((prev) => prev + delta);
            }
            setPauseStart(null);
        }
        setPaused(!paused);
    };

    const stop = () => {
        const end = new Date();
        let totalPaused = pausedTotal;
        if (pauseStart) {
            totalPaused += Math.floor((end - pauseStart) / 1000);
        }

        // map to backend-friendly mode
        let backendMode = "main";
        if (mainTask === "School") backendMode = "school";
        else if (mainTask === "Reading") backendMode = "reading";
        else if (mainTask === "Reading Manga") backendMode = "manga";

        const session = {
            id: Date.now(),
            mode: backendMode,
            mainTask,
            subTask,
            title: title || mainTask || subTask,
            desc,
            seconds: goalMinutes * 60 - seconds,
            goalMinutes,
            startTime,
            endTime: end,
            pausedTime: totalPaused,
        };

        onFinish(session);
        reset();
    };

    const cancel = () => {
        if (window.confirm("Cancel this session? It will not be saved.")) {
            reset();
        }
    };

    const reset = () => {
        setTitle("");
        setDesc("");
        setMainTask("");
        setSubTask("");
        setSeconds(0);
        setActive(false);
        setPaused(false);
        setGoalMinutes(15);
        setStartTime(null);
        setPauseStart(null);
        setPausedTotal(0);
        localStorage.removeItem("activeSession"); // clear on reset
    };

    const color =
        mode === "main"
            ? { btn: "bg-red-600 hover:bg-red-700", text: "text-red-500" }
            : { btn: "bg-orange-500 hover:bg-orange-600", text: "text-orange-500" };

    return (
        <div className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
                <TimerIcon className={`w-5 h-5 ${color.text}`} /> Timer
            </h2>

            {!active ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                            {mode === "main" ? "Main Task" : "Subtask"}
                        </span>
                        <button
                            onClick={() => setMode(mode === "main" ? "sub" : "main")}
                            className="flex items-center gap-1 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                        >
                            <Repeat className="w-3 h-3" />
                            Switch to {mode === "main" ? "Subtask" : "Main"}
                        </button>
                    </div>

                    {mode === "main" ? (
                        <>
                            <Dropdown
                                label="Main Task"
                                options={mainTasks}
                                selected={mainTask}
                                setSelected={setMainTask}
                            />
                            {mainTask === "Custom..." && (
                                <input
                                    className="w-full border rounded-lg px-3 py-2 mt-2"
                                    placeholder="Type your custom main task"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            <Dropdown
                                label="Subtask"
                                options={subtasks.map((s) => s.name)}
                                selected={subTask}
                                setSelected={setSubTask}
                            />
                            {subTask === "Custom..." && (
                                <input
                                    className="w-full border rounded-lg px-3 py-2 mt-2"
                                    placeholder="Type your custom subtask"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            )}
                        </>
                    )}

                    <label className="block">
                        <span className="text-sm font-medium text-gray-700">Duration</span>
                        <Dropdown
                            label="Minutes"
                            options={countdownOptions.map((m) => `${m} minutes`)}
                            selected={`${goalMinutes} minutes`}
                            setSelected={(val) =>
                                setGoalMinutes(parseInt(val.replace(" minutes", "")))
                            }
                        />
                    </label>

                    <textarea
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="Description (optional)"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                    />

                    <button
                        onClick={start}
                        className={`${color.btn} text-white px-4 py-2 rounded-xl transition`}
                    >
                        Start Timer
                    </button>
                </div>
            ) : (
                <div className="space-y-3 text-center">
                    <p className="font-semibold">{title || mainTask || subTask}</p>
                    <p className="text-gray-500">{desc}</p>
                    <h3 className="text-3xl font-bold">
                        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
                    </h3>
                    <p className="text-sm text-indigo-600">🎯 Goal: {goalMinutes} min</p>

                    <div className="flex justify-center gap-3 flex-wrap">
                        <button
                            onClick={togglePause}
                            className="flex items-center gap-1 bg-yellow-500 text-white px-4 py-2 rounded-xl hover:bg-yellow-600 transition"
                        >
                            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            {paused ? "Resume" : "Pause"}
                        </button>
                        <button
                            onClick={stop}
                            className={`flex items-center gap-1 ${color.btn} text-white px-4 py-2 rounded-xl transition`}
                        >
                            <StopCircle className="w-4 h-4" /> Finish
                        </button>
                        <button
                            onClick={cancel}
                            className="flex items-center gap-1 bg-gray-400 text-white px-4 py-2 rounded-xl hover:bg-gray-500 transition"
                        >
                            ✖ Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
