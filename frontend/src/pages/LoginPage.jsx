import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/api/client";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            navigate("/");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-96 space-y-5">
                <h1 className="text-2xl font-bold text-center text-gray-800">Candidate Scoring Platform</h1>
                <p className="text-sm text-gray-500 text-center">Sign in to continue</p>

                {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input className="border border-gray-300 p-2.5 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" type="email" placeholder="example@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input className="border border-gray-300 p-2.5 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" type="password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2">
                    {loading && (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                    )}
                    {loading ? "Signing in..." : "Sign In"}
                </button>

                <p className="text-sm text-center text-gray-500">
                    Contact your admin for access.
                </p>
            </form>
        </div>
    );
}
