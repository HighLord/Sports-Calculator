import "./App.css";
import { useState } from "react";
import Wheel from "./components/selection/wheel";
import Direction from "./components/selection/Direction";
import Progress from "./components/selection/Progress";
import Result from "./components/selection/Result";
import { getInfoMessage } from "./algorithms/infoMessages";
import useSportsFlow from "./hooks/useSportsFlow";

function App() {
	const {
		allPages,
		pageIndex,
		selectedValues,
		showProgress,
		setShowProgress,
		matchesMessage,
		handleSelect,
		nextPage,
		prevPage,
		savePage,
		stop,
		finalSelection,
	} = useSportsFlow();

  const [progressData, setProgressData] = useState({
		dataKing: {},
		saveGame: [],
  });
	const currentPage = allPages[pageIndex];

	return (
		<div className="container">
			<div className="grid-item header">
				<h4>Sports Calculator</h4>
			</div>

			<div className="grid-item info">
				<span>
					{getInfoMessage(pageIndex, selectedValues, matchesMessage)}
				</span>
			</div>

			{showProgress == 0 && (
				<div className="grid-item wheel">
					<Wheel
						data={currentPage.data}
						dataKey={currentPage.key}
						onSelect={handleSelect}
						selectedValue={selectedValues[currentPage.key]}
					/>
				</div>
			)}

			{showProgress == 1 && (
				<Progress
					finalSelection={finalSelection}
          onDataUpdate={( data ) => { setProgressData( data ); setShowProgress( 2 ); }}
				/>
			)}

			{showProgress == 2 && (
				<Result
					dataKing={progressData.dataKing}
          saveGame={progressData.saveGame}
          finalSelection={finalSelection}
				/>
			)}

			{
				<div className="grid-item direction">
					<Direction
						onNext={nextPage}
						onPrev={prevPage}
						onSaved={savePage}
						disableSaved={pageIndex > 0}
						disablePrev={pageIndex === 0 || showProgress === 1}
						disableNext={
							pageIndex > allPages.length ||
							stop ||
							showProgress >= 1
						}
					/>
				</div>
			}
		</div>
	);
}

export default App;
