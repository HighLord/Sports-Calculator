import "./direction.css";

export default function Direction({
	onNext,
	onPrev,
	onSaved,
	disableSaved,
	disableNext,
	disablePrev,
}) {
	return (
		<div id="direction">
			<div className="button">
				<button
					id="saved"
					onClick={onSaved}
					disabled={disableSaved}
					className={disableSaved ? "disabled" : ""}>
					Saved
				</button>
				<button
					id="prevbutton"
					onClick={onPrev}
					disabled={disablePrev}
					className={disablePrev ? "disabled" : ""}>
					Prev
				</button>
			</div>
			<div className="button">
				<button
					id="nextbutton"
					onClick={onNext}
					disabled={disableNext}
					className={disableNext ? "disabled" : ""}>
					Next
				</button>
			</div>
		</div>
	);
}
