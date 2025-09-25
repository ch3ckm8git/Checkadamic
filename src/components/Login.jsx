import React from "react";
import { loginWithGoogle } from "../firebase";

export default function Login() {
  const handleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      console.log("User logged in:", user);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-2xl shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">Checkadamic</h1>
        <button
          onClick={handleLogin}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl font-semibold"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
