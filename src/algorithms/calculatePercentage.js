// src/algorithms/calculatePercentage.js
export function calculatePercentage ( matchJson, gameMode )
{
    let master = 0, limit = 0, draw = 0;
    const checkedAlready = new Set();
    const minNumber = Math.min( matchJson.team1.length, matchJson.team2.length );

    for ( let i = 0; i < minNumber; i++ ) {
        const firstMatch = matchJson.team1[i];
        const homeScore1 = Number( firstMatch[Object.keys( firstMatch )[0]] );
        const awayScore1 = Number( firstMatch[Object.keys( firstMatch )[1]] );

        for ( let j = 0; j < minNumber; j++ ) {
            const secondMatch = matchJson.team2[j];
            const homeScore2 = Number( secondMatch[Object.keys( secondMatch )[0]] );
            const awayScore2 = Number( secondMatch[Object.keys( secondMatch )[1]] );
            const awayTeam1 = Object.keys( firstMatch )[1];
            const awayTeam2 = Object.keys( secondMatch )[1];

            if ( awayTeam1 === awayTeam2 && !checkedAlready.has( awayTeam1 ) ) {
                checkedAlready.add( awayTeam1 );

                if ( homeScore1 > awayScore1 ) master++;
                if ( homeScore2 > awayScore2 ) master--;
                if ( homeScore1 === 0 && homeScore2 === 0 ) draw++;

                limit++;
                if ( limit >= gameMode ) break;
            }
        }
        if ( limit >= gameMode ) break;
    }

    return { master, draw: draw > Math.abs( master ) };
}
