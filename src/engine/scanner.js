// Streaming scan (ported from sportsV2.js analyse/processElements): several games are fetched at once,
// failed fetches are retried, picks are collected until enough confident ones exist.
import { sortGame, predict, outcomes, pickProbability } from "./model";
import { delay } from "./feed";

const MIN_WINDOW = 4, MAX_WINDOW = 10;
const MATCH_ATTEMPTS = 5, MATCH_RETRY_MS = 2000;
export const SCAN_MULTIPLIER = 3, PICK_GOAL_MULTIPLIER = 1.5;
const SIDES = ["football", "icehockey", "handball"];
const randomWindow = () => MIN_WINDOW + Math.floor(Math.random() * (MAX_WINDOW - MIN_WINDOW + 1));

async function fetchWithRetry(key, onRetry) {
    for (let a = 1; a <= MATCH_ATTEMPTS; a++) {
        try { return await sortGame(key); }
        catch { if (a < MATCH_ATTEMPTS) { onRetry?.(+1); await delay(MATCH_RETRY_MS); onRetry?.(-1); } }
    }
    return null;
}

function statementFor(sport, market, pick, home, away) {
    if (SIDES.includes(sport)) {
        if (market === "draw") return { outcome: "Draw", statement: `${home} to draw ${away}` };
        if (pick.market === "double" || market === "double_chance") {
            return pick.result
                ? { outcome: "Home or Draw", statement: `${home} to win or draw ${away}` }
                : { outcome: "Draw or Away", statement: `${away} to win or draw ${home}` };
        }
    }
    return pick.result
        ? { outcome: "Home", statement: `${home} to win ${away}` }
        : { outcome: "Away", statement: `${away} to win ${home}` };
}

export function createScanner({ games, sport, market, strictness, method, wanted, onChange }) {
    const picks = [];
    const s = { cursor: 0, scanned: 0, retrying: 0, counter: 0 };
    const goal = Math.ceil(wanted * PICK_GOAL_MULTIPLIER);

    function commit(g, json) {
        const calc = predict(json, sport, method, Number(g.time));
        const pick = outcomes(calc, json, { market, strictness });
        if (pick.result === null) return;
        const { team1name: home, team2name: away } = json.names;
        const { outcome, statement } = statementFor(sport, market, pick, home, away);
        const confidence = pickProbability(calc.probabilities, pick);
        const gameNo = ++s.counter;
        picks.push({
            gameNo, outcome, home, away, confidence,
            time: new Date(g.time * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
            game: { num: gameNo, key: g.key, time: g.time, league: g.league, statement },
            log: pick,
        });
    }

    /** Scans up to `budget` more games (stops early once enough picks exist). */
    function scanMore(budget) {
        return new Promise((resolve) => {
            let launched = 0, inFlight = 0, windowSize = randomWindow(), finished = false;
            const pump = () => {
                if (finished) return;
                while (inFlight < windowSize && launched < budget && s.cursor < games.length && picks.length < goal) {
                    launched++; inFlight++;
                    run(games[s.cursor++]);
                }
                if (inFlight === 0) { finished = true; resolve(); }
            };
            const run = async (g) => {
                let json = null;
                try { if (Number(g.time) > Date.now() / 1000) json = await fetchWithRetry(g.key, (d) => { s.retrying += d; onChange(); }); } catch { /* skipped */ }
                try { if (json) commit(g, json); } catch (e) { console.error(`Skipped game ${g.key}:`, e); }
                inFlight--; s.scanned++; windowSize = randomWindow();
                onChange(); pump();
            };
            pump();
        });
    }

    return {
        picks, goal, state: s,
        scanMore,
        hasMore: () => s.cursor < games.length,
        keepOnly: (keys) => { for (let i = picks.length - 1; i >= 0; i--) if (!keys.includes(picks[i].game.key)) picks.splice(i, 1); },
        trimTo: (n) => { picks.sort((a, b) => b.confidence - a.confidence).splice(n); },
    };
}
