import { ListingsResponseSchema, ListingSchema, ShippingQuoteResponseSchema } from "@iphone-indexer/shared";

export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

export async function fetchListings(q: string) {
  const u = new URL(`${API_BASE}/listings`);
  u.searchParams.set("q", q);
  u.searchParams.set("page", "0");
  u.searchParams.set("page_size", "20");
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return ListingsResponseSchema.parse(json);
}

export async function fetchListing(id: string) {
  const res = await fetch(`${API_BASE}/listings/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return ListingSchema.parse(json);
}

export async function fetchShippingQuote(country_code: string, model: string, declared_value_usd?: number) {
  const res = await fetch(`${API_BASE}/shipping/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country_code, model, declared_value_usd })
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return ShippingQuoteResponseSchema.parse(json);
}
