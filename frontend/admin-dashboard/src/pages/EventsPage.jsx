import { useEffect, useState } from "react";
import {
  CalendarDaysIcon, MapPinIcon, CurrencyDollarIcon, UsersIcon, PlusIcon,
  ArrowPathIcon, PencilSquareIcon, TrashIcon, TicketIcon,
  XMarkIcon, ChevronDownIcon, ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import API from "../services/api";

// ─── Tier Input Row (reused from AnalyticsPage) ──────────────
function TierInput({ tier, index, onChange, onRemove }) {
  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 relative group">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 text-slate-400 hover:text-rose-600 transition-colors"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Tier Name *</label>
          <input
            required
            className="input"
            placeholder="e.g. VIP, General, Student"
            value={tier.name}
            onChange={(e) => onChange(index, 'name', e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Benefits</label>
          <input
            className="input"
            placeholder="What this tier includes"
            value={tier.description}
            onChange={(e) => onChange(index, 'description', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Price (R) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            className="input"
            value={tier.price}
            onChange={(e) => onChange(index, 'price', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Capacity *</label>
          <input
            type="number"
            min="1"
            required
            className="input"
            value={tier.capacity}
            onChange={(e) => onChange(index, 'capacity', parseInt(e.target.value) || 1)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Benefits (comma‑separated)</label>
          <input
            className="input"
            placeholder="e.g. Early entry, Meet & Greet"
            value={tier.benefits}
            onChange={(e) => onChange(index, 'benefits', e.target.value)}
          />
          <p className="text-[10px] text-slate-400 mt-1">Separate benefits with commas.</p>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Modal state ─────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [tierForm, setTierForm] = useState({
    name: "",
    description: "",
    price: 0,
    capacity: 10,
    benefits: "",
  });
  const [editingTier, setEditingTier] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTiers, setLoadingTiers] = useState(false);

  // ─── Load events ──────────────────────────────────────────────
  const load = () => {
    setLoading(true);
    API.get("/events")
      .then((r) => setEvents(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ─── Open modal and load tiers ──────────────────────────────
  const openModal = async (event) => {
    setSelectedEvent(event);
    setModalOpen(true);
    setEditingTier(null);
    setTierForm({ name: "", description: "", price: 0, capacity: 10, benefits: "" });
    setLoadingTiers(true);
    try {
      const res = await API.get(`/admin/events/${event.id}/tiers`);
      setTiers(res.data);
    } catch (err) {
      console.error("Failed to load tiers", err);
      setTiers([]);
    } finally {
      setLoadingTiers(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
    setTiers([]);
  };

  // ─── Tier CRUD ────────────────────────────────────────────────
  const addTier = async () => {
    if (!selectedEvent) return;
    setSubmitting(true);
    try {
      await API.post(`/admin/events/${selectedEvent.id}/tiers`, tierForm);
      const res = await API.get(`/admin/events/${selectedEvent.id}/tiers`);
      setTiers(res.data);
      setTierForm({ name: "", description: "", price: 0, capacity: 10, benefits: "" });
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to add tier");
    } finally {
      setSubmitting(false);
    }
  };

  const updateTier = async (tierId) => {
    if (!editingTier) return;
    setSubmitting(true);
    try {
      await API.put(`/admin/tiers/${tierId}`, tierForm);
      const res = await API.get(`/admin/events/${selectedEvent.id}/tiers`);
      setTiers(res.data);
      setEditingTier(null);
      setTierForm({ name: "", description: "", price: 0, capacity: 10, benefits: "" });
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update tier");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTier = async (tierId) => {
    if (!confirm("Delete this tier?")) return;
    setSubmitting(true);
    try {
      await API.delete(`/admin/tiers/${tierId}`);
      const res = await API.get(`/admin/events/${selectedEvent.id}/tiers`);
      setTiers(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete tier");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditTier = (tier) => {
    setEditingTier(tier);
    setTierForm({
      name: tier.name,
      description: tier.description || "",
      price: tier.price,
      capacity: tier.capacity,
      benefits: tier.benefits || "",
    });
  };

  const cancelEdit = () => {
    setEditingTier(null);
    setTierForm({ name: "", description: "", price: 0, capacity: 10, benefits: "" });
  };

  // ─── Delete Event ─────────────────────────────────────────────
  const deleteEvent = async (eventId, eventName) => {
    if (!confirm(`Are you sure you want to delete "${eventName}"? This action cannot be undone.`)) return;
    try {
      await API.delete(`/admin/events/${eventId}`);
      load(); // Refresh the list
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete event.");
    }
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Events</h1>
          <p className="text-sm text-slate-500 mt-0.5">{events.length} events in the system</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline">
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-48 skeleton" />
          ))}
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
            const eventTiers = ev.tiers || [];
            const lowestPrice = eventTiers.length > 0
              ? Math.min(...eventTiers.map(t => t.price))
              : (ev.ticket_price || 0);

            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card overflow-hidden group"
              >
                <div className={`h-1.5 ${upcoming ? "bg-gradient-to-r from-brand-500 to-violet-500" : "bg-slate-200"}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-slate-900 text-base leading-snug pr-3">{ev.name}</h3>
                    <span className={`badge shrink-0 ${upcoming ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {upcoming ? "Upcoming" : "Past"}
                    </span>
                  </div>
                  {ev.description && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{ev.description}</p>
                  )}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <CalendarDaysIcon className="w-3.5 h-3.5 shrink-0" />
                      {new Date(ev.start_date).toLocaleString("en-ZA")}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <MapPinIcon className="w-3.5 h-3.5 shrink-0" /> {ev.venue || "TBA"}
                    </div>
                  </div>

                  {/* ─── Ticket Tiers ────────────────────────── */}
                  <div className="mb-3">
                    {eventTiers.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                          <TicketIcon className="w-3.5 h-3.5" /> Ticket Tiers
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {eventTiers.map((tier) => (
                            <div
                              key={tier.id}
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-2"
                            >
                              <span className="font-medium text-slate-800">{tier.name}</span>
                              <span className="text-brand-600 font-bold">R {tier.price}</span>
                              <span className="text-slate-400">(Cap: {tier.capacity})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">No ticket tiers</div>
                    )}
                  </div>

                  {/* ─── Footer ───────────────────────────────── */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="font-bold text-slate-900 text-base flex items-center gap-1">
                      <CurrencyDollarIcon className="w-4 h-4 text-emerald-500" />
                      {eventTiers.length > 0 ? `From R ${lowestPrice}` : `R ${lowestPrice}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openModal(ev)}
                        className="text-xs text-slate-400 hover:text-brand-600 transition-colors flex items-center gap-1"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5" /> Manage Tiers
                      </button>
                      <button
                        onClick={() => deleteEvent(ev.id, ev.name)}
                        className="text-xs text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── Tier Management Modal ──────────────────────────── */}
      <AnimatePresence>
        {modalOpen && selectedEvent && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4 overflow-y-auto py-8"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Manage Tiers</h2>
                  <p className="text-sm text-slate-500">{selectedEvent.name}</p>
                </div>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* ─── Existing tiers ──────────────────────────── */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Current Tiers</h3>
                {loadingTiers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
                  </div>
                ) : tiers.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No tiers defined for this event.</p>
                ) : (
                  <div className="space-y-3">
                    {tiers.map((tier) => (
                      <div
                        key={tier.id}
                        className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">{tier.name}</div>
                          <div className="text-sm text-slate-500">
                            R {tier.price} · Capacity: {tier.capacity}
                            {tier.benefits && <span className="ml-2 text-xs">• {tier.benefits}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditTier(tier)}
                            className="text-xs text-slate-400 hover:text-brand-600 transition-colors"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTier(tier.id)}
                            className="text-xs text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ─── Add/Edit Tier Form ──────────────────────── */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">
                  {editingTier ? "Edit Tier" : "Add New Tier"}
                </h3>
                {editingTier && (
                  <div className="text-xs text-slate-500 mb-3">
                    Editing: <span className="font-medium text-slate-700">{editingTier.name}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tier Name *</label>
                    <input
                      required
                      className="input"
                      placeholder="e.g. VIP, General"
                      value={tierForm.name}
                      onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Benefits</label>
                    <input
                      className="input"
                      placeholder="What this tier includes"
                      value={tierForm.description}
                      onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Price (R) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      className="input"
                      value={tierForm.price}
                      onChange={(e) => setTierForm({ ...tierForm, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Capacity *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="input"
                      value={tierForm.capacity}
                      onChange={(e) => setTierForm({ ...tierForm, capacity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Benefits (comma‑separated)</label>
                    <input
                      className="input"
                      placeholder="e.g. Early entry, Meet & Greet"
                      value={tierForm.benefits}
                      onChange={(e) => setTierForm({ ...tierForm, benefits: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  {editingTier && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="btn-outline flex-1 justify-center"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={editingTier ? () => updateTier(editingTier.id) : addTier}
                    disabled={submitting}
                    className="btn-primary flex-1 justify-center"
                  >
                    {submitting ? "Saving…" : editingTier ? "Update Tier" : "Add Tier"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}