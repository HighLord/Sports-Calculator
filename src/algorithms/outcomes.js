/**
 * Calculates the likely outcome between two teams based on computed stats.
 * 
 * @param {Object} calculatedJson - The object returned from predict()
 * @param {Object} matchJson - Original match data (teams and scores)
 * @param {Object} finalSelection - Object containing leagues, sportsIntensity, and sportsOptions
 * @returns {Object} outcome log
 */
export function outcomes ( calculatedJson, matchJson, finalSelection )
{
    const { highestGoals, mostGamesWon, percentageOfHOHWins, head2head } = calculatedJson;
    const { team1name, team2name } = matchJson.names;
    const { sportsIntensity, sportsOptions } = finalSelection || {};

    const sum1 = highestGoals?.sum1 || 0;
    const sum2 = highestGoals?.sum2 || 0;

    const score1 = mostGamesWon?.score1 || 0;
    const score2 = mostGamesWon?.score2 || 0;
    const draw1 = mostGamesWon?.draw || false;

    const master = percentageOfHOHWins?.master || 0;
    const draw2 = percentageOfHOHWins?.draw || false;

    const head2headValue = head2head?.highValue || 0;
    const draw3 = head2head?.draw || false;

    let home = 0;
    let away = 0;
    let result = null;

    if ( sportsOptions === "winner" || sportsOptions === "double_chance" ) {
        home +=
            ( score1 > score2 ) +
            ( sum1 > sum2 ) +
            ( master > sportsIntensity ) +
            ( head2headValue > sportsIntensity );

        away +=
            ( score1 < score2 ) +
            ( sum1 < sum2 ) +
            ( master < sportsIntensity * -1 ) +
            ( head2headValue < sportsIntensity * -1 );

        const homeWin = home > ( away + sportsIntensity ) && master > sportsIntensity && head2headValue > sportsIntensity;
        const awayWin = away > ( home + sportsIntensity ) && master < sportsIntensity * -1 && head2headValue < sportsIntensity * -1;

        result = homeWin ? true : awayWin ? false : null;
    }
    else if ( sportsOptions === "draw" ) {
        result = draw1 && draw2 && draw3 ? true : null;
    }

    const log = {
        team1: team1name,
        team2: team2name,
        sum1,
        sum2,
        score1,
        score2,
        master,
        head2head: head2headValue,
        result,
        home,
        away
    };

    // Attach result to calculatedJson (optional)
    calculatedJson.result = result;

    return log;
}
