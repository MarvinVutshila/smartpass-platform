import { useEffect, useState, useCallback } from "react";
import {
  ShieldExclamationIcon, ShieldCheckIcon, ArrowPathIcon,
  ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon,
  TicketIcon, QrCodeIcon, ClockIcon,
  EyeIcon, EyeSlashIcon,
  LockClosedIcon, LockOpenIcon, ExclamationCircleIcon,
  ArrowDownTrayIcon,
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
  blocked: { icon: LockClosedIcon, label: "Ticket Blocked", color: "text-slate-600", bg: "bg-slate-100" },
  unblocked: { icon: LockOpenIcon, label: "Ticket Unblocked", color: "text-emerald-600", bg: "bg-emerald-50" },
  scan_reset: { icon: ArrowPathIcon, label: "Scan Reset", color: "text-amber-600", bg: "bg-amber-50" },
  failed_scan: { icon: ExclamationCircleIcon, label: "Failed Scan", color: "text-rose-600", bg: "bg-rose-50" },
};

export default function FraudPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minRisk, setMinRisk] = useState(0);
  const [scanStatusFilter, setScanStatusFilter] = useState("all"); // all, not_scanned, scanned, failed, blocked
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [showActivity, setShowActivity] = useState(true);
  const [stats, setStats] = useState({ totalTickets: 0, scanned: 0, notScanned: 0, failed: 0, blocked: 0 });

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
        status: item.status || 'active', // active, checked_in, failed, blocked, revoked
        last_scanned: item.last_scanned || null,
      }));
      setList(data);

      const todayUTC = new Date().toISOString().split('T')[0]; 
      const scannedToday = data.filter(f => 
        f.last_scanned && f.last_scanned.startsWith(todayUTC)
      ).length;

      const high = data.filter(f => (f.risk_score || 0) >= 0.7).length;
      const medium = data.filter(f => (f.risk_score || 0) >= 0.4 && (f.risk_score || 0) < 0.7).length;
      // Count both blocked and revoked as "Blocked"
      const blocked = data.filter(f => f.status === "blocked" || f.status === "revoked").length;
      const failed = data.filter(f => f.status === "failed").length;

      setStats({
        totalTickets: data.length,
        scanned: scannedToday,
        notScanned: data.filter(f => f.status === "active").length,
        failed,
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

  // ─── Action Handler (Block, Unblock, Reset Scan) ─────────────────
  const handleAction = async (id, action) => {
    const confirmMessages = {
      block: `Block ticket #${id}? This will deny entry.`,
      unblock: `Unblock ticket #${id}? This will allow entry again.`,
      reset: `Reset scan status for ticket #${id}? This will clear check-in or failure and allow scanning again.`,
    };

    if (!window.confirm(confirmMessages[action])) return;

    setActionLoadingId(id);
    try {
      if (action === "block") await API.post(`/admin/tickets/${id}/block`);
      if (action === "unblock") await API.post(`/admin/tickets/${id}/unblock`);
      if (action === "reset") await API.post(`/admin/tickets/${id}/reset-scan`);
      
      await loadAll();
    } catch (err) {
      alert(`Failed to ${action} ticket.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ─── CSV Download Handler ──────────────────────────────────────────
  const downloadCSV = () => {
    if (filtered.length === 0) {
      alert("No data to export with the current filters.");
      return;
    }

    const headers = ["Ticket ID", "User ID", "Event ID", "Risk Score (%)", "Status", "Last Scanned"];
    
    const rows = filtered.map(f => [
      f.ticket_id,
      `U-${f.user_id}`,
      `E-${f.event_id}`,
      `${Math.round((f.risk_score || 0) * 100)}%`,
      f.status,
      f.last_scanned ? new Date(f.last_scanned).toLocaleString() : "Never"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `smartpass_fraud_report_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── Filtering Logic ────────────────────────────────────────────────
  const filtered = list.filter(f => {
    const meetsRisk = (f.risk_score || 0) >= minRisk;
    const isBlockedOrRevoked = f.status === "blocked" || f.status === "revoked";
    
    let meetsScan = true;
    if (scanStatusFilter === "not_scanned") meetsScan = f.status === "active";
    else if (scanStatusFilter === "scanned") meetsScan = f.status === "checked_in";
    else if (scanStatusFilter === "failed") meetsScan = f.status === "failed";
    else if (scanStatusFilter === "blocked") meetsScan = isBlockedOrRevoked;

    return meetsRisk && meetsScan;
  });

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
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Ticket Control Center</h1>
            <p className="text-sm text-slate-500">Real‑time risk scoring, scan status & full ticket control</p>
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
            onClick={downloadCSV}
            className="px-4 py-2 bg-brand-50 border border-brand-200 text-brand-700 rounded-xl text-sm font-medium hover:bg-brand-100 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export CSV
          </button>
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Tickets", value: stats.totalTickets, icon: TicketIcon, bg: "bg-brand-50", color: "text-brand-600" },
          { label: "Not Scanned", value: stats.notScanned, icon: ClockIcon, bg: "bg-slate-100", color: "text-slate-600" },
          { label: "Scanned", value: stats.scanned, icon: CheckCircleIcon, bg: "bg-emerald-50", color: "text-emerald-600" },
          { label: "Failed Scans", value: stats.failed, icon: ExclamationTriangleIcon, bg: "bg-amber-50", color: "text-amber-600" },
          { label: "Blocked/Revoked", value: stats.blocked, icon: LockClosedIcon, bg: "bg-rose-50", color: "text-rose-600" },
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

      {/* ─── Chart + Filters + Activity ────────────────────────────── */}
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

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Risk Score Filter</h3>
            <div className="space-y-3 mb-5">
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
          
          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-semibold text-slate-900 mb-3">Scan Status Filter</h3>
            <select
              value={scanStatusFilter}
              onChange={(e) => setScanStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-brand-500 focus:border-brand-500 block p-2.5 outline-none"
            >
              <option value="all">All Tickets</option>
              <option value="not_scanned">Not Scanned (Active)</option>
              <option value="scanned">Scanned (Checked In)</option>
              <option value="failed">Failed Scans (Unlock Needed)</option>
              <option value="blocked">Blocked / Revoked</option>
            </select>
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
                    className={`flex items-start gap-3 p-2.5 rounded-xl ${act.type === "fraud_alert" || act.type === "failed_scan" ? "bg-rose-50 border border-rose-100" : "hover:bg-slate-50 transition-colors"}`}
                  >
                    <div className={`w-8 h-8 rounded-xl ${type.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${type.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{type.label}</p>
                        {(act.type === "fraud_alert" || act.type === "failed_scan") && (
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
          <p className="font-semibold text-slate-700">No tickets match your filters</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting the risk or scan status filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{filtered.length} tickets found</h3>
            <span className="text-xs text-slate-400">Last updated: {new Date().toLocaleTimeString()}</span>
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
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const rc = RISK_COLOR(f.risk_score || 0);
                  // Treat both 'blocked' and 'revoked' as blocked
                  const isBlocked = f.status === "blocked" || f.status === "revoked";
                  const isCheckedIn = f.status === "checked_in";
                  const isFailed = f.status === "failed";
                  const isActive = f.status === "active";
                  const isLoading = actionLoadingId === f.ticket_id;

                  return (
                    <tr
                      key={f.ticket_id}
                      className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${isBlocked ? "opacity-60 bg-slate-50" : ""}`}
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
                          isActive ? "bg-blue-50 text-blue-700" :
                          isCheckedIn ? "bg-emerald-50 text-emerald-700" :
                          isFailed ? "bg-amber-50 text-amber-700" :
                          isBlocked ? "bg-rose-50 text-rose-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {isActive ? "Not Scanned" : 
                           isCheckedIn ? "Scanned" : 
                           isFailed ? "Failed Scan" : 
                           isBlocked ? (f.status === "revoked" ? "Revoked" : "Blocked") : 
                           f.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {f.last_scanned ? new Date(f.last_scanned).toLocaleString() : "Never"}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Reset Scan / Unlock Button */}
                          {(isCheckedIn || isFailed) && (
                            <button
                              onClick={() => handleAction(f.ticket_id, "reset")}
                              disabled={isLoading}
                              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                              title="Reset Scan / Unlock"
                            >
                              <ArrowPathIcon className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                              Reset
                            </button>
                          )}

                          {/* Block / Unblock Button */}
                          {isBlocked ? (
                            <button
                              onClick={() => handleAction(f.ticket_id, "unblock")}
                              disabled={isLoading}
                              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                              title="Unblock Ticket"
                            >
                              <LockOpenIcon className="w-3.5 h-3.5" />
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(f.ticket_id, "block")}
                              disabled={isLoading}
                              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                              title="Block Ticket"
                            >
                              <LockClosedIcon className="w-3.5 h-3.5" />
                              Block
                            </button>
                          )}
                        </div>
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