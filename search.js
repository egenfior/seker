import fs from "fs";
import path from "path";
import { searchItems } from "../../lib/amazonPaapi";
import { recordSearchResults } from "../../lib/db";

export default async function handler(req, res) {
    const useMock = process.env.USE_MOCK_AMAZON === "true";
    const { q = "iphone", page = 1 } = req.query;
    const query = normalizeQuery(q);
    const itemPage = Number(page) || 1;

    if (useMock) {
        const filePath = path.join(process.cwd(), "mock/amazonUsedIphones.json");
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const terms = query.split(/\s+/).filter(Boolean);
        const showAll = terms.length === 0 || ["all", "apple", "iphone", "iphones", "watch", "watches", "apple watch", "refurbished", "renewed"].includes(query);
        const filtered = showAll
            ? data.items
            : data.items.filter((item) => {
                const haystack = `${item.title} ${item.condition} ${item.merchant}`.toLowerCase();
                return terms.every((term) => termMatches(haystack, term));
            });

        const storage = await safeRecordSearchResults({ query, page: itemPage, items: filtered });

        return res.status(200).json({
            asOf: new Date().toISOString(),
            items: filtered,
            storage
        });
    }

    try {
        const data = await searchItems({ keywords: query, page: itemPage });
        const storage = await safeRecordSearchResults({ query, page: itemPage, items: data.items || [] });
        res.status(200).json({ ...data, storage });
    } catch (error) {
        res.status(500).json({
            error: error.message || "Amazon search failed"
        });
    }
}

function normalizeQuery(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\breferbished\b/g, "refurbished");
}

function termMatches(haystack, term) {
    if (term === "watches") return haystack.includes("watch");
    if (term === "iphones") return haystack.includes("iphone");
    if (term === "refurbished") return haystack.includes("refurbished") || haystack.includes("renewed");
    return haystack.includes(term);
}

async function safeRecordSearchResults({ query, page, items }) {
    try {
        return await recordSearchResults({ source: "amazon", query, page, items });
    } catch (error) {
        console.error("Database write failed", error);
        return { enabled: true, error: "Database write failed" };
    }
}
