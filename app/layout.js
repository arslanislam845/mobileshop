import "./styles/globals.css";
import { Inter } from "next/font/google";

export const metadata = { title: "Mobile Shop" };

const inter = Inter({ subsets: ["latin"] });

const navLink =
  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-white/60 transition";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900`}>

        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/60 border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
            {/* Brand */}
            <a href="/" className="flex items-center gap-3 group">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md group-hover:scale-105 transition">
                <span className="text-xl">📱</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold leading-tight">Mobile Shop</h1>
                <p className="text-xs text-slate-500 hidden sm:block">Stock • Billing • Daily Sales</p>
              </div>
            </a>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-2">
              <a className={navLink} href="/">Dashboard</a>
              <a className={navLink} href="/stocks">Stocks</a>
              <a className={navLink} href="/investors">Investors</a>
              <a className={navLink} href="/credits">Credits</a>
              <a
                href="/bills/new"
                className={`${navLink} bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm`}
              >
                <span className="text-base">🧾</span>
                <span>Create Bill</span>
              </a>
            </nav>

            {/* Mobile menu shortcut */}
            <div className="md:hidden">
              <a
                href="/bills/new"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-white text-sm font-semibold shadow-sm hover:bg-indigo-500"
              >
                🧾 Bill
              </a>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          {children}
        </main>

        {/* Footer */}
        {/* <footer className="border-t border-slate-200">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-600">
            <p>© {new Date().getFullYear()} Mobile Shop. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="/" className="hover:text-slate-900">Dashboard</a>
              <a href="/stocks" className="hover:text-slate-900">Stocks</a>
              <a href="/investors" className="hover:text-slate-900">Investors</a>
              <a href="/credits" className="hover:text-slate-900">Credits</a>
            </div>
          </div>
        </footer> */}
      </body>
    </html>
  );
}
