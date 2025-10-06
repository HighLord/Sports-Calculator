export function h2h(matchJson) {
    const h2H = matchJson.teamHeads;
    let highValue = 0;
    let draw = 0;

    h2H.forEach(Match => {
        const homeTeam = Object.keys(Match)[0];
        const homeScore = Match[homeTeam];
        const awayTeam = Object.keys(Match)[1];
        const awayScore = Match[awayTeam];

        if (homeScore > awayScore) {
            highValue += 1;
        }
        if (awayScore > homeScore) {
            highValue -= 1;
        }
        if (homeScore === awayScore) {
            draw += 1;
        }
    });

    if (highValue > 0) {
        draw = draw > highValue ? true : false;
        highValue = 1;
    } else if (highValue < 0) {
        draw = draw * -1 > highValue ? true : false;
        highValue = -1;
    } else {
        draw = draw > highValue ? true : false;
        highValue = 0;
    }

    return { highValue, draw };
}