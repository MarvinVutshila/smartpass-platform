import { useEffect, useState, useCallback, useMemo, memo } from "react";
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
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const resolveImage = (url) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_BASE}${url}`;
};

const getPriceInfo = (event) => {
  const tiers = (event.tiers || []).filter((t) => t.price != null);
  const prices = tiers.length
    ? tiers.map((t) => Number(t.price) || 0)
    : [Number(event.ticket_price) || 0];

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (max === 0) return { text: "Free", note: null, min: 0 };
  if (min === max) return { text: `R${min.toLocaleString("en-ZA")}`, note: null, min };
  return { text: `R${min.toLocaleString("en-ZA")}`, note: "From", min };
};

const formatCurrency = (amount) =>
  `R${Number(amount || 0).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

const monthShort = (iso) =>
  new Date(iso).toLocaleString("en-ZA", { month: "short" }).toUpperCase();

const dayNum = (iso) => new Date(iso).getDate();

/* ────────────────────────────────────────────────────────────────
   Static content
   ──────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: "All", label: "All events", icon: SparklesIcon },
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
    desc: "Every ticket is verified before it reaches you. No fakes, no duplicates, no surprises at the gate.",
  },
  {
    icon: DevicePhoneMobileIcon,
    title: "On your phone instantly",
    desc: "The moment your payment clears, your ticket is in your account. Nothing to print, nothing to wait for.",
  },
  {
    icon: BoltIcon,
    title: "Walk straight in",
    desc: "One scan at the door. It holds up even when there are thousands of people arriving at once.",
  },
  {
    icon: ClockIcon,
    title: "Clear, honest refunds",
    desc: "If an event changes or gets cancelled, you can see exactly what's happening and what you're owed.",
  },
];

const STEPS = [
  {
    icon: MagnifyingGlassIcon,
    title: "Find it",
    desc: "Search events, bus trips and experiences near you.",
  },
  {
    icon: TicketIcon,
    title: "Pay securely",
    desc: "Checkout takes under a minute. Your ticket confirms instantly.",
  },
  {
    icon: QrCodeIcon,
    title: "Show up and scan",
    desc: "Open your QR code at the gate, bus stop or venue and you're in.",
  },
];

const SLIDER_IMAGES = [
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1920&h=1080&fit=crop",
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1920&h=1080&fit=crop",
  "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1920&h=1080&fit=crop",
  "https://images.unsplash.com/photo-1461896836934-bd1c20a2b9e7?w=1920&h=1080&fit=crop",
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1920&h=1080&fit=crop",
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1920&h=1080&fit=crop",
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1920&h=1080&fit=crop",
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1920&h=1080&fit=crop",
];

const EASE = [0.22, 1, 0.36, 1];

/* ────────────────────────────────────────────────────────────────
   HomePage
   ──────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("soonest");
  const [userName, setUserName] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);

  const navigate = useNavigate();
  const token = sessionStorage.getItem("access_token");
  const isLoggedIn = !!token;

  /* ── user name ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!isLoggedIn) return;
    const cached = sessionStorage.getItem("user_name");
    if (cached) return setUserName(cached);

    API.get("/auth/me")
      .then((res) => {
        setUserName(res.data.full_name);
        sessionStorage.setItem("user_name", res.data.full_name);
      })
      .catch(() => {});
  }, [isLoggedIn]);

  /* ── events ────────────────────────────────────────────────── */
  useEffect(() => {
    API.get("/events")
      .then((r) => {
        const now = new Date();
        const upcoming = (r.data || [])
          .filter((e) => new Date(e.start_date) > now)
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        setEvents(upcoming);
      })
      .catch((err) => console.error("Failed to load events:", err))
      .finally(() => setLoading(false));
  }, []);

  /* ── hero rotation ─────────────────────────────────────────── */
  useEffect(() => {
    const timer = setInterval(
      () => setHeroIndex((i) => (i + 1) % SLIDER_IMAGES.length),
      6500
    );
    return () => clearInterval(timer);
  }, []);

  /* ── derived numbers (honest, from real data) ──────────────── */
  const seatsAvailable = useMemo(
    () =>
      events.reduce((sum, e) => {
        const tierCap =
          e.tiers?.reduce((s, t) => s + (t.capacity || 0), 0) || e.capacity || 0;
        return sum + tierCap;
      }, 0),
    [events]
  );

  const categoryCounts = useMemo(() => {
    const counts = { All: events.length };
    events.forEach((e) => {
      const key = (e.category || "").trim();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [events]);

  /* ── filtering + sorting ───────────────────────────────────── */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    const list = events.filter((e) => {
      const matchSearch =
        !term ||
        (e.name || "").toLowerCase().includes(term) ||
        (e.venue || "").toLowerCase().includes(term) ||
        (e.description || "").toLowerCase().includes(term);

      const matchCat =
        cat === "All" ||
        (e.category || "").toLowerCase().trim() === cat.toLowerCase().trim();

      return matchSearch && matchCat;
    });

    const sorted = [...list];
    if (sort === "price-asc") {
      sorted.sort((a, b) => getPriceInfo(a).min - getPriceInfo(b).min);
    } else if (sort === "price-desc") {
      sorted.sort((a, b) => getPriceInfo(b).min - getPriceInfo(a).min);
    } else if (sort === "name") {
      sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return sorted;
  }, [events, search, cat, sort]);

  const featured = useMemo(() => events.slice(0, 3), [events]);

  /* ── actions ───────────────────────────────────────────────── */
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

  const scrollToEvents = useCallback(() => {
    document.getElementById("all-events")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const onHeroSearch = (e) => {
    e.preventDefault();
    scrollToEvents();
  };

  /* ── loading ───────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
          <p className="text-sm text-slate-500">Loading events…</p>
        </div>
      </div>
    );
  }

  const firstName = userName?.split(" ")[0];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white antialiased">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative h-[86vh] min-h-[600px] w-full overflow-hidden bg-slate-950">
        {/* background slides */}
        <div className="absolute inset-0">
          {SLIDER_IMAGES.map((url, i) => (
            <div
              key={url}
              className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
                i === heroIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[7000ms] ease-out"
                style={{
                  backgroundImage: `url(${url})`,
                  transform: i === heroIndex ? "scale(1.08)" : "scale(1)",
                }}
              />
            </div>
          ))}
        </div>

        {/* overlays — deeper on the left so the text always reads */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40" />

        {/* content */}
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-5 pb-20 sm:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="max-w-2xl"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/75">
                {events.length > 0
                  ? `${events.length} events live right now`
                  : "Verified tickets, always"}
              </span>
            </span>

            <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.06] tracking-tight text-white sm:text-[3.4rem] lg:text-[4rem]">
              {isLoggedIn ? (
                <>
                  Welcome back{firstName ? `, ${firstName}` : ""}.
                  <br />
                  <span className="text-white/55">Here's what's on.</span>
                </>
              ) : (
                <>
                  Find something worth
                  <br />
                  leaving the house for.
                </>
              )}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65 sm:text-[17px]">
              Gigs, conferences, festivals, workshops and bus trips across South
              Africa — all in one place, all verified before they reach you.
            </p>

            {/* hero search */}
            <form
              onSubmit={onHeroSearch}
              className="mt-8 flex w-full max-w-xl items-center gap-1.5 rounded-2xl border border-white/15 bg-white/[0.08] p-1.5 backdrop-blur-xl"
            >
              <MagnifyingGlassIcon className="ml-2.5 h-5 w-5 shrink-0 text-white/50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, artists or venues"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-white/45"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-white/90"
              >
                Search
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheckIcon className="h-4 w-4" /> Every ticket verified
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BoltIcon className="h-4 w-4" /> Delivered instantly
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4" /> Refunds if it's cancelled
              </span>
            </div>
          </motion.div>
        </div>

        {/* slide indicators */}
        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {SLIDER_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === heroIndex
                  ? "w-8 bg-white"
                  : "w-4 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </section>

      {/* ═══════════════ TRUST BAND ═══════════════ */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-5 py-10 sm:px-8 lg:grid-cols-4 lg:px-12">
          <BandItem
            value={events.length.toLocaleString()}
            label="Events & trips live"
          />
          <BandItem
            value={seatsAvailable.toLocaleString()}
            label="Tickets available"
            divider
          />
          <BandItem value="Instant" label="Ticket delivery" divider />
          <BandItem value="24/7" label="Support & refunds" divider />
        </div>
      </section>

      {/* ═══════════════ FEATURED ═══════════════ */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pt-16 sm:px-8 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <SectionHeading
              eyebrow="Selling fast"
              title="Popular right now"
              action="View all events"
              onAction={scrollToEvents}
            />

            <div className="mt-7 grid gap-5 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <FeaturedHeroCard ev={featured[0]} onBuy={buy} />
              </div>
              <div className="flex flex-col gap-5 lg:col-span-5">
                {featured.slice(1, 3).map((ev) => (
                  <FeaturedRowCard key={ev.id} ev={ev} onBuy={buy} />
                ))}
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* ═══════════════ BROWSE ═══════════════ */}
      <section id="all-events" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
        <SectionHeading
          eyebrow="Browse"
          title="All upcoming events & trips"
        />

        {/* category rail */}
        <div className="mt-7 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0 sm:overflow-visible">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = cat === c.id;
            const count = categoryCounts[c.id] || 0;
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {c.label}
                {count > 0 && (
                  <span
                    className={`text-[11px] tabular-nums ${
                      active ? "text-white/50" : "text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* toolbar */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5">
          <p className="text-[13px] text-slate-500">
            {filtered.length} {filtered.length === 1 ? "result" : "results"}
            {search && (
              <>
                {" "}
                for{" "}
                <span className="font-medium text-slate-900">“{search}”</span>
              </>
            )}
          </p>

          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-10 text-[13px] font-medium text-slate-700 outline-none transition-colors hover:border-slate-300 focus:border-slate-900"
            >
              <option value="soonest">Soonest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name: A – Z</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* grid */}
        {filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-20 text-center">
            <CalendarDaysIcon className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-4 text-base font-medium text-slate-700">
              {events.length === 0
                ? "No upcoming events or trips yet."
                : "Nothing matches those filters."}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {events.length === 0
                ? "Check back soon — organisers are adding new dates all the time."
                : "Try a different category, or clear your search."}
            </p>
            {(search || cat !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setCat("All");
                }}
                className="mt-5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.3), ease: EASE }}
              >
                <EventCard ev={ev} onBuy={buy} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════ WHY BUY HERE ═══════════════ */}
      <section className="border-y border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Why SmartPass
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.1rem]">
              Nobody should drive across town
              <br className="hidden sm:block" /> to find out their ticket isn't real.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              So we built the boring, careful parts properly — verification,
              delivery, scanning and refunds — and left the fun parts to the
              organisers.
            </p>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {REASONS.map((r) => (
              <div key={r.title} className="bg-white p-6">
                <r.icon className="h-6 w-6 text-slate-900" />
                <h3 className="mt-5 text-[15px] font-semibold text-slate-900">
                  {r.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.1rem]">
            Three steps, no apps to install
          </h2>
        </div>

        <div className="relative mt-12 grid gap-10 md:grid-cols-3">
          {/* connector line on desktop */}
          <div className="pointer-events-none absolute left-0 right-0 top-6 hidden border-t border-dashed border-slate-200 md:block" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
              className="relative"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white">
                <step.icon className="h-5 w-5 text-slate-900" />
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Step {i + 1}
              </p>
              <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-slate-500">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════ ORGANISER CTA ═══════════════ */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
        <div className="overflow-hidden rounded-2xl bg-slate-900 px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
                Selling tickets for something?
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
                We'll set up your event page, handle payments, issue the tickets
                and scan people in at the door. You just focus on the show.
              </p>
            </div>
            <a
              href="mailto:events@smartpass.co.za"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Talk to us
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12">
          <div className="grid gap-10 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <TicketIcon className="h-6 w-6 text-brand-400" />
                SmartPass
              </div>
              <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-slate-400">
                Tickets you can trust for events, bus trips and experiences
                across South Africa. Pay securely, walk in without the worry.
              </p>
              <div className="mt-5 flex gap-3">
                <a
                  href="#"
                  aria-label="Twitter"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 transition-colors hover:border-slate-700 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 transition-colors hover:border-slate-700 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            {[
              { title: "Browse", links: ["Events", "Bus trips", "Conferences", "Festivals"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
              { title: "Support", links: ["Help centre", "Contact", "Privacy", "Terms"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {col.title}
                </h4>
                <ul className="mt-4 space-y-2.5 text-[13.5px]">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-slate-400 transition-colors hover:text-white"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-6 text-[12.5px] text-slate-500 sm:flex-row">
            <p>© 2026 SmartPass. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="transition-colors hover:text-white">
                Privacy
              </a>
              <a href="#" className="transition-colors hover:text-white">
                Terms
              </a>
              <a href="#" className="transition-colors hover:text-white">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Small pieces
   ──────────────────────────────────────────────────────────────── */
function BandItem({ value, label, divider }) {
  return (
    <div className={divider ? "lg:border-l lg:border-slate-200 lg:pl-10" : ""}>
      <p className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-[13px] text-slate-500">{label}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, action, onAction }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-2.5 text-[1.6rem] font-semibold tracking-tight text-slate-900 sm:text-[1.9rem]">
          {title}
        </h2>
      </div>
      {action && (
        <button
          onClick={onAction}
          className="group inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-900 transition-colors hover:text-brand-600"
        >
          {action}
          <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Featured — large
   ──────────────────────────────────────────────────────────────── */
const FeaturedHeroCard = memo(function FeaturedHeroCard({ ev, onBuy }) {
  const image = resolveImage(ev.image_url);
  const price = getPriceInfo(ev);

  return (
    <article
      onClick={() => onBuy(ev.id)}
      className="group relative flex h-full min-h-[380px] cursor-pointer flex-col justify-end overflow-hidden rounded-2xl border border-slate-200 lg:min-h-[460px]"
    >
      {image ? (
        <img
          src={image}
          alt={ev.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-600" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-transparent" />

      <div className="relative p-6 sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
          <BoltIcon className="h-3.5 w-3.5" />
          Selling fast
        </span>

        <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-[1.9rem]">
          {ev.name}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-white/65">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDaysIcon className="h-4 w-4" />
            {formatDate(ev.start_date)} · {formatTime(ev.start_date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon className="h-4 w-4" />
            {ev.venue || "Venue TBA"}
          </span>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/15 pt-5">
          <p className="text-white">
            {price.note && (
              <span className="mr-1 text-[12px] text-white/55">{price.note}</span>
            )}
            <span className="text-xl font-bold tracking-tight">{price.text}</span>
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-900 transition-colors group-hover:bg-white/90">
            Get tickets
            <ArrowRightIcon className="h-4 w-4" />
          </span>
        </div>
      </div>
    </article>
  );
});

/* ────────────────────────────────────────────────────────────────
   Featured — row
   ──────────────────────────────────────────────────────────────── */
const FeaturedRowCard = memo(function FeaturedRowCard({ ev, onBuy }) {
  const image = resolveImage(ev.image_url);
  const price = getPriceInfo(ev);

  return (
    <article
      onClick={() => onBuy(ev.id)}
      className="group flex flex-1 cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_36px_-24px_rgba(15,23,42,0.4)]"
    >
      <div className="relative w-28 shrink-0 overflow-hidden bg-slate-100 sm:w-36">
        {image ? (
          <img
            src={image}
            alt={ev.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-600 text-2xl font-semibold text-white">
            {(ev.name || "?").charAt(0)}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center p-4 sm:p-5">
        {ev.category && (
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {ev.category}
          </p>
        )}
        <h3 className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-brand-700">
          {ev.name}
        </h3>
        <div className="mt-2 space-y-1 text-[12.5px] text-slate-500">
          <p className="flex items-center gap-1.5">
            <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{formatDate(ev.start_date)}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{ev.venue || "Venue TBA"}</span>
          </p>
        </div>
        <p className="mt-3 text-[15px] font-bold tracking-tight text-slate-900">
          {price.note && (
            <span className="mr-1 text-[11px] font-medium text-slate-400">
              {price.note}
            </span>
          )}
          {price.text}
        </p>
      </div>
    </article>
  );
});

/* ────────────────────────────────────────────────────────────────
   Event card
   ──────────────────────────────────────────────────────────────── */
const EventCard = memo(function EventCard({ ev, onBuy }) {
  const image = resolveImage(ev.image_url);
  const price = getPriceInfo(ev);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_44px_-26px_rgba(15,23,42,0.45)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={ev.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-600 text-4xl font-semibold text-white">
            {(ev.name || "?").charAt(0)}
          </div>
        )}

        {/* date chip */}
        <div className="absolute left-3 top-3 rounded-xl bg-white/95 px-2.5 py-1.5 text-center shadow-sm backdrop-blur">
          <span className="block text-[9.5px] font-bold leading-none tracking-wider text-brand-600">
            {monthShort(ev.start_date)}
          </span>
          <span className="mt-0.5 block text-[15px] font-bold leading-none text-slate-900">
            {dayNum(ev.start_date)}
          </span>
        </div>

        {ev.category && (
          <span className="absolute right-3 top-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-[10.5px] font-medium tracking-wide text-white backdrop-blur">
            {ev.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-brand-700">
          {ev.name}
        </h3>

        <div className="mt-2.5 space-y-1.5 text-[13px] text-slate-500">
          <p className="flex items-center gap-1.5">
            <MapPinIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{ev.venue || "Venue TBA"}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4 shrink-0" />
            {formatTime(ev.start_date)}
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-slate-900">
            {price.note && (
              <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {price.note}
              </span>
            )}
            <span className="text-[17px] font-bold tracking-tight">
              {price.text}
            </span>
          </p>
          <button
            onClick={() => onBuy(ev.id)}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Get tickets
          </button>
        </div>
      </div>
    </article>
  );
});
