// File: api/watchmode-proxy.js
// This function acts as a proxy to the WatchMode API.

// Using Node's built-in fetch for Vercel environment

export default async function handler(req, res) {
    const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY; // Your WatchMode API key from Vercel env variables
    const WATCHMODE_BASE_URL = 'https://api.watchmode.com/v1';

    if (!WATCHMODE_API_KEY) {
        return res.status(500).json({ error: 'WatchMode API key is not configured on the server.' });
    }

    // Determine the WatchMode endpoint and parameters from the request
    // For example, the frontend might send a query like:
    // /api/watchmode-proxy?endpoint=sources&apiKey=[should_not_be_here_but_handled_by_proxy]
    // Or /api/watchmode-proxy?endpoint=title/tt0120336/sources&apiKey=...
    // Or /api/watchmode-proxy?endpoint=list-titles&source_ids=203,157&types=movie

    const { endpoint, ...queryParams } = req.query;

    if (!endpoint) {
        return res.status(400).json({ error: 'WatchMode API endpoint parameter is required.' });
    }

    // Remove apiKey from queryParams if it was mistakenly sent from client
    // The real API key is added securely from environment variables
    delete queryParams.apiKey; 
    delete queryParams.api_key;


    const queryString = new URLSearchParams({
        ...queryParams,
        apiKey: WATCHMODE_API_KEY, // Add the secure API key here
    }).toString();

    const urlToFetch = `${WATCHMODE_BASE_URL}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}?${queryString}`;
    // console.log("WatchMode Proxy: Fetching URL:", urlToFetch); // For debugging

    try {
        const watchmodeResponse = await fetch(urlToFetch);
        const data = await watchmodeResponse.json(); // WatchMode API typically returns JSON

        // Forward WatchMode's status code and response
        res.status(watchmodeResponse.status).json(data);

    } catch (error) {
        console.error('Error in WatchMode proxy:', error);
        res.status(500).json({
            error: 'Failed to fetch data from WatchMode API via proxy.',
            details: error.message
        });
    }
}
```

**Key aspects of this `api/watchmode-proxy.js`:**
* It expects your WatchMode API key to be set as an environment variable named `WATCHMODE_API_KEY` in your Vercel project.
* It takes an `endpoint` query parameter (e.g., `list-titles`, `title/343126/sources`, `sources`) and any other necessary WatchMode parameters.
* It constructs the full WatchMode API URL, appends your secure API key, and fetches the data.
* It returns the JSON response from WatchMode to your frontend.

Are you ready to proceed to the next step, which will involve modifying the `index.html` to use these new proxy endpoints and start integrating the WatchMode functionality (Y/
