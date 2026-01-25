"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  ListingSchema,
  ShippingQuoteResponseSchema,
  type Listing,
  type ShippingQuoteResponse
} from "@iphone-indexer/shared";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();
  const country = sp.get("country") || "GHA";

  const [listing, setListing] = useState<Listing | null>(null);
  const [quotes, setQuotes] = useState<ShippingQuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listingUrl = useMemo(() => `${API}/listings/${encodeURIComponent(params.id)}`, [params.id]);

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        const res = await fetch(listingUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const json = await res.json();
        setListing(ListingSchema.parse(json));
      } catch (e: any) {
        setError(e?.message ?? "Unknown error");
      }
    })();
  }, [listingUrl]);

  async function loadShipping() {
    if (!listing) return;
    setError(null);
    try {
      const res = await fetch(`${API}/shipping/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_code: country,
          model: listing.model,
          declared_value_usd: listing.price_usd
        })
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setQuotes(ShippingQuoteResponseSchema.parse(json));
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
      setQuotes(null);
    }
  }

  return (
    <main>
      <a href="/" className="muted">← Back</a>
      <h2 style={{ marginBottom: 4 }}>Listing Detail</h2>

      {error && <p className="card" style={{ borderColor: "#ef4444" }}>Error: {error}</p>}
      {!listing && !error && <p className="muted">Loading...</p>}

      {listing && (
        <div className="card">
          <div style={{ fontWeight: 700 }}>{listing.title}</div>
          <div className="muted small">
            {listing.source.toUpperCase()} • {listing.model} • {listing.storage_gb}GB • {listing.condition} • {listing.carrier}
          </div>
          <div style={{ marginTop: 10, fontWeight: 800 }}>${listing.price_usd.toFixed(2)}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <a className="button secondary" href={listing.url} target="_blank" rel="noreferrer">Open source</a>
            <button className="button" onClick={loadShipping}>Get shipping to {country}</button>
          </div>

          {quotes && (
            <div style={{ marginTop: 12 }}>
              <h3 style={{ margin: "10px 0 6px" }}>Shipping quotes</h3>
              {quotes.quotes.map((q, idx) => (
                <div key={idx} className="card" style={{ margin: "8px 0" }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 650 }}>{q.carrier}</div>
                    <div style={{ fontWeight: 800 }}>${q.cost_usd.toFixed(2)}</div>
                  </div>
                  <div className="muted small">ETA: {q.eta_days} days{q.notes ? ` • ${q.notes}` : ""}</div>
                  <div className="small" style={{ marginTop: 8 }}>
                    Estimated landed cost: <b>${(listing.price_usd + q.cost_usd).toFixed(2)}</b>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
