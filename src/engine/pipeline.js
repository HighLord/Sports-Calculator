// Whole run: list games -> scan -> book -> trim to the best N / scan more -> slip.
import { getGames } from "./feed";
import { createScanner, SCAN_MULTIPLIER } from "./scanner";
import { bookPicks } from "./booking";

const MAX_ROUNDS = 6;

export async function runSlip(sel, onProgress) {
    const wanted = Number(sel.sportsAmount);
    const ui = { phase: "list", scanned: 0, total: 0, picks: 0, goal: 0, note: "", rescan: 0, roundStart: 0, roundBudget: 1 };
    const emit = (patch = {}) => { Object.assign(ui, patch); onProgress({ ...ui }); };
    emit();

    const games = await getGames(sel.sportsType, sel.sportsTime, { onRetry: (a, n) => emit({ note: `RETRYING GAME LIST... ATTEMPT ${a} OF ${n}` }) });
    if (games.length === 0) throw new Error("NO GAMES AVAILABLE FOR SPECIFIED DATE");

    const scanner = createScanner({
        games, wanted, sport: sel.sportsType, market: sel.sportsOptions, strictness: sel.sportsIntensity, method: sel.sportsMethod,
        onChange: () => emit({ scanned: scanner.state.scanned, picks: scanner.picks.length, note: scanner.state.retrying > 0 ? `RETRYING ${scanner.state.retrying} GAME${scanner.state.retrying === 1 ? "" : "S"}...` : "" }),
    });
    const firstBudget = Math.min(games.length, Math.ceil(wanted * SCAN_MULTIPLIER));
    emit({ phase: "scan", total: firstBudget, goal: scanner.goal, roundStart: 0, roundBudget: firstBudget, note: "" });
    await scanner.scanMore(Math.ceil(wanted * SCAN_MULTIPLIER));

    let trimmed = false, result = null;
    for (let round = 0; round < MAX_ROUNDS; round++) {
        if (scanner.picks.length === 0) throw new Error(round === 0 ? "No games matched your criteria. Try Lax or another day." : "Unable to get booking code");
        emit({ phase: "book", note: "BOOKING..." });
        result = await bookPicks(scanner.picks, sel.sportsType, sel.sportsOdd, (a) => emit({ note: a > 1 ? `REBOOKING... ATTEMPT ${a - 1}` : "BOOKING..." }));
        const survivors = Array.isArray(result.debug) ? result.debug : scanner.picks.map((p) => p.game.key);
        scanner.keepOnly(survivors);
        const total = scanner.picks.length;
        if (total === 0) throw new Error("Unable to get booking code");
        if (!trimmed && total > wanted) {            // more survived than asked for: keep the most confident, book again
            trimmed = true; scanner.trimTo(wanted);
            emit({ note: `KEEPING THE BEST ${wanted} GAMES` });
            continue;
        }
        if (total < wanted && scanner.hasMore()) {   // fewer survived: scan more, book again
            trimmed = false;
            const budget = Math.ceil((wanted - total) * SCAN_MULTIPLIER);
            const roundBudget = Math.max(1, Math.min(budget, games.length - scanner.state.cursor));
            // rescan++ is the UI's cue that water was lost: the level drops to what survived, then refills.
            emit({ phase: "scan", total: scanner.state.scanned + roundBudget, goal: wanted, rescan: ui.rescan + 1, roundStart: scanner.state.scanned, roundBudget, picks: total, note: "" });
            await scanner.scanMore(budget);
            continue;
        }
        break;
    }
    const code = result?.data?.shareCode ?? null;
    return {
        code,
        shareURL: result?.data?.shareURL || (code ? `https://www.sportybet.com?shareCode=${code}&c=ng` : null),
        odds: result.gamesBooked || {},
        totalOdds: result.totalOdds,
        games: scanner.picks.map(({ game, log }) => ({ game, log })),
        sport: sel.sportsType,
    };
}
