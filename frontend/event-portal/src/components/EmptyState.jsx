import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

export default function EmptyState({ title, message, cta, to }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-5">
        <CalendarDaysIcon className="w-10 h-10 text-brand-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-xs mb-6">{message}</p>
      {cta && to && (
        <Link to={to} className="btn-primary">{cta}</Link>
      )}
    </div>
  );
}
