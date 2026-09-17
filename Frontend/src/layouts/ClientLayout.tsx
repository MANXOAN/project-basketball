import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function ClientLayout() {
    return (
        <div className="min-h-screen bg-[#0B0B0B] font-sans text-gray-200 flex flex-col selection:bg-yellow-500 selection:text-black">
            <Header />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
