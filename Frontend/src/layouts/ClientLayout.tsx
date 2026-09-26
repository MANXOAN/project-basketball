import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function ClientLayout() {
    const { pathname } = useLocation();

    // Sang trang mới thì về đầu trang (trừ khi trình duyệt khôi phục vị trí cuộn).
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, [pathname]);

    return (
        <div className="min-h-screen bg-surface font-sans text-stone-900 flex flex-col">
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-brand-700 focus:shadow-lg">
                Bỏ qua điều hướng
            </a>
            <Header />
            <main id="main-content" key={pathname} className="page-enter flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
