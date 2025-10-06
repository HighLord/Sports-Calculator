// /src/api/booking.js

export async function bookGame ( { dataKing, sportsType, sportsOdd } )
{    
    try {
        const response = await fetch( "https://webappsng.vercel.app/api/sportbooking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify( {
                data: dataKing,
                game: sportsType,
                setOdd: sportsOdd,
            } ),
        } );

        if ( !response.ok ) {
            throw new Error( `HTTP error ${response.status}` );
        }

        const result = await response.json();
        return result;
    } catch ( error ) {
        console.error( "Booking request failed:", error.message );
        throw error;
    }
}
