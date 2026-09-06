import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircleIcon, XCircleIcon, TicketIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference");
  const [status, setStatus] = useState("loading");
  const [ticketId, setTicketId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      return;
    }

    // Verify payment with backend
    API.get(`/payments/paystack/verify/${reference}`)
      .then((res) => {
        if (res.data.status === "success") {
          setStatus("success");
          // If backend returns ticket_id, store it
          if (res.data.ticket_id) setTicketId(res.data.ticket_id);
        } else {
          setStatus("failed");
        }
      })
      .catch(() => setStatus("error"));
  }, [reference]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-brand-500 animate-spin mx-auto" />
          <p className="mt-4 text-slate-600 font-medium">Verifying your payment…</p>
          <p className="text-sm text-slate-400">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-emerald-100"
        >
          {/* Success icon with pulse */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircleIcon className="w-14 h-14 text-emerald-600" />
          </motion.div>

          <h1 className="text-3xl font-extrabold text-slate-900">Payment Successful! 🎉</h1>
          <p className="text-slate-500 mt-2">Your ticket has been issued and sent to your email.</p>

          <div className="mt-6 bg-slate-50 rounded-xl p-4 flex items-center gap-3 border border-slate-200">
            <TicketIcon className="w-6 h-6 text-brand-500" />
            <div className="text-left">
              <p className="text-xs text-slate-400">Reference</p>
              <p className="font-mono text-sm font-semibold text-slate-700">{reference}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/my-tickets")}
              className="flex-1 bg-brand-600 text-white font-semibold py-3 rounded-xl hover:bg-brand-700 transition shadow-md"
            >
              View My Tickets
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 bg-white border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition"
            >
              Browse More Events
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-6">
            A copy of your ticket has also been sent to your registered email.
          </p>
        </motion.div>
      </div>
    );
  }

  // Failed or error state
  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-rose-200">
        <XCircleIcon className="w-20 h-20 text-rose-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Payment Failed</h1>
        <p className="text-slate-500 mt-2">
          We couldn't verify your payment. Please try again or contact support.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-brand-600 text-white font-semibold py-3 rounded-xl hover:bg-brand-700 transition"
          >
            Retry
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex-1 bg-white border border-slate-300 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}