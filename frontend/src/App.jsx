import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "@/api/client";
import LoginPage from "@/pages/LoginPage";
import CandidateListPage from "@/pages/CandidateListPage";
import CandidateDetailPage from "@/pages/CandidateDetailPage";
import CandidateFormPage from "@/pages/CandidateFormPage";
import AddReviewerPage from "@/pages/AddReviewerPage";

function ProtectedRoute({ children }) {
    if (!isAuthenticated()) return <Navigate to="/login" replace />;
    return children;
}

function PublicRoute({ children }) {
    if (isAuthenticated()) return <Navigate to="/" replace />;
    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <LoginPage />
                        </PublicRoute>
                    }
                />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <CandidateListPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/candidates/new"
                    element={
                        <ProtectedRoute>
                            <CandidateFormPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/candidates/:id"
                    element={
                        <ProtectedRoute>
                            <CandidateDetailPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/reviewers/new"
                    element={
                        <ProtectedRoute>
                            <AddReviewerPage />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
