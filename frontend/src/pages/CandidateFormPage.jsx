import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createCandidate } from "@/api/client";
import { STATUSES, ROLES } from "@/constants";

export default function CandidateFormPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    status: "new",
    role_applied: "",
    company: "",
    years_of_experience: "",
    skills: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = {
        ...form,
        years_of_experience: form.years_of_experience
          ? Number(form.years_of_experience)
          : null,
        skills: form.skills
          ? form.skills.split(",").map((s) => s.trim()).filter(Boolean)
          : null,
      };
      const candidate = await createCandidate(data);
      navigate(`/candidates/${candidate.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
          <h1 className="text-xl font-bold text-gray-800 mb-6">
            Add Candidate
          </h1>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  className="border border-gray-300 p-2.5 w-full rounded-lg text-sm"
                  value={form.first_name}
                  onChange={set("first_name")}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  className="border border-gray-300 p-2.5 w-full rounded-lg text-sm"
                  value={form.last_name}
                  onChange={set("last_name")}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                className="border border-gray-300 p-2.5 w-full rounded-lg text-sm"
                type="email"
                value={form.email}
                onChange={set("email")}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Applied *
                </label>
                <input
                  className="border border-gray-300 p-2.5 w-full rounded-lg text-sm"
                  list="roles"
                  value={form.role_applied}
                  onChange={set("role_applied")}
                  required
                />
                <datalist id="roles">
                  {ROLES.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="border border-gray-300 p-2.5 w-full rounded-lg text-sm bg-white"
                  value={form.status}
                  onChange={set("status")}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  className="border border-gray-300 p-2.5 w-full rounded-lg text-sm"
                  value={form.company}
                  onChange={set("company")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Exp
                </label>
                <input
                  className="border border-gray-300 p-2.5 w-full rounded-lg text-sm"
                  type="number"
                  min="0"
                  value={form.years_of_experience}
                  onChange={set("years_of_experience")}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills
              </label>
              <input
                className="border border-gray-300 p-2.5 w-full rounded-lg text-sm"
                placeholder="Python, FastAPI, React..."
                value={form.skills}
                onChange={set("skills")}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                className="border border-gray-300 p-2.5 w-full rounded-lg text-sm resize-y"
                rows={3}
                value={form.notes}
                onChange={set("notes")}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link
                to="/"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? "Saving..." : "Save Candidate"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
