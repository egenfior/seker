import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { STRINGS } from "../lib/i18n";
import { estimateLandedCostUSD } from "../lib/landedCost";
import { formatMoney } from "../lib/fx";

const COUNTRY_TO_CURRENCY = {
  US: "USD",
  GH: "GHS",
  CI: "XOF",
  SN: "XOF"
};

const COUNTRY_LABELS = {
  US: "U.S. address",
  GH: "Ghana",
  CI: "Cote d'Ivoire",
  SN: "Senegal"
};

const CAPACITY_VALUES = [64, 128, 256, 512, 1024];

function parseAppleDeviceMeta(title) {
  const t = String(title || "");
  const watchMatch = t.match(/Apple\s+Watch\s+(Series\s*\d+|Ultra|SE)\b/i);
  const watchSizeMatch = t.match(/\b(38|40|41|42|44|45|49)\s*mm\b/i);
  const cellular = /\b(cellular|gps\s*\+\s*cellular)\b/i.test(t);
  const gps = /\bgps\b/i.test(t);
  const numberMatch = t.match(/iPhone\s*(SE|1[1-6])/i);
  const proMax = /\bPro\s*Max\b/i.test(t);
  const pro = /\bPro\b/i.test(t);
  const plus = /\bPlus\b/i.test(t);
  const mini = /\bmini\b/i.test(t);
  const storageMatch = t.match(/(64|128|256|512|1024)\s*GB/i);

  if (watchMatch) {
    const series = watchMatch[1].replace(/\s+/g, " ");
    return {
      productType: "Apple Watch",
      model: `Apple Watch ${series.toUpperCase() === "SE" ? "SE" : series}`,
      variant: cellular ? "GPS + Cellular" : gps ? "GPS" : null,
      storage: watchSizeMatch ? `${watchSizeMatch[1]}mm` : null,
      storageValue: 0
    };
  }

  const model = numberMatch ? `iPhone ${numberMatch[1].toUpperCase()}` : "Apple device";
  const variant = proMax ? "Pro Max" : pro ? "Pro" : plus ? "Plus" : mini ? "mini" : null;
  const storage = storageMatch ? `${storageMatch[1]}GB` : null;
  const storageValue = storageMatch ? Number(storageMatch[1]) : 0;

  return { productType: "iPhone", model, variant, storage, storageValue };
}

function makeWhatsAppText({ item, country, landedUSD }) {
  const meta = parseAppleDeviceMeta(item.title);
  const lines = [
    "Refurbished Apple deal on Amazon.com",
    `Device: ${[meta.model, meta.variant, meta.storage].filter(Boolean).join(" ")}`,
    item.condition ? `Condition: ${item.condition}` : null,
    item.price != null ? `Amazon price: $${Number(item.price).toFixed(2)}` : null,
    landedUSD?.total != null ? `Est. landed to ${COUNTRY_LABELS[country]}: $${Number(landedUSD.total).toFixed(2)}` : null,
    item.url ? `Link: ${item.url}` : null
  ].filter(Boolean);

  return lines.join("\n");
}

function getItemScore({ item, landedUSD }) {
  const condition = String(item.condition || "").toLowerCase();
  const fulfilledBonus = item.isAmazonFulfilled ? 8 : 0;
  const conditionBonus = condition.includes("excellent") ? 12 : condition.includes("very good") ? 9 : condition.includes("good") ? 5 : 2;
  const pricePenalty = landedUSD?.total ? Math.min(45, landedUSD.total / 28) : 20;
  return Math.max(0, Math.round(72 + fulfilledBonus + conditionBonus - pricePenalty));
}

function cardForItem({ item, country, shipUSD, fxRate, displayCurrency }) {
  const meta = parseAppleDeviceMeta(item.title);
  const priceUSD = typeof item.price === "number" ? item.price : null;
  const landedUSD = priceUSD != null ? estimateLandedCostUSD({ itemPriceUSD: priceUSD, shipUSD, country }) : null;
  const score = getItemScore({ item, landedUSD });

  return {
    ...item,
    meta,
    landedUSD,
    score,
    amazonDisplay: priceUSD != null ? formatMoney(priceUSD * fxRate, displayCurrency) : "-",
    landedDisplay: landedUSD ? formatMoney(landedUSD.total * fxRate, displayCurrency) : "-"
  };
}

export default function Home() {
  const [lang, setLang] = useState("en");
  const S = STRINGS[lang];
  const [q, setQ] = useState("Apple");
  const [country, setCountry] = useState("GH");
  const [deliveryMode, setDeliveryMode] = useState("forwarder");
  const [estShipUSD, setEstShipUSD] = useState(45);
  const [estUsShipUSD, setEstUsShipUSD] = useState(0);
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [productFilter, setProductFilter] = useState("all");
  const [storageFilter, setStorageFilter] = useState("any");
  const [sortBy, setSortBy] = useState("score");
  const [fx, setFx] = useState({ USD: 1, GHS: 15, XOF: 650, XAF: 650 });
  const [items, setItems] = useState([]);
  const [asOf, setAsOf] = useState(null);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const countryDefaultCurrency = COUNTRY_TO_CURRENCY[country] || "USD";

  useEffect(() => {
    fetch("/api/fx")
      .then((r) => r.json())
      .then((j) => setFx(j.fx))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setDisplayCurrency(countryDefaultCurrency);
  }, [countryDefaultCurrency]);

  useEffect(() => {
    if (country === "US") {
      setDeliveryMode("usAddress");
    }
  }, [country]);

  useEffect(() => {
    if (deliveryMode === "usAddress") {
      setCountry("US");
      setDisplayCurrency("USD");
    }
  }, [deliveryMode]);

  async function runSearch(event) {
    event?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&page=1`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Search failed");
      setItems(data.items || []);
      setAsOf(data.asOf || null);
      setStorage(data.storage || null);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSearch();
  }, []);

  const shipUSD = deliveryMode === "forwarder" ? Number(estShipUSD || 0) : deliveryMode === "usAddress" ? Number(estUsShipUSD || 0) : 0;
  const costCountry = deliveryMode === "usAddress" ? "US" : country;
  const fxRate = fx?.[displayCurrency] || 1;

  const cards = useMemo(() => {
    const prepared = items.map((item) => cardForItem({ item, country: costCountry, shipUSD, fxRate, displayCurrency }));
    const productFiltered = productFilter === "all" ? prepared : prepared.filter((item) => item.meta.productType === productFilter);
    const filtered = storageFilter === "any" ? productFiltered : productFiltered.filter((item) => item.meta.storageValue >= Number(storageFilter));

    return filtered.sort((a, b) => {
      if (sortBy === "landed") return (a.landedUSD?.total || Infinity) - (b.landedUSD?.total || Infinity);
      if (sortBy === "price") return (a.price || Infinity) - (b.price || Infinity);
      return b.score - a.score;
    });
  }, [items, costCountry, shipUSD, fxRate, displayCurrency, productFilter, storageFilter, sortBy]);

  const stats = useMemo(() => {
    const priced = cards.filter((item) => item.landedUSD?.total);
    const best = priced[0];
    const avg = priced.length ? priced.reduce((sum, item) => sum + item.landedUSD.total, 0) / priced.length : null;

    return {
      count: cards.length,
      best,
      avg
    };
  }, [cards]);

  return (
    <>
      <Head>
        <title>Sekar | Refurbished Apple Indexer</title>
        <meta name="description" content="Sekar indexes refurbished Apple devices on Amazon.com with estimated landed costs." />
      </Head>

      <main className="shell">
        <nav className="topbar" aria-label="Main navigation">
          <a href="/login">Account</a>
        </nav>

        <section className="hero">
          <div>
            <p className="eyebrow">Apple resale index</p>
            <h1>Sekar</h1>
            <p className="product-line">{S.title}</p>
            <p className="subtitle">{S.subtitle}</p>
        </div>
        <div className="hero-metrics">
          <Metric label="Indexed" value={stats.count || "-"} />
          <Metric label="Best landed" value={stats.best ? formatMoney(stats.best.landedUSD.total * fxRate, displayCurrency) : "-"} />
          <Metric label="Avg landed" value={stats.avg ? formatMoney(stats.avg * fxRate, displayCurrency) : "-"} />
        </div>
      </section>

      <form className="control-panel" onSubmit={runSearch}>
        <label className="field search-field">
          <span>Search Amazon</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={S.searchPlaceholder} />
        </label>

        <label className="field">
          <span>{S.countryLabel}</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="US">United States (U.S. address)</option>
            <option value="GH">Ghana</option>
            <option value="CI">Cote d'Ivoire</option>
            <option value="SN">Senegal</option>
          </select>
        </label>

        <label className="field">
          <span>{S.languageLabel}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="fr">Francais</option>
          </select>
        </label>

        <label className="field">
          <span>{S.forwarderMode}</span>
          <select value={deliveryMode} onChange={(e) => setDeliveryMode(e.target.value)}>
            <option value="forwarder">{S.forwarder}</option>
            <option value="usAddress">{S.usAddress}</option>
            <option value="direct">{S.direct}</option>
          </select>
        </label>

        <label className="field">
          <span>{deliveryMode === "usAddress" ? S.estUsShip : S.estShip}</span>
          <input
            type="number"
            value={deliveryMode === "usAddress" ? estUsShipUSD : estShipUSD}
            onChange={(e) => deliveryMode === "usAddress" ? setEstUsShipUSD(Number(e.target.value)) : setEstShipUSD(Number(e.target.value))}
            disabled={deliveryMode === "direct"}
            min={0}
          />
        </label>

        <label className="field">
          <span>{S.fxLabel}</span>
          <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)}>
            <option value="USD">USD</option>
            <option value="GHS">GHS</option>
            <option value="XOF">XOF</option>
            <option value="XAF">XAF</option>
          </select>
        </label>

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? S.searching : S.search}
        </button>
      </form>

      <section className="toolbar" aria-label="Listing filters">
        <div className="segmented">
          <button className={sortBy === "score" ? "active" : ""} onClick={() => setSortBy("score")} type="button">Best index</button>
          <button className={sortBy === "landed" ? "active" : ""} onClick={() => setSortBy("landed")} type="button">Landed price</button>
          <button className={sortBy === "price" ? "active" : ""} onClick={() => setSortBy("price")} type="button">Amazon price</button>
        </div>

        <label className="field compact">
          <span>Product</span>
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="iPhone">iPhone only</option>
            <option value="Apple Watch">Apple Watch only</option>
          </select>
        </label>

        <label className="field compact">
          <span>Min phone storage</span>
          <select value={storageFilter} onChange={(e) => setStorageFilter(e.target.value)}>
            <option value="any">Any</option>
            {CAPACITY_VALUES.map((value) => <option key={value} value={value}>{value}GB+</option>)}
          </select>
        </label>
      </section>

      <div className="status-row">
        <span>{S.disclaimer}</span>
        <span>
          {storage?.enabled ? `Database on: saved ${storage.savedItems || 0}` : "Database off: demo mode"}
          {asOf ? ` · ${S.updatedAt}: ${new Date(asOf).toLocaleString()}` : ""}
        </span>
      </div>

      {error && <div className="error">{error}</div>}

      <section className="grid" aria-label="Indexed Apple devices">
        {cards.map((item) => {
          const waUrl = `https://wa.me/?text=${encodeURIComponent(makeWhatsAppText({ item, country: costCountry, landedUSD: item.landedUSD }))}`;
          const scoreTone = item.score >= 80 ? "strong" : item.score >= 65 ? "medium" : "watch";

          return (
            <article className="card" key={item.asin}>
              <div className="image-wrap">
                {item.image ? <img src={item.image} alt={item.title || "iPhone"} loading="lazy" /> : <div className="image-empty">iPhone</div>}
                <span className={`score ${scoreTone}`}>{item.score}</span>
              </div>

              <div className="tags">
                <span>{item.meta.model}</span>
                {item.meta.variant && <span>{item.meta.variant}</span>}
                {item.meta.storage && <span>{item.meta.storage}</span>}
                <span>{item.meta.productType}</span>
                {item.isAmazonFulfilled === true && <span>FBA</span>}
              </div>

              <h2>{item.title}</h2>

              <dl className="facts">
                <div><dt>{S.condition}</dt><dd>{item.condition || "-"}</dd></div>
                <div><dt>{S.merchant}</dt><dd>{item.merchant || "-"}</dd></div>
                <div><dt>{S.amazonPrice}</dt><dd>{item.amazonDisplay}</dd></div>
                <div><dt>{S.estLanded}</dt><dd>{item.landedDisplay}</dd></div>
              </dl>

              {item.landedUSD && (
                <div className="cost-breakdown">
                  <span>{deliveryMode === "usAddress" ? "U.S. ship" : "Ship"} {formatMoney(shipUSD * fxRate, displayCurrency)}</span>
                  <span>Duty {formatMoney(item.landedUSD.duty * fxRate, displayCurrency)}</span>
                  <span>VAT {formatMoney(item.landedUSD.vat * fxRate, displayCurrency)}</span>
                </div>
              )}

              <div className="actions">
                {item.url && <a className="button dark" href={item.url} target="_blank" rel="noreferrer">{S.viewAmazon}</a>}
                <a className="button light" href={waUrl} target="_blank" rel="noreferrer">{S.shareWhatsApp}</a>
              </div>
            </article>
          );
        })}
      </section>

      {!loading && cards.length === 0 && <div className="empty">No refurbished Apple listings matched this search.</div>}

        <style jsx>{`
        :global(*) {
          box-sizing: border-box;
        }

        :global(body) {
          margin: 0;
          background: #f5f7f8;
          color: #13201b;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .shell {
          max-width: 1180px;
          margin: 0 auto;
          padding: 32px 18px 48px;
        }

        .topbar {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 18px;
        }

        .topbar a {
          background: #ffffff;
          border: 1px solid #dfe6e2;
          border-radius: 8px;
          color: #13201b;
          font-size: 14px;
          font-weight: 800;
          min-height: 38px;
          padding: 9px 13px;
          text-decoration: none;
        }

        .hero {
          align-items: end;
          display: grid;
          gap: 24px;
          grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
          margin-bottom: 20px;
        }

        .eyebrow {
          color: #2d6954;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0;
          margin: 0 0 8px;
          text-transform: uppercase;
        }

        h1 {
          font-size: clamp(72px, 15vw, 168px);
          line-height: 0.95;
          margin: 0;
          max-width: 760px;
        }

        .product-line {
          color: #13201b;
          font-size: clamp(22px, 3vw, 34px);
          font-weight: 800;
          line-height: 1.1;
          margin: 8px 0 0;
        }

        .subtitle {
          color: #58635f;
          font-size: 18px;
          line-height: 1.5;
          margin: 16px 0 0;
        }

        .hero-metrics {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        :global(.metric) {
          background: #ffffff;
          border: 1px solid #dfe6e2;
          border-radius: 8px;
          padding: 14px;
        }

        :global(.metric span) {
          color: #68736f;
          display: block;
          font-size: 12px;
          margin-bottom: 8px;
        }

        :global(.metric strong) {
          display: block;
          font-size: 20px;
          line-height: 1.1;
        }

        .control-panel,
        .toolbar {
          background: #ffffff;
          border: 1px solid #dfe6e2;
          border-radius: 8px;
          display: grid;
          gap: 12px;
          margin-bottom: 14px;
          padding: 14px;
        }

        .control-panel {
          grid-template-columns: minmax(280px, 2fr) repeat(5, minmax(130px, 1fr)) auto;
        }

        .toolbar {
          align-items: center;
          grid-template-columns: 1fr auto auto;
        }

        .field {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .field span {
          color: #58635f;
          font-size: 12px;
          font-weight: 700;
        }

        input,
        select {
          background: #fbfcfb;
          border: 1px solid #cad5cf;
          border-radius: 8px;
          color: #13201b;
          font: inherit;
          height: 42px;
          min-width: 0;
          padding: 0 10px;
          width: 100%;
        }

        input:disabled {
          background: #edf1ef;
          color: #8a9691;
        }

        .primary-button,
        .button,
        .segmented button {
          align-items: center;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          font: inherit;
          font-weight: 700;
          justify-content: center;
          min-height: 42px;
          text-decoration: none;
          transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
          white-space: nowrap;
        }

        .primary-button {
          align-self: end;
          background: #13201b;
          border: 1px solid #13201b;
          color: #ffffff;
          padding: 0 18px;
        }

        .primary-button:disabled {
          cursor: wait;
          opacity: 0.65;
        }

        .segmented {
          background: #eef3f0;
          border-radius: 8px;
          display: inline-flex;
          gap: 4px;
          padding: 4px;
        }

        .segmented button {
          background: transparent;
          border: 1px solid transparent;
          color: #46524d;
          padding: 0 12px;
        }

        .segmented button.active {
          background: #ffffff;
          border-color: #cad5cf;
          color: #13201b;
        }

        .compact {
          width: 170px;
        }

        .status-row {
          color: #68736f;
          display: flex;
          font-size: 13px;
          gap: 16px;
          justify-content: space-between;
          line-height: 1.45;
          margin: 8px 2px 18px;
        }

        .error,
        .empty {
          background: #fff5f0;
          border: 1px solid #efc6b4;
          border-radius: 8px;
          color: #7a2d14;
          margin-bottom: 16px;
          padding: 14px;
        }

        .empty {
          background: #ffffff;
          border-color: #dfe6e2;
          color: #58635f;
        }

        .grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        }

        .card {
          background: #ffffff;
          border: 1px solid #dfe6e2;
          border-radius: 8px;
          display: grid;
          gap: 12px;
          padding: 12px;
        }

        .image-wrap {
          align-items: center;
          background: linear-gradient(180deg, #f8faf9, #edf2ef);
          border-radius: 8px;
          display: flex;
          height: 230px;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .image-wrap img {
          height: 92%;
          object-fit: contain;
          width: 92%;
        }

        .image-empty {
          color: #8a9691;
          font-size: 24px;
          font-weight: 800;
        }

        .score {
          border-radius: 999px;
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          padding: 7px 9px;
          position: absolute;
          right: 10px;
          top: 10px;
        }

        .score.strong {
          background: #1d7a55;
        }

        .score.medium {
          background: #9a6b17;
        }

        .score.watch {
          background: #9b3d2f;
        }

        .tags,
        .cost-breakdown {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tags span,
        .cost-breakdown span {
          background: #eef3f0;
          border: 1px solid #d8e1dc;
          border-radius: 999px;
          color: #394641;
          font-size: 12px;
          padding: 4px 8px;
        }

        .cost-breakdown span {
          background: #f9fbfa;
        }

        h2 {
          font-size: 17px;
          line-height: 1.3;
          margin: 0;
          min-height: 66px;
        }

        .facts {
          display: grid;
          gap: 8px;
          margin: 0;
        }

        .facts div {
          align-items: start;
          display: grid;
          gap: 10px;
          grid-template-columns: 100px minmax(0, 1fr);
        }

        dt {
          color: #68736f;
          font-size: 12px;
          font-weight: 700;
        }

        dd {
          font-size: 14px;
          font-weight: 700;
          margin: 0;
          overflow-wrap: anywhere;
        }

        .actions {
          display: grid;
          gap: 8px;
          grid-template-columns: 1fr 1fr;
          margin-top: 4px;
        }

        .button {
          border: 1px solid #13201b;
          min-width: 0;
          padding: 0 10px;
        }

        .button.dark {
          background: #13201b;
          color: #ffffff;
        }

        .button.light {
          background: #ffffff;
          color: #13201b;
        }

        @media (max-width: 980px) {
          .hero,
          .control-panel,
          .toolbar {
            grid-template-columns: 1fr;
          }

          .hero-metrics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .primary-button {
            width: 100%;
          }

          .compact {
            width: 100%;
          }
        }

        @media (max-width: 620px) {
          .shell {
            padding: 22px 12px 36px;
          }

          .hero-metrics,
          .actions {
            grid-template-columns: 1fr;
          }

          .status-row {
            display: grid;
          }

          .segmented {
            display: grid;
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 42px;
          }
        }
        `}</style>
      </main>
    </>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
