// src/pages/ForgotPasswordPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { SparklesIcon, EnvelopeIcon, ArrowLeftIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await API.post("/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
          <p className="text-sm text-slate-500 mt-1">
            We'll send you a link to create a new password.
          </p>
        </div>

        <div className="card p-8 shadow-xl">
          {success ? (
            <div className="text-center py-4">
              <CheckCircleIcon className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
              <p className="text-emerald-600 font-medium text-lg">Check your inbox</p>
              <p className="text-sm text-slate-500 mt-1">
                We sent a reset link to <strong>{email}</strong>
              </p>
              <p className="text-xs text-slate-400 mt-2">(Don't forget to check your spam folder)</p>
              <Link
                to="/login"
                className="btn-primary mt-6 inline-block"
              >
                Back to sign in
              </Link>
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
                  Email address
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    placeholder="you@example.com"
                    className="input pl-10"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary justify-center py-3.5 text-base"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" /> Back to sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}