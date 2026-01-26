import { z } from "zod";

export const ListingSourceEnum = z.enum(["amazon", "swappa", "mock"]);
export type ListingSource = z.infer<typeof ListingSourceEnum>;

export const ConditionEnum = z.enum(["new", "like_new", "good", "fair", "unknown"]);
export type Condition = z.infer<typeof ConditionEnum>;

export const CarrierEnum = z.enum(["unlocked", "att", "verizon", "tmobile", "other", "unknown"]);
export type Carrier = z.infer<typeof CarrierEnum>;

export const ListingSchema = z.object({
  id: z.string(),
  source: ListingSourceEnum,
  title: z.string(),
  model: z.string(),
  storage_gb: z.number().int().nonnegative(),
  condition: ConditionEnum,
  carrier: CarrierEnum,
  price_usd: z.number().nonnegative(),
  url: z.string().url(),
  image_url: z.string().url().optional(),
  updated_at: z.string()
});
export type Listing = z.infer<typeof ListingSchema>;

export const ListingsResponseSchema = z.object({
  items: z.array(ListingSchema),
  page: z.number().int().nonnegative(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative()
});
export type ListingsResponse = z.infer<typeof ListingsResponseSchema>;

export const ShippingQuoteRequestSchema = z.object({
  country_code: z.string().min(2).max(3),
  model: z.string(),
  declared_value_usd: z.number().nonnegative().optional()
});
export type ShippingQuoteRequest = z.infer<typeof ShippingQuoteRequestSchema>;

export const ShippingQuoteSchema = z.object({
  carrier: z.string(),
  cost_usd: z.number().nonnegative(),
  eta_days: z.number().int().positive(),
  notes: z.string().optional()
});
export type ShippingQuote = z.infer<typeof ShippingQuoteSchema>;

export const ShippingQuoteResponseSchema = z.object({
  country_code: z.string(),
  quotes: z.array(ShippingQuoteSchema)
});
export type ShippingQuoteResponse = z.infer<typeof ShippingQuoteResponseSchema>;
