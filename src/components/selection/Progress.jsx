import "./progress.css";
import { useEffect, useRef, useState } from "react";
import { runSlip } from "../../engine/pipeline";
import { saveSlip } from "../../engine/store";

// Water circle = progress of the whole run: game list -> scan -> booking -> saving.
export default function Progress({ finalSelection, onDone }) {
	const waterRef = useRef(null);
	const startedRef = useRef(false);
	const [p, setP] = useState({ phase: "list", scanned: 0, total: 0, picks: 0, goal: 0, note: "", rescan: 0, roundStart: 0, roundBudget: 1 });
	const [draining, setDraining] = useState(false);
	const [seenRescan, setSeenRescan] = useState(0);
	// Derived during render so the drain class and the lower water level reach the screen in the same frame.
	if (p.rescan !== seenRescan) { setSeenRescan(p.rescan); setDraining(true); }

	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;
		(async () => {
			try {
				const slip = await runSlip(finalSelection, setP);
				setP((prev) => ({ ...prev, phase: "save", note: "SAVING..." }));
				const saved = await saveSlip(slip).catch(() => false);
				setP((prev) => ({ ...prev, phase: "done", note: "" }));
				setTimeout(() => onDone({ slip, saved }), 1200); // let the water finish filling
			} catch (e) {
				onDone({ error: e.message || "Something went wrong, try again" });
			}
		})();
	}, [finalSelection, onDone]);

	const fraction =
		p.phase === "list" ? 0.04 :
		p.phase === "scan" ? 0.05 + 0.8 * Math.min(1, Math.max((p.scanned - p.roundStart) / Math.max(1, p.roundBudget), p.picks / Math.max(1, p.goal))) :
		p.phase === "book" ? 0.92 : p.phase === "save" ? 0.97 : 1;

	// Booking came back with fewer games than asked for: pour some water out, then keep filling.
	useEffect(() => {
		if (p.rescan === 0) return;
		const t = setTimeout(() => setDraining(false), 2600);
		return () => clearTimeout(t);
	}, [p.rescan]);

	useEffect(() => {
		waterRef.current?.style.setProperty("--fill-top", `-${fraction * 300}px`);
	}, [fraction]);

	return (
		<div className="progress-wrap">
			<div className={`progress-container${draining ? " draining" : ""}`}>
				<div className={`water${draining ? " drain" : ""}`} ref={waterRef}></div>
				{draining && <div className="drips"><i /><i /><i /></div>}
			</div>
			<div className="progress-status">
				<div>{p.phase === "list" ? "LOADING GAMES" : p.phase === "scan" ? `SCANNING ${p.scanned} / ${p.total}` : p.phase === "done" ? "DONE" : p.phase.toUpperCase()}</div>
				<div>PICKS FOUND : {p.picks}</div>
				{draining ? <div className="progress-note">SOME GAMES WERE REJECTED, POURING OUT AND REFILLING...</div> : p.note && <div className="progress-note">{p.note}</div>}
			</div>
		</div>
	);
}
