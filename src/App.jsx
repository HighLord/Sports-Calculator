import "./App.css";
import { useCallback, useState } from "react";
import Wheel from "./components/selection/wheel";
import Direction from "./components/selection/Direction";
import Progress from "./components/selection/Progress";
import Results from "./components/selection/Results";
import { getInfoMessage } from "./algorithms/infoMessages";
import useSportsFlow from "./hooks/useSportsFlow";

function App() {
	const {
		allPages, pageIndex, selectedValues, showProgress, setShowProgress, resultsTab,
		matchesMessage, handleSelect, nextPage, prevPage, savePage, stop, finalSelection,
	} = useSportsFlow();

	const [outcome, setOutcome] = useState({ slip: null, error: null, saved: true });
	const currentPage = allPages[pageIndex];

	const onDone = useCallback((data) => {
		setOutcome({ slip: data.slip || null, error: data.error || null, saved: data.saved });
		setShowProgress(2);
	}, [setShowProgress]);

	const info = showProgress === 1 ? "Scanning games, building your slip..."
		: showProgress === 2 ? "Your results"
		: getInfoMessage(pageIndex, selectedValues, matchesMessage);

	return (
		<div className="container">
			<div className="grid-item header"><h4>Sports Calculator</h4></div>
			<div className="grid-item info"><span>{info}</span></div>

			{showProgress == 0 && (
				<div className="grid-item wheel">
					<Wheel
						key={currentPage.key}
						data={currentPage.data}
						dataKey={currentPage.key}
						onSelect={handleSelect}
						selectedValue={selectedValues[currentPage.key]}
					/>
				</div>
			)}

			{showProgress == 1 && <Progress finalSelection={finalSelection} onDone={onDone} />}

			{showProgress == 2 && (
				<div className="grid-item results">
					<Results
						slip={outcome.slip}
						error={outcome.error}
						saved={outcome.saved}
						initialTab={resultsTab}
						onClose={() => setShowProgress(0)}
					/>
				</div>
			)}

			<div className="grid-item direction">
				<Direction
					onNext={nextPage}
					onPrev={prevPage}
					onSaved={savePage}
					disableSaved={pageIndex > 0 || showProgress > 0}
					disablePrev={(pageIndex === 0 && showProgress === 0) || showProgress === 1}
					disableNext={stop || showProgress >= 1}
				/>
			</div>
		</div>
	);
}

export default App;
