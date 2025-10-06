// components/data/index.js
export const sportsType = [
    { value: "football", text: "Football" },
    { value: "basketball", text: "Basketball" },
    { value: "tennis", text: "Tennis" },
    { value: "tabletennis", text: "Table Tennis" },
    { value: "americanfootball", text: "American Football" },
    { value: "icehockey", text: "Ice Hockey" },
    { value: "volleyball", text: "Volley Ball" },
    { value: "handball", text: "HandBall" },
    { value: "baseball", text: "BaseBall" },
    { value: "badminton", text: "Badminton" },
    { value: "boxing", text: "Boxing" },
    { value: "mma", text: "MMA" },
    { value: "darts", text: "Darts" }
];

export const sportsTime = [
    { value: "today", text: "Today" },
    { value: "tomorrow", text: "Tomorrow" },
    { value: "next-tomorrow", text: "Next Tomorrow" }
];

export const sportsIntensity = [
    { value: "1", text: "Lax" },
    { value: "2", text: "Moderate" },
    { value: "3", text: "Strict" },
];

export const sportsAmount = [
    { value: "1", text: "Book 1 game" },
    { value: "2", text: "Book 2 games" },
    { value: "3", text: "Book 3 games" },
    { value: "4", text: "Book 4 games" },
    { value: "5", text: "Book 5 games" },
    { value: "10", text: "Book 10 games" },
    { value: "20", text: "Book 20 games" },
    { value: "30", text: "Book 30 games" },
    { value: "40", text: "Book 40 games" },
    { value: "50", text: "Book 50 games" }
];

export const sportsOdd = ( function ()
{
    const oddsOptions = [];
    for ( let Odds = 4.0; Odds >= 1.0; Odds -= 0.2 ) {
        oddsOptions.push( {
            value: Odds.toFixed( 1 ),
            text: `Less than ${Odds.toFixed( 1 )} Odds`
        } );
    }
    return oddsOptions;
} )();

export const sportsOptions = ( function ()
{
    const matchoption = [];
    matchoption.push(
        { value: 'winner', text: 'Winner' },
        { value: 'double_chance', text: 'Double Chance' },
        { value: 'draw', text: 'Draws' }
    );
    return matchoption;
} )();

export default sportsType;