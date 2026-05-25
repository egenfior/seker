import crypto from "crypto";

function sha256Hex(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

/**
 * Minimal SigV4 signer for Amazon PA-API v5.
 * For production: consider a well-maintained library and robust error handling.
 */
function signPaapiRequest({ host, region, service, accessKey, secretKey, body, target, path }) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const method = "POST";
  const uri = path;
  const query = "";

  const headers = {
    "content-encoding": "amz-1.0",
    "content-type": "application/json; charset=utf-8",
    host,
    "x-amz-date": amzDate,
    "x-amz-target": target
  };

  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${String(headers[k]).trim()}\n`)
    .join("");

  const canonicalRequest =
    `${method}\n${uri}\n${query}\n` +
    `${canonicalHeaders}\n${signedHeaders}\n${sha256Hex(body)}`;

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${sha256Hex(canonicalRequest)}`;

  const kDate = crypto.createHmac("sha256", "AWS4" + secretKey).update(dateStamp).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
  const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();

  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authorization =
    `${algorithm} Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { headers: { ...headers, Authorization: authorization }, amzDate };
}

export async function searchItems({ keywords, page = 1 }) {
  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;
  const host = process.env.AMAZON_MARKETPLACE || "www.amazon.com";

  if (!accessKey || !secretKey || !partnerTag) {
    throw new Error("Missing Amazon PA-API credentials. Set AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG in .env.local");
  }

  const region = "us-east-1";
  const service = "ProductAdvertisingAPI";
  const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
  const path = "/paapi5/searchitems";

  const bodyObj = {
    Keywords: keywords || "Apple renewed",
    SearchIndex: "Electronics",
    ItemCount: 10,
    ItemPage: page,
    PartnerTag: partnerTag,
    PartnerType: "Associates",
    Marketplace: host,
    Resources: [
      "ItemInfo.Title",
      "ItemInfo.ProductInfo",
      "Images.Primary.Medium",
      "Offers.Listings.Price",
      "Offers.Listings.Condition",
      "Offers.Listings.MerchantInfo",
      "Offers.Listings.DeliveryInfo.IsAmazonFulfilled",
      "Offers.Summaries.LowestPrice"
    ]
  };

  const body = JSON.stringify(bodyObj);
  const { headers, amzDate } = signPaapiRequest({ host, region, service, accessKey, secretKey, body, target, path });

  const res = await fetch(`https://${host}${path}`, {
    method: "POST",
    headers,
    body
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PA-API error ${res.status}: ${text}`);
  }

  const json = JSON.parse(text);
  return {
    asOf: amzDate,
    items: normalizeSearchItems(json)
  };
}

function normalizeSearchItems(json) {
  const rawItems = json?.SearchResult?.Items || [];

  return rawItems
    .map((item) => {
      const listing = item?.Offers?.Listings?.[0] || {};
      const summary = item?.Offers?.Summaries?.[0] || {};
      const price = listing?.Price?.Amount ?? summary?.LowestPrice?.Amount ?? null;
      const condition = listing?.Condition?.DisplayValue || listing?.Condition?.Value || null;

      return {
        asin: item?.ASIN,
        title: item?.ItemInfo?.Title?.DisplayValue || "Untitled Apple listing",
        url: item?.DetailPageURL || null,
        image: item?.Images?.Primary?.Medium?.URL || null,
        price: typeof price === "number" ? price : null,
        condition,
        merchant: listing?.MerchantInfo?.Name || null,
        isAmazonFulfilled: listing?.DeliveryInfo?.IsAmazonFulfilled ?? null
      };
    })
    .filter((item) => item.asin && isRefurbishedAppleDevice(item));
}

function isRefurbishedAppleDevice(item) {
  const haystack = `${item.title || ""} ${item.condition || ""}`.toLowerCase();
  const isAppleDevice = haystack.includes("iphone") || haystack.includes("apple watch");
  return isAppleDevice && /(used|renewed|refurbished|pre-owned|acceptable|good|excellent)/i.test(haystack);
}
