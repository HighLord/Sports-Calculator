// src/algorithms/head2head.js
export function head2head ( matchJson )
{
    const h2H = matchJson.teamHeads;
    let add = 0;

    const { highValue, draw } = h2H.slice().reverse().reduce( ( acc, Match ) =>
    {
        const homeScore = Number( Match[Object.keys( Match )[0]] );
        const awayScore = Number( Match[Object.keys( Match )[1]] );

        if ( homeScore > awayScore ) add++, acc.highValue += add;
        else if ( awayScore > homeScore ) add++, acc.highValue -= add;
        else acc.draw++;

        return acc;
    }, { highValue: 0, draw: 0 } );

    return { highValue, draw: draw > Math.abs( highValue ) };
}
