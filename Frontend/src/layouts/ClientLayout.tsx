import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function ClientLayout() {
    return (
        <div className="min-h-screen bg-[#f7f8f6] font-sans text-slate-900 flex flex-col selection:bg-yellow-400 selection:text-slate-950">
            <Header />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
