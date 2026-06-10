import { useEffect, useState } from "react";
import { TicketIcon, ArrowPathIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

const STATUS_STYLE = {
  active:  "bg-emerald-50 text-emerald-700",
  used:    "bg-slate-100 text-slate-500",
  blocked: "bg-rose-50 text-rose-700",
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = () => {
    API.get("/tickets/recent").then((r) => setTickets(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = tickets.filter((t) =>
    t.event_name.toLowerCase().includes(search.toLowerCase()) ||
    t.user_email.toLowerCase().includes(search.toLowerCase()) ||
    String(t.id).includes(search)
  );

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-500 mt-0.5">Most recent purchases</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="input pl-9 w-56" placeholder="Search tickets…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button onClick={load} className="btn-outline"><ArrowPathIcon className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="card h-64 skeleton" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3.5">Ticket ID</th>
                  <th className="px-5 py-3.5">Event</th>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <TicketIcon className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                    No tickets found.
                  </td></tr>
                ) : filtered.map((t, i) => (
                  <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * .03 }}
                    className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">#{t.id}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{t.event_name}</td>
                    <td className="px-5 py-3 text-slate-500">{t.user_email}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">R {t.price_paid}</td>
                    <td className="px-5 py-3">
                      <span className={`badge ${STATUS_STYLE[t.status] || STATUS_STYLE.active}`}>
                        {(t.status || "active").charAt(0).toUpperCase() + (t.status || "active").slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{new Date(t.purchase_date).toLocaleString("en-ZA")}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
