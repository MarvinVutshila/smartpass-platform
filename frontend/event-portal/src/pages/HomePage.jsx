import { useEffect, useState, useCallback, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  MapPinIcon,
  ShieldCheckIcon,
  QrCodeIcon,
  ClockIcon,
  BoltIcon,
  TicketIcon,
  ArrowRightIcon,
  CheckBadgeIcon,
  DevicePhoneMobileIcon,
  MusicalNoteIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  TrophyIcon,
  CpuChipIcon,
  PaintBrushIcon,
  TruckIcon,
  GlobeAltIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Slider from "react-slick";
import API from "../services/api";

// ─── Helper to get price display ───────────────────────────────
const getPriceDisplay = (event) => {
  const tiers = event.tiers || [];
  if (tiers.length > 0) {
    const prices = tiers.map((t) => t.price ?? 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) {
      return min === 0 ? "Free" : `R ${min}`;
    }
    return `R ${min} – R ${max}`;
  }
  const price = event.ticket_price ?? 0;
  return price === 0 ? "Free" : `R ${price}`;
};

const formatCurrency = (amount) => {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

// ─── Categories with icons ──────────────────────────────────────
const CATEGORIES = [
  { id: "All", label: "All", icon: SparklesIcon },
  { id: "Music", label: "Music", icon: MusicalNoteIcon },
  { id: "Conference", label: "Conference", icon: BuildingOfficeIcon },
  { id: "Workshop", label: "Workshop", icon: WrenchScrewdriverIcon },
  { id: "Sports", label: "Sports", icon: TrophyIcon },
  { id: "Tech", label: "Tech", icon: CpuChipIcon },
  { id: "Arts", label: "Arts", icon: PaintBrushIcon },
  { id: "Bus", label: "Bus", icon: TruckIcon },
  { id: "Travel", label: "Travel", icon: GlobeAltIcon },
  { id: "Festival", label: "Festival", icon: SparklesIcon },
];

const REASONS = [
  {
    icon: CheckBadgeIcon,
    title: "Real tickets, guaranteed",
    desc: "Every ticket is verified before it reaches you. No fakes, no duplicates.",
    color: "text-brand-600",
    bg: "bg-brand-50",
  },
  {
    icon: DevicePhoneMobileIcon,
    title: "On your phone, instantly",
    desc: "Your ticket is ready in your account the second you pay – no waiting, no printing.",
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    icon: BoltIcon,
    title: "Walk straight in",
    desc: "One scan at the gate and you're through – even with thousands of people.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: ClockIcon,
    title: "Clear refunds",
    desc: "If an event changes, you can see exactly what's happening and what you're owed.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

// ─── Updated slider images – now 8 images covering all categories ───
const SLIDER_IMAGES = [
  // Music / Concert
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1600&h=800&fit=crop",
  // Conference / Business
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1600&h=800&fit=crop",
  // Arts / Exhibition
  "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1600&h=800&fit=crop",
  // Sports / Stadium
  "https://images.unsplash.com/photo-1461896836934-bd1c20a2b9e7?w=1600&h=800&fit=crop",
  // Bus / Travel – new
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1600&h=800&fit=crop",
  // Tech / Hackathon – new
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1600&h=800&fit=crop",
  // Workshop / Education – new
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1600&h=800&fit=crop",
  // Festival / Outdoor – new
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1600&h=800&fit=crop",
];

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({
    totalTickets: 0,
    totalRevenue: 0,
    totalEvents: 0,
  });
  const navigate = useNavigate();
  const token = sessionStorage.getItem("access_token");
  const isLoggedIn = !!token;

  // ─── Get user name ──────────────────────────────────────────────
  useEffect(() => {
    if (isLoggedIn) {
      const name = sessionStorage.getItem("user_name");
      if (name) {
        setUserName(name);
      } else {
        API.get("/auth/me")
          .then((res) => {
            setUserName(res.data.full_name);
            sessionStorage.setItem("user_name", res.data.full_name);
          })
          .catch(() => {});
      }
    }
  }, [isLoggedIn]);

  // ─── Fetch events ───────────────────────────────────────────────
  useEffect(() => {
    API.get("/events")
      .then((r) => {
        const now = new Date();
        const upcoming = r.data
          .filter((e) => new Date(e.start_date) > now)
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        setEvents(upcoming);
        console.log("Event categories:", upcoming.map(e => e.category));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ─── Derive stats from events ──────────────────────────────────
  useEffect(() => {
    if (events.length > 0) {
      const totalTickets = events.reduce((sum, e) => {
        const tierCap = e.tiers?.reduce((s, t) => s + t.capacity, 0) || e.capacity || 0;
        return sum + tierCap;
      }, 0);
      const totalRevenue = events.reduce((sum, e) => sum + (e.ticket_price || 0), 0);
      setStats({
        totalTickets,
        totalRevenue,
        totalEvents: events.length,
      });
    }
  }, [events]);

  // ─── Buy handler (memoized) ────────────────────────────────────
  const buy = useCallback(
    (id) => {
      if (!token) {
        sessionStorage.setItem("intendedEventId", id);
        navigate("/login");
        return;
      }
      navigate(`/checkout?eventId=${id}`);
    },
    [token, navigate]
  );

  // ─── FILTER LOGIC ──────────────────────────────────────────────
  const filtered = events.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.venue || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.description || "").toLowerCase().includes(search.toLowerCase());
    const eventCategory = (e.category || "").toLowerCase().trim();
    const selectedCategory = cat.toLowerCase();
    const matchCat = cat === "All" || eventCategory === selectedCategory;
    return matchSearch && matchCat;
  });

  const featured = events.slice(0, 3);

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4500,
    fade: true,
    pauseOnHover: false,
    arrows: false,
    appendDots: (dots) => (
      <div
        style={{
          position: "absolute",
          bottom: "24px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <ul style={{ display: "flex", gap: "8px", margin: 0, padding: 0 }}> {dots} </ul>
      </div>
    ),
    customPaging: () => (
      <button className="w-2.5 h-2.5 rounded-full bg-white/30 hover:bg-white/80 transition-colors" />
    ),
  };

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500">Loading events…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* ─── HERO ────────────────────────────────────────────────── */}
      <section className="relative h-[80vh] min-h-[600px] overflow-hidden">
        <Slider {...sliderSettings} className="h-full">
          {SLIDER_IMAGES.map((url, idx) => (
            <div key={idx} className="h-[80vh] min-h-[600px] relative">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${url})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-start px-6 sm:px-12 lg:px-24">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="max-w-2xl text-white"
                >
                  <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
                    <ShieldCheckIcon className="w-4 h-4" /> Every ticket verified
                  </span>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
                    {isLoggedIn ? (
                      <>
                        Welcome back,{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-violet-300">
                          {userName || "👋"}
                        </span>
                        !
                      </>
                    ) : (
                      <>
                        Find your next
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-violet-300">
                          live experience
                        </span>
                      </>
                    )}
                  </h1>
                  <p className="text-lg text-white/70 max-w-xl mt-4">
                    {isLoggedIn
                      ? "Browse, book, and go – your tickets are always ready on your phone."
                      : "Buy tickets for concerts, conferences, festivals, bus trips, workshops, and more. Real tickets, guaranteed."}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-4">
                    {isLoggedIn ? (
                      <>
                        <button
                          onClick={() => navigate("/my-tickets")}
                          className="bg-white text-brand-700 font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                        >
                          <TicketIcon className="w-5 h-5" /> My Tickets
                        </button>
                        <button
                          onClick={() =>
                            document.getElementById("all-events")?.scrollIntoView({ behavior: "smooth" })
                          }
                          className="bg-white/20 backdrop-blur-sm border border-white/30 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
                        >
                          Browse Events
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            document.getElementById("all-events")?.scrollIntoView({ behavior: "smooth" })
                          }
                          className="bg-white text-brand-700 font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                        >
                          Find an event <ArrowRightIcon className="w-5 h-5" />
                        </button>
                        <Link
                          to="/register"
                          className="bg-white/20 backdrop-blur-sm border border-white/30 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
                        >
                          Create free account
                        </Link>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          ))}
        </Slider>
      </section>

      {/* ─── CATEGORY PILLS ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-20">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 flex flex-wrap items-center justify-center gap-3">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  cat === c.id
                    ? "bg-brand-600 text-white shadow-md"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:shadow-sm"
                }`}
              >
                <Icon className="w-4 h-4" />
                {c.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── SEARCH BAR ───────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 mt-6 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-2 flex items-center gap-2">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, artists, venues, or bus routes…"
            className="w-full py-3 text-sm outline-none text-slate-700 placeholder:text-slate-400"
          />
          <button
            onClick={() => document.getElementById("all-events")?.scrollIntoView({ behavior: "smooth" })}
            className="bg-brand-600 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-brand-700 transition-colors shrink-0"
          >
            Search
          </button>
        </div>
      </section>

      {/* ─── FEATURED EVENTS ────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">🔥 Selling fast</h2>
                <p className="text-sm text-slate-500">Popular events & trips right now</p>
              </div>
              <button
                onClick={() =>
                  document.getElementById("all-events")?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                View all <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featured.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <FeaturedCard ev={ev} onBuy={buy} priceDisplay={getPriceDisplay(ev)} apiBase={API_BASE} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* ─── TRUST NUMBERS ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6"
        >
          <StatCard label="Tickets Sold" value={stats.totalTickets.toLocaleString()} suffix="+" />
          <StatCard label="Paid Out Safely" value={formatCurrency(stats.totalRevenue)} />
          <StatCard label="Genuine Ticket Rate" value="99.8" suffix="%" />
          <StatCard label="Events & Trips" value={stats.totalEvents.toLocaleString()} suffix="+" />
        </motion.div>
      </section>

      {/* ─── WHY BUY HERE ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-extrabold text-slate-900"
          >
            Why people buy here
          </motion.h2>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto">
            No one wants to show up and find out their ticket isn't real. Here's how we make sure that never happens.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {REASONS.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all border border-slate-100 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed mt-1">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────────── */}
      <section className="bg-white border-y border-slate-100 py-16 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-extrabold text-slate-900"
          >
            Three steps to your ticket
          </motion.h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">No apps to install, nothing to print</p>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {[
              { icon: MagnifyingGlassIcon, title: "1. Find", desc: "Search events, bus trips, or experiences near you." },
              { icon: TicketIcon, title: "2. Pay", desc: "Secure checkout – your ticket is confirmed instantly." },
              { icon: QrCodeIcon, title: "3. Go", desc: "Show your QR code at the gate, bus stop, or venue and walk straight in." },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
                  <step.icon className="w-8 h-8 text-brand-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ALL EVENTS ──────────────────────────────────────────── */}
      <section id="all-events" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900">All Upcoming Events & Trips</h2>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  cat === c.id
                    ? "bg-brand-600 text-white shadow-md"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-brand-300"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl py-20 text-center text-slate-500 border border-slate-200"
          >
            <CalendarDaysIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">
              {events.length === 0 ? "No upcoming events or trips." : "No results match your filters."}
            </p>
            {(search || cat !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setCat("All");
                }}
                className="mt-4 text-sm text-brand-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <EventCard ev={ev} onBuy={buy} priceDisplay={getPriceDisplay(ev)} apiBase={API_BASE} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ─── ORGANISER SECTION ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="bg-slate-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">🎤 Got an event, bus trip, or experience to sell?</p>
            <p className="text-xs text-slate-500">We set it up for you and start selling. Just reach out.</p>
          </div>
          <a
            href="mailto:events@smartpass.co.za"
            className="text-brand-600 font-semibold text-sm hover:text-brand-700 transition-colors"
          >
            Contact us →
          </a>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 text-2xl font-bold mb-4">
                <TicketIcon className="w-8 h-8 text-brand-400" />
                SmartPass
              </div>
              <p className="text-sm text-slate-400 max-w-xs">
                Buy tickets you can trust. Find events, bus trips, conferences, and more – pay securely, and walk in without the worry.
              </p>
              <div className="flex gap-4 mt-4">
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </a>
              </div>
            </div>
            {[
              { title: "Browse", links: ["Events", "Bus Trips", "Conferences", "Festivals"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
              { title: "Support", links: ["Help Center", "Contact", "Privacy", "Terms"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold text-sm uppercase tracking-wider text-slate-400 mb-3">
                  {col.title}
                </h4>
                <ul className="space-y-2 text-sm">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-slate-300 hover:text-white transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-400">
            <p>&copy; 2026 SmartPass. All rights reserved.</p>
            <div className="flex gap-6 mt-2 sm:mt-0">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── STAT CARD ──────────────────────────────────────────────────
function StatCard({ label, value, suffix }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-extrabold text-slate-900">
        {value}
        {suffix}
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

// ─── FEATURED CARD (memoized) ──────────────────────────────────
const FeaturedCard = memo(function FeaturedCard({ ev, onBuy, priceDisplay, apiBase }) {
  const imageUrl = ev.image_url ? `${apiBase}${ev.image_url}` : null;

  return (
    <div
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer border border-slate-100"
      onClick={() => onBuy(ev.id)}
    >
      <div className="relative h-44 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={ev.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-400 to-violet-400 flex items-center justify-center text-5xl font-bold text-white">
            {ev.name.charAt(0)}
          </div>
        )}
        <span className="absolute top-3 left-3 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">
          Selling fast
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-brand-600 transition-colors">
          {ev.name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
          <CalendarDaysIcon className="w-3.5 h-3.5" />
          {new Date(ev.start_date).toLocaleDateString("en-ZA", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <MapPinIcon className="w-3.5 h-3.5" /> {ev.venue || "TBA"}
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="text-xl font-bold text-brand-700">{priceDisplay}</span>
          <button className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-700 transition-colors shadow-md">
            Buy now
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── EVENT CARD (memoized) ──────────────────────────────────────
const EventCard = memo(function EventCard({ ev, onBuy, priceDisplay, apiBase }) {
  const date = new Date(ev.start_date);
  const imageUrl = ev.image_url ? `${apiBase}${ev.image_url}` : null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-slate-100 group">
      <div className="h-48 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={ev.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-400 to-violet-400 flex items-center justify-center text-4xl font-bold text-white">
            {ev.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex flex-col items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-brand-600 uppercase leading-none">
              {date.toLocaleString("default", { month: "short" })}
            </span>
            <span className="text-lg font-extrabold text-brand-700 leading-none">{date.getDate()}</span>
          </div>
          <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
            Tickets available
          </span>
        </div>
        <h3 className="font-bold text-slate-900 text-lg leading-snug mt-3 group-hover:text-brand-600 transition-colors">
          {ev.name}
        </h3>
        {ev.description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{ev.description}</p>
        )}
        <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
          <MapPinIcon className="w-3.5 h-3.5" />
          {ev.venue || "TBA"}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <CalendarDaysIcon className="w-3.5 h-3.5" />
          {date.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <span className="text-xl font-extrabold text-slate-900">{priceDisplay}</span>
          <button
            onClick={() => onBuy(ev.id)}
            className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-700 transition-colors flex items-center gap-1 shadow-md"
          >
            <TicketIcon className="w-4 h-4" /> Get ticket
          </button>
        </div>
      </div>
    </div>
  );
});