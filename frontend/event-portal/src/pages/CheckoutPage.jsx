import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CreditCardIcon, CheckBadgeIcon, LockClosedIcon, CalendarDaysIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const eventId = params.get("eventId");
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!eventId) { navigate("/"); return; }
    API.get(`/events/${eventId}`)
      .then((r) => setEvent(r.data))
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));
  }, [eventId, navigate]);

  const handlePay = async () => {
    setProcessing(true);
    try {
      const res = await API.post("/checkout", { event_id: parseInt(eventId) });
      navigate(`/my-tickets?success=${res.data.ticket_id}`);
    } catch (err) {
      alert("Payment failed: " + (err.response?.data?.detail || err.message));
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );

  if (!event) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-start justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg space-y-5">

        <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>

        {/* Event summary */}
        <div className="card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Your Order</h2>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 flex items-center justify-center shrink-0">
              <CalendarDaysIcon className="w-7 h-7 text-brand-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight">{event.name}</h3>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                <CalendarDaysIcon className="w-4 h-4" />
                {new Date(event.start_date).toLocaleString("en-ZA")}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
                <MapPinIcon className="w-4 h-4" /> {event.venue}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-5 pt-5 flex items-center justify-between">
            <span className="text-sm text-slate-500">General Admission × 1</span>
            <span className="text-xl font-extrabold text-slate-900">R {event.ticket_price}</span>
          </div>
        </div>

        {/* Payment (mock) */}
        <div className="card p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Payment</h2>
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-slate-500 mb-5">
            <LockClosedIcon className="w-4 h-4 text-emerald-500" />
            This is a demo checkout — no real charge will be made.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Card number</label>
              <input className="input" defaultValue="4242 4242 4242 4242" readOnly />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Expiry</label>
              <input className="input" defaultValue="12/28" readOnly />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">CVC</label>
              <input className="input" defaultValue="123" readOnly />
            </div>
          </div>
        </div>

        <button onClick={handlePay} disabled={processing}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95 text-base disabled:opacity-60">
          {processing
            ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
            : <><CreditCardIcon className="w-5 h-5" /> Pay R {event.ticket_price} — Complete Purchase</>
          }
        </button>

        <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          <LockClosedIcon className="w-3 h-3" /> Secured by SmartPass AI Fraud Protection
        </p>
      </motion.div>
    </div>
  );
}
