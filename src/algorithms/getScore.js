// src/algorithms/getScore.js
export function getScore ( matchJson, gameMode )
{
    const calculateScores = ( matches ) =>
    {
        let score = 0, draw = 0, iteration = 0;
        for ( let i = 0; i < matches.length && iteration < gameMode; i++ ) {
            const match = matches[i];
            const homeScore = Number( match[Object.keys( match )[0]] );
            const awayScore = Number( match[Object.keys( match )[1]] );
            if ( homeScore > awayScore ) score++;
            else if ( homeScore === awayScore ) draw++;
            iteration++;
        }
        return { score, draw, iteration };
    };

    const team1Result = calculateScores( matchJson.team1 );
    const team2Result = calculateScores( matchJson.team2 );

    return {
        iteration1: team1Result.iteration,
        iteration2: team2Result.iteration,
        draw: team1Result.draw + team2Result.draw >= team1Result.score && team1Result.draw + team2Result.draw >= team2Result.score,
        score1: team1Result.score,
        score2: team2Result.score
    };
}
