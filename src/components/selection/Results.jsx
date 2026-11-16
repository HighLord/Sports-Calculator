import "./results.css";
import { useEffect, useMemo, useState } from "react";
import useLiveScores from "../../hooks/useLiveScores";
import { deleteSlip, loadSlips } from "../../engine/store";

const MIN_HOURS_AFTER_KICKOFF = 3;
const SORTS = [["time", "Sort: Time"], ["odds", "Sort: Odds"], ["confidence", "Sort: Confidence"], ["default", "Sort: Default"]];

// Probability of the side that was actually picked, in percent (from the saved log, so it also works for saved slips).
function pickPct(log) {
	const { score1: h, draw: d, score2: a } = log;
	if (log.market === "double") return log.result ? h + d : d + a;
	if (log.market === "draw") return d;
	return log.result ? h : a;
}
function formatTime(ts) {
	const d = new Date(Number(ts) * 1000);
	const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
	return d.toDateString() === new Date().toDateString() ? `Today : ${time}` : `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}: ${time}`;
}
const totalOddsOf = (slip) => slip.games.reduce((p, g) => p * (Number(slip.odds[g.game.num]) || 1), 1);
const matches = (g, q) => !q || `${g.game.statement} ${g.game.league} ${g.log.team1} ${g.log.team2}`.toLowerCase().includes(q.toLowerCase());

// The picked side is highlighted with the accent colour, everything else stays neutral.
function ProbBar({ log }) {
	const h = log.score1, d = log.draw, a = log.score2;
	const on = log.market === "draw" ? { h: 0, d: 1, a: 0 } : log.market === "double" ? { h: log.result ? 1 : 0, d: 1, a: log.result ? 0 : 1 } : { h: log.result ? 1 : 0, d: 0, a: log.result ? 0 : 1 };
	return (
		<div className="rs-prob">
			<div className="rs-bar">
				<span className={on.h ? "on" : ""} style={{ width: `${h}%` }} />
				{d > 0 && <span className={on.d ? "on" : ""} style={{ width: `${d}%` }} />}
				<span className={on.a ? "on" : ""} style={{ width: `${a}%` }} />
			</div>
			<div className="rs-prob-labels"><span>Home {h}%</span>{d > 0 && <span>Draw {d}%</span>}<span>Away {a}%</span></div>
		</div>
	);
}

function GameCard({ item, odd, index, live }) {
	const [open, setOpen] = useState(false);
	const { game, log } = item;
	const badge = !live || live.state === "pending"
		? <span className="rs-live rs-wait">{live ? "Not started" : "Checking"}</span>
		: <span className={`rs-live ${live.correct ? "rs-ok" : "rs-bad"}`}>{live.text} {live.state === "live" ? <i className="fa fa-spinner fa-spin" /> : <i className={`fa ${live.correct ? "fa-check" : "fa-times"}`} />}</span>;
	return (
		<div className="rs-game">
			<div className="rs-row">
				<div className="rs-meta">{index} · {formatTime(game.time)} · {game.league}</div>
				<div className="rs-odd">{odd}</div>
			</div>
			<div className="rs-statement">{game.statement}</div>
			<ProbBar log={log} />
			<div className="rs-row rs-foot">
				<span>Confidence <b>{pickPct(log)}%</b></span>
				<span>xG <b>{log.sum1} – {log.sum2}</b></span>
				{badge}
			</div>
			{open && (
				<div className="rs-details">
					<span>Data used</span><b>{log.games1} / {log.games2} matches</b>
					<span>Link trust</span><b>{log.trust}</b>
					<span>Goals margin</span><b>{log.formGoals}</b>
					<span>Form margin</span><b>{log.formResults}</b>
					<span>Common opponents</span><b>{log.master}</b>
					<span>Head-to-head</span><b>{log.head2head}</b>
				</div>
			)}
			<div className="rs-links">
				<button onClick={() => setOpen(!open)}>{open ? "Hide details" : "Details"}</button>
				<a href={`https://www.livescore.in/match/${game.key}/#/h2h/overall`} target="_blank" rel="noreferrer">Match link</a>
			</div>
		</div>
	);
}

