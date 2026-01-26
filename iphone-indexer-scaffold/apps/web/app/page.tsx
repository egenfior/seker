"use client";

import { useEffect, useMemo, useState } from "react";
import { ListingsResponseSchema, type Listing } from "@iphone-indexer/shared";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function HomePage() {
  const [q, setQ] = useState("iPhone 13");
  const [country, setCountry] = useState("GHA");
  const [items, setItems] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const searchUrl = useMemo(() => {
    const u = new URL(`${API}/listings`);
    u.searchParams.set("q", q);
    u.searchParams.set("page", "0");
    u.searchParams.set("page_size", "10");
    return u.toString();
  }, [q]);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(searchUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      const parsed = ListingsResponseSchema.parse(json);
      setItems(parsed.items);
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runSearch(); }, []); // initial

  return (
    <main>
      <div className="row">
        <input className="input" style={{ minWidth: 280 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search iPhone model (e.g., iPhone 13 Pro)" />
        <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="GHA">Ghana (GHA)</option>
          <option value="NGA">Nigeria (NGA)</option>
          <option value="SEN">Senegal (SEN)</option>
          <option value="CIV">Côte d’Ivoire (CIV)</option>
        </select>
        <button className="button" onClick={runSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <p className="card" style={{ borderColor: "#ef4444" }}>Error: {error}</p>}

      <div style={{ marginTop: 12 }}>
        {items.map((it) => (
          <ListingCard key={it.id} listing={it} country={country} />
        ))}
        {!loading && items.length === 0 && !error && (
          <p className="muted">No listings found (mock data). Next step: connect DB + ingestion.</p>
        )}
      </div>
    </main>
  );
}

function ListingCard({ listing, country }: { listing: Listing; country: string }) {
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 650 }}>{listing.title}</div>
          <div className="muted small">
            {listing.source.toUpperCase()} • {listing.model} • {listing.storage_gb}GB • {listing.condition} • {listing.carrier}
          </div>
        </div>
        <div style={{ fontWeight: 700 }}>${listing.price_usd.toFixed(2)}</div>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        <a className="button secondary" href={listing.url} target="_blank" rel="noreferrer">Open source</a>
        <a className="button" href={`/listing/${encodeURIComponent(listing.id)}?country=${encodeURIComponent(country)}`}>View + Shipping</a>
      </div>
    </div>
  );
}
