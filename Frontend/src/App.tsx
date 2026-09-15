import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Home from "./pages/Home";
import Detail from "./pages/Detail";
import Booking from "./pages/Booking";
import List from "./pages/List";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import FieldPage from "./pages/FieldPage";
import MapPage from "./pages/MapPage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";
import Paygate from "./pages/Paygate";
import VnPaySandbox from "./pages/VnPaySandbox"; // 1. Đã thêm import trang giả lập VNPAY
import AdminLayout from "./layouts/AdminLayout";
import AdminBookings from "./pages/Admin/AdminBookings";
import Dashboard from "./pages/Admin/Dashboard";
import Courts from "./pages/Admin/Courts";
import CalendarPage from "./pages/Admin/CalendarPage";
import AdminCustomers from "./pages/Admin/AdminCustomers";
import AdminVouchers from "./pages/Admin/AdminVouchers";
import AdminEmployees from "./pages/Admin/AdminEmployees";
import ClientLayout from "./layouts/ClientLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import VnPayReturn from "./pages/VnPayReturn";

function App() {
  return (
    <>
      <Routes>
        <Route path="/*" element={<ClientLayout />}>
          <Route index element={<Home />} />
          <Route path="detail/:id" element={<Detail />} />
          <Route path="detail" element={<Detail />} />
          <Route path="booking" element={<Booking />} />
          <Route path="tim-san" element={<List />} />
          <Route path="fields" element={<FieldPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="ban-do" element={<MapPage />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:id" element={<BlogDetail />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="paygate" element={<Paygate />} />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-bookings"
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 2. Đã thêm Route VnPaySandbox độc lập ở đây */}
        <Route path="/vnpay-sandbox" element={<VnPaySandbox />} />
        <Route path="/vnpay-return" element={<VnPayReturn />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="courts" element={<Courts />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="vouchers" element={<AdminVouchers />} />
          <Route path="employees" element={<AdminEmployees />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}

export default App;