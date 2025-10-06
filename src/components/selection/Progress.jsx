// src/components/selection/Progress.jsx
import "./Progress.css";
import { useEffect, useState, useRef } from "react";
import { sortGame } from "../../api/sortGames";
import { predict } from "../../algorithms/predict";
import { outcomes } from "../../algorithms/outcomes";
import { processResult } from "../../algorithms/processResult";

export default function Progress({ finalSelection, onDataUpdate }) {
	const { leagues } = finalSelection || {};
	const waterRef = useRef(null);
	const startedRef = useRef(false);
    const [fillLevel, setFillLevel] = useState( 0 );

	const shuffledLeagues = Object.entries(leagues)
		.map(([key, value]) => ({ key, value })) 
		.sort(() => Math.random() - 0.5);    

	const withTimeout = (promise, ms = 5000) =>
		Promise.race([
			promise,
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error("Timeout")), ms)
			),
		]);

	const chunkArray = (arr, size) => {
		const chunks = [];
		for (let i = 0; i < arr.length; i += size) {
			chunks.push(arr.slice(i, i + size));
		}
		return chunks;
	};

	useEffect(() => {
		if (!leagues || startedRef.current) return;
		startedRef.current = true;
        
		const totalLeagues = shuffledLeagues.length;

		const batches = chunkArray(shuffledLeagues, 10);

        ( async () =>
        {
            const dataKing = {};
            const saveGame = [];
            
            for ( let batchIndex = 0; batchIndex < batches.length; batchIndex++ )
            {
				const batch = batches[batchIndex];

				await Promise.allSettled(
                    batch.map( async ( code, index ) =>
                    {   
						const globalIndex = batchIndex * 10 + index;
						setFillLevel(((globalIndex + 1) * 300) / totalLeagues);

						try {
							const result = await withTimeout(
								sortGame(code.key),
								7000
                            );
                            
                            const response = predict( result );
                            const resultLog = outcomes( response, result, finalSelection );
                            const final = processResult( resultLog, finalSelection, code, globalIndex + 1 );
                            if ( final ) {
                                dataKing[`NO${globalIndex + 1}`] = final.data;
								saveGame.push(final.game);
                            }
						} catch (err) {
							console.warn(`⚠️ Skipped ${code} - ${err.message}`);
						}
					})
                );
                
				// Wait 1 second before next batch
				if (batchIndex < batches.length - 1) {
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
            }

            if ( onDataUpdate ) setTimeout( () => { onDataUpdate( { dataKing, saveGame } ) }, 5000);

		})();
    }, [shuffledLeagues, finalSelection, leagues, onDataUpdate] );

	useEffect(() => {
		if (waterRef.current) {
			waterRef.current.style.setProperty("--fill-top", `-${fillLevel}px`);
		}
	}, [fillLevel]);

	return (
		<div className="progress-container">
			<div className="water" ref={waterRef}></div>
		</div>
	);
}
