// src/algorithms/infoMessages.js
export function getInfoMessage ( pageIndex, selectedValues, matchesMessage )
{
    switch ( pageIndex ) {
        case 0:
            return "Select a game from the wheel and click next";
        case 1:
            return `Select a date for ${capitalize( selectedValues.sportsType )}`;
        case 2:
            return (
                matchesMessage ||
                "Select intensity level while we load data"
            );
        case 3:
            return (matchesMessage || `Select booking amount for ${selectedValues.sportsTime}'s ${selectedValues.sportsType}`);
        case 4:
            return "Select the Max amount of odds to go for";
        default:
            return "Select a game from the wheel and click next";
    }
}

function capitalize ( str = "" )
{
    return str.charAt( 0 ).toUpperCase() + str.slice( 1 );
}
