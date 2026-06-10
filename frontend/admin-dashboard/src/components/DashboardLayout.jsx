import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  SparklesIcon, ChartBarIcon, CalendarDaysIcon, TicketIcon,
  ShieldExclamationIcon, ArrowRightOnRectangleIcon, Bars3Icon,
  XMarkIcon, UserCircleIcon, BellIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

const NAV = [
  { to: "/",       icon: ChartBarIcon,           label: "Dashboard" },
  { to: "/events", icon: CalendarDaysIcon,        label: "Events" },
  { to: "/tickets",icon: TicketIcon,              label: "Tickets" },
  { to: "/fraud",  icon: ShieldExclamationIcon,   label: "Fraud Monitor" },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userName = sessionStorage.getItem("user_name") || "Admin";
  const navigate = useNavigate();
  const logout = () => { sessionStorage.clear(); navigate("/login"); };

  const Sidebar = ({ mobile }) => (
    <aside className={mobile
      ? "w-64 bg-white border-r border-slate-100 h-full flex flex-col"
      : "hidden lg:flex w-64 shrink-0 bg-white border-r border-slate-100 flex-col h-screen sticky top-0"
    }>
      {/* Logo */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center shadow">
          <SparklesIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-bold text-slate-900 text-sm leading-tight">SmartPass</div>
          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Admin</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === "/"}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <UserCircleIcon className="w-5 h-5 text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">{userName}</div>
            <div className="text-xs text-slate-400">Administrator</div>
          </div>
          <button onClick={logout} title="Sign out"
            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors">
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full z-50 lg:hidden">
              <Sidebar mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-30">
          <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setSidebarOpen(true)}>
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-slate-100 relative">
              <BellIcon className="w-5 h-5 text-slate-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                <UserCircleIcon className="w-5 h-5 text-brand-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{userName.split(" ")[0]}</span>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
