import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SparklesIcon, UserIcon, EnvelopeIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await API.post("/auth/register", { full_name: fullName, email, password });
      navigate("/login?registered=1");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
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
          <h1 className="text-3xl font-extrabold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Join SmartPass it's free forever for attendees</p>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-100">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 mb-5 flex items-start gap-2">
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError("")}
                className="text-rose-400 hover:text-rose-600 transition-colors"
              >
                ✕
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Full name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  placeholder="Jane Smith"
                  className="w-full pl-12 pr-4 py-3.5 text-base text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Email */}
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
                  placeholder="jane@example.com"
                  className="w-full pl-12 pr-4 py-3.5 text-base text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="min. 8 characters"
                  className="w-full pl-12 pr-4 py-3.5 text-base text-slate-900 bg-white border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-base font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-brand-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}