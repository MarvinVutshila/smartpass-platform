// src/pages/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  SparklesIcon, EnvelopeIcon, LockClosedIcon, 
  EyeIcon, EyeSlashIcon, ExclamationCircleIcon 
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const form = new URLSearchParams({ username: email, password });
      const res = await API.post("/auth/login", form);
      sessionStorage.setItem("access_token", res.data.access_token);
      
      const me = await API.get("/auth/me");
      sessionStorage.setItem("user_name", me.data.full_name);
      sessionStorage.setItem("user_email", me.data.email);   // <-- ADDED
      
      const intendedId = sessionStorage.getItem("intendedEventId");
      if (intendedId) {
        sessionStorage.removeItem("intendedEventId");
        navigate(`/checkout?eventId=${intendedId}`);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-8 bg-slate-50">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <SparklesIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your SmartPass account</p>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-100">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
              <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
              <button
                onClick={() => setError("")}
                className="ml-auto text-rose-400 hover:text-rose-600 transition-colors"
              >
                ✕
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3.5 text-base text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 text-base text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 focus:ring-2"
                />
                <span className="text-slate-600">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-base font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-brand-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Create one free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}