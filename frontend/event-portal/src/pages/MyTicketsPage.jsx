import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  TicketIcon, CalendarDaysIcon, MapPinIcon,
  CheckCircleIcon, XCircleIcon, QrCodeIcon,
  ArrowDownTrayIcon, EnvelopeIcon,
  ClockIcon, CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import API from "../services/api";

const STATUS_CONFIG = {
  active:  { label: "Active",  bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  used:    { label: "Used",    bg: "bg-slate-100 text-slate-500",    dot: "bg-slate-400" },
  blocked: { label: "Blocked", bg: "bg-rose-50 text-rose-700",      dot: "bg-rose-400" },
  expired: { label: "Expired", bg: "bg-slate-100 text-slate-500",    dot: "bg-slate-400" },
  revoked: { label: "Revoked", bg: "bg-rose-50 text-rose-700",      dot: "bg-rose-400" },
  checked_in: { label: "Checked In", bg: "bg-blue-50 text-blue-700", dot: "bg-blue-400" },
};

function Toast({ message, type, onClose }) {
  const bg = type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800";
  const icon = type === "success" ? <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> : <XCircleIcon className="w-5 h-5 text-rose-500" />;
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border shadow-lg flex items-center gap-3 ${bg}`}>
      {icon}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-4 text-slate-400 hover:text-slate-600">&times;</button>
    </motion.div>
  );
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [params] = useSearchParams();
  const [toast, setToast] = useState(null);
  const successId = params.get("success");

  useEffect(() => {
    API.get("/tickets/me")
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        setTickets(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const sendTicketEmail = async (ticketId) => {
    try {
      await API.post(`/tickets/${ticketId}/email`);
      setToast({ message: "Ticket sent to your email! 📧", type: "success" });
    } catch (err) {
      setToast({ message: err.response?.data?.detail || "Failed to send email.", type: "error" });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "TBD";
    return new Date(dateStr).toLocaleString("en-ZA", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {successId && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-8">
          <CheckCircleIcon className="w-6 h-6 text-emerald-500 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">Ticket confirmed! 🎉</p>
            <p className="text-sm text-emerald-600">Ticket #{successId} is now in your wallet below.</p>
            <p className="text-xs text-emerald-500 mt-1">📧 A copy was also sent to your email.</p>
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tickets.map((t, i) => {
            const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.active;
            return (
              <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * .06 }}
                className="card overflow-hidden cursor-pointer hover:shadow-card-hover transition-shadow"
                onClick={() => setSelected(t)}>
                <div className={`h-1 bg-gradient-to-r ${t.status === 'active' ? 'from-brand-500 to-violet-500' : 'from-slate-300 to-slate-400'}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug">{t.event_name || `Event #${t.event_id}`}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{t.ticket_type || "General Admission"}</p>
                    </div>
                    <span className={`badge ${cfg.bg} flex items-center gap-1 text-xs`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <CalendarDaysIcon className="w-3.5 h-3.5" />
                      <span>{formatDate(t.issued_at)}</span>
                    </div>
                    {t.venue && (
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="w-3.5 h-3.5" />
                        <span>{t.venue}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <CurrencyDollarIcon className="w-3.5 h-3.5" />
                      <span className="font-semibold text-slate-700">R {t.price_paid?.toFixed(2) || "0.00"}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-400">Ticket ID: {t.public_ticket_id?.slice(0, 8) || t.id}</span>
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

      {/* ─── QR Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4"
            onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: .92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .92, opacity: 0 }}
              className="card w-full max-w-sm p-8 text-center" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-slate-900 text-lg mb-1">{selected.event_name || `Ticket #${selected.id}`}</h3>
              <p className="text-sm text-slate-500 mb-4">{selected.ticket_type || "General Admission"}</p>
              <div className="bg-slate-50 rounded-2xl p-6 flex items-center justify-center mb-4">
                {/* ✅ The QR image now contains the full verification URL */}
                <img
                  src={selected.qr_image_url}
                  alt="QR code"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button onClick={() => setSelected(null)} className="btn-outline flex-1 justify-center">Close</button>
                  <a
                    href={selected.qr_image_url}
                    download={`ticket-${selected.id}.png`}
                    className="btn-primary flex-1 justify-center"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" /> Download
                  </a>
                </div>
                <button
                  onClick={() => sendTicketEmail(selected.id)}
                  className="btn-secondary w-full justify-center gap-2"
                >
                  <EnvelopeIcon className="w-4 h-4" /> Send to Email
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}