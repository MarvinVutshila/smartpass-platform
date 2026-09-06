import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  CreditCardIcon,
  LockClosedIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

const formatPrice = (price) => `R ${price.toFixed(2)}`;

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const eventId = params.get("eventId");
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const navigate = useNavigate();

  // Get token and check authentication
  const token = sessionStorage.getItem("access_token");

  useEffect(() => {
    // If no token, redirect to login
    if (!token) {
      navigate(`/login?redirect=checkout&eventId=${eventId}`);
      return;
    }

    // Fetch user email if not stored
    const storedEmail = sessionStorage.getItem("user_email");
    if (storedEmail) {
      setUserEmail(storedEmail);
    } else {
      API.get("/auth/me")
        .then((res) => {
          const email = res.data.email;
          sessionStorage.setItem("user_email", email);
          setUserEmail(email);
        })
        .catch(() => {
          // Token invalid, redirect to login
          sessionStorage.removeItem("access_token");
          navigate(`/login?redirect=checkout&eventId=${eventId}`);
        });
    }

    // Fetch event
    if (!eventId) {
      navigate("/");
      return;
    }
    API.get(`/events/${eventId}`)
      .then((r) => {
        const ev = r.data;
        setEvent(ev);
        if (ev.tiers && ev.tiers.length > 0) {
          const sorted = [...ev.tiers].sort((a, b) => a.price - b.price);
          setSelectedTier(sorted[0]);
        } else {
          setSelectedTier({
            id: null,
            name: "General Admission",
            price: ev.ticket_price || 0,
          });
        }
      })
      .catch(() => navigate("/"))
      .finally(() => setLoading(false));
  }, [eventId, navigate, token]);

  const handlePay = async () => {
    if (!selectedTier) {
      alert("Please select a ticket type.");
      return;
    }
    if (!userEmail) {
      alert("Please log in first.");
      navigate("/login");
      return;
    }

    setProcessing(true);
    try {
      const res = await API.post("/payments/paystack/initialize", {
        event_id: parseInt(eventId),
        ticket_type: selectedTier.name,
        amount: selectedTier.price,
      });

      const { authorization_url } = res.data;
      window.location.href = authorization_url;
    } catch (err) {
      alert("Payment initialization failed: " + (err.response?.data?.detail || err.message));
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!event) return null;

  const tiers = event.tiers || [];
  const hasTiers = tiers.length > 0;
  const displayPrice = selectedTier ? formatPrice(selectedTier.price) : "R 0.00";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 to-white flex items-start justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
            <p className="text-sm text-slate-500">Review your order and confirm</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-600" />
            Event
          </span>
          <span className="w-8 h-px bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-600" />
            Ticket
          </span>
          <span className="w-8 h-px bg-slate-200" />
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            Pay
          </span>
        </div>

        {/* Event Summary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Your Order
          </h2>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 flex items-center justify-center shrink-0">
              <CalendarDaysIcon className="w-7 h-7 text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 text-lg leading-tight truncate">
                {event.name}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                <CalendarDaysIcon className="w-4 h-4" />
                {new Date(event.start_date).toLocaleString("en-ZA")}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
                <MapPinIcon className="w-4 h-4" /> {event.venue || "TBA"}
              </div>
            </div>
          </div>

          {/* Selected tier */}
          <div className="border-t border-slate-100 mt-5 pt-5">
            {selectedTier && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-slate-500">Ticket Type</span>
                  <p className="font-semibold text-slate-900">{selectedTier.name}</p>
                  {selectedTier.description && (
                    <p className="text-xs text-slate-400">{selectedTier.description}</p>
                  )}
                </div>
                <span className="text-2xl font-extrabold text-brand-700">
                  {displayPrice}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tier Selection */}
        {hasTiers && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6 border border-slate-100 shadow-sm"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Select Ticket Type
            </h2>
            <div className="space-y-3">
              {tiers.map((tier, idx) => {
                const isSelected = selectedTier && selectedTier.id === tier.id;
                return (
                  <motion.button
                    key={tier.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    onClick={() => setSelectedTier(tier)}
                    className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                      isSelected
                        ? "border-brand-500 ring-2 ring-brand-500/30 bg-brand-50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          {tier.name}
                          {isSelected && (
                            <CheckCircleIcon className="w-4 h-4 text-brand-500" />
                          )}
                        </div>
                        {tier.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{tier.description}</p>
                        )}
                        {tier.benefits && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tier.benefits.split(",").map((b, i) => (
                              <span
                                key={i}
                                className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                              >
                                {b.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-lg font-bold text-brand-700">
                        {formatPrice(tier.price)}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Payment */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6 border border-slate-100 shadow-sm bg-gradient-to-br from-white to-slate-50/50"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Payment
          </h2>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-slate-500 border border-slate-200 mb-5">
            <LockClosedIcon className="w-4 h-4 text-emerald-500" />
            <span>You will be redirected to Paystack to complete payment securely.</span>
          </div>
        </motion.div>

        {/* Pay Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative"
        >
          <button
            onClick={handlePay}
            disabled={processing || !selectedTier}
            className={`w-full flex items-center justify-center gap-2 text-white font-bold py-4 rounded-2xl shadow-lg transition-all text-base ${
              processing || !selectedTier
                ? "bg-slate-400 cursor-not-allowed opacity-60"
                : "bg-gradient-to-r from-brand-600 to-violet-600 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {processing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <CreditCardIcon className="w-5 h-5" />
                Pay {displayPrice} with Paystack
                <ArrowRightIcon className="w-4 h-4" />
              </>
            )}
          </button>
          {!processing && selectedTier && (
            <motion.div
              className="absolute inset-0 rounded-2xl -z-10 bg-gradient-to-r from-brand-600 to-violet-600 opacity-20"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400"
        >
          <span className="flex items-center gap-1.5">
            <LockClosedIcon className="w-3.5 h-3.5" /> Secure payment
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheckIcon className="w-3.5 h-3.5" /> Fraud protection
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircleIcon className="w-3.5 h-3.5" /> Instant confirmation
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}