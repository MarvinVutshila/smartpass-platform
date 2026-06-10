import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLoginPage from "./pages/AdminLoginPage";
import DashboardLayout from "./components/DashboardLayout";
import AnalyticsPage from "./pages/AnalyticsPage";
import EventsPage from "./pages/EventsPage";
import TicketsPage from "./pages/TicketsPage";
import FraudPage from "./pages/FraudPage";

function Protected({ children }) {
  const token = sessionStorage.getItem("access_token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AdminLoginPage />} />
        <Route path="/" element={<Protected><DashboardLayout /></Protected>}>
          <Route index element={<AnalyticsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="fraud" element={<FraudPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
