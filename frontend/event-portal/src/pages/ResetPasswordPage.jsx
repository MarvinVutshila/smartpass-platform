// src/pages/ResetPasswordPage.jsx
import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { SparklesIcon, LockClosedIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await API.post("/auth/reset-password", { token, new_password: password });
      setSuccess(true);
      setTimeout(() => navigate("/login?reset=1"), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired token.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-slate-50">
        <div className="card p-8 max-w-md text-center shadow-xl">
          <ExclamationCircleIcon className="w-14 h-14 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Missing reset token</h2>
          <p className="text-sm text-slate-500 mt-2">
            The password reset link is invalid or has expired.
          </p>
          <Link to="/forgot-password" className="btn-primary mt-6 inline-block">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <SparklesIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
          <p className="text-sm text-slate-500 mt-1">Choose a strong, unique password.</p>
        </div>

        <div className="card p-8 shadow-xl">
          {success ? (
            <div className="text-center py-4">
              <CheckCircleIcon className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
              <p className="text-emerald-600 font-medium text-lg">Password updated!</p>
              <p className="text-sm text-slate-500 mt-1">Redirecting to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 text-center">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Min. 8 characters"
                    className="input pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm password
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                    placeholder="Confirm your password"
                    className="input pl-10"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary justify-center py-3.5 text-base"
              >
                {loading ? "Updating…" : "Reset password"}
              </button>
            </form>
          )}
          <p className="text-center text-sm text-slate-500 mt-6">
            <Link
              to="/login"
              className="font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              ← Back to sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}