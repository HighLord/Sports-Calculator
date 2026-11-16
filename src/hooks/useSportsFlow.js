// src/hooks/useSportsFlow.js
import { useEffect, useState, useMemo } from "react";
import { getGames } from "../engine/feed";
import { sportsType, sportsTime, sportsIntensity, sportsAmount, sportsOdd, sportsOptions, sportsMethod, drawSports } from "../components/data/index";

export default function useSportsFlow ()
{
    const [pageIndex, setPageIndex] = useState( 0 );
    const [selectedValues, setSelectedValues] = useState( {} );
    const [showProgress, setShowProgress] = useState( 0 ); // 0 wheel, 1 running, 2 results
    const [resultsTab, setResultsTab] = useState( "current" );
    const [matchesMessage, setMatchesMessage] = useState( false );
    const [matchAmount, setMatchAmount] = useState( 0 );
    const [stop, setStop] = useState( false );
    const [finalSelection, setFinalSelection] = useState( null );
    const [games, setGames] = useState( [] );

    const sport = selectedValues.sportsType || sportsType[0].value;
    // Double Chance and Draws only exist for sports that can end level.
    const marketOptions = drawSports.includes( sport ) ? sportsOptions : sportsOptions.slice( 0, 1 );

    const allPages = useMemo( () => [
        { key: "sportsType", data: sportsType },
        { key: "sportsTime", data: sportsTime },
        { key: "sportsIntensity", data: sportsIntensity },
        { key: "sportsAmount", data: sportsAmount },
        { key: "sportsOdd", data: sportsOdd },
        { key: "sportsOptions", data: marketOptions },
        { key: "sportsMethod", data: sportsMethod },
    ], [marketOptions] );

    const handleSelect = ( key, value ) => setSelectedValues( ( prev ) => ( { ...prev, [key]: value } ) );

    useEffect( () =>
    {
        const { key, data } = allPages[pageIndex];
        if ( !selectedValues[key] ) setSelectedValues( ( prev ) => ( { ...prev, [key]: data[0].value } ) );
    }, [pageIndex, allPages, selectedValues] );

    useEffect( () =>
    {
        if ( pageIndex === 3 && matchAmount < selectedValues.sportsAmount ) {
            setMatchesMessage( `Only ${matchAmount} matches available. Please select a lower amount.` );
            setStop( true );
        }
        else if ( pageIndex === 3 ) {
            setMatchesMessage( false );
            setStop( false );
        }
    }, [pageIndex, matchAmount, selectedValues] );

    const nextPage = async () =>
    {
        const nextIndex = pageIndex + 1;
        if ( pageIndex == allPages.length - 1 ) {
            const pick = ( key, data ) => ( data.some( ( d ) => d.value === selectedValues[key] ) ? selectedValues[key] : data[0].value );
            setFinalSelection( {
                sportsType: sport,
                sportsTime: pick( "sportsTime", sportsTime ),
                sportsIntensity: pick( "sportsIntensity", sportsIntensity ),
                sportsAmount: pick( "sportsAmount", sportsAmount ),
                sportsOdd: pick( "sportsOdd", sportsOdd ),
                sportsOptions: pick( "sportsOptions", marketOptions ),
                sportsMethod: pick( "sportsMethod", sportsMethod ),
            } );
            setResultsTab( "current" );
            setShowProgress( 1 );
            return;
        }
        if ( !stop ) setPageIndex( nextIndex );

        if ( nextIndex === 2 && !matchesMessage )
        {
            setStop( true );
            const date = selectedValues.sportsTime || sportsTime[0].value;
            const gameText = ( sportsType.find( ( item ) => item.value === sport ) || {} ).text || sport;
            try
            {
                const list = await getGames( sport, date );
                setGames( list );
                setMatchAmount( list.length );
                setMatchesMessage( `${gameText} has ${list.length} matches available for ${date}` );
                setStop( list.length === 0 );
            } catch {
                setMatchesMessage( "Your network is down and unable to make requests" );
            }
        }
    };

    const prevPage = () =>
    {
        if ( showProgress > 0 ) { setShowProgress( 0 ); return; }
        if ( pageIndex === 0 ) return;
        setMatchesMessage( false );
        setStop( false );
        setPageIndex( ( prev ) => prev - 1 );
    };

    // Opens the Results page on the Saved tab.
    const savePage = () => { setResultsTab( "saved" ); setShowProgress( 2 ); };

    return { allPages, pageIndex, selectedValues, showProgress, setShowProgress, resultsTab, matchesMessage, handleSelect, nextPage, prevPage, savePage, stop, finalSelection, games };
}
