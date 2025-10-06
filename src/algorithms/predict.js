// src/algorithms/predict.js
import { matchAllTeamNames } from "./matchAllTeamNames";
import { getSum } from "./getSum";
import { getScore } from "./getScore";
import { head2head } from "./head2head";
import { calculatePercentage } from "./calculatePercentage";

export function predict ( niceJson )
{
    const gameMode = Math.floor( Math.random() * ( 60 - 20 + 1 ) ) + 20;
    const matchJson = matchAllTeamNames( niceJson );
    const highestGoals = getSum( matchJson, gameMode );
    const mostGamesWon = getScore( matchJson, gameMode );
    const head2headResult = head2head( matchJson );
    const percentageOfHOHWins = calculatePercentage( matchJson, gameMode );

    return {
        highestGoals,
        mostGamesWon,
        percentageOfHOHWins,
        head2head: head2headResult
    };
}