function SlipView({ slip, query, sort, onDeleted }) {
	const { scores, settled } = useLiveScores(slip.games);
	const [deleting, setDeleting] = useState(false);
	const valid = slip.games.filter((g) => slip.odds[g.game.num]);
	const shown = useMemo(() => {
		const list = valid.filter((g) => matches(g, query));
		const odd = (g) => Number(slip.odds[g.game.num]);
		if (sort === "time") list.sort((a, b) => Number(a.game.time) - Number(b.game.time));
		else if (sort === "odds") list.sort((a, b) => odd(a) - odd(b));
		else if (sort === "confidence") list.sort((a, b) => pickPct(b.log) - pickPct(a.log));
		return list;
	}, [valid, query, sort, slip.odds]);
	const avg = valid.length ? Math.round(valid.reduce((s, g) => s + pickPct(g.log), 0) / valid.length) : 0;
	const won = valid.filter((g) => scores[g.game.key]?.state === "done" && scores[g.game.key].correct).length;
	const lost = valid.filter((g) => scores[g.game.key]?.state === "done" && !scores[g.game.key].correct).length;
	const allPlayed = settled && valid.length > 0 && valid.every((g) => Number(g.game.time) <= Date.now() / 1000 - MIN_HOURS_AFTER_KICKOFF * 3600);

	const remove = async () => {
		if (!window.confirm(`Delete this saved result (${slip.code})?\nAll ${valid.length} of its games have been played. This cannot be undone.`)) return;
		setDeleting(true);
		const ok = await deleteSlip(slip.code).catch(() => false);
		if (ok) onDeleted(slip.code); else { setDeleting(false); window.alert("Could not delete this result, try again."); }
	};

	return (
		<div className="rs-slip">
			<div className="rs-summary">
				<div className="rs-sum-top">
					<div>
						<div className="rs-label">Total odds</div>
						<div className="rs-total">{totalOddsOf({ ...slip, games: valid }).toFixed(2)}</div>
					</div>
					<div className="rs-actions">
						{allPlayed && <button className="rs-danger" onClick={remove} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>}
						{slip.code && <a href={slip.shareURL || `https://www.sportybet.com?shareCode=${slip.code}&c=ng`} target="_blank" rel="noreferrer"><button className="rs-play">Play</button></a>}
					</div>
				</div>
				<div className="rs-stats">
					<div><span>Code</span><b>{slip.code || "—"}</b></div>
					<div><span>Games</span><b>{valid.length}</b></div>
					<div><span>Avg confidence</span><b>{avg}%</b></div>
					{(won + lost > 0) && <div><span>Result</span><b>{won} ✓ · {lost} ✗</b></div>}
				</div>
			</div>
			{shown.length === 0 && <p className="rs-empty">No games match your search.</p>}
			{shown.map((g, i) => <GameCard key={g.game.key} item={g} index={i + 1} odd={slip.odds[g.game.num]} live={scores[g.game.key]} />)}
		</div>
	);
}

export default function Results({ slip, error, saved, initialTab, onClose }) {
	const [tab, setTab] = useState(initialTab);
	const [query, setQuery] = useState("");
	const [sort, setSort] = useState("time");
	const [list, setList] = useState(null);      // saved slips; null = loading
	const [listError, setListError] = useState(false);
	const [open, setOpen] = useState(null);       // code of the expanded saved slip

	useEffect(() => {
		if (tab !== "saved" || list) return;
		loadSlips().then(setList).catch(() => { setListError(true); setList([]); });
	}, [tab, list]);

	const savedShown = useMemo(() => {
		if (!list) return [];
		const out = list.filter((s) => !query || s.games.some((g) => matches(g, query)));
		const last = (s) => Math.max(...s.games.map((g) => Number(g.game.time)));
		if (sort === "time") out.sort((a, b) => last(b) - last(a));
		else if (sort === "odds") out.sort((a, b) => Number(b.totalOdds) - Number(a.totalOdds));
		return out;
	}, [list, query, sort]);

	return (
		<div className="rs-page">
			<div className="rs-top">
				<div className="rs-tabs">
					<button className={tab === "current" ? "on" : ""} onClick={() => setTab("current")}>This slip</button>
					<button className={tab === "saved" ? "on" : ""} onClick={() => setTab("saved")}>Saved</button>
				</div>
				<button className="rs-close" onClick={onClose} aria-label="Close"><i className="fa fa-times" /></button>
			</div>
			<div className="rs-tools">
				<div className="rs-search"><i className="fa fa-search" /><input placeholder="Search team, league or pick" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
				<select value={sort} onChange={(e) => setSort(e.target.value)}>
					{SORTS.filter(([v]) => tab === "current" || v === "time" || v === "odds" || v === "default").map(([v, t]) => <option key={v} value={v}>{t}</option>)}
				</select>
			</div>
			<div className="rs-scroll">
				{tab === "current" && (error
					? <p className="rs-error">{error}</p>
					: slip
						? <>
							{saved === false && <p className="rs-error">This result could not be saved to your saved list, but the booking code is valid.</p>}
							<SlipView slip={slip} query={query} sort={sort} onDeleted={() => { setList(null); onClose(); }} />
						</>
						: <p className="rs-empty">No slip yet. Run a search, or open the Saved tab.</p>)}
				{tab === "saved" && (
					list === null ? <p className="rs-empty"><i className="fa fa-spinner fa-spin" /> Loading saved results...</p>
					: listError ? <p className="rs-error">Saved results could not be loaded.</p>
					: savedShown.length === 0 ? <p className="rs-empty">No saved results.</p>
					: savedShown.map((s) => (
						<div key={s.code} className="rs-saved">
							<button className="rs-saved-head" onClick={() => setOpen(open === s.code ? null : s.code)}>
								<span><b>{s.code}</b></span><span className="rs-dim">{s.games.length} games · {s.totalOdds} odds</span><i className={`fa fa-chevron-${open === s.code ? "up" : "down"}`} />
							</button>
							{open === s.code && <SlipView slip={s} query={query} sort={sort} onDeleted={() => setList(null)} />}
						</div>
					)))}
			</div>
		</div>
	);
}
