import React from "react";
import { CheckCircle } from "lucide-react";

export default function Checkin({ checkedIn, onCheckin, comment }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-500" /> Daily Check-in
      </h2>
      {checkedIn ? (
        <p className="text-green-600 font-medium">
          ✅ Checked in! Comment: <b>{comment}</b>
        </p>
      ) : (
        <button
          onClick={onCheckin}
          className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition"
        >
          Check-in
        </button>
      )}
    </div>
  );
}
