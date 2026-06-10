import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  SparklesIcon, TicketIcon, Bars3Icon, XMarkIcon,
  UserCircleIcon, BellIcon, ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const token = sessionStorage.getItem("access_token");
  const userName = sessionStorage.getItem("user_name") || "Account";
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const logout = () => { sessionStorage.clear(); navigate("/"); };

  const navLink = (to, label) => (
    <Link
      key={to}
      to={to}
      onClick={() => setMenuOpen(false)}
      className={`text-sm font-medium transition-colors ${
        pathname === to ? "text-brand-600" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 flex items-center justify-center shadow-sm">
            <SparklesIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg tracking-tight">SmartPass</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {navLink("/", "Events")}
          {token && navLink("/my-tickets", "My Tickets")}
        </nav>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-3">
          {token ? (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-3 pr-4 py-1.5 rounded-full border border-slate-200 hover:border-brand-300 transition-colors text-sm font-medium text-slate-700"
              >
                <UserCircleIcon className="w-5 h-5 text-brand-600" />
                {userName.split(" ")[0]}
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: .96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: .96 }}
                    transition={{ duration: .15 }}
                    className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-1 z-50"
                  >
                    <Link to="/my-tickets" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                      <TicketIcon className="w-4 h-4" /> My Tickets
                    </Link>
                    <hr className="my-1 border-slate-100" />
                    <button onClick={logout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50">
                      <ArrowRightOnRectangleIcon className="w-4 h-4" /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Sign in</Link>
              <Link to="/register" className="btn-primary text-sm !py-2 !px-4">Get started</Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-100 bg-white overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              {navLink("/", "Events")}
              {token && navLink("/my-tickets", "My Tickets")}
              {token
                ? <button onClick={logout} className="text-left text-sm font-medium text-rose-500">Sign out</button>
                : <>
                    <Link to="/login" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-slate-600">Sign in</Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary text-sm w-full justify-center">Get started</Link>
                  </>
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
