import { useEffect, useState, useCallback } from "react";
import {
  ShieldExclamationIcon, ShieldCheckIcon, ArrowPathIcon,
  ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import API from "../services/api";

const RISK_COLOR = (score) => {
  if (score >= 0.7) return { text: "text-rose-600", bg: "bg-rose-100", label: "High Risk" };
  if (score >= 0.4) return { text: "text-amber-600", bg: "bg-amber-100", label: "Medium" };
  return { text: "text-emerald-600", bg: "bg-emerald-100", label: "Low Risk" };
};

export default function FraudPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minRisk, setMinRisk] = useState(0);
  const [blockingId, setBlockingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await API.get("/admin/fraud"); setList(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const block = async (id) => {
    if (!window.confirm(`Block ticket #${id}?`)) return;
    setBlockingId(id);
    try { await API.post(`/admin/tickets/${id}/block`); load(); }
    catch { alert("Failed to block."); }
    finally { setBlockingId(null); }
  };

  const filtered = list.filter((f) => (f.risk_score || 0) >= minRisk);

  const high   = list.filter((f) => (f.risk_score || 0) >= 0.7).length;
  const medium = list.filter((f) => (f.risk_score || 0) >= 0.4 && (f.risk_score || 0) < 0.7).length;
  const low    = list.filter((f) => (f.risk_score || 0) < 0.4).length;
  const blocked = list.filter((f) => f.status === "blocked").length;

  const pieData = [
    { name: "High Risk", value: high, color: "#EF4444" },
    { name: "Medium",    value: medium, color: "#F59E0B" },
    { name: "Low Risk",  value: low,    color: "#10B981" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
            <ShieldExclamationIcon className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Fraud Monitor</h1>
            <p className="text-sm text-slate-500">Real-time AI risk scoring for all tickets</p>
          </div>
        </div>
        <button onClick={load} className="btn-outline"><ArrowPathIcon className="w-4 h-4" /> Refresh</button>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "High Risk", value: high, icon: ExclamationTriangleIcon, bg: "bg-rose-50", color: "text-rose-600", border: "border-rose-200" },
          { label: "Medium Risk", value: medium, icon: ExclamationTriangleIcon, bg: "bg-amber-50", color: "text-amber-600", border: "border-amber-200" },
          { label: "Low Risk", value: low, icon: CheckCircleIcon, bg: "bg-emerald-50", color: "text-emerald-600", border: "border-emerald-200" },
          { label: "Blocked", value: blocked, icon: XCircleIcon, bg: "bg-slate-100", color: "text-slate-600", border: "border-slate-200" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .06 }}
            className={`card p-4 flex items-center gap-4 border ${s.border}`}>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart + filter */}
      <div className="grid lg:grid-cols-3 gap-5">
        {pieData.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Risk Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={45} paddingAngle={3}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 mt-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}: <span className="font-semibold text-slate-900">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`card p-5 ${pieData.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <h3 className="font-semibold text-slate-900 mb-4">Risk Score Filter</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Minimum score:</span>
              <span className="font-bold text-brand-700">{Math.round(minRisk * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.01" value={minRisk}
              onChange={(e) => setMinRisk(parseFloat(e.target.value))}
              className="w-full accent-brand-600" />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0% — All</span>
              <span>40% — Medium+</span>
              <span>70% — High only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card h-48 skeleton" />
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <ShieldCheckIcon className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
          <p className="font-semibold text-slate-700">No tickets meet this threshold</p>
          <p className="text-sm text-slate-400 mt-1">Lower the filter to see more results.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{filtered.length} tickets flagged</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3.5">Ticket</th>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Event</th>
                  <th className="px-5 py-3.5">Risk Score</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => {
                  const rc = RISK_COLOR(f.risk_score || 0);
                  return (
                    <motion.tr key={f.ticket_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * .03 }}
                      className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">#{f.ticket_id}</td>
                      <td className="px-5 py-3 text-slate-600">U-{f.user_id}</td>
                      <td className="px-5 py-3 text-slate-600">E-{f.event_id}</td>
                      <td className="px-5 py-3">
                        <span className={`badge ${rc.bg} ${rc.text} flex items-center gap-1.5 w-fit`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rc.text.replace("text", "bg")}`} />
                          {Math.round((f.risk_score || 0) * 100)}% — {rc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`badge ${f.status === "active" ? "bg-emerald-50 text-emerald-700" : f.status === "blocked" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
                          {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => block(f.ticket_id)}
                          disabled={blockingId === f.ticket_id || f.status !== "active"}
                          className="btn-danger text-xs !py-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                          {blockingId === f.ticket_id ? "Blocking…" : "Block"}
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
