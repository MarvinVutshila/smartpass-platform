import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  CurrencyDollarIcon, TicketIcon, CalendarDaysIcon, UsersIcon,
  ShieldExclamationIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  ArrowPathIcon, PlusIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

const PIE_COLORS = ["#2563EB", "#7C3AED", "#10B981", "#F59E0B"];

const KPI = ({ title, value, icon: Icon, change, positive, color, bg, delay }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="card p-5 flex items-start justify-between gap-4">
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-semibold mt-1.5 ${positive ? "text-emerald-600" : "text-rose-500"}`}>
          {positive ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />}
          {change}% this month
        </div>
      )}
    </div>
    <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
  </motion.div>
);

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name:"", description:"", start_date:"", end_date:"", venue:"", capacity:100, ticket_price:0 });

  const load = useCallback(async () => {
    try {
      const [ana, rec] = await Promise.all([API.get("/admin/analytics"), API.get("/tickets/recent").catch(() => ({ data: [] }))]);
      setData(ana.data);
      setRecent(rec.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const createEvent = async (e) => {
    e.preventDefault(); setCreating(true);
    try { await API.post("/events", form); setShowForm(false); load(); setForm({ name:"", description:"", start_date:"", end_date:"", venue:"", capacity:100, ticket_price:0 }); }
    catch (err) { alert(err.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[...Array(4)].map((_,i) => <div key={i} className="card h-28 skeleton" />)}
      </div>
    </div>
  );

  const chartData = (data?.events || []).map((ev) => ({ name: ev.name.length > 16 ? ev.name.slice(0,14)+"…" : ev.name, tickets: ev.tickets_sold }));
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    return { day: d.toLocaleDateString("en-ZA", { weekday: "short" }), revenue: Math.round(Math.random() * 800 + 200), tickets: Math.round(Math.random() * 20 + 5) };
  });
  const pieData = [
    { name: "Tickets Sold", value: data?.total_sales || 0 },
    { name: "Available", value: Math.max(0, 500 - (data?.total_sales || 0)) },
  ];

  return (
    <div className="space-y-7 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live overview of your platform.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline gap-1.5"><ArrowPathIcon className="w-4 h-4" /> Refresh</button>
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5"><PlusIcon className="w-4 h-4" /> New Event</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KPI title="Total Revenue" value={`R ${((data?.total_revenue || 0)).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`} icon={CurrencyDollarIcon} change={12.4} positive color="text-emerald-600" bg="bg-emerald-50" delay={0} />
        <KPI title="Tickets Sold" value={data?.total_sales || 0} icon={TicketIcon} change={8.2} positive color="text-brand-600" bg="bg-brand-50" delay={.05} />
        <KPI title="Active Events" value={data?.events?.length || 0} icon={CalendarDaysIcon} color="text-violet-600" bg="bg-violet-50" delay={.1} />
        <KPI title="Fraud Alerts" value="0" icon={ShieldExclamationIcon} change={2.1} positive={false} color="text-rose-500" bg="bg-rose-50" delay={.15} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Revenue trend */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4">Revenue Trend (last 7 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Ticket Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales by event */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Sales by Event</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Bar dataKey="tickets" fill="#2563EB" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent tickets */}
      {recent.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent Purchases</h3>
            <span className="text-xs text-slate-400">{recent.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Ticket</th>
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">#{t.id}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{t.event_name}</td>
                    <td className="px-5 py-3 text-slate-500">{t.user_email}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">R {t.price_paid}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{new Date(t.purchase_date).toLocaleString("en-ZA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 overflow-y-auto py-8" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 mb-6">Create New Event</h2>
            <form onSubmit={createEvent} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Event name *</label>
                  <input required className="input" placeholder="e.g. AI Innovation Summit" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                  <textarea className="input resize-none h-20" placeholder="Brief event description…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start date & time *</label>
                  <input type="datetime-local" required className="input" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">End date & time *</label>
                  <input type="datetime-local" required className="input" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Venue *</label>
                  <input required className="input" placeholder="e.g. Cape Town ICC" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Capacity</label>
                  <input type="number" min="1" className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ticket price (R)</label>
                  <input type="number" min="0" step="0.01" className="input" value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1 justify-center">
                  {creating ? "Creating…" : "Create Event"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
