import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  TicketIcon, CalendarDaysIcon, MapPinIcon,
  CheckCircleIcon, XCircleIcon, QrCodeIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import API from "../services/api";

const STATUS_CONFIG = {
  active:  { label: "Active",  bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  used:    { label: "Used",    bg: "bg-slate-100 text-slate-500",    dot: "bg-slate-400" },
  blocked: { label: "Blocked", bg: "bg-rose-50 text-rose-700",      dot: "bg-rose-400" },
};

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [params] = useSearchParams();
  const successId = params.get("success");

  useEffect(() => {
    API.get("/tickets/me")
      .then((r) => setTickets(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

      {/* Success banner */}
      {successId && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-8">
          <CheckCircleIcon className="w-6 h-6 text-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">Ticket confirmed! 🎉</p>
            <p className="text-sm text-emerald-600">Ticket #{successId} is now in your wallet below.</p>
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""} in your wallet</p>
        </div>
        <Link to="/" className="btn-outline text-sm">Browse events</Link>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="skeleton h-4 w-2/3 rounded-full" />
              <div className="skeleton h-3 w-1/2 rounded-full" />
              <div className="skeleton h-32 rounded-xl" />
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="card py-20 text-center">
          <TicketIcon className="w-14 h-14 mx-auto mb-4 text-slate-200" />
          <h3 className="font-semibold text-slate-700 mb-2">No tickets yet</h3>
          <p className="text-sm text-slate-500 mb-6">Browse upcoming events and grab your first ticket.</p>
          <Link to="/" className="btn-primary">Browse events</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {tickets.map((t, i) => {
            const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.active;
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * .06 }}
                className="card overflow-hidden cursor-pointer hover:shadow-card-hover transition-shadow"
                onClick={() => setSelected(t)}>
                {/* Top accent */}
                <div className="h-1 bg-gradient-to-r from-brand-500 to-violet-500" />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug max-w-[70%]">Ticket #{t.id}</h3>
                    <span className={`badge ${cfg.bg} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                    Purchased {new Date(t.purchase_date).toLocaleDateString("en-ZA")}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                    <MapPinIcon className="w-3.5 h-3.5" /> Event #{t.event_id}
                  </div>

                  {/* QR preview */}
                  <div className="bg-slate-50 rounded-xl p-4 flex flex-col items-center gap-2">
                    <img src={t.qr_image_url}
                      onError={(e) => { e.target.style.display = "none"; }}
                      alt="QR code" className="w-24 h-24 object-contain" />
                    <p className="text-xs text-slate-400">Tap to view full QR</p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="text-base font-bold text-slate-900">R {t.price_paid}</span>
                    <button className="btn-outline text-xs !py-1.5 !px-3" onClick={(e) => { e.stopPropagation(); setSelected(t); }}>
                      <QrCodeIcon className="w-3.5 h-3.5" /> View QR
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* QR Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: .92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .92, opacity: 0 }}
              className="card w-full max-w-sm p-8 text-center" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-slate-900 text-lg mb-1">Ticket #{selected.id}</h3>
              <p className="text-sm text-slate-500 mb-6">Show this QR code at the venue entrance.</p>
              <div className="bg-slate-50 rounded-2xl p-6 flex items-center justify-center mb-6">
                <img src={selected.qr_image_url}
                  onError={(e) => { e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SMARTPASS-${selected.id}`; }}
                  alt="QR" className="w-48 h-48 object-contain" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="btn-outline flex-1 justify-center">Close</button>
                <a href={selected.qr_image_url} download={`ticket-${selected.id}.png`}
                  className="btn-primary flex-1 justify-center">
                  <ArrowDownTrayIcon className="w-4 h-4" /> Download
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
