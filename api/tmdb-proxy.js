// File: api/tmdb-proxy.js
// This is a Vercel Serverless Function (Node.js runtime)

// Import 'node-fetch' if you are using an older Node.js version on Vercel
// that doesn't have fetch built-in. For Node.js 18+ on Vercel, global fetch is available.
// If needed: const fetch = require('node-fetch');

export default async function handler(request, response) {
    // --- 1. Get the TMDB API Key from Environment Variables ---
    // In Vercel, you'd set an environment variable, e.g., TMDB_API_KEY_VALUE
    const apiKey = process.env.TMDB_API_KEY_VALUE;

    if (!apiKey) {
        console.error("TMDB API Key is not configured in environment variables.");
        return response.status(500).json({ error: "Server configuration error: TMDB API Key missing." });
    }

    // --- 2. Get Parameters from the Client Request ---
    // The client will send the TMDB endpoint and any specific query parameters.
    // We expect these as query parameters to our serverless function.
    // e.g., /api/tmdb-proxy?endpoint=movie/popular&page=1 or /api/tmdb-proxy?endpoint=search/multi&query=Inception

    const { endpoint, ...queryParams } = request.query;

    if (!endpoint) {
        return response.status(400).json({ error: "Missing 'endpoint' query parameter." });
    }

    // --- 3. Construct the Full TMDB API URL ---
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
    const searchParams = new URLSearchParams({
        ...queryParams, // Spread the rest of the query params from the client
        api_key: apiKey, // Add the API key securely on the server
    });
    const tmdbUrl = `${TMDB_BASE_URL}/${endpoint}?${searchParams.toString()}`;

    // --- 4. Make the Request to the TMDB API ---
    try {
        console.log(`Proxying request to TMDB: ${tmdbUrl}`); // Optional: for server-side logging
        const tmdbResponse = await fetch(tmdbUrl);

        // Check if the TMDB API request was successful
        if (!tmdbResponse.ok) {
            const errorData = await tmdbResponse.json().catch(() => ({})); // Try to get error details from TMDB
            console.error(`TMDB API Error: ${tmdbResponse.status} ${tmdbResponse.statusText}`, errorData);
            return response.status(tmdbResponse.status).json({ 
                error: `TMDB API Error: ${tmdbResponse.statusText}`,
                details: errorData 
            });
        }

        const data = await tmdbResponse.json();

        // --- 5. Return the Response from TMDB to the Client ---
        // Set CORS headers to allow your frontend to access this API route
        // Vercel handles this by default for same-origin, but explicit is good for clarity
        // or if your frontend might be on a different Vercel preview domain.
        response.setHeader('Access-Control-Allow-Origin', '*'); // Or specify your domain
        response.setHeader('Access-Control-Allow-Methods', 'GET');
        response.setHeader('Content-Type', 'application/json');
        
        return response.status(200).json(data);

    } catch (error) {
        console.error('Error in TMDB proxy function:', error);
        return response.status(500).json({ error: "Internal Server Error while contacting TMDB." });
    }
}
