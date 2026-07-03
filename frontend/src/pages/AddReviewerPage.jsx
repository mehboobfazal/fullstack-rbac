import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUser, isAdmin } from "@/api/client";

export default function AddReviewerPage() {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    if (!isAdmin()) {
        navigate("/", { replace: true });
        return null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            await createUser(name, email, password);
            setSuccess(true);
            setName("");
            setEmail("");
            setPassword("");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <Link to="/" className="text-sm text-blue-600 hover:underline">
                    &larr; Back to Candidates
                </Link>
            </header>

            <div className="max-w-2xl mx-auto p-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h1 className="text-xl font-bold text-gray-800 mb-6">Add Reviewer</h1>

                    {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">{error}</p>}
                    {success && <p className="text-green-600 text-sm bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">Reviewer created successfully!</p>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <input className="border border-gray-300 p-2.5 w-full rounded-lg text-sm" type="text" placeholder="example" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input className="border border-gray-300 p-2.5 w-full rounded-lg text-sm" type="email" placeholder="reviewer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                            <input className="border border-gray-300 p-2.5 w-full rounded-lg text-sm" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Link to="/" className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">
                                Cancel
                            </Link>
                            <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                                {loading ? "Creating..." : "Create Reviewer"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
