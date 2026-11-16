// GENERATED from Portfolio/js/sportsV2.js (lines 1331-2031): v2 model, match fetching and parsing.
// Unchanged logic; only the UI reads (selType / selectElement) became the explicit `opts` argument.
async function fetchMatchMeta(key) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MATCHDATA_TIMEOUT_MS);
    try {
        const response = await fetch(`${MATCHDATA_URL}?id=${encodeURIComponent(key)}`, { signal: controller.signal });
        if (!response.ok) return null;
        const data = await response.json();
        return data && data.ok ? data : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function sortGame(key) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    //const url = `https://d.livescore.in/x/feed/df_hh_4_${key}`;
    const url = `https://api.webapps.com.ng/v2/sports/loadteam.php?50&x&feed&df_hh_4_${key}`;
    const metaPromise = fetchMatchMeta(key); // runs in parallel; never rejects, resolves to null on any failure

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { "x-fsign": "SW9D1eZo" },
            signal: controller.signal,
        });

        if (!response.ok) {
            const responseText = await response.text();
            throw new Error(`HTTP error! Status: ${response.status}, Response: ${responseText}`);
        }

        const matches = await response.text();

        const getNames = () => {
            const lines = matches.replace(/¬/g, '÷').split('÷');

            const wordCount = [];
            let counts = 0;

            lines.forEach((line) => {
                if (line.includes('Last matches:') && counts < 3) {
                    counts += 1;
                    wordCount.push(line.replace('Last matches: ', ''));
                }
            });

            return {
                team1name: wordCount[0] || null,
                team2name: wordCount[1] || null,
            };
        };


        const getTeams = () => {
            const lines = matches.replace(/¬/g, '÷').split('÷');
            const hometeams = [];
            const awayteams = [];
            const homescores = [];
            const awayscores = [];
            const gameDate = [];
            const dateLimit = new Date('2023-01-01').getTime() / 1000;
            let count = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (line.includes('Last matches')) {
                    count += 1;
                } else if (line.match(/(\d+):(\d+)/) && count <= 2) {

                    const [_, homeScore, awayScore] = line.match(/(\d+):(\d+)/);
                    const awayTeam = lines[i - 4] || '';
                    const homeTeam = lines[i - 12] || '';
                    const dTime = lines[i - 34] || '';
                    const dTime2 = lines[i + 16] || '';

                    const time100 = dTime.length === 10 ? dTime : (dTime2.length === 10 ? dTime2 : null);


                    if (time100 > dateLimit && !/\b\w*\.png\w*\b/.test(homeTeam) && !/\b\w*\.png\w*\b/.test(awayTeam)) {
                        hometeams.push(homeTeam);
                        awayteams.push(awayTeam);
                        homescores.push(homeScore);
                        awayscores.push(awayScore);
                        gameDate.push(time100);

                        // console.log(homeTeam, awayTeam, homeScore, awayScore, time100);

                    }
                }
            }

            return {
                hometeams,
                awayteams,
                homescores,
                awayscores,
                gameDate,
            };
        };

        const meta = await metaPromise;
        return {
            names: getNames(),
            ...getTeams(),
            meta,
        };

    } catch (error) {
        console.error(`Error fetching or processing data: ${error.message}`);
        throw error;
    }
    finally {
        clearTimeout(timeoutId);
    }
}


