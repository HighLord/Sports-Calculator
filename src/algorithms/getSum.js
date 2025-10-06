// src/algorithms/getSum.js
export function getSum ( matchJson, gameMode )
{
    let sum1 = 0, sum2 = 0, iteration = 0;
    const numMatchesToIterate = Math.min( matchJson.team1.length, matchJson.team2.length );

    if ( numMatchesToIterate === 0 || gameMode === 0 ) return { iteration: 0, sum1: 0, sum2: 0 };

    for ( let i = 0; i < numMatchesToIterate && iteration < gameMode; i++ ) {
        const firstMatch = matchJson.team1[i];
        const secondMatch = matchJson.team2[i];

        const homeScore = Number( firstMatch[Object.keys( firstMatch )[0]] );
        const awayScore = Number( secondMatch[Object.keys( secondMatch )[0]] );

        if ( !isNaN( homeScore ) ) sum1 += homeScore;
        if ( !isNaN( awayScore ) ) sum2 += awayScore;

        iteration++;
    }

    return { iteration, sum1, sum2 };
}
