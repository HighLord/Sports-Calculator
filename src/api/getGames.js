// src/api/getGames.js
export async function getGames ( game, date )
{
    const dateMapping = {
        "today": 0,
        "tomorrow": 1,
        "next-tomorrow": 2,
    };

    const gameMapping = {
        football: 1,
        tennis: 2,
        basketball: 3,
        icehockey: 4,
        americanfootball: 5,
        baseball: 6,
        handball: 7,
        volleyball: 12,
        darts: 14,
        boxing: 16,
        badminton: 21,
        tabletennis: 25,
        mma: 28,
    };

    if ( !( date in dateMapping ) || !( game in gameMapping ) ) {
        throw new Error( "Invalid game or date" );
    }

    const dateIndex = dateMapping[date];
    const gameIndex = gameMapping[game];
    const url = `https://d.livescore.in/x/feed/f_${gameIndex}_${dateIndex}_1_en_4`;

    const controller = new AbortController();
    const timeoutId = setTimeout( () => controller.abort(), 8000 );

    try {
        const response = await fetch( url, {
            method: "GET",
            headers: { "x-fsign": "SW9D1eZo" },
            signal: controller.signal,
        } );

        if ( !response.ok ) throw new Error( response.status );

        const matches = await response.text();
        const lines = matches.replace( /÷/g, "<br>" ).split( "<br>" );
        const leagues = {};
        const currentTimestamp = Math.floor( Date.now() / 1000 );

        let codes1, league, codes2;

        lines.forEach( ( line ) =>
        {
            const codes1Match = line.match( /(\w+)¬AD(?!\w)/ );
            if ( codes1Match ) codes1 = codes1Match[1];
            else if ( line.match( /^(.*?¬ZEE.*)$/ ) ) league = line.replace( /¬ZEE/g, "" );
            else {
                const timeMatch = line.match( /(\w+)¬ADE(?!\w)/ );
                if ( timeMatch ) {
                    codes2 = Number(timeMatch[1]);
                    if ( currentTimestamp < codes2 ) {
                        const nextDateTime = new Date( codes2 * 1000 );
                        const currentDate = new Date( currentTimestamp * 1000 ).toISOString().split( "T" )[0];
                        const nextDate = nextDateTime.toISOString().split( "T" )[0];

                        const options = { hour: "2-digit", minute: "2-digit" };
                        let displayTime;
                        if ( currentDate !== nextDate )
                            displayTime = nextDateTime.toDateString() + " : " + nextDateTime.toLocaleTimeString( undefined, options );
                        else displayTime = "Today : " + nextDateTime.toLocaleTimeString( undefined, options );

                        if ( !leagues[codes1] ) leagues[codes1] = {};
                        leagues[codes1][displayTime] =
                        {
                            league: league,
                            timestamp: codes2,
                        }
                    }
                }
            }
        } );

        // Filter out empty leagues
        const filteredLeagues = Object.fromEntries(
            Object.entries( leagues ).filter( ( [v] ) => Object.keys( v ).length > 0 )
        );

        return filteredLeagues;
    }  finally {
        clearTimeout( timeoutId );
    }
}
