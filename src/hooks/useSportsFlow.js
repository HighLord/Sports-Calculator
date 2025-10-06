// src/hooks/useSportsFlow.js
import { useEffect, useState, useMemo } from "react";
import { getGames } from "../api/getGames";
import
{
    sportsType,
    sportsTime,
    sportsIntensity,
    sportsAmount,
    sportsOdd,
    sportsOptions,
} from "../components/data/index";

export default function useSportsFlow ()
{
    const allPages = useMemo( () => [
        { key: "sportsType", data: sportsType },
        { key: "sportsTime", data: sportsTime },
        { key: "sportsIntensity", data: sportsIntensity },
        { key: "sportsAmount", data: sportsAmount },
        { key: "sportsOdd", data: sportsOdd },
        { key: "sportsOptions", data: sportsOptions },
    ], [] );

    const [pageIndex, setPageIndex] = useState( 0 );
    const [selectedValues, setSelectedValues] = useState( {} );
    const [showProgress, setShowProgress] = useState( 0 );
    const [matchesMessage, setMatchesMessage] = useState( false );
    const [matchAmount, setMatchAmount] = useState( 0 );
    const [stop, setStop] = useState( false );
    const [finalSelection, setFinalSelection] = useState( null );
    const [leagues, setLeagues] = useState( null );


    const handleSelect = ( key, value ) =>
    {
        setSelectedValues( ( prev ) => ( { ...prev, [key]: value } ) );
    };

    useEffect( () =>
    {
        const currentPage = allPages[pageIndex];
        const currentKey = currentPage.key;
        if ( !selectedValues[currentKey] ) {
            const defaultValue = currentPage.data[0].value; // first item
            setSelectedValues( ( prev ) => ( {
                ...prev,
                [currentKey]: defaultValue,
            } ) );
        }
    }, [pageIndex, allPages, selectedValues] );

    useEffect( () =>
    {
        if ( pageIndex === 3 && matchAmount < selectedValues.sportsAmount ) {
            setMatchesMessage(
                `Only ${matchAmount} matches available. Please select a lower amount.`
            );
            setStop( true );
        }
        else if (pageIndex === 3){
            setMatchesMessage( false );
            setStop( false );
        }
    }, [pageIndex, matchAmount, selectedValues] );

    const nextPage = async () =>
    {
        const nextIndex = pageIndex + 1;
        if ( pageIndex == allPages.length - 1 ) {
            const final = {
                sportsType: selectedValues.sportsType || sportsType[0].value,
                sportsTime: selectedValues.sportsTime || sportsTime[0].value,
                sportsIntensity: selectedValues.sportsIntensity || sportsIntensity[0].value,
                sportsAmount: selectedValues.sportsAmount || sportsAmount[0].value,
                sportsOdd: selectedValues.sportsOdd || sportsOdd[0].value,
                sportsOptions: selectedValues.sportsOptions || sportsOptions[0].value,
                leagues: leagues || {},
            };

            setFinalSelection( final );
            setShowProgress( 1 );
            return;
        }
        if ( !stop ) setPageIndex( nextIndex );
        
        if ( nextIndex === 2 && !matchesMessage ) setStop( true );

        if ( nextIndex == 2 && !matchesMessage )
        {
            const gameValue = selectedValues.sportsType || sportsType[0].value;
            const date = selectedValues.sportsTime || sportsTime[0].value;

            const gameObj = sportsType.find(( item ) => item.value === gameValue );
            const gameText = gameObj ? gameObj.text : gameValue;

            try
            {
                const leagues = await getGames( gameValue, date );
                
                setLeagues( leagues );
                const totalMatches = Object.keys( leagues ).length;
                setMatchAmount( totalMatches );

                setMatchesMessage(
                    `${gameText} has ${totalMatches} matches available for ${date}`
                );

                setStop( totalMatches === 0 );
            } catch {
                setMatchesMessage(
                    "Your network is down and unable to make requests"
                );
            }
        }
    };

    const prevPage = () =>
    {
        if ( pageIndex === 0 ) return;
        if ( showProgress > 0 ) {
            setShowProgress( showProgress - 2 );
        } else {
            setMatchesMessage( false );
            setStop( false );
            setPageIndex( ( prev ) => prev - 1 );
        }
    };

    const savePage = () =>
    {
        return true
    }

    return {
        allPages,
        pageIndex,
        selectedValues,
        showProgress,
        setShowProgress,
        matchesMessage,
        handleSelect,
        nextPage,
        prevPage,
        savePage,
        stop,
        finalSelection,
    };
}
