import { useEffect, useState } from "react";
import { checkLiveScores, delay } from "../engine/feed";

// Is the pick currently winning, drawing or losing? (ported from renderLiveScore in sportsV2.js)
function evaluate(item, ls) {
    const st = item.game.statement;
    const winOrDraw = /win\s+or\s+draw/i.test(st);
    const justDraw = /(?<!win\s+or\s+)draw/i.test(st);
    const homeSide = (ls.home > ls.away && item.log.result) || (ls.home < ls.away && !item.log.result);
    const drawn = ls.home == ls.away;
    const correct = winOrDraw ? homeSide || drawn : justDraw ? drawn : homeSide;
    const text = item.log.result ? `${ls.home}:${ls.away}` : `${ls.away}:${ls.home}`;
    return { state: ls.live ? "live" : "done", text, correct };
}

/** Polls every game that is waiting or live every 20 s. scores[key] = { state: pending|live|done, text, correct }. */
export default function useLiveScores(games) {
    const [scores, setScores] = useState({});
    const [settled, setSettled] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setScores({}); setSettled(false);
        const check = async (item) => {
            const ls = await checkLiveScores(item.game.key);
            const notStarted = ls.currenttime < Number(item.game.time) || (ls.home == null && ls.away == null);
            const r = notStarted ? { state: "pending" } : evaluate(item, ls);
            if (!cancelled) setScores((p) => ({ ...p, [item.game.key]: r }));
            return r.state !== "done"; // still has to be watched
        };
        (async () => {
            let hold = games;
            while (!cancelled && hold.length > 0) {
                const [flags] = await Promise.all([Promise.all(hold.map(check)), delay(20000)]);
                hold = hold.filter((_, i) => flags[i]);
            }
            if (!cancelled) setSettled(true);
        })();
        return () => { cancelled = true; };
    }, [games]);

    return { scores, settled };
}
