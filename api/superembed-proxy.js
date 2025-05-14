// File: api/superembed-proxy.js
// This function replicates the logic of se_player.php for Vercel serverless environment.

// Using Node's built-in fetch for Vercel environment
// If deploying elsewhere or using an older Node version, you might need 'node-fetch'.

export default async function handler(req, res) {
    // Player settings from your PHP script (can be customized here or passed as env vars)
    const player_font = "Poppins"; // Google Font name, spaces replaced with +
    const player_bg_color = "000000"; // Background color (HEX without #)
    const player_font_color = "ffffff"; // Font color (HEX without #)
    const player_primary_color = "34cfeb"; // Primary color (HEX without #)
    const player_secondary_color = "6900e0"; // Secondary color (HEX without #)
    const player_loader = 1; // Loader animation (1-10)
    const preferred_server = 11; // Preferred server number (0 for no preference)
    const player_sources_toggle_type = 2; // Source list style (1 or 2)
    const autoplay = req.query.autoplay === '1' ? 1 : 0; // Check for autoplay parameter

    // Extract video identification parameters from the request query
    const { video_id, tmdb, season, episode, s, e } = req.query;

    const currentVideoId = video_id;
    const isTmdb = tmdb === '1' ? 1 : 0; // Default to 0 if not '1'
    const currentSeason = season || s || 0;
    const currentEpisode = episode || e || 0;

    if (!currentVideoId || String(currentVideoId).trim() === "") {
        return res.status(400).json({ error: "Missing video_id parameter." });
    }

    // Construct the request URL for getsuperembed.link
    const params = new URLSearchParams({
        video_id: currentVideoId,
        tmdb: isTmdb,
        season: currentSeason,
        episode: currentEpisode,
        player_font: player_font,
        player_bg_color: player_bg_color,
        player_font_color: player_font_color,
        player_primary_color: player_primary_color,
        player_secondary_color: player_secondary_color,
        player_loader: player_loader,
        preferred_server: preferred_server,
        player_sources_toggle_type: player_sources_toggle_type,
        // Note: getsuperembed.link might not support an 'autoplay' param directly.
        // Autoplay is usually handled by the iframe 'allow' attribute and player's internal logic.
        // We pass it along in case their backend uses it, but primary control is via iframe attributes.
    });

    const requestUrl = `https://getsuperembed.link/?${params.toString()}`;

    try {
        // Fetch the player URL/content from getsuperembed.link
        const playerResponse = await fetch(requestUrl, {
            timeout: 7000, // 7 seconds timeout
            redirect: 'manual', // We want to see the redirect URL if one is given
        });

        // Check if getsuperembed.link wants to redirect us
        if (playerResponse.status >= 300 && playerResponse.status < 400 && playerResponse.headers.has('location')) {
            const finalPlayerUrl = playerResponse.headers.get('location');
            // Append autoplay=1 to the final player URL if it's not already there and if requested
            // This is a best-effort attempt; the player itself must support it.
            let urlToRedirect = finalPlayerUrl;
            if (autoplay === 1) {
                try {
                    const parsedUrl = new URL(finalPlayerUrl);
                    if (!parsedUrl.searchParams.has('autoplay')) {
                        parsedUrl.searchParams.set('autoplay', '1');
                    }
                    urlToRedirect = parsedUrl.toString();
                } catch (urlParseError) {
                    console.error("SuperEmbed Proxy: Error parsing final player URL for autoplay:", urlParseError);
                    // Proceed with the original finalPlayerUrl if parsing fails
                }
            }
            
            // Redirect the client (iframe) to the actual player URL
            res.writeHead(302, { Location: urlToRedirect });
            res.end();
            return;
        }

        // If no redirect, check if the response is text (potentially an error message or the player page itself)
        const contentType = playerResponse.headers.get('content-type');
        if (contentType && (contentType.includes('text/html') || contentType.includes('text/plain'))) {
            const playerPageContent = await playerResponse.text();
            if (playerPageContent.toLowerCase().includes("https://")) { // Heuristic: if it's just a URL string
                 // This case is less likely if the above redirect check worked, but as a fallback.
                let urlToRedirect = playerPageContent.trim();
                 if (autoplay === 1) {
                    try {
                        const parsedUrl = new URL(urlToRedirect);
                        if (!parsedUrl.searchParams.has('autoplay')) {
                            parsedUrl.searchParams.set('autoplay', '1');
                        }
                        urlToRedirect = parsedUrl.toString();
                    } catch (urlParseError) {
                         console.error("SuperEmbed Proxy: Error parsing text response URL for autoplay:", urlParseError);
                    }
                }
                res.writeHead(302, { Location: urlToRedirect});
                res.end();
                return;
            }
            // If it's actual HTML content for the player, serve it directly
            // This would mean getsuperembed.link sometimes returns the player page directly
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(playerPageContent);
            return;
        }
        
        // If the response was not a redirect and not text, it's an unexpected format or error
        console.error("SuperEmbed Proxy: Unexpected response from getsuperembed.link. Status:", playerResponse.status, "ContentType:", contentType);
        res.status(502).json({ error: "Failed to retrieve player: Unexpected response from provider." });

    } catch (error) {
        console.error("SuperEmbed Proxy: Error fetching from getsuperembed.link -", error.message);
        if (error.type === 'request-timeout' || (error.name && error.name === 'AbortError')) { // Node-fetch timeout might be AbortError
             res.status(504).json({ error: "Request to player provider timed out." });
        } else {
             res.status(500).json({ error: "Internal server error while fetching player.", details: error.message });
        }
    }
}
```

**Key changes and considerations in this `api/superembed-proxy.js`:**
* It uses the player settings (font, colors, etc.) directly from the values you provided in the PHP script.
* It extracts `video_id`, `tmdb`, `season`, and `episode` from the query parameters.
* It constructs the URL for `getsuperembed.link`.
* It attempts to fetch the player. If `getsuperembed.link` provides a redirect (`Location` header), this function will redirect the client (your iframe) to that new player URL.
* If `getsuperembed.link` returns HTML content directly, this function will serve that HTML.
* It includes basic error handling and a timeout.
* It attempts to append `autoplay=1` to the *final* player URL if autoplay was requested from the frontend. This is a best-effort, as the ultimate player must support this parameter.

Are you ready to proceed to the next step (Y/
