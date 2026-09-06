// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CheckoutPage from "./pages/CheckoutPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import VerifyPage from "./pages/VerifyPage";          // IMPORT THIS
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/my-tickets" element={<MyTicketsPage />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/verify" element={<VerifyPage />} />   {/* ADD THIS */}
      </Routes>
    </BrowserRouter>
  );
}