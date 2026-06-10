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
    setLoading(true); setError("");
    try {
      await API.post("/auth/register", { full_name: fullName, email, password });
      navigate("/login?registered=1");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed."); setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-slate-50">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}
        className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-md">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Join SmartPass — it's free forever for attendees</p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3 mb-5 text-center">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Full name", icon: UserIcon, type: "text", val: fullName, set: setFullName, ph: "Jane Smith" },
              { label: "Email address", icon: EnvelopeIcon, type: "email", val: email, set: setEmail, ph: "jane@example.com" },
              { label: "Password", icon: LockClosedIcon, type: "password", val: password, set: setPassword, ph: "min. 8 characters" },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{f.label}</label>
                <div className="relative">
                  <f.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type={f.type} required value={f.val} onChange={(e) => f.set(e.target.value)}
                    disabled={loading} placeholder={f.ph} className="input pl-10" />
                </div>
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full btn-primary justify-center py-3 mt-2">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
