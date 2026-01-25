import os
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

APP_NAME = os.getenv("APP_NAME", "iPhone Indexer API")
APP_ENV = os.getenv("APP_ENV", "local")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()]

app = FastAPI(title=APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class Listing(BaseModel):
    id: str
    source: str
    title: str
    model: str
    storage_gb: int = Field(ge=0)
    condition: str
    carrier: str
    price_usd: float = Field(ge=0)
    url: str
    image_url: Optional[str] = None
    updated_at: str

class ListingsResponse(BaseModel):
    items: List[Listing]
    page: int = Field(ge=0)
    page_size: int = Field(ge=1)
    total: int = Field(ge=0)

class ShippingQuoteRequest(BaseModel):
    country_code: str = Field(min_length=2, max_length=3)
    model: str
    declared_value_usd: Optional[float] = Field(default=None, ge=0)

class ShippingQuote(BaseModel):
    carrier: str
    cost_usd: float = Field(ge=0)
    eta_days: int = Field(ge=1)
    notes: Optional[str] = None

class ShippingQuoteResponse(BaseModel):
    country_code: str
    quotes: List[ShippingQuote]

# Mock data for scaffold (replace with DB + ingestion)
MOCK_LISTINGS: List[Listing] = [
    Listing(
        id="mock-1",
        source="mock",
        title="Apple iPhone 13 128GB Unlocked (Good)",
        model="iPhone 13",
        storage_gb=128,
        condition="good",
        carrier="unlocked",
        price_usd=429.99,
        url="https://example.com/mock/iphone-13-128",
        image_url=None,
        updated_at=now_iso(),
    ),
    Listing(
        id="mock-2",
        source="mock",
        title="Apple iPhone 14 Pro 256GB Unlocked (Like New)",
        model="iPhone 14 Pro",
        storage_gb=256,
        condition="like_new",
        carrier="unlocked",
        price_usd=749.00,
        url="https://example.com/mock/iphone-14-pro-256",
        image_url=None,
        updated_at=now_iso(),
    ),
]

@app.get("/health")
def health():
    return {"status": "ok", "env": APP_ENV, "time": now_iso()}

@app.get("/version")
def version():
    return {"name": APP_NAME, "env": APP_ENV, "time": now_iso()}

@app.get("/listings", response_model=ListingsResponse)
def list_listings(q: str = "", page: int = 0, page_size: int = 10):
    q_lower = (q or "").strip().lower()
    items = [x for x in MOCK_LISTINGS if q_lower in x.title.lower() or q_lower in x.model.lower()] if q_lower else list(MOCK_LISTINGS)
    total = len(items)
    start = page * page_size
    end = start + page_size
    return ListingsResponse(items=items[start:end], page=page, page_size=page_size, total=total)

@app.get("/listings/{listing_id}", response_model=Listing)
def get_listing(listing_id: str):
    for it in MOCK_LISTINGS:
        if it.id == listing_id:
            return it
    raise HTTPException(status_code=404, detail="Listing not found")

@app.post("/shipping/quote", response_model=ShippingQuoteResponse)
def shipping_quote(payload: ShippingQuoteRequest):
    # MVP placeholder rules engine:
    # - Base rate by country
    # - Two carriers with different speed/price
    base_by_country = {
        "GHA": 55.0,
        "NGA": 65.0,
        "SEN": 60.0,
        "CIV": 62.0,
    }
    cc = payload.country_code.upper()
    base = base_by_country.get(cc, 70.0)

    # Mild value-based surcharge
    value = payload.declared_value_usd or 0.0
    surcharge = min(35.0, max(0.0, value * 0.02))  # 2% capped

    quotes = [
        ShippingQuote(carrier="Standard Air", cost_usd=base + surcharge, eta_days=7, notes="Estimate; duties/taxes not included"),
        ShippingQuote(carrier="Express Air", cost_usd=base + surcharge + 25.0, eta_days=3, notes="Estimate; duties/taxes not included"),
    ]
    return ShippingQuoteResponse(country_code=cc, quotes=quotes)
