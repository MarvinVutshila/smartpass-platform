import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  CurrencyDollarIcon, TicketIcon, CalendarDaysIcon, UsersIcon,
  ShieldExclamationIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  ArrowPathIcon, PlusIcon, TrashIcon, PhotoIcon,
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

// ─── Tier Input Row ────────────────────────────────────────────
function TierInput({ tier, index, onChange, onRemove }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 relative group">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 text-slate-400 hover:text-rose-600 transition-colors"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Tier Name *</label>
          <input
            required
            className="input"
            placeholder="e.g. VIP, General, Student"
            value={tier.name}
            onChange={(e) => onChange(index, 'name', e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Benefits</label>
          <input
            className="input"
            placeholder="What this tier includes"
            value={tier.description}
            onChange={(e) => onChange(index, 'description', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Price (R) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            className="input"
            value={tier.price}
            onChange={(e) => onChange(index, 'price', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Capacity *</label>
          <input
            type="number"
            min="1"
            required
            className="input"
            value={tier.capacity}
            onChange={(e) => onChange(index, 'capacity', parseInt(e.target.value) || 1)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Benefits (comma‑separated)</label>
          <input
            className="input"
            placeholder="e.g. Early entry, Meet & Greet"
            value={tier.benefits}
            onChange={(e) => onChange(index, 'benefits', e.target.value)}
          />
          <p className="text-[10px] text-slate-400 mt-1">Separate benefits with commas.</p>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    venue: "",
    image_url: "",
    tiers: [],
  });

  // ─── Load data ──────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      let analyticsData = null;
      let recentData = [];

      try {
        const ana = await API.get("/admin/analytics");
        analyticsData = ana.data;
      } catch (e) {
        console.warn("Failed to load analytics:", e);
      }

      try {
        const rec = await API.get("/tickets/recent");
        recentData = rec.data || [];
        if (!Array.isArray(recentData)) recentData = [];
      } catch (e) {
        console.warn("Failed to load recent tickets:", e);
      }

      setData(analyticsData || null);
      setRecent(recentData);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // ─── Tier management ──────────────────────────────────────
  const addTier = () => {
    setForm({
      ...form,
      tiers: [
        ...form.tiers,
        { name: "", description: "", price: 0, capacity: 10, benefits: "" }
      ]
    });
  };

  const removeTier = (index) => {
    setForm({
      ...form,
      tiers: form.tiers.filter((_, i) => i !== index)
    });
  };

  const updateTier = (index, field, value) => {
    const updated = [...form.tiers];
    updated[index][field] = value;
    setForm({ ...form, tiers: updated });
  };

  // ─── Image upload ────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);

    // Upload to backend
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/admin/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm({ ...form, image_url: res.data.url });
    } catch (err) {
      alert("Image upload failed. Please try again.");
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  // ─── Create event ───────────────────────────────────────────
  const createEvent = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await API.post("/admin/events", form);
      setShowForm(false);
      setImagePreview(null);
      load();
      setForm({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        venue: "",
        image_url: "",
        tiers: [],
      });
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create event");
    } finally {
      setCreating(false);
    }
  };

  // ─── Close modal ─────────────────────────────────────────────
  const closeModal = () => {
    setShowForm(false);
    setImagePreview(null);
    setForm({
      name: "",
      description: "",
      start_date: "",
      end_date: "",
      venue: "",
      image_url: "",
      tiers: [],
    });
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-28 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Extract real data ──────────────────────────────────────
  const events = data?.events || [];
  const totalRevenue = data?.revenue || 0;
  const totalSales = data?.tickets || 0;
  const totalCapacity = events.reduce((sum, ev) => sum + (ev.capacity || 0), 0);
  const fraudAlerts = data?.fraud_alerts || 0;

  const salesByEvent = events.map((ev) => ({
    name: ev.name?.length > 16 ? ev.name.slice(0, 14) + "…" : ev.name || `Event ${ev.id}`,
    tickets: ev.tickets_sold || 0,
  })).filter((d) => d.tickets > 0);

  const totalSold = totalSales;
  const totalAvail = Math.max(0, totalCapacity - totalSold);
  const pieData = [
    { name: "Tickets Sold", value: totalSold },
    { name: "Available", value: totalAvail },
  ].filter((d) => d.value > 0);

  const revenueTrend = data?.daily_revenue || [];

  const kpis = [
    {
      title: "Total Revenue",
      value: `R ${totalRevenue.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`,
      icon: CurrencyDollarIcon,
      change: 12.4,
      positive: true,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      delay: 0,
    },
    {
      title: "Tickets Sold",
      value: totalSales,
      icon: TicketIcon,
      change: 8.2,
      positive: true,
      color: "text-brand-600",
      bg: "bg-brand-50",
      delay: 0.05,
    },
    {
      title: "Active Events",
      value: events.length,
      icon: CalendarDaysIcon,
      color: "text-violet-600",
      bg: "bg-violet-50",
      delay: 0.1,
    },
    {
      title: "Fraud Alerts",
      value: fraudAlerts,
      icon: ShieldExclamationIcon,
      change: 2.1,
      positive: false,
      color: "text-rose-500",
      bg: "bg-rose-50",
      delay: 0.15,
    },
  ];

  return (
    <div className="space-y-7 max-w-[1400px]">
      {/* ─── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live overview of your platform.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline gap-1.5">
            <ArrowPathIcon className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary gap-1.5">
            <PlusIcon className="w-4 h-4" /> New Event
          </button>
        </div>
      </div>

      {/* ─── KPIs ─────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map((k) => (
          <KPI key={k.title} {...k} />
        ))}
      </div>

      {/* ─── Charts ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4">
            Revenue Trend {revenueTrend.length > 0 ? "(last 7 days)" : ""}
          </h3>
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
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
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">No revenue data available yet.</div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Ticket Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">No ticket data yet.</div>
          )}
        </div>
      </div>

      {/* ─── Sales by event ───────────────────────────────────── */}
      {salesByEvent.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Sales by Event</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesByEvent} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Bar dataKey="tickets" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── Recent purchases ────────────────────────────────── */}
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
                    <td className="px-5 py-3 font-medium text-slate-800">{t.event_name || `Event ${t.event_id}`}</td>
                    <td className="px-5 py-3 text-slate-500">{t.user_email || `U-${t.user_id}`}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">R {t.price_paid}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {new Date(t.purchase_date).toLocaleString("en-ZA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Create Event Modal (with Image Upload & Tiers) ── */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 overflow-y-auto py-8"
          onClick={closeModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-900 mb-6">Create New Event</h2>
            <form onSubmit={createEvent} className="space-y-4">
              {/* Basic info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Event name *</label>
                  <input
                    required
                    className="input"
                    placeholder="e.g. AI Innovation Summit"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                  <textarea
                    className="input resize-none h-20"
                    placeholder="Brief event description…"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start date & time *</label>
                  <input
                    type="datetime-local"
                    required
                    className="input"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">End date & time *</label>
                  <input
                    type="datetime-local"
                    required
                    className="input"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Venue</label>
                  <input
                    className="input"
                    placeholder="e.g. Cape Town ICC"
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  />
                </div>

                {/* ─── Image Upload ───────────────────────────── */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Event Image</label>
                  <div className="flex items-center gap-4">
                    <label className={`btn-outline text-xs py-2 px-4 cursor-pointer flex items-center gap-2 ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                      <PhotoIcon className="w-4 h-4" />
                      {uploadingImage ? 'Uploading…' : 'Choose Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                    {imagePreview && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                        <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {form.image_url && !imagePreview && (
                      <div className="text-xs text-emerald-600">✓ Image uploaded</div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Upload a square image for best results (JPEG, PNG, WebP).</p>
                </div>
              </div>

              {/* ─── Ticket Tiers ────────────────────────────── */}
              <div className="border-t border-slate-200 pt-4 mt-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-700">Ticket Tiers</h3>
                  <button
                    type="button"
                    onClick={addTier}
                    className="btn-outline text-xs !py-1.5 !px-3"
                  >
                    <PlusIcon className="w-3.5 h-3.5" /> Add Tier
                  </button>
                </div>
                {form.tiers.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No tiers added yet. Click "Add Tier" to create ticket types.</p>
                ) : (
                  <div className="space-y-3">
                    {form.tiers.map((tier, idx) => (
                      <TierInput
                        key={idx}
                        tier={tier}
                        index={idx}
                        onChange={updateTier}
                        onRemove={() => removeTier(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ─── Buttons ───────────────────────────────────── */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={closeModal} className="btn-outline flex-1 justify-center">
                  Cancel
                </button>
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