import { useEffect, useState } from "react";
import {
  CalendarDaysIcon, MapPinIcon, CurrencyDollarIcon, UsersIcon, PlusIcon,
  ArrowPathIcon, PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    API.get("/events").then((r) => setEvents(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Events</h1>
          <p className="text-sm text-slate-500 mt-0.5">{events.length} events in the system</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline"><ArrowPathIcon className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-48 skeleton" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="card py-20 text-center">
          <CalendarDaysIcon className="w-12 h-12 mx-auto mb-3 text-slate-200" />
          <p className="text-slate-500 font-medium">No events yet.</p>
          <p className="text-xs text-slate-400 mt-1">Create your first event from the Dashboard.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {events.map((ev, i) => {
            const now = new Date();
            const start = new Date(ev.start_date);
            const upcoming = start > now;
            return (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .04 }}
                className="card overflow-hidden group">
                <div className={`h-1.5 ${upcoming ? "bg-gradient-to-r from-brand-500 to-violet-500" : "bg-slate-200"}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-slate-900 text-base leading-snug pr-3">{ev.name}</h3>
                    <span className={`badge shrink-0 ${upcoming ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {upcoming ? "Upcoming" : "Past"}
                    </span>
                  </div>
                  {ev.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{ev.description}</p>}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <CalendarDaysIcon className="w-3.5 h-3.5 shrink-0" />
                      {new Date(ev.start_date).toLocaleString("en-ZA")}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <MapPinIcon className="w-3.5 h-3.5 shrink-0" /> {ev.venue}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <UsersIcon className="w-3.5 h-3.5 shrink-0" /> Capacity: {ev.capacity}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="font-bold text-slate-900 text-base flex items-center gap-1">
                      <CurrencyDollarIcon className="w-4 h-4 text-emerald-500" /> R {ev.ticket_price}
                    </span>
                    <span className="text-xs font-mono text-slate-400">ID #{ev.id}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
