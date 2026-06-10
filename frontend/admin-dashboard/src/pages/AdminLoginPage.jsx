import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SparklesIcon, EnvelopeIcon, LockClosedIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

export default function AdminLoginPage() {
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
      if (me.data.role !== "ADMIN") {
        sessionStorage.clear();
        setError("Access denied — administrator account required.");
        setLoading(false);
        return;
      }
      sessionStorage.setItem("user_name", me.data.full_name);
      navigate("/");
    } catch { setError("Invalid credentials."); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4"
      style={{ backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(37,99,235,.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(124,58,237,.15) 0%, transparent 60%)" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}
        className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-xl">
            <SparklesIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SmartPass Admin</h1>
          <p className="text-slate-400 text-sm mt-2">Sign in to your admin console</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-xl px-4 py-3 mb-5 text-center">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email address</label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  disabled={loading} placeholder="admin@example.com"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 pl-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/50 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  disabled={loading} placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 pl-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/50 transition-all" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-all mt-2 disabled:opacity-60">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</> : "Sign in to Admin Console"}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-600">
          <ShieldCheckIcon className="w-4 h-4" /> Admin access only — unauthorised attempts are logged
        </div>
      </motion.div>
    </div>
  );
}
