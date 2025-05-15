export default async function handler(req, res) {
    const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY;
    const WATCHMODE_BASE_URL = 'https://api.watchmode.com/v1';

    if (!WATCHMODE_API_KEY) {
        console.error("WatchMode Proxy Error: WATCHMODE_API_KEY is not configured on the server.");
        return res.status(500).json({ error: 'WatchMode API key is not configured on the server.' });
    }

    const { endpoint, ...queryParams } = req.query;

    if (!endpoint) {
        console.error("WatchMode Proxy Error: WatchMode API endpoint parameter is required.");
        return res.status(400).json({ error: 'WatchMode API endpoint parameter is required.' });
    }

    delete queryParams.apiKey; 
    delete queryParams.api_key;

    const queryString = new URLSearchParams({
        ...queryParams,
        apiKey: WATCHMODE_API_KEY,
    }).toString();

    const urlToFetch = `${WATCHMODE_BASE_URL}/${endpoint.startsWith('/') ? endpoint.substring(1) : endpoint}?${queryString}`;
    
    console.log("WatchMode Proxy: Attempting to fetch URL:", urlToFetch);

    try {
        const watchmodeResponse = await fetch(urlToFetch, { timeout: 10000 }); // 10 second timeout
        
        console.log(`WatchMode Proxy: Response from WatchMode API - Status: ${watchmodeResponse.status}`);

        const responseText = await watchmodeResponse.text(); // Get text for better error inspection

        if (!watchmodeResponse.ok) {
            console.error(`WatchMode Proxy: Error from WatchMode API - Status: ${watchmodeResponse.status}, Body: ${responseText.substring(0, 500)}`);
            try {
                const errorJson = JSON.parse(responseText);
                return res.status(watchmodeResponse.status).json(errorJson);
            } catch (e) {
                return res.status(watchmodeResponse.status).json({ error: `WatchMode API error: ${watchmodeResponse.statusText}`, details: responseText.substring(0, 200) });
            }
        }
        
        // Attempt to parse as JSON, assuming WatchMode usually returns JSON
        try {
            const data = JSON.parse(responseText);
            console.log("WatchMode Proxy: Successfully fetched and parsed data for endpoint:", endpoint);
            return res.status(200).json(data);
        } catch (jsonError) {
            console.error("WatchMode Proxy: Error parsing JSON response from WatchMode API. Body:", responseText.substring(0, 500), "Error:", jsonError.message);
            return res.status(502).json({ error: 'Failed to parse WatchMode API response.', details: responseText.substring(0, 200) });
        }

    } catch (error) {
        console.error("WatchMode Proxy: CATCH BLOCK - Network or operational error:", error.name, error.message);
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            return res.status(504).json({ error: 'Request to WatchMode API timed out.' });
        }
        return res.status(500).json({
            error: 'Failed to fetch data from WatchMode API via proxy.',
            details: error.message
        });
    }
}
