import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SparklesIcon, EnvelopeIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const form = new URLSearchParams({ username: email, password });
      const res = await API.post("/auth/login", form);
      sessionStorage.setItem("access_token", res.data.access_token);
      const me = await API.get("/auth/me");
      sessionStorage.setItem("user_name", me.data.full_name);
      const intendedId = sessionStorage.getItem("intendedEventId");
      if (intendedId) { sessionStorage.removeItem("intendedEventId"); navigate(`/checkout?eventId=${intendedId}`); }
      else navigate("/");
    } catch { setError("Invalid email or password."); setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-slate-50">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}
        className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-md">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your SmartPass account</p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 mb-5 text-center">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  disabled={loading} placeholder="you@example.com"
                  className="input pl-10" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  disabled={loading} placeholder="••••••••"
                  className="input pl-10" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary justify-center py-3 mt-2">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">Create one free</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
