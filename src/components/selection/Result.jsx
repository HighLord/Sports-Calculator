import "./result.css";
import { useEffect, useState, useRef } from "react";
import { bookGame } from "../../api/booking";

export default function Result ( { dataKing, saveGame, finalSelection } )
{
    const { sportsType, sportsOdd } = finalSelection || {};
    const [bookingResults, setBookingResults] = useState( [] );
    const startedRef = useRef(false);

    const chunkObject = (obj, size) => {
		const entries = Object.entries(obj); // get array of [key, value]
		const result = [];

		for (let i = 0; i < entries.length; i += size) {
			const chunkEntries = entries.slice(i, i + size);
			result.push(Object.fromEntries(chunkEntries)); // convert back to object
		}

		return result;
	};


    useEffect( () =>
    {
        if ( startedRef.current ) return;
        startedRef.current = true;
        
        async function sendBooking ()
        {
            if (!dataKing || Object.keys(dataKing).length === 0) return;

			const chunks = chunkObject(dataKing, 50); // now chunks are objects
			const allResults = [];
            
            for ( let i = 0; i < chunks.length; i++ ) {
                const chunk = chunks[i];
                try {
					console.log(`Booking chunk ${i + 1}/${chunks.length}...`);
					const apiResult = await bookGame({
						dataKing: chunk,
						sportsType,
						sportsOdd,
					});

					/*const debugKeys = apiResult.debug;
					const gamesBookedValues = Object.values(apiResult.gamesBooked);
					const gamesBookedKeys = Object.keys(apiResult.gamesBooked);


					const firstArray = debugKeys.map((debugKey, idx) => ({
						key: debugKey,
						gameBooked: gamesBookedKeys[idx],
						odds: gamesBookedValues[idx], 
					}));
                    console.log(firstArray);*/
                    const firstArray = apiResult.debug.map((debugKey, idx) => {
						const selection = Object.values(chunk).find(
							(item) => item.key === debugKey
						);
						return {
							key: debugKey,
							gameBooked: Object.keys(apiResult.gamesBooked)[idx],
							odds: Object.values(apiResult.gamesBooked)[idx],
							home: selection?.home,
							away: selection?.away,
							time: selection?.time,
							outcome: selection?.outcome,
							league: sportsType,
						};
					});

                    
					const secondArray = {
						shareCode: apiResult.data.shareCode,
						shareURL: apiResult.data.shareURL,
						totalOdds: apiResult.totalOdds,
						League: sportsType,
					};

					allResults.push([firstArray, secondArray]);
				} catch ( err ) {
                    console.error( `Error booking chunk ${i + 1}:`, err.message );
                }
            }
            setBookingResults(allResults);

            console.log("All bookings done:", allResults);
		}
		sendBooking();
	}, [dataKing, sportsType, sportsOdd]);

    
    return (
		<div className="result-wrapper">
			{bookingResults.map((resultChunk, idx) => {
				const [games, shareInfo] = resultChunk;
				return (
					<div className="booking-card" key={idx}>
						<h3>Booking {idx + 1}</h3>
						<div className="games-row">
							{games.map((game) => (
								<div className="game-card" key={game.key}>
									<p>
										<strong>{game.home}</strong> vs{" "}
										<strong>{game.away}</strong>
									</p>
									<p>Outcome: {game.outcome}</p>
									<p>Time: {game.time}</p>
									<p>Odds: {game.odds}</p>
									<p>League: {game.league}</p>
									<div style={{ display: "none" }}>
										{game.key}
									</div>
								</div>
							))}
						</div>
						<button
							className="share-btn"
							onClick={() =>
								window.open(shareInfo.shareURL, "_blank")
							}>
							Go to Share Link ({shareInfo.shareCode})
						</button>
						<p>Total Odds: {shareInfo.totalOdds}</p>
					</div>
				);
			})}
		</div>
	);
}