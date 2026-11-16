// Saved bookings. Same backend + same storage format as the Portfolio, so both apps share one saved list.
import { delay } from "./feed";
const API = "https://github.webapps.com.ng/paste.php";
const PIN = "3728";
const ATTEMPTS = 5, RETRY_MS = 1500;
let lock = Promise.resolve();

async function fetchData(strict = false) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    try {
        const res = await fetch(`${API}?saved`, { signal: ctl.signal });
        const body = await res.json();
        if (body.Status === "200" && String(body.data).trim() !== "") return JSON.parse(body.data);
        if (strict && body.Status !== "200") throw new Error("Saved results could not be read, Status " + body.Status);
        return {};
    } finally { clearTimeout(t); }
}
async function saveData(payload) {
    const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ save: JSON.stringify(payload), pin: PIN }) });
    return res.json();
}
// Read, change, write, read again to verify. One at a time, retried.
async function changeStore(change) {
    const prev = lock; let release;
    lock = new Promise((r) => { release = r; });
    await prev;
    try {
        for (let a = 1; a <= ATTEMPTS; a++) {
            try {
                const stored = await fetchData(true);
                const out = change(stored);
                if (out.done !== undefined) return out.done;
                await saveData(stored);
                if (out.verify(await fetchData(true))) return true;
            } catch (e) { console.error(`Saved results, attempt ${a} failed:`, e); }
            if (a < ATTEMPTS) await delay(RETRY_MS);
        }
        return false;
    } finally { release(); }
}

const hasCode = (code) => (sub) => Array.isArray(sub) && sub[sub.length - 1] === code;

export async function saveSlip(slip) {
    if (!slip.code) return false;
    const rows = slip.games.map((g) => ({ game: g.game, log: g.log }));
    const entry = [...rows, { odds: slip.odds }, slip.code];
    const last = Math.max(...rows.map((r) => parseInt(r.game.time, 10)));
    const base = new Date((last + 3600) * 1000);
    return changeStore((stored) => {
        if (Object.values(stored).some(hasCode(slip.code))) return { done: true };
        let key = base.toISOString();
        for (let bump = 1; stored[key] !== undefined; bump++) key = new Date(base.getTime() + bump).toISOString();
        stored[key] = entry;
        return { verify: (check) => Array.isArray(check[key]) && check[key].length === entry.length };
    });
}

export async function deleteSlip(code) {
    if (typeof code !== "string" || code === "") return false;
    return changeStore((stored) => {
        const keys = Object.keys(stored).filter((k) => hasCode(code)(stored[k]));
        if (keys.length === 0) return { done: true };
        keys.forEach((k) => delete stored[k]);
        return { verify: (check) => !Object.values(check).some(hasCode(code)) };
    });
}

/** Saved slips, newest booking first, in the same shape runSlip returns. */
export async function loadSlips() {
    const stored = await fetchData();
    return Object.entries(stored).map(([key, arr]) => {
        const code = arr[arr.length - 1];
        const odds = (arr.find((i) => i && i.odds) || {}).odds || {};
        const games = arr.filter((i) => i && i.game && i.log);
        return { code, shareURL: `https://www.sportybet.com?shareCode=${code}&c=ng`, odds, games, savedKey: key,
            totalOdds: games.reduce((p, g) => p * (Number(odds[g.game.num]) || 1), 1).toFixed(2) };
    }).sort((a, b) => (a.savedKey < b.savedKey ? 1 : -1));
}
