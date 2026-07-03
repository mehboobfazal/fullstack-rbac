import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCandidate, addScore, triggerSummary, updateCandidate, isAdmin, getUserId, connectScoreStream } from "@/api/client";

const CATEGORIES = ["Technical Skills", "Communication", "Problem Solving", "Cultural Fit", "Experience"];

export default function CandidateDetailPage() {
    const { id } = useParams();
    const [candidate, setCandidate] = useState(null);
    const [scores, setScores] = useState([]);
    const [summary, setSummary] = useState("");
    const [summaryLoading, setSummaryLoading] = useState(false);

    const [category, setCategory] = useState(CATEGORIES[0]);
    const [scoreVal, setScoreVal] = useState("5");
    const [comment, setComment] = useState("");
    const [scoreError, setScoreError] = useState("");

    const [internalNotes, setInternalNotes] = useState("");
    const [notesSaving, setNotesSaving] = useState(false);
    const [notesSaved, setNotesSaved] = useState(false);

    const admin = isAdmin();
    const currentUserId = Number(getUserId());

    useEffect(() => {
        getCandidate(id).then((c) => {
            setCandidate(c);
            setInternalNotes(c.internal_notes || "");
            setScores(c.scores || []);
        });
    }, [id]);

    useEffect(() => {
        const ctrl = connectScoreStream(id, setScores);
        return () => ctrl.abort();
    }, [id]);

    async function handleScore(e) {
        e.preventDefault();
        setScoreError("");
        try {
            const s = await addScore(id, {
                category,
                score: Number(scoreVal),
                note: comment || undefined,
            });
            setScores((prev) => {
              const filtered = prev.filter((p) => p.category !== category);
              return [s, ...filtered];
            });
            setComment("");
        } catch (err) {
            setScoreError(err.message);
        }
    }

    async function handleSummary() {
        setSummaryLoading(true);
        setSummary("");
        try {
            const res = await triggerSummary(id);
            setSummary(res.summary);
        } catch {
            setSummary("Failed to generate summary.");
        } finally {
            setSummaryLoading(false);
        }
    }

    async function handleSaveNotes() {
        setNotesSaving(true);
        setNotesSaved(false);
        try {
            await updateCandidate(id, { internal_notes: internalNotes });
            setNotesSaved(true);
        } catch {
            setNotesSaved(false);
        } finally {
            setNotesSaving(false);
        }
    }

    if (!candidate) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <Link to="/" className="text-sm text-blue-600 hover:underline">
                    &larr; Back to Candidates
                </Link>
            </header>

            <div className="max-w-4xl mx-auto p-6 space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">
                                {candidate.first_name} {candidate.last_name}
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">
                                {candidate.email} &middot; {candidate.role_applied}
                            </p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${candidate.status === "new" ? "bg-blue-100 text-blue-700" : candidate.status === "reviewed" ? "bg-yellow-100 text-yellow-700" : candidate.status === "hired" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {candidate.status}
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {candidate.company && (
                            <div>
                                <span className="text-gray-400">Company</span>
                                <p className="font-medium">{candidate.company}</p>
                            </div>
                        )}
                        {candidate.years_of_experience != null && (
                            <div>
                                <span className="text-gray-400">Experience</span>
                                <p className="font-medium">{candidate.years_of_experience} yrs</p>
                            </div>
                        )}
                        {candidate.skills && candidate.skills.length > 0 && (
                            <div className="col-span-2 md:col-span-3">
                                <span className="text-gray-400">Skills</span>
                                <p className="font-medium">{candidate.skills.join(", ")}</p>
                            </div>
                        )}
                        {candidate.created_by_id && admin && (
                            <div>
                                <span className="text-gray-400">Created by</span>
                                <p className="font-medium">User #{candidate.created_by_id}</p>
                            </div>
                        )}
                        {candidate.notes && (
                            <div className="col-span-2 md:col-span-3">
                                <span className="text-gray-400">Notes</span>
                                <p className="font-medium whitespace-pre-wrap">{candidate.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {admin && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Internal Notes</h2>
                        <textarea className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-y" rows={3} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
                        <div className="flex items-center gap-3 mt-2">
                            <button onClick={handleSaveNotes} disabled={notesSaving} className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition">
                                {notesSaving ? "Saving..." : "Save"}
                            </button>
                            {notesSaved && <span className="text-green-600 text-sm">Saved</span>}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">AI Summary</h2>
                    <button onClick={handleSummary} disabled={summaryLoading} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition flex items-center gap-2">
                        {summaryLoading && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                        )}
                        {summaryLoading ? "Generating..." : "Generate Summary"}
                    </button>
                    {summary && <div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">{summary}</div>}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">Add Score</h2>
                    <form onSubmit={handleScore} className="space-y-3">
                        {scoreError && <p className="text-red-600 text-sm">{scoreError}</p>}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-gray-300 rounded-lg p-2.5 text-sm bg-white">
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                            <select value={scoreVal} onChange={(e) => setScoreVal(e.target.value)} className="border border-gray-300 rounded-lg p-2.5 text-sm bg-white">
                                {[5, 4, 3, 2, 1].map((n) => (
                                    <option key={n} value={n}>
                                        {n} / 5
                                    </option>
                                ))}
                            </select>
                            <button type="submit" className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition">
                                Submit Score
                            </button>
                        </div>
                        <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Optional comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
                    </form>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">Scores{admin ? "" : " (My Scores)"}</h2>
                    {scores.length === 0 ? (
                        <p className="text-sm text-gray-400">No scores yet.</p>
                    ) : !admin ? (
                        <div className="space-y-2">
                            {scores.map((s) => (
                                <div key={s.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3 text-sm">
                                    <div>
                                        <span className="font-semibold text-lg mr-2">{s.score}</span>
                                        <span className="text-gray-400 text-xs mr-3">{s.category}</span>
                                    </div>
                                    {s.note && <span className="text-gray-500">{s.note}</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        (() => {
                            const groups = {};
                            scores.forEach((s) => {
                                if (!groups[s.category]) groups[s.category] = [];
                                groups[s.category].push(s);
                            });
                            return Object.entries(groups).map(([cat, items]) => (
                                <div key={cat} className="mb-4 last:mb-0">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1">{cat}</h3>
                                    <div className="space-y-1.5">
                                        {items.map((s) => {
                                            const mine = s.reviewer_id === currentUserId;
                                            return (
                                                <div
                                                    key={s.id}
                                                    className={`flex items-center justify-between rounded-lg p-3 text-sm border ${
                                                        mine
                                                            ? "bg-blue-50 border-blue-200"
                                                            : "bg-white border-gray-100"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-lg">{s.score}</span>
                                                        <span className="text-gray-400 text-xs">/ 5</span>
                                                        <span className="text-gray-500 text-xs ml-1">{s.reviewer_name}</span>
                                                        {mine && (
                                                            <span className="text-xs bg-blue-200 text-blue-800 font-semibold px-1.5 py-0.5 rounded">
                                                                you
                                                            </span>
                                                        )}
                                                    </div>
                                                    {s.note && <span className="text-gray-500 ml-2">{s.note}</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ));
                        })()
                    )}
                </div>
            </div>
        </div>
    );
}