// -----------------------------------------------------------------------
// Prediction model v2 (deterministic, no randomness)
//
// Every signal is expressed as an expected goal margin (home minus away)
// at a neutral venue. Signals are blended, home advantage is added back,
// and the margin is converted into win / draw / loss probabilities.
// A pick is made only when its probability clears the strictness threshold.
// -----------------------------------------------------------------------
const MODEL_VERSION = 2;
const MAX_MATCHES_PER_TEAM = 20;      // older results say little about current form
const RECENCY_TIER_SIZE = 5;          // matches per weight tier
const RECENCY_TIER_WEIGHTS = [1.0, 0.7, 0.4, 0.15]; // latest 5, next 5, next 5, last 5
// Second weight, by how long ago a match was played (calendar months back from today).
// It multiplies the tier weight above, for team form, goals, tempo, common opponents and head-to-head.
const AGE_LIMITS_MONTHS = [3, 6, 12];
const AGE_WEIGHTS = [1.0, 0.75, 0.5, 0.25];  // up to 3 months, 3 to 6 months, 6 to 12 months, 1 year or older
const FORM_PRIOR_MATCHES = 3;         // pulls thin samples towards an average team
const MIN_MATCHES_REQUIRED = 6;       // below this per team, no pick is made
const MIN_VENUE_MATCHES_FOR_HFA = 3;  // home and away games needed to estimate home advantage
const HFA_PRIOR_MATCHES = 20;         // shrinks the home advantage estimate towards zero
const COMMON_OPPONENT_MAX_WEIGHT = 0.6;
const COMMON_OPPONENT_PRIOR = 6;
const HEAD2HEAD_MAX_WEIGHT = 1.0;     // a single recent meeting already carries a third of the form weight
const HEAD2HEAD_PRIOR = 2;
// Largest goal margin a single match may count for. A 12-0 against a minnow says little more than a 3-0.
// Only for low-scoring sports; in basketball or handball a 3-goal margin is normal, so no cap there.
const MARGIN_CAP_BY_SPORT = { football: 3, icehockey: 3 };
// Teams that share no opponents (different leagues or competitions) cannot be compared through form alone,
// so their expected margin is pulled towards zero. Full trust needs this many shared opponents.
const SHARED_OPPONENTS_FOR_FULL_TRUST = 4;
const MIN_LINK_TRUST = 0.5;
// Competition-aware data from matchdata.php (optional; the model works without it).
const MATCHDATA_URL = 'https://api.webapps.com.ng/v2/sports/matchdata.php';
const MATCHDATA_TIMEOUT_MS = 8000;
// Football only: goals a tier-2 team's margin is worth less than a tier-1 team's, per tier below the top flight.
const LEVEL_MARGIN_PER_TIER = 0.4;
// Two teams whose latest league matches are in the same competition count as at least this many shared opponents.
const SAME_LEAGUE_LINK_COUNT = 3;
// Team-specific venue form: the home team's home results and the away team's away results.
const VENUE_PRIOR_MATCHES = 4;        // pseudo-matches pulling venue form towards the team's overall strength
const VENUE_FORM_WEIGHT = 0.4;        // share of the expected margin that comes from venue form
const MIN_MATCH_DATE_SECONDS = new Date('2023-01-01').getTime() / 1000; // same cut-off as getTeams
// Rest days: a small penalty for a team that played less than REST_DAYS_FULL days before kick-off. No bonus for long rest.
const REST_DAYS_FULL = 4;             // this much rest or more: no penalty
const REST_DAYS_MAX_PENALTY = 2;      // this little rest or less: the full penalty
// Share of the expected total goals lost at full penalty (about 0.14 goals in football).
// Low-scoring sports use 0.05; basketball and other high-scoring sports use far less, as 5% of a 220-point total is huge.
const REST_MAX_PENALTY_SHARE_BY_SPORT = { football: 0.05, icehockey: 0.05, handball: 0.05 };
const REST_MAX_PENALTY_SHARE_DEFAULT = 0.01;
// Conflict veto: when the like-for-like signals (shared opponents, head-to-head) point to the other side from the pick,
// the pick needs a higher probability. The strictness thresholds are untouched; the boost is added on top.
const CONFLICT_MIN_COMMON_COUNT = 1.5;  // effective shared opponents needed for that signal to count
const CONFLICT_MIN_H2H_COUNT = 0.6;     // effective head-to-head meetings needed for that signal to count
const CONFLICT_MARGIN_SHARE = 0.15;     // a signal counts only above this share of the expected total goals (about 0.4 in football)
const CONFLICT_BOOST_PER_SIGNAL = 0.06;
const CONFLICT_BOOST_MAX = 0.12;
// Per-team draw rates (sports that can end level). Poisson models tend to underestimate draws.
const DRAW_PRIOR_MATCHES = 6;         // pseudo-matches pulling a team's draw rate towards the pooled rate
const DRAW_POISSON_SHARE = 0.5;       // final draw = this share of the Poisson draw + the rest from the teams' draw rates
const DRAW_MIN = 0.05;
const DRAW_MAX = 0.5;
const MIN_EXPECTED_GOALS_SHARE = 0.1; // keeps an expected-goals value from reaching zero
const MIN_MARGIN_SPREAD = 0.5;
const DEFAULT_METHOD = 'mix';         // 'goals', 'form' or 'mix' (mySelect7 in the HTML)
const FORM_BLEND_WEIGHT = 0.3;        // share of the margin that comes from win/draw/loss form in 'mix'
const DOWNGRADE_WINNER_TO_DOUBLE_CHANCE = true; // winner market only, sports that have draws
const NO_PICK = { result: null, market: 'none' };
const POISSON_SPORTS = ['football', 'icehockey', 'handball'];
const POISSON_TAIL_SIGMAS = 6;
// Starting values, not yet tuned against real results. Keyed by strictness select (1 lax, 2 moderate, 3 strict).
const PICK_THRESHOLDS = {
    winner: { 1: 0.50, 2: 0.56, 3: 0.64 },
    double_chance: { 1: 0.70, 2: 0.75, 3: 0.82 },
    draw: { 1: 0.27, 2: 0.30, 3: 0.32 }
};

