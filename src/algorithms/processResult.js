export function processResult ( predictedOutcome, finalSelection, info, times ) 
{    
    const { team1, team2, result } = predictedOutcome;

    const { sportsType, sportsOptions } = finalSelection || {};

    const { key, value } = info || {};

    const time = Object.keys( value )[0];
    const league = Object.values( value )[0].league;
    const timestamp = Object.values( value )[0].timestamp;

    if ( result !== null )
    {
        let outcome = null;
        let statement = null;
        switch ( sportsType ) {
            case "football":
            case "icehockey":
            case "handball":
                if ( sportsOptions === "draw" ) {
                    outcome = "Draw";
                    statement = `${team1} to draw ${team2}`;
                    break;
                }
                else if ( sportsOptions === "winner" ) {
                    outcome = result ? "Home" : "Away";
                    statement = outcome === "Home" ? `${team1} to win ${team2}` : `${team2} to win ${team1}`;
                    break;
                }
                else if ( sportsOptions === "double_chance" ) {
                    outcome = result ? "Home or Draw" : "Draw or Away";
                    statement = outcome === "Home or Draw" ? `${team1} to win or draw ${team2}` : `${team2} to win or draw ${team1}`;
                }
                break;
            case "basketball":
            case "tennis":
            case "baseball":
            case "boxing":
            case "americanfootball":
            case "tabletennis":
            case "cricket":
            case "darts":
            case "volleyball":
            case "badminton":
            case "mma":
                outcome = result ? "Home" : "Away";
                statement = outcome === "Home" ? `${team1} to win ${team2}` : `${team2} to win ${team1}`;
                break;
            default:
                break;
        }
        const date = new Date( timestamp * 1000 );
        const options = { hour: '2-digit', minute: '2-digit', hour12: true };
        const formattedTime = date.toLocaleTimeString( 'en-US', options );

        const data =
        {
            "key": key,
            "home": team1,
            "away": team2,
            "time": formattedTime,
            "outcome": outcome,
            "gameNo": times
        };

        const game =
        {
            num: times,
            key,
            time,
            league,
            statement
        };

        return ( {
            data: data,
            game: game,
            log: predictedOutcome
        } );
    }
    return false;
}