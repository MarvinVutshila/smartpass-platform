import { useEffect, useMemo, useState } from "react";
import {
  TicketIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import API from "../services/api";

const STATUS_STYLE = {
  active: "bg-emerald-50 text-emerald-700",
  used: "bg-slate-100 text-slate-500",
  blocked: "bg-rose-50 text-rose-700",
  expired: "bg-amber-50 text-amber-700",
};

const PAGE_SIZE = 20;

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);

    try {
      // IMPORTANT:
      // Use /tickets if your backend returns ALL individual tickets.
      // If your backend has /tickets/all, use that instead.
      const response = await API.get("/tickets");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.tickets || [];

      setTickets(data);
      setPage(1);
    } catch (error) {
      console.error("Failed to load tickets:", error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Search + status filtering
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tickets.filter((t) => {
      const matchesStatus =
        status === "all" ||
        (t.status || "active").toLowerCase() === status;

      const matchesSearch =
        !query ||
        String(t.id || "").toLowerCase().includes(query) ||
        (t.event_name || "").toLowerCase().includes(query) ||
        (t.user_email || "").toLowerCase().includes(query) ||
        (t.ticket_type || "").toLowerCase().includes(query) ||
        (t.ticket_code || "").toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [tickets, search, status]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const paginatedTickets = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // Statistics
  const stats = useMemo(() => {
    const total = tickets.length;

    const active = tickets.filter(
      (t) => (t.status || "active").toLowerCase() === "active"
    ).length;

    const used = tickets.filter(
      (t) => (t.status || "").toLowerCase() === "used"
    ).length;

    const revenue = tickets.reduce(
      (sum, t) => sum + Number(t.price_paid || 0),
      0
    );

    return {
      total,
      active,
      used,
      revenue,
    };
  }, [tickets]);

  // Reset page when searching/filtering
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Tickets
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Manage all tickets purchased for your events
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

            <input
              className="input pl-9 w-full sm:w-64"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status */}
          <select
            className="input w-full sm:w-36"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="used">Used</option>
            <option value="blocked">Blocked</option>
            <option value="expired">Expired</option>
          </select>

          {/* Refresh */}
          <button
            onClick={load}
            className="btn-outline"
            title="Refresh tickets"
          >
            <ArrowPathIcon
              className={`w-4 h-4 ${
                loading ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">
            Total Tickets
          </p>

          <p className="text-2xl font-bold text-slate-900 mt-2">
            {stats.total}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">
            Active
          </p>

          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {stats.active}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">
            Used
          </p>

          <p className="text-2xl font-bold text-slate-600 mt-2">
            {stats.used}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">
            Revenue
          </p>

          <p className="text-2xl font-bold text-slate-900 mt-2">
            R {stats.revenue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="card h-96 skeleton" />
      ) : (
        <>
          {/* Ticket table */}
          <div className="card overflow-hidden">

            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  All Tickets
                </h2>

                <p className="text-xs text-slate-400 mt-1">
                  Showing {filtered.length} ticket
                  {filtered.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">

                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">

                    <th className="px-5 py-3.5">
                      Ticket ID
                    </th>

                    <th className="px-5 py-3.5">
                      Ticket Code
                    </th>

                    <th className="px-5 py-3.5">
                      Event
                    </th>

                    <th className="px-5 py-3.5">
                      Type
                    </th>

                    <th className="px-5 py-3.5">
                      Customer
                    </th>

                    <th className="px-5 py-3.5">
                      Amount
                    </th>

                    <th className="px-5 py-3.5">
                      Status
                    </th>

                    <th className="px-5 py-3.5">
                      Purchased
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {paginatedTickets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-16 text-center text-slate-400"
                      >
                        <TicketIcon className="w-10 h-10 mx-auto mb-3 text-slate-200" />

                        <p className="font-medium">
                          No tickets found
                        </p>

                        <p className="text-xs mt-1">
                          Try changing your search or filter.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedTickets.map((t, i) => {

                      const ticketStatus =
                        (t.status || "active").toLowerCase();

                      return (
                        <motion.tr
                          key={t.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            delay: i * 0.02,
                          }}
                          className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                        >

                          {/* Ticket ID */}
                          <td className="px-5 py-3">
                            <span className="font-mono text-xs text-slate-500">
                              #{t.id}
                            </span>
                          </td>

                          {/* Ticket Code */}
                          <td className="px-5 py-3">
                            <span className="font-mono text-xs font-semibold text-slate-700">
                              {t.ticket_code || "—"}
                            </span>
                          </td>

                          {/* Event */}
                          <td className="px-5 py-3">
                            <div className="font-medium text-slate-800">
                              {t.event_name || "Unknown Event"}
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-5 py-3">
                            <span className="text-xs font-medium bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                              {t.ticket_type || "General Admission"}
                            </span>
                          </td>

                          {/* Customer */}
                          <td className="px-5 py-3">
                            <div className="text-slate-700">
                              {t.user_name || "Customer"}
                            </div>

                            <div className="text-xs text-slate-400">
                              {t.user_email || "Unknown"}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-3 font-semibold text-slate-900">
                            R {Number(t.price_paid || 0).toFixed(2)}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3">
                            <span
                              className={`badge ${
                                STATUS_STYLE[ticketStatus] ||
                                STATUS_STYLE.active
                              }`}
                            >
                              {ticketStatus
                                .charAt(0)
                                .toUpperCase() +
                                ticketStatus.slice(1)}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">
                            {t.purchase_date
                              ? new Date(
                                  t.purchase_date
                                ).toLocaleString("en-ZA")
                              : "N/A"}
                          </td>

                        </motion.tr>
                      );
                    })
                  )}

                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">

                <p className="text-xs text-slate-500">
                  Page {page} of {totalPages}
                </p>

                <div className="flex gap-2">

                  <button
                    disabled={page === 1}
                    onClick={() =>
                      setPage((p) => Math.max(1, p - 1))
                    }
                    className="btn-outline disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    Previous
                  </button>

                  <button
                    disabled={page === totalPages}
                    onClick={() =>
                      setPage((p) =>
                        Math.min(totalPages, p + 1)
                      )
                    }
                    className="btn-outline disabled:opacity-40"
                  >
                    Next
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>

                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}