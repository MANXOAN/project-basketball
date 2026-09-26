import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import ClientLayout from "./layouts/ClientLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useRevealOnScroll } from "./hooks/useRevealOnScroll";

const Home = lazy(() => import("./pages/Home"));
const Detail = lazy(() => import("./pages/Detail"));
const Booking = lazy(() => import("./pages/Booking"));
const List = lazy(() => import("./pages/List"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const FieldPage = lazy(() => import("./pages/FieldPage"));
const CommunityHub = lazy(() => import("./pages/CommunityHub"));
const MapPage = lazy(() => import("./pages/MapPage"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const Profile = lazy(() => import("./pages/Profile"));
const Paygate = lazy(() => import("./pages/Paygate"));
const VnPaySandbox = lazy(() => import("./pages/VnPaySandbox"));
const VnPayReturn = lazy(() => import("./pages/VnPayReturn"));
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const AdminBookings = lazy(() => import("./pages/Admin/AdminBookings"));
const Dashboard = lazy(() => import("./pages/Admin/Dashboard"));
const Courts = lazy(() => import("./pages/Admin/Courts"));
const Facilities = lazy(() => import("./pages/Admin/Facilities"));
const CalendarPage = lazy(() => import("./pages/Admin/CalendarPage"));
const AdminCustomers = lazy(() => import("./pages/Admin/AdminCustomers"));
const AdminVouchers = lazy(() => import("./pages/Admin/AdminVouchers"));
const AdminEmployees = lazy(() => import("./pages/Admin/AdminEmployees"));

function RouteFallback() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3 bg-surface text-stone-500" role="status" aria-live="polite">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 ring-1 ring-brand-100">
        <Loader2 className="h-7 w-7 animate-spin text-brand-500" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold">Đang chuẩn bị trải nghiệm...</span>
    </div>
  );
}

function App() {
  useRevealOnScroll();
  return (
    <>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/*" element={<ClientLayout />}>
          <Route index element={<Home />} />
          <Route path="field/:id" element={<Detail />} />
          <Route path="detail/:id" element={<Detail />} />
          <Route path="detail" element={<Detail />} />
          <Route path="booking" element={
            <ProtectedRoute>
              <Booking />
            </ProtectedRoute>
          } />
          <Route path="tim-san" element={<List />} />
          <Route path="fields" element={<FieldPage />} />
          <Route path="clubs" element={<CommunityHub mode="clubs" />} />
          <Route path="tournaments" element={<CommunityHub mode="tournaments" />} />
          <Route path="rankings" element={<CommunityHub mode="rankings" />} />
          <Route path="map" element={<MapPage />} />
          <Route path="ban-do" element={<MapPage />} />
          <Route path="blog" element={<Blog />} />
          <Route path="blog/:id" element={<BlogDetail />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="paygate" element={
            <ProtectedRoute>
              <Paygate />
            </ProtectedRoute>
          } />
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
            <ProtectedRoute allowedRoles={["admin", "manager"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="courts" element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <Courts />
            </ProtectedRoute>
          } />
          <Route path="facilities" element={<ProtectedRoute allowedRoles={["manager"]}><Facilities /></ProtectedRoute>} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="vouchers" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminVouchers />
            </ProtectedRoute>
          } />
          <Route path="employees" element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminEmployees />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
      </Suspense>
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3500,
          style: { borderRadius: 14, padding: "12px 14px", fontWeight: 600, fontSize: 14, color: "#1c1917", border: "1px solid #e7e5e4", boxShadow: "0 16px 32px -12px rgba(28,25,23,.18)" },
          success: { iconTheme: { primary: "#059669", secondary: "#fff" } },
          error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
        }}
      />
    </>
  );
}

export default App;
