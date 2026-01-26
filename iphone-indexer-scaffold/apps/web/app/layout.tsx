import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iPhone Indexer (Scaffold)",
  description: "Compare iPhone listings and estimate shipping to West Africa."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="header">
            <h1>iPhone Indexer</h1>
            <p className="muted">Next.js + FastAPI + React Native scaffold</p>
          </header>
          {children}
          <footer className="footer muted">
            Estimates only. Duties/taxes may apply depending on destination country.
          </footer>
        </div>
      </body>
    </html>
  );
}
