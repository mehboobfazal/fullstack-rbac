import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listCandidates, deleteCandidate, clearToken, isAdmin } from "@/api/client";
import { STATUSES, ROLES } from "@/constants";
import ConfirmDialog from "@/components/ConfirmDialog";
import useDebounce from "@/hooks/useDebounce";

export default function CandidateListPage() {
    const navigate = useNavigate();
    const [data, setData] = useState({ items: [], total: 0 });
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(20);

    const [status, setStatus] = useState("");
    const [roleApplied, setRoleApplied] = useState("");

    const [skillInput, setSkillInput] = useState("");
    const [keywordInput, setKeywordInput] = useState("");
    const skill = useDebounce(skillInput, 300);
    const keyword = useDebounce(keywordInput, 300);

    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        setPage(0);
    }, [skill, keyword]);

    const fetchData = useCallback(() => {
        const params = { offset: page * limit, limit };
        if (status) params.status = status;
        if (roleApplied) params.role_applied = roleApplied;
        if (skill) params.skill = skill;
        if (keyword) params.keyword = keyword;
        listCandidates(params).then(setData);
    }, [page, limit, status, roleApplied, skill, keyword]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function handleFilterChange(setter) {
        return (e) => {
            setter(e.target.value);
            setPage(0);
        };
    }

    function handleLogout() {
        clearToken();
        window.location.href = "/login";
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        try {
            await deleteCandidate(deleteTarget.id);
            setDeleteTarget(null);
            fetchData();
        } catch {
            setDeleteTarget(null);
        }
    }

    const admin = isAdmin();
    const totalPages = Math.ceil(data.total / limit);

    return (
        <div className="min-h-screen bg-gray-50">
            <ConfirmDialog open={!!deleteTarget} title="Delete Candidate" message={`Are you sure you want to delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}? This action cannot be undone.`} confirmLabel="Delete" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />

            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-800">Candidates</h1>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate("/candidates/new")} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                        + Add Candidate
                    </button>
                    {admin && (
                        <button onClick={() => navigate("/admin/reviewers/new")} className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 transition">
                            + Add Reviewer
                        </button>
                    )}
                    <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 transition">
                        Logout
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select value={status} onChange={handleFilterChange(setStatus)} className="border border-gray-300 rounded-lg p-2.5 text-sm bg-white">
                        <option value="">All Statuses</option>
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                        ))}
                    </select>

                    <select value={roleApplied} onChange={handleFilterChange(setRoleApplied)} className="border border-gray-300 rounded-lg p-2.5 text-sm bg-white">
                        <option value="">All Roles</option>
                        {ROLES.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>

                    <input className="border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Skill (e.g. Python)" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} />

                    <input className="border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="Name or email..." value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                                <th className="p-3 border-b">Name</th>
                                <th className="p-3 border-b">Email</th>
                                <th className="p-3 border-b">Role Applied</th>
                                <th className="p-3 border-b">Status</th>
                                {admin && <th className="p-3 border-b text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.length === 0 ? (
                                <tr>
                                    <td colSpan={admin ? 5 : 4} className="p-6 text-center text-gray-400 text-sm">
                                        No candidates found.
                                    </td>
                                </tr>
                            ) : (
                                data.items.map((c) => (
                                    <tr key={c.id} className="hover:bg-blue-50 transition border-b last:border-0">
                                        <td className="p-3">
                                            <Link to={`/candidates/${c.id}`} className="text-blue-700 font-medium hover:underline">
                                                {c.first_name} {c.last_name}
                                            </Link>
                                        </td>
                                        <td className="p-3 text-gray-600 text-sm">{c.email}</td>
                                        <td className="p-3 text-sm">{c.role_applied}</td>
                                        <td className="p-3">
                                            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${c.status === "new" ? "bg-blue-100 text-blue-700" : c.status === "reviewed" ? "bg-yellow-100 text-yellow-700" : c.status === "hired" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{c.status}</span>
                                        </td>
                                        {admin && (
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Link to={`/candidates/${c.id}`} className="text-xs px-2.5 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition">
                                                        View
                                                    </Link>
                                                    <button onClick={() => setDeleteTarget(c)} className="text-xs px-2.5 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition">
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-3">
                        <span>{data.total === 0 ? "No results" : `Showing ${page * limit + 1}–${Math.min((page + 1) * limit, data.total)} of ${data.total}`}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">Per page:</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(0);
                            }}
                            className="border border-gray-300 rounded-lg p-1.5 text-sm bg-white"
                        >
                            <option value={20}>20</option>
                            <option value={40}>40</option>
                            <option value={50}>50</option>
                        </select>
                        <div className="flex gap-2">
                            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                &larr; Prev
                            </button>
                            <span className="self-center text-xs text-gray-400">{totalPages > 0 ? `Page ${page + 1} of ${totalPages}` : ""}</span>
                            <button disabled={(page + 1) * limit >= data.total} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                Next &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
