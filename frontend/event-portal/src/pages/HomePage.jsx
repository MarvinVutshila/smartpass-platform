import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon, CalendarDaysIcon, MapPinIcon,
  ShieldCheckIcon, QrCodeIcon, ChartBarIcon, BoltIcon,
  TicketIcon, ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";
import SkeletonCard from "../components/SkeletonCard";

const CATEGORIES = ["All", "Conference", "Music", "Sports", "Workshop", "Tech", "Arts"];

const FEATURES = [
  { icon: QrCodeIcon,      title: "Smart QR Tickets",    desc: "One-tap scan entry with tamper-proof QR codes tied to your identity.", color: "text-brand-600", bg: "bg-brand-50" },
  { icon: ShieldCheckIcon, title: "AI Fraud Detection",  desc: "Real-time risk scoring prevents fake purchases and duplicate scans.", color: "text-violet-600", bg: "bg-violet-50" },
  { icon: BoltIcon,        title: "Instant Check-In",    desc: "Gate staff scan thousands of tickets per hour without any lag.", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: ChartBarIcon,    title: "Live Analytics",       desc: "Organisers see attendance, revenue, and fraud metrics in real-time.", color: "text-amber-600", bg: "bg-amber-50" },
];

const STATS = [
  { value: "120K+", label: "Tickets issued" },
  { value: "R 4.2M", label: "Revenue processed" },
  { value: "99.8%", label: "Fraud-free rate" },
  { value: "340+", label: "Events hosted" },
];

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const navigate = useNavigate();
  const token = sessionStorage.getItem("access_token");

  useEffect(() => {
    API.get("/events")
      .then((r) => {
        const now = new Date();
        const upcoming = r.data.filter((e) => new Date(e.start_date) > now)
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        setEvents(upcoming);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const buy = (id) => {
    if (!token) { sessionStorage.setItem("intendedEventId", id); navigate("/login"); return; }
    navigate(`/checkout?eventId=${id}`);
  };

  const filtered = events.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.venue || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = cat === "All" || (e.category || "").toLowerCase() === cat.toLowerCase();
    return matchSearch && matchCat;
  });

  const featured = events.slice(0, 3);

  return (
    <div className="min-h-screen">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-900 to-violet-900 text-white">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #2563EB 0%, transparent 50%), radial-gradient(circle at 80% 20%, #7C3AED 0%, transparent 50%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-28 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}>
            <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <ShieldCheckIcon className="w-3.5 h-3.5" /> AI-powered fraud protection included
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
              Discover & attend<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-violet-300">
                amazing events
              </span>
            </h1>
            <p className="text-lg text-white/70 max-w-xl mx-auto mb-10">
              Buy verified tickets in seconds. SmartPass protects every transaction with AI fraud detection and secure QR entry.
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2, duration: .5 }}
            className="max-w-2xl mx-auto relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events, venues, cities…"
              className="w-full bg-white text-slate-900 pl-12 pr-4 py-4 rounded-2xl text-sm shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </motion.div>

          {/* Quick stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .4 }}
            className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-extrabold text-white">{s.value}</div>
                <div className="text-xs text-white/50 mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURED ──────────────────────────────────────────────── */}
      {!loading && featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Featured Events</h2>
              <p className="text-sm text-slate-500 mt-1">Handpicked upcoming highlights</p>
            </div>
            <Link to="/#all-events" className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featured.map((ev, i) => (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .08 }}>
                <FeaturedCard ev={ev} onBuy={buy} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── WHY SMARTPASS ─────────────────────────────────────────── */}
      <section className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900">Built for serious events</h2>
            <p className="text-slate-500 mt-2 text-sm max-w-lg mx-auto">
              From small workshops to stadium concerts, SmartPass handles every scale with enterprise-grade security.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * .07 }}
                className="card p-6">
                <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ALL EVENTS ────────────────────────────────────────────── */}
      <section id="all-events" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-2xl font-bold text-slate-900">All Upcoming Events</h2>
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  cat === c ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-brand-300"
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card py-20 text-center text-slate-500">
            <CalendarDaysIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No events match your search.</p>
            <button onClick={() => { setSearch(""); setCat("All"); }} className="mt-4 text-sm text-brand-600 hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((ev, i) => (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * .05 }}>
                <EventCard ev={ev} onBuy={buy} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="rounded-3xl bg-gradient-to-r from-brand-600 to-violet-600 p-10 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Organising an event?</h2>
          <p className="text-white/70 mb-6 text-sm max-w-md mx-auto">
            Set up your event, configure ticket tiers, and start selling in minutes. Fraud protection is always on.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-white text-brand-700 font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all">
            Create free account <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <span>© 2026 SmartPass. All rights reserved.</span>
          <div className="flex gap-6">
            <Link to="/" className="hover:text-slate-600">Events</Link>
            <Link to="/login" className="hover:text-slate-600">Sign in</Link>
            <Link to="/register" className="hover:text-slate-600">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeaturedCard({ ev, onBuy }) {
  return (
    <div className="group card overflow-hidden cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => onBuy(ev.id)}>
      <div className="relative h-40 bg-gradient-to-br from-brand-100 to-violet-100 flex items-center justify-center">
        <CalendarDaysIcon className="w-14 h-14 text-brand-300" />
        <span className="absolute top-3 left-3 badge bg-brand-600 text-white">Featured</span>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-slate-900 text-lg leading-snug mb-2 group-hover:text-brand-700 transition-colors">{ev.name}</h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
          <CalendarDaysIcon className="w-3.5 h-3.5" />
          {new Date(ev.start_date).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
          <MapPinIcon className="w-3.5 h-3.5" /> {ev.venue || "TBA"}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-brand-700">R {ev.ticket_price}</span>
          <button className="btn-primary !py-1.5 !px-4 text-sm">Buy now</button>
        </div>
      </div>
    </div>
  );
}

function EventCard({ ev, onBuy }) {
  const date = new Date(ev.start_date);
  return (
    <div className="card overflow-hidden group hover:shadow-card-hover transition-shadow">
      <div className="h-2 bg-gradient-to-r from-brand-500 to-violet-500" />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex flex-col items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-brand-600 uppercase leading-none">
              {date.toLocaleString("default", { month: "short" })}
            </span>
            <span className="text-lg font-extrabold text-brand-700 leading-none">{date.getDate()}</span>
          </div>
          <span className="badge bg-emerald-50 text-emerald-700">Active</span>
        </div>
        <h3 className="font-bold text-slate-900 text-base leading-snug mb-2 group-hover:text-brand-700 transition-colors">
          {ev.name}
        </h3>
        {ev.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{ev.description}</p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <MapPinIcon className="w-3.5 h-3.5" /> {ev.venue || "TBA"}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
          <CalendarDaysIcon className="w-3.5 h-3.5" />
          {date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xl font-extrabold text-slate-900">R {ev.ticket_price}</span>
          <button onClick={() => onBuy(ev.id)} className="btn-primary text-sm !py-2">
            <TicketIcon className="w-4 h-4" /> Get ticket
          </button>
        </div>
      </div>
    </div>
  );
}
