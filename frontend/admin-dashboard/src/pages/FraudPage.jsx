import { useEffect, useState, useCallback } from "react";
import {
  ShieldExclamationIcon, ShieldCheckIcon, ArrowPathIcon,
  ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon,
  TicketIcon, QrCodeIcon, ClockIcon,
  EyeIcon, EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import API from "../services/api";

// ─── Risk colour helper ──────────────────────────────────────────────
const RISK_COLOR = (score) => {
  if (score >= 0.7) return { text: "text-rose-600", bg: "bg-rose-100", label: "High Risk", color: "#EF4444" };
  if (score >= 0.4) return { text: "text-amber-600", bg: "bg-amber-100", label: "Medium", color: "#F59E0B" };
  return { text: "text-emerald-600", bg: "bg-emerald-100", label: "Low Risk", color: "#10B981" };
};

const ACTIVITY_ICONS = {
  purchase: { icon: TicketIcon, label: "Ticket Purchased", color: "text-brand-600", bg: "bg-brand-50" },
  checkin: { icon: QrCodeIcon, label: "Ticket Scanned", color: "text-emerald-600", bg: "bg-emerald-50" },
  fraud_alert: { icon: ExclamationTriangleIcon, label: "Fraud Alert", color: "text-rose-600", bg: "bg-rose-50" },
  blocked: { icon: XCircleIcon, label: "Ticket Blocked", color: "text-slate-600", bg: "bg-slate-100" },
};

export default function FraudPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minRisk, setMinRisk] = useState(0);
  const [blockingId, setBlockingId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [showActivity, setShowActivity] = useState(true);
  const [stats, setStats] = useState({ totalTickets: 0, scannedToday: 0, fraudAlerts: 0, blocked: 0 });

  // ─── Load fraud data ────────────────────────────────────────────────
  const loadFraudData = useCallback(async () => {
    try {
      const r = await API.get("/admin/fraud");
      let data = r.data;
      if (data && typeof data === "object" && !Array.isArray(data) && data.tickets) {
        data = data.tickets;
      }
      if (!Array.isArray(data)) data = [];
      // Normalise each ticket
      data = data.map(item => ({
        ...item,
        risk_score: item.risk_score ?? 0,
        status: item.status || 'unknown',
        last_scanned: item.last_scanned || null,
      }));
      setList(data);

      // ✅ Fix: compare today's date in UTC (ISO date string)
      const todayUTC = new Date().toISOString().split('T')[0]; // "2026-09-06"
      const scannedToday = data.filter(f => 
        f.last_scanned && f.last_scanned.startsWith(todayUTC)
      ).length;

      const high = data.filter(f => (f.risk_score || 0) >= 0.7).length;
      const medium = data.filter(f => (f.risk_score || 0) >= 0.4 && (f.risk_score || 0) < 0.7).length;
      const blocked = data.filter(f => f.status === "blocked").length;

      setStats({
        totalTickets: data.length,
        scannedToday,
        fraudAlerts: high + medium,
        blocked,
      });
    } catch (e) {
      console.error("Error loading fraud data:", e);
      setList([]);
    }
  }, []);

  // ─── Load live activity ─────────────────────────────────────────────
  const loadActivities = useCallback(async () => {
    try {
      const r = await API.get("/admin/activities/recent");
      let data = r.data;
      if (!Array.isArray(data)) data = data?.activities || [];
      // Sort by timestamp descending (most recent first)
      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivities(data.slice(0, 20));
    } catch (e) {
      console.error("Error loading activities:", e);
      setActivities([]);
    }
  }, []);

  // ─── Load all ──────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadFraudData(), loadActivities()]);
    setLoading(false);
  }, [loadFraudData, loadActivities]);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 15000);
    return () => clearInterval(t);
  }, [loadAll]);

  // ─── Block ticket ──────────────────────────────────────────────────
  const block = async (id) => {
    if (!window.confirm(`Block ticket #${id}?`)) return;
    setBlockingId(id);
    try {
      await API.post(`/admin/tickets/${id}/block`);
      loadAll();
    } catch {
      alert("Failed to block.");
    } finally {
      setBlockingId(null);
    }
  };

  const filtered = list.filter(f => (f.risk_score || 0) >= minRisk);
  const high = list.filter(f => (f.risk_score || 0) >= 0.7).length;
  const medium = list.filter(f => (f.risk_score || 0) >= 0.4 && (f.risk_score || 0) < 0.7).length;
  const low = list.filter(f => (f.risk_score || 0) < 0.4).length;
  const pieData = [
    { name: "High Risk", value: high, color: "#EF4444" },
    { name: "Medium", value: medium, color: "#F59E0B" },
    { name: "Low Risk", value: low, color: "#10B981" },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-4 py-8">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-lg">
            <ShieldExclamationIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Fraud Monitor</h1>
            <p className="text-sm text-slate-500">Real‑time risk scoring & live ticket activity</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live
          </span>
          <button
            onClick={loadAll}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ─── Stats Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Tickets", value: stats.totalTickets, icon: TicketIcon, bg: "bg-brand-50", color: "text-brand-600" },
          { label: "Scanned Today", value: stats.scannedToday, icon: QrCodeIcon, bg: "bg-emerald-50", color: "text-emerald-600" },
          { label: "Fraud Alerts", value: stats.fraudAlerts, icon: ExclamationTriangleIcon, bg: "bg-rose-50", color: "text-rose-600" },
          { label: "Blocked", value: stats.blocked, icon: XCircleIcon, bg: "bg-slate-100", color: "text-slate-600" },
        ].map((s, i) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Chart + Filter + Activity ────────────────────────────── */}
      <div className="grid lg:grid-cols-4 gap-5">
        {pieData.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 lg:col-span-1">
            <h3 className="font-semibold text-slate-900 mb-4">Risk Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={45} paddingAngle={3}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 mt-2 text-xs">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  {d.name}: <span className="font-semibold text-slate-900">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 lg:col-span-1">
          <h3 className="font-semibold text-slate-900 mb-4">Risk Score Filter</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Minimum score:</span>
              <span className="font-bold text-brand-700">{Math.round(minRisk * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={minRisk}
              onChange={(e) => setMinRisk(parseFloat(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0% — All</span>
              <span>40% — Medium+</span>
              <span>70% — High only</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Live Activity
            </h3>
            <button
              onClick={() => setShowActivity(!showActivity)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showActivity ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
          {activities.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">No recent activity</div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {activities.slice(0, 8).map((act, i) => {
                const type = ACTIVITY_ICONS[act.type] || ACTIVITY_ICONS.purchase;
                const Icon = type.icon;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-2.5 rounded-xl ${act.type === "fraud_alert" ? "bg-rose-50 border border-rose-100" : "hover:bg-slate-50 transition-colors"}`}
                  >
                    <div className={`w-8 h-8 rounded-xl ${type.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${type.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{type.label}</p>
                        {act.type === "fraud_alert" && (
                          <span className="badge bg-rose-100 text-rose-700 text-xs">⚠️</span>
                        )}
                        <span className="text-xs text-slate-400 ml-auto flex-shrink-0">
                          {new Date(act.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        Ticket #{act.ticket_id} • {act.details || `User ${act.user_id}`}
                        {act.venue && ` • ${act.venue}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Table ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl py-16 text-center border border-slate-200 shadow-sm">
          <ShieldCheckIcon className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
          <p className="font-semibold text-slate-700">No tickets meet this threshold</p>
          <p className="text-sm text-slate-400 mt-1">Lower the filter to see more results.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{filtered.length} tickets flagged</h3>
            <span className="text-xs text-slate-400">Last scan: {new Date().toLocaleTimeString()}</span>
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
                  <th className="px-5 py-3.5">Last Scan</th>
                  <th className="px-5 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const rc = RISK_COLOR(f.risk_score || 0);
                  const isBlocked = f.status === "blocked";
                  return (
                    <tr
                      key={f.ticket_id}
                      className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${isBlocked ? "opacity-60" : ""}`}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">#{f.ticket_id}</td>
                      <td className="px-5 py-3 text-slate-600">U-{f.user_id}</td>
                      <td className="px-5 py-3 text-slate-600">E-{f.event_id}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${rc.bg} ${rc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rc.text.replace("text", "bg")}`} />
                          {Math.round((f.risk_score || 0) * 100)}% — {rc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          f.status === "active" ? "bg-emerald-50 text-emerald-700" :
                          f.status === "blocked" ? "bg-rose-50 text-rose-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {f.last_scanned ? new Date(f.last_scanned).toLocaleString() : "Never"}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => block(f.ticket_id)}
                          disabled={blockingId === f.ticket_id || isBlocked}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                            isBlocked
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                          }`}
                        >
                          {blockingId === f.ticket_id ? "Blocking…" : isBlocked ? "Blocked" : "Block"}
                        </button>
                      </td>
                    </tr>
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