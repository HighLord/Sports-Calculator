// Booking with automatic rebooking (ported from sportsV2.js bookNow/sendBooking).
import { delay } from "./feed";
const BOOK_URL = "https://webappsng.vercel.app/api/sportbooking";
const REBOOK_DELAY_MS = 3000, MAX_ATTEMPTS = 8;

/** Sends picks to the booking API. Retries every few seconds; resolves with the API answer or throws. */
export async function bookPicks(picks, sport, maxOdd, onAttempt) {
    const data = {};
    picks.forEach((p) => { data["NO" + p.gameNo] = { key: p.game.key, home: p.home, away: p.away, time: p.time, outcome: p.outcome, gameNo: p.gameNo }; });
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        onAttempt?.(attempt);
        try {
            const ctl = new AbortController();
            const t = setTimeout(() => ctl.abort(), 18000);
            const res = await fetch(BOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data, game: sport, setOdd: maxOdd }), signal: ctl.signal });
            clearTimeout(t);
            const r = await res.json();
            if (r.message === "Success" || r.innerMsg === "Invalid" || r.innerMsg === "selections can not be null or empty") return r;
        } catch (e) { console.error(`Booking attempt ${attempt} failed`, e); }
        if (attempt < MAX_ATTEMPTS) await delay(REBOOK_DELAY_MS);
    }
    throw new Error("Unable to get booking code");
}
