// Game list + live scores (ported from sportsV2.js getGames / checkLiveScores / parseLine)
export const HEADERS = { "x-fsign": "SW9D1eZo" };
export const FEED_UTC_OFFSET_HOURS = 1;
export const delay = (ms) => new Promise((r) => setTimeout(r, ms));
export const feedDay = (seconds) => Math.floor((seconds + FEED_UTC_OFFSET_HOURS * 3600) / 86400);

const DAYS = { today: 0, tomorrow: 1, "next-tomorrow": 2 };
const SPORTS = { football: 1, tennis: 2, basketball: 3, icehockey: 4, americanfootball: 5, baseball: 6, handball: 7, volleyball: 12, darts: 14, boxing: 16, badminton: 21, tabletennis: 25, mma: 28 };

async function fetchText(url, { attempts = 5, retryDelay = 2000, onRetry } = {}) {
    let last;
    for (let i = 1; i <= attempts; i++) {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 15000);
        try {
            const res = await fetch(url, { headers: HEADERS, signal: ctl.signal });
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            return await res.text();
        } catch (e) {
            last = e;
            if (i < attempts) { onRetry?.(i + 1, attempts); await delay(retryDelay); }
        } finally { clearTimeout(t); }
    }
    throw last;
}

/** Upcoming games for a sport/day: [{ key, time (unix seconds, string), league }] in random order. */
export async function getGames(sport, day, { onRetry } = {}) {
    if (!(day in DAYS) || !(sport in SPORTS)) throw new Error("Invalid game or date.");
    const offset = DAYS[day];
    const text = await fetchText(`https://api.webapps.com.ng/v2/sports/livescore.php?50&x&feed&f_${SPORTS[sport]}_${offset}_${FEED_UTC_OFFSET_HOURS}_en_4`, { onRetry });
    const now = Date.now() / 1000;
    const out = [];
    let id, league;
    text.replace(/÷/g, "<br>").split("<br>").forEach((line) => {
        const a = line.match(/(\w+)¬AD(?!\w)/);
        if (a) { id = a[1]; return; }
        if (/^(.*?¬ZEE.*)$/.test(line)) { league = line.replace(/¬ZEE/g, ""); return; }
        const t = line.match(/(\w+)¬ADE(?!\w)/);
        if (t && now < Number(t[1])) out.push({ key: id, time: t[1], league });
    });
    return out.sort(() => Math.random() - 0.5);
}

function parseLine(words) {
    const v = { currenttime: null, starttime: null, home: null, away: null, live: false };
    for (let i = 0; i < words.length; i++) {
        if (words[i] === "DD") v.currenttime = Number(words[i + 1]);
        else if (words[i] === "DC") v.starttime = Number(words[i + 1]);
        else if (words[i] === "DG") v.home = Number(words[i + 1]);
        else if (words[i] === "DH") v.away = Number(words[i + 1]);
        else if (words[i] === "DI" && words[i + 1] !== "-1") v.live = true;
    }
    return v;
}

/** Live score of one game; resolves to { home, away, live, currenttime } (nulls when not available). */
export async function checkLiveScores(key) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15000);
    try {
        const res = await fetch(`https://api.webapps.com.ng/v2/sports/livefeed.php?50&x&feed&dc_4_${key}`, { headers: HEADERS, signal: ctl.signal });
        if (res.ok) return parseLine((await res.text()).replace(/¬/g, "÷").split("÷"));
    } catch { /* falls through to "not started" */ } finally { clearTimeout(t); }
    return { currenttime: null, home: null, away: null, live: false };
}
