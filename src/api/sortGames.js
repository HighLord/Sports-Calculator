// src/api/sortGames.js

export async function sortGame ( leagueCode )
{
    const url = `https://d.livescore.in/x/feed/df_hh_4_${leagueCode}`;

    try {
        const response = await fetch( url, {
            method: "GET",
            headers: { "x-fsign": "SW9D1eZo" },
        } );

        if ( !response.ok ) {
            const responseText = await response.text();
            throw new Error(
                `HTTP error! Status: ${response.status}, Response: ${responseText}`
            );
        }

        const matches = await response.text();

        // --- Extract Team Names ---
        const getNames = () =>
        {
            const lines = matches.replace( /¬/g, "÷" ).split( "÷" );
            const wordCount = [];
            let counts = 0;

            lines.forEach( ( line ) =>
            {
                if ( line.includes( "Last matches:" ) && counts < 3 ) {
                    counts += 1;
                    wordCount.push( line.replace( "Last matches: ", "" ) );
                }
            } );

            return {
                team1name: wordCount[0] || null,
                team2name: wordCount[1] || null,
            };
        };

        // --- Extract Historical Game Data ---
        const getTeams = () =>
        {
            const lines = matches.replace( /¬/g, "÷" ).split( "÷" );
            const hometeams = [];
            const awayteams = [];
            const homescores = [];
            const awayscores = [];
            const gameDate = [];
            const dateLimit = new Date( "2023-01-01" ).getTime() / 1000;
            let count = 0;

            for ( let i = 0; i < lines.length; i++ ) {
                const line = lines[i];

                if ( line.includes( "Last matches" ) ) {
                    count += 1;
                } else if ( line.match( /(\d+):(\d+)/ ) && count <= 2 ) {
                    const [_, homeScore, awayScore] = line.match( /(\d+):(\d+)/ );
                    const awayTeam = lines[i - 4] || "";
                    const homeTeam = lines[i - 12] || "";
                    const dTime = lines[i - 34] || "";
                    const dTime2 = lines[i + 16] || "";
                    const time100 =
                        dTime.length === 10 ? dTime : dTime2.length === 10 ? dTime2 : null;

                    // Skip invalid / old or image lines
                    if (
                        time100 > dateLimit &&
                        !/\b\w*\.png\w*\b/.test( homeTeam ) &&
                        !/\b\w*\.png\w*\b/.test( awayTeam )
                    ) {
                        hometeams.push( homeTeam );
                        awayteams.push( awayTeam );
                        homescores.push( homeScore );
                        awayscores.push( awayScore );
                        gameDate.push( time100 );
                    }
                }
            }

            return {
                hometeams,
                awayteams,
                homescores,
                awayscores,
                gameDate,
            };
        };

        // --- Final structured result ---
        return {
            names: getNames(),
            ...getTeams(),
        };
    } catch ( error ) {
        console.error( `Error fetching or processing data: ${error.message}` );
        throw error;
    }
}