function mean(values) {
    return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function recencyWeight(index) {
    const tier = Math.floor(index / RECENCY_TIER_SIZE);
    return RECENCY_TIER_WEIGHTS[Math.min(tier, RECENCY_TIER_WEIGHTS.length - 1)];
}

// Weight for a match by its age. `dateSeconds` is the unix time of the match.
function ageWeight(dateSeconds) {
    const monthsAgo = (months) => {
        const day = new Date(Date.now());
        const dayOfMonth = day.getDate();
        day.setDate(1);
        day.setMonth(day.getMonth() - months);
        const lastDay = new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate();
        day.setDate(Math.min(dayOfMonth, lastDay)); // 31 May minus 3 months is 28/29 Feb, not 3 Mar
        return day.getTime() / 1000;
    };
    const tier = AGE_LIMITS_MONTHS.findIndex((months) => dateSeconds >= monthsAgo(months));
    return AGE_WEIGHTS[tier === -1 ? AGE_WEIGHTS.length - 1 : tier];
}

// Final weight of one match: its position tier times its age.
function matchWeight(match, index) {
    return recencyWeight(index) * ageWeight(match.date) * (match.competitionWeight ?? 1);
}

function weightedMean(values, weights, priorMean, priorWeight) {
    let weightSum = priorWeight;
    let total = priorMean * priorWeight;
    values.forEach((value, index) => {
        weightSum += weights[index];
        total += value * weights[index];
    });
    return weightSum > 0 ? total / weightSum : priorMean;
}

function normalCdf(z) {
    // Abramowitz-Stegun 26.2.17
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const density = 0.3989423 * Math.exp(-z * z / 2);
    const tail = density * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - tail : tail;
}

function poissonPmf(lambda, maxGoals) {
    const pmf = [Math.exp(-lambda)];
    for (let goals = 1; goals <= maxGoals; goals++) {
        pmf.push(pmf[goals - 1] * lambda / goals);
    }
    return pmf;
}

// Rebuilds each team's results as plain objects seen from that team's side.
// Uses only the arrays produced by getTeams, which is left untouched.
// Shrinks a lopsided score so the margin is at most `cap`, keeping the winner and the loser's goals sensible.
function capMargin(goalsFor, goalsAgainst, cap) {
    if (goalsFor - goalsAgainst > cap) return { goalsFor: goalsAgainst + cap, goalsAgainst };
    if (goalsAgainst - goalsFor > cap) return { goalsFor, goalsAgainst: goalsFor + cap };
    return { goalsFor, goalsAgainst };
}

// Lookup of competition info by date|home|away, built from the matchdata.php lists.
function buildMetaLookup(meta) {
    const lookup = new Map();
    if (!meta || !meta.overall) return lookup;
    const lists = [meta.overall.home, meta.overall.away, meta.overall.h2h, meta.homeOnly, meta.awayOnly];
    lists.forEach((list) => (list || []).forEach((m) => {
        lookup.set(`${m.date}|${m.home}|${m.away}`, { weight: m.weight, tier: m.tier, code: m.code, type: m.type });
    }));
    return lookup;
}

function collectMatches(niceJson, sport) {
    const metaLookup = buildMetaLookup(niceJson.meta);
    const marginCap = MARGIN_CAP_BY_SPORT[sport] ?? Infinity;
    const { team1name, team2name } = niceJson.names;
    const { hometeams, awayteams, homescores, awayscores, gameDate } = niceJson;
    const team1 = [];
    const team2 = [];
    const headToHead = [];
    const seenHeadToHead = new Set();

    for (let index = 0; index < hometeams.length; index++) {
        const homeTeam = hometeams[index];
        const awayTeam = awayteams[index];
        const homeScore = Number(homescores[index]);
        const awayScore = Number(awayscores[index]);
        const date = Number(gameDate[index]);
        if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || !Number.isFinite(date)) continue;

        const cappedHome = capMargin(homeScore, awayScore, marginCap);
        const info = metaLookup.get(`${date}|${homeTeam}|${awayTeam}`);
        const comp = {
            competitionWeight: info && Number.isFinite(info.weight) ? info.weight : 1,
            code: info ? info.code : null,
            type: info ? info.type : null,
            // Division adjustment, football only. Missing info means tier 1, so no change.
            levelPenalty: sport === 'football' && info && info.tier ? LEVEL_MARGIN_PER_TIER * (info.tier - 1) : 0
        };
        const fromHome = { goalsFor: cappedHome.goalsFor, goalsAgainst: cappedHome.goalsAgainst, venue: 'home', date, ...comp };
        const fromAway = { goalsFor: cappedHome.goalsAgainst, goalsAgainst: cappedHome.goalsFor, venue: 'away', date, ...comp };

        const isHeadToHead = (homeTeam === team1name && awayTeam === team2name)
            || (homeTeam === team2name && awayTeam === team1name);
        if (isHeadToHead) {
            const dedupeKey = `${date}|${homeTeam}|${homeScore}|${awayScore}`;
            if (seenHeadToHead.has(dedupeKey)) continue;
            seenHeadToHead.add(dedupeKey);
            // Both sides played this match in the same competition, so there is no division gap to correct.
            fromHome.levelPenalty = 0;
            fromAway.levelPenalty = 0;
            headToHead.push(homeTeam === team1name ? { ...fromHome, opponent: team2name } : { ...fromAway, opponent: team2name });
            // The meeting also counts in each team's own form; it is the most relevant match either of them played.
            team1.push(homeTeam === team1name ? { ...fromHome, opponent: team2name } : { ...fromAway, opponent: team2name });
            team2.push(homeTeam === team2name ? { ...fromHome, opponent: team1name } : { ...fromAway, opponent: team1name });
            continue;
        }

        if (homeTeam === team1name) team1.push({ ...fromHome, opponent: awayTeam });
        else if (awayTeam === team1name) team1.push({ ...fromAway, opponent: homeTeam });

        if (homeTeam === team2name) team2.push({ ...fromHome, opponent: awayTeam });
        else if (awayTeam === team2name) team2.push({ ...fromAway, opponent: homeTeam });
    }

    const newestFirst = (a, b) => b.date - a.date;
    const team1Sorted = team1.sort(newestFirst).slice(0, MAX_MATCHES_PER_TEAM);
    const team2Sorted = team2.sort(newestFirst).slice(0, MAX_MATCHES_PER_TEAM);

    // Venue-only lists from matchdata.php (they go deeper than the Overall list).
    // venue 'home': rows of the team's home section; venue 'away': rows of the team's away section.
    const venueFromMeta = (rows, teamName, otherName, venue) => {
        const isHome = venue === 'home';
        const seen = new Set();
        const list = [];
        (rows || []).forEach((m) => {
            if ((isHome ? m.home : m.away) !== teamName) return;
            const date = Number(m.date), homeGoals = Number(m.homeGoals), awayGoals = Number(m.awayGoals);
            if (!Number.isFinite(date) || !Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return;
            if (date < MIN_MATCH_DATE_SECONDS) return;
            const dedupeKey = `${date}|${m.home}|${m.away}`;
            if (seen.has(dedupeKey)) return;
            seen.add(dedupeKey);
            const capped = capMargin(homeGoals, awayGoals, marginCap);
            const opponent = isHome ? m.away : m.home;
            list.push({
                goalsFor: isHome ? capped.goalsFor : capped.goalsAgainst,
                goalsAgainst: isHome ? capped.goalsAgainst : capped.goalsFor,
                venue, date, opponent,
                competitionWeight: Number.isFinite(m.weight) ? m.weight : 1,
                code: m.code ?? null,
                type: m.type ?? null,
                levelPenalty: sport === 'football' && m.tier && opponent !== otherName ? LEVEL_MARGIN_PER_TIER * (m.tier - 1) : 0
            });
        });
        return list.sort(newestFirst).slice(0, MAX_MATCHES_PER_TEAM);
    };
    const meta = niceJson.meta;
    let team1Home = venueFromMeta(meta && meta.homeOnly, team1name, team2name, 'home');
    let team2Away = venueFromMeta(meta && meta.awayOnly, team2name, team1name, 'away');
    // Without matchdata.php, use the venue split of the Overall list.
    if (team1Home.length === 0) team1Home = team1Sorted.filter((match) => match.venue === 'home');
    if (team2Away.length === 0) team2Away = team2Sorted.filter((match) => match.venue === 'away');

    return {
        team1: team1Sorted,
        team2: team2Sorted,
        headToHead: headToHead.sort(newestFirst),
        team1Home,
        team2Away
    };
}

const goalDiff = (match) => match.goalsFor - match.goalsAgainst;

// Win = 1, draw = 0, loss = -1. Venue is not adjusted: each team plays both home and away,
// so the effect largely cancels when the two teams are compared.
function teamResultForm(matches) {
    const values = matches.map((match) => Math.sign(goalDiff(match)));
    const weights = matches.map((match, index) => matchWeight(match, index));
    return weightedMean(values, weights, 0, FORM_PRIOR_MATCHES);
}

// Converts result form into goal units using the typical margin of a decisive match.
function resultFormScale(matches) {
    const margins = matches.map((match) => Math.abs(goalDiff(match))).filter((margin) => margin > 0);
    return margins.length === 0 ? 1 : mean(margins);
}

// Average extra goal margin a team earns by playing at home, pooled over both teams.
function estimateHomeAdvantage(teamLists) {
    let weightedSum = 0;
    let totalPairs = 0;
    teamLists.forEach((matches) => {
        const home = matches.filter((match) => match.venue === 'home').map(goalDiff);
        const away = matches.filter((match) => match.venue === 'away').map(goalDiff);
        if (home.length < MIN_VENUE_MATCHES_FOR_HFA || away.length < MIN_VENUE_MATCHES_FOR_HFA) return;
        const pairs = Math.min(home.length, away.length);
        weightedSum += ((mean(home) - mean(away)) / 2) * pairs;
        totalPairs += pairs;
    });
    if (totalPairs === 0) return 0;
    return (weightedSum / totalPairs) * (totalPairs / (totalPairs + HFA_PRIOR_MATCHES));
}

// Goal difference with the venue effect removed, so home and away games compare fairly.
function neutralGoalDiff(match, homeAdvantage) {
    return goalDiff(match) - (match.levelPenalty ?? 0) - (match.venue === 'home' ? homeAdvantage : -homeAdvantage);
}

function teamStrength(matches, homeAdvantage) {
    const values = matches.map((match) => neutralGoalDiff(match, homeAdvantage));
    const weights = matches.map((match, index) => matchWeight(match, index));
    return weightedMean(values, weights, 0, FORM_PRIOR_MATCHES);
}

// Competition- and recency-weighted goal margin of a team at one venue, pulled towards `prior`.
// The margin is the raw one (it includes the venue effect), less any division adjustment.
function venueStrength(matches, prior) {
    const values = matches.map((match) => goalDiff(match) - (match.levelPenalty ?? 0));
    const weights = matches.map((match, index) => matchWeight(match, index));
    return weightedMean(values, weights, prior, VENUE_PRIOR_MATCHES);
}

// Days between the team's latest earlier match and kick-off (matches are newest first), or null if unknown.
function restDaysBefore(matches, kickoff) {
    if (!Number.isFinite(kickoff)) return null;
    const previous = matches.find((match) => match.date < kickoff);
    return previous ? (kickoff - previous.date) / 86400 : null;
}

// Goals a tired team loses. Less than REST_DAYS_FULL days of rest costs a little, up to the cap at REST_DAYS_MAX_PENALTY.
function restPenalty(restDays, expectedTotal, sport) {
    if (restDays === null) return 0;
    const share = REST_MAX_PENALTY_SHARE_BY_SPORT[sport] ?? REST_MAX_PENALTY_SHARE_DEFAULT;
    const shortfall = Math.min(1, Math.max(0, (REST_DAYS_FULL - restDays) / (REST_DAYS_FULL - REST_DAYS_MAX_PENALTY)));
    return share * expectedTotal * shortfall;
}

function teamTempo(matches, fallbackTotal) {
    const totals = matches.map((match) => match.goalsFor + match.goalsAgainst);
    const weights = matches.map((match, index) => matchWeight(match, index));
    return weightedMean(totals, weights, fallbackTotal, FORM_PRIOR_MATCHES);
}

// Compares both teams through opponents they have both played, which cancels out schedule strength.
// Each shared opponent is weighted by recency: the comparison is only as fresh as the older of the two
// teams' meetings with that opponent, so a recent shared opponent counts for more than an old one.
function commonOpponentMargin(team1, team2, homeAdvantage) {
    const averageByOpponent = (matches) => {
        const grouped = new Map();
        matches.forEach((match, index) => {
            const entry = grouped.get(match.opponent) || { total: 0, weight: 0 };
            const weight = matchWeight(match, index);
            entry.total += neutralGoalDiff(match, homeAdvantage) * weight;
            entry.weight += weight;
            grouped.set(match.opponent, entry);
        });
        return grouped;
    };

    const team1ByOpponent = averageByOpponent(team1);
    const team2ByOpponent = averageByOpponent(team2);
    const differences = [];
    const weights = [];
    team1ByOpponent.forEach((entry1, opponent) => {
        const entry2 = team2ByOpponent.get(opponent);
        if (!entry2) return;
        differences.push(entry1.total / entry1.weight - entry2.total / entry2.weight);
        // Capped at 1 so an opponent met several times does not count as more than one opponent.
        weights.push(Math.min(1, entry1.weight, entry2.weight));
    });
    // As with head-to-head, the count is the sum of the weights (three recent shared opponents = about 3,
    // three old ones = much less), so stale evidence is also trusted less overall.
    const effectiveCount = weights.reduce((sum, weight) => sum + weight, 0);
    return { margin: weightedMean(differences, weights, 0, 0), count: effectiveCount };
}

function headToHeadMargin(headToHead, homeAdvantage) {
    const values = headToHead.map((match) => neutralGoalDiff(match, homeAdvantage));
    const weights = headToHead.map((match, index) => matchWeight(match, index));
    // Old meetings also count for less in how much head-to-head is trusted overall:
    // the count is the sum of the age weights (three recent meetings = 3, three from last year = 0.75).
    const effectiveCount = headToHead.reduce((sum, match) => sum + ageWeight(match.date), 0);
    return { margin: weightedMean(values, weights, 0, 0), count: effectiveCount };
}

// A team's share of matches that ended level, competition- and recency-weighted, pulled towards the pooled rate.
function teamDrawRate(matches, pooledRate) {
    const values = matches.map((match) => (match.goalsFor === match.goalsAgainst ? 1 : 0));
    const weights = matches.map((match, index) => matchWeight(match, index));
    return weightedMean(values, weights, pooledRate, DRAW_PRIOR_MATCHES);
}

// Mixes the Poisson draw probability with the two teams' own draw rates, then rescales home and away to keep the total at 1.
function blendDrawRates(poisson, team1, team2) {
    const isDraw = (match) => (match.goalsFor === match.goalsAgainst ? 1 : 0);
    const pooledRate = mean([...team1, ...team2].map(isDraw));
    const matchupRate = (teamDrawRate(team1, pooledRate) + teamDrawRate(team2, pooledRate)) / 2;
    const blended = DRAW_POISSON_SHARE * poisson.draw + (1 - DRAW_POISSON_SHARE) * matchupRate;
    const draw = Math.min(DRAW_MAX, Math.max(DRAW_MIN, blended));
    const decisive = poisson.home + poisson.away;
    const scale = decisive > 0 ? (1 - draw) / decisive : 0;
    return { home: poisson.home * scale, draw, away: poisson.away * scale };
}

function poissonProbabilities(lambdaHome, lambdaAway) {
    const maxLambda = Math.max(lambdaHome, lambdaAway);
    const maxGoals = Math.ceil(maxLambda + POISSON_TAIL_SIGMAS * Math.sqrt(maxLambda)) + 3;
    const homePmf = poissonPmf(lambdaHome, maxGoals);
    const awayPmf = poissonPmf(lambdaAway, maxGoals);
    let home = 0, draw = 0, away = 0;
    for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals++) {
        for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals++) {
            const probability = homePmf[homeGoals] * awayPmf[awayGoals];
            if (homeGoals > awayGoals) home += probability;
            else if (homeGoals === awayGoals) draw += probability;
            else away += probability;
        }
    }
    const total = home + draw + away;
    return { home: home / total, draw: draw / total, away: away / total };
}

