import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import quotes from "../quotes.json"; // 👈 import your local quotes.json

export default function DailyGreeting({ setSkips }) {
    const [quote, setQuote] = useState("");
    const [image, setImage] = useState("");
    const [dayName, setDayName] = useState("");
    const [isSunday, setIsSunday] = useState(false);
    const [claimed, setClaimed] = useState(false);
    const [skipCount, setSkipCount] = useState(null);

    useEffect(() => {
        // 🗓️ detect current day in Bangkok
        const tzDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
        const today = new Date(tzDate);
        const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        setDayName(names[today.getDay()]);
        setIsSunday(today.getDay() === 0);

        // ✨ pick random local quote
        const random = quotes[Math.floor(Math.random() * quotes.length)];
        if (today.getDay() != 0) {
            setQuote(random.q);

        } else {
            setQuote("Practice is when something works, but you don't know why. Programmers combine theory and practice: Nothing works and they don't know why.");


        }

        // 🌄 random image from Picsum
        setImage(`https://picsum.photos/800/400?random=${Date.now()}`);
    }, []);

    async function claimSkip() {
        try {
            const token = await getAuth().currentUser?.getIdToken(true);
            const res = await fetch(import.meta.env.VITE_GET_SKIP, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to claim skip");

            setSkipCount(data.skips ?? null);
            setSkips(data.skips ?? 0);
            setClaimed(true);
            alert("🎉 Skip granted!");
        } catch (err) {
            alert(`❌ ${err.message}`);
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow p-6 text-center space-y-4">
            <h2 className="text-lg font-bold">Happy {dayName}!</h2>

            {quote && <p className="italic text-gray-700">“{quote}”</p>}

            {image && (
                <div>
                    <img
                        src={image}
                        alt="Chill inspiration"
                        className="w-full h-64 object-cover rounded-lg shadow"
                    />
                </div>
            )}

            {isSunday && (
                <div className="mt-4">
                    <p className="font-semibold text-green-700">
                        🎉 Congratulations! Today is Sunday. You can claim a free Skip.
                    </p>
                    {!claimed ? (
                        <button
                            onClick={claimSkip}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl mt-2"
                        >
                            Claim Skip
                        </button>
                    ) : (
                        <p className="text-sm text-gray-500">
                            ✅ Already claimed today {skipCount !== null ? `(Skips: ${skipCount})` : ""}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
