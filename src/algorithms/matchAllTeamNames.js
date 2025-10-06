// src/algorithms/matchAllTeamNames.js
export function matchAllTeamNames ( niceJson )
{
    const { names, hometeams, awayteams, homescores, awayscores, gameDate } = niceJson;
    const team1name = names.team1name;
    const team2name = names.team2name;

    const team1 = [];
    const team2 = [];
    const teamHeads = [];

    const maxNumber = Math.max( hometeams.length, awayteams.length );

    const addMatch = ( array, homeTeam, homeScore, awayTeam, awayScore, date ) =>
    {
        array.push( { [homeTeam]: homeScore, [awayTeam]: awayScore, date } );
    };

    const addUniqueMatch = ( array, homeTeam, homeScore, awayTeam, awayScore, date ) =>
    {
        if ( !array.find( obj =>
            obj[homeTeam] === homeScore &&
            obj[awayTeam] === awayScore &&
            obj.date === date
        ) ) {
            addMatch( array, homeTeam, homeScore, awayTeam, awayScore, date );
        }
    };

    for ( let index = 0; index < maxNumber; index++ ) {
        const homeTeam = hometeams[index];
        const awayTeam = awayteams[index];
        const homeScore = Number( homescores[index] );
        const awayScore = Number( awayscores[index] );
        const date = gameDate[index];

        if ( team1name === homeTeam ) {
            if ( awayTeam !== team2name ) addMatch( team1, homeTeam, homeScore, awayTeam, awayScore, date );
            else addUniqueMatch( teamHeads, homeTeam, homeScore, awayTeam, awayScore, date );
        }
        if ( team1name === awayTeam ) {
            if ( homeTeam !== team2name ) addMatch( team1, awayTeam, awayScore, homeTeam, homeScore, date );
            else addUniqueMatch( teamHeads, awayTeam, awayScore, homeTeam, homeScore, date );
        }
        if ( team2name === homeTeam ) {
            if ( awayTeam !== team1name ) addMatch( team2, homeTeam, homeScore, awayTeam, awayScore, date );
            else addUniqueMatch( teamHeads, homeTeam, homeScore, awayTeam, awayScore, date );
        }
        if ( team2name === awayTeam ) {
            if ( homeTeam !== team1name ) addMatch( team2, awayTeam, awayScore, homeTeam, homeScore, date );
            else addUniqueMatch( teamHeads, awayTeam, awayScore, homeTeam, homeScore, date );
        }
    }

    return { team1, team2, teamHeads };
}