function marginProbabilities(expectedMargin, spread) {
    const home = normalCdf(expectedMargin / spread);
    return { home, draw: 0, away: 1 - home };
}

function predict(niceJson, sport, method = DEFAULT_METHOD, kickoff = null) {
    const { team1, team2, headToHead, team1Home, team2Away } = collectMatches(niceJson, sport);
    const enoughData = team1.length >= MIN_MATCHES_REQUIRED && team2.length >= MIN_MATCHES_REQUIRED;
    if (!enoughData) {
        return { enoughData, matches1: team1.length, matches2: team2.length };
    }

    const homeAdvantage = estimateHomeAdvantage([team1, team2]);
    const formMargin = teamStrength(team1, homeAdvantage) - teamStrength(team2, homeAdvantage);
    const common = commonOpponentMargin(team1, team2, homeAdvantage);
    const h2h = headToHeadMargin(headToHead, homeAdvantage);

    const commonWeight = COMMON_OPPONENT_MAX_WEIGHT * common.count / (common.count + COMMON_OPPONENT_PRIOR);
    const h2hWeight = HEAD2HEAD_MAX_WEIGHT * h2h.count / (h2h.count + HEAD2HEAD_PRIOR);
    const neutralMargin = (formMargin + commonWeight * common.margin + h2hWeight * h2h.margin)
        / (1 + commonWeight + h2hWeight);
    const allMatches = [...team1, ...team2];
    const resultFormMargin = (teamResultForm(team1) - teamResultForm(team2)) * resultFormScale(allMatches);
    let blendedMargin;
    if (method === 'goals') blendedMargin = neutralMargin;
    else if (method === 'form') blendedMargin = resultFormMargin;
    else blendedMargin = (1 - FORM_BLEND_WEIGHT) * neutralMargin + FORM_BLEND_WEIGHT * resultFormMargin;
    // Teams with no shared opponents are judged against different schedules, so trust the margin less.
    // Teams whose latest league matches are in the same competition are connected even with few shared opponents.
    // Cups and friendlies do not count: they are exactly where unrelated leagues meet.
    const latestLeagueCode = (matches) => (matches.find((match) => match.type === 'league' && match.code) || {}).code || null;
    const code1 = latestLeagueCode(team1);
    const sameLeague = code1 !== null && code1 === latestLeagueCode(team2);
    const connectionCount = sameLeague ? Math.max(common.count, SAME_LEAGUE_LINK_COUNT) : common.count;
    const linkTrust = MIN_LINK_TRUST + (1 - MIN_LINK_TRUST) * Math.min(1, connectionCount / SHARED_OPPONENTS_FOR_FULL_TRUST);
    const currentMargin = blendedMargin * linkTrust + homeAdvantage;
    // Team-specific venue form. Each venue strength already contains the home effect once for each side,
    // so one pooled home advantage is taken out again to keep the match margin on the same footing.
    const homeVenueStrength = venueStrength(team1Home, teamStrength(team1, homeAdvantage) + homeAdvantage);
    const awayVenueStrength = venueStrength(team2Away, teamStrength(team2, homeAdvantage) - homeAdvantage);
    const venueMargin = homeVenueStrength - awayVenueStrength - homeAdvantage;
    let expectedMargin = (1 - VENUE_FORM_WEIGHT) * currentMargin + VENUE_FORM_WEIGHT * venueMargin * linkTrust;

    const allTotals = [...team1, ...team2].map((match) => match.goalsFor + match.goalsAgainst);
    const pooledTotal = mean(allTotals);
    const expectedTotal = (teamTempo(team1, pooledTotal) + teamTempo(team2, pooledTotal)) / 2;
    const restHome = restDaysBefore(team1, kickoff);
    const restAway = restDaysBefore(team2, kickoff);
    expectedMargin += restPenalty(restAway, expectedTotal, sport) - restPenalty(restHome, expectedTotal, sport);
    const minimumGoals = expectedTotal * MIN_EXPECTED_GOALS_SHARE;
    const expectedHomeGoals = Math.max(minimumGoals, (expectedTotal + expectedMargin) / 2);
    const expectedAwayGoals = Math.max(minimumGoals, (expectedTotal - expectedMargin) / 2);

    let probabilities;
    if (POISSON_SPORTS.includes(sport)) {
        probabilities = blendDrawRates(poissonProbabilities(expectedHomeGoals, expectedAwayGoals), team1, team2);
    }
    else {
        const spread = Math.max(MIN_MARGIN_SPREAD, standardDeviation([...team1, ...team2].map(goalDiff)));
        probabilities = marginProbabilities(expectedHomeGoals - expectedAwayGoals, spread);
    }

    return {
        enoughData,
        matches1: team1.length,
        matches2: team2.length,
        expectedHomeGoals,
        expectedAwayGoals,
        probabilities,
        goalsMargin: neutralMargin,
        formMargin: resultFormMargin,
        commonMargin: common.margin,
        linkTrust,
        venueMargin,
        restDays: { home: restHome, away: restAway },
        commonCount: common.count,
        h2hCount: h2h.count,
        expectedTotal,
        headToHeadMargin: h2h.margin
    };
}

function standardDeviation(values) {
    const average = mean(values);
    return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

// result: true = home side of the market, false = away side, null = no pick.
// market: 'win', 'double' or 'draw' (what was actually picked).
// Extra probability a pick on each side needs. A signal that favours the home side argues against an away pick,
// and the other way round. Draw picks are exempt (pickResult does not use the boost for them).
function conflictBoosts(calculated) {
    const boosts = { home: 0, away: 0 };
    const minMargin = CONFLICT_MARGIN_SHARE * (calculated.expectedTotal || 0);
    const signals = [
        { margin: calculated.commonMargin, count: calculated.commonCount, minCount: CONFLICT_MIN_COMMON_COUNT },
        { margin: calculated.headToHeadMargin, count: calculated.h2hCount, minCount: CONFLICT_MIN_H2H_COUNT }
    ];
    signals.forEach(({ margin, count, minCount }) => {
        if (!(count >= minCount) || !Number.isFinite(margin) || Math.abs(margin) <= minMargin) return;
        if (margin > 0) boosts.away += CONFLICT_BOOST_PER_SIGNAL;
        else boosts.home += CONFLICT_BOOST_PER_SIGNAL;
    });
    boosts.home = Math.min(boosts.home, CONFLICT_BOOST_MAX);
    boosts.away = Math.min(boosts.away, CONFLICT_BOOST_MAX);
    return boosts;
}

function pickResult(market, strictness, probabilities, boosts = { home: 0, away: 0 }) {
    const threshold = PICK_THRESHOLDS[market]?.[strictness];
    if (threshold === undefined) return NO_PICK;
    const { home, draw, away } = probabilities;

    if (market === 'winner') {
        if (home >= threshold + boosts.home && home > away) return { result: true, market: 'win' };
        if (away >= threshold + boosts.away && away > home) return { result: false, market: 'win' };
        if (DOWNGRADE_WINNER_TO_DOUBLE_CHANCE && draw > 0) {
            const doubleThreshold = PICK_THRESHOLDS.double_chance[strictness];
            const homeOrDraw = home + draw;
            const drawOrAway = draw + away;
            if (homeOrDraw >= doubleThreshold + boosts.home && homeOrDraw > drawOrAway) return { result: true, market: 'double' };
            if (drawOrAway >= doubleThreshold + boosts.away && drawOrAway > homeOrDraw) return { result: false, market: 'double' };
        }
        return NO_PICK;
    }
    if (market === 'double_chance') {
        const homeOrDraw = home + draw;
        const drawOrAway = draw + away;
        if (homeOrDraw >= threshold + boosts.home && homeOrDraw > drawOrAway) return { result: true, market: 'double' };
        if (drawOrAway >= threshold + boosts.away && drawOrAway > homeOrDraw) return { result: false, market: 'double' };
        return NO_PICK;
    }
    if (market === 'draw') return draw >= threshold ? { result: true, market: 'draw' } : NO_PICK;
    return NO_PICK;
}

// Probability of the side that was actually picked; used to choose which picks to keep when there are extras.
function pickProbability(probabilities, pick) {
    const { home, draw, away } = probabilities;
    if (pick.market === 'double') return pick.result ? home + draw : draw + away;
    if (pick.market === 'draw') return draw;
    return pick.result ? home : away;
}

function outcomes(calculatedJson, matchJson, opts) {
    const { team1name, team2name } = matchJson.names;
    const percent = (probability) => Math.round(probability * 100);
    const rounded = (value) => Math.round(value * 100) / 100;

    const pick = calculatedJson.enoughData
        ? pickResult(opts.market, Number(opts.strictness), calculatedJson.probabilities, conflictBoosts(calculatedJson))
        : NO_PICK;

    const probabilities = calculatedJson.probabilities || { home: 0, draw: 0, away: 0 };
    const log = {
        model: MODEL_VERSION,
        team1: team1name,
        team2: team2name,
        score1: percent(probabilities.home),            // win probability %
        score2: percent(probabilities.away),
        sum1: rounded(calculatedJson.expectedHomeGoals || 0), // expected goals
        sum2: rounded(calculatedJson.expectedAwayGoals || 0),
        master: rounded(calculatedJson.commonMargin || 0),    // common-opponent margin
        head2head: rounded(calculatedJson.headToHeadMargin || 0),
        formGoals: rounded(calculatedJson.goalsMargin || 0),
        formResults: rounded(calculatedJson.formMargin || 0),
        draw: percent(probabilities.draw),
        trust: rounded(calculatedJson.linkTrust ?? 1),   // 1 = teams are well connected through shared opponents
        games1: calculatedJson.matches1,
        games2: calculatedJson.matches2,
        result: pick.result,
        market: pick.market
    };

    calculatedJson.result = pick.result;
    return log;
}

export { sortGame, predict, outcomes, pickProbability, DEFAULT_METHOD };
