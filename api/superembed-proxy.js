// File: api/superembed-proxy.js
// v2: Enhanced error handling and logging.

export default async function handler(req, res) {
    console.log("SuperEmbed Proxy: Received request query:", req.query);

    const player_font = "Poppins";
    const player_bg_color = "000000";
    const player_font_color = "ffffff";
    const player_primary_color = "34cfeb";
    const player_secondary_color = "6900e0";
    const player_loader = 1;
    const preferred_server = 11;
    const player_sources_toggle_type = 2;
    const autoplay = req.query.autoplay === '1' ? 1 : 0;

    const { video_id, tmdb, season, episode, s, e } = req.query;

    const currentVideoId = video_id;
    const isTmdb = tmdb === '1' ? 1 : 0;
    const currentSeason = season || s || 0;
    const currentEpisode = episode || e || 0;

    if (!currentVideoId || String(currentVideoId).trim() === "") {
        console.error("SuperEmbed Proxy: Error - Missing video_id parameter.");
        return res.status(400).json({ error: "Missing video_id parameter." });
    }

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
    });

    const requestUrl = `https://getsuperembed.link/?${params.toString()}`;
    console.log("SuperEmbed Proxy: Requesting URL:", requestUrl);

    try {
        const playerResponse = await fetch(requestUrl, {
            timeout: 10000, // Increased timeout to 10 seconds
            redirect: 'manual', 
        });

        console.log(`SuperEmbed Proxy: Response from getsuperembed.link - Status: ${playerResponse.status}`);

        if (playerResponse.status >= 300 && playerResponse.status < 400 && playerResponse.headers.has('location')) {
            let finalPlayerUrl = playerResponse.headers.get('location');
            console.log("SuperEmbed Proxy: Redirect detected. Location:", finalPlayerUrl);
            
            if (autoplay === 1) {
                try {
                    const parsedUrl = new URL(finalPlayerUrl);
                    if (!parsedUrl.searchParams.has('autoplay')) {
                        parsedUrl.searchParams.set('autoplay', '1');
                    }
                    finalPlayerUrl = parsedUrl.toString();
                    console.log("SuperEmbed Proxy: Appended autoplay to redirect URL:", finalPlayerUrl);
                } catch (urlParseError) {
                    console.error("SuperEmbed Proxy: Error parsing final player URL for autoplay:", urlParseError.message, "Original URL:", finalPlayerUrl);
                }
            }
            
            res.writeHead(302, { Location: finalPlayerUrl });
            res.end();
            return;
        }

        const contentType = playerResponse.headers.get('content-type');
        console.log("SuperEmbed Proxy: Content-Type:", contentType);
        const responseText = await playerResponse.text(); // Get text for logging/checking

        if (playerResponse.ok) { // Status 200-299
            if (contentType && (contentType.includes('text/html') || contentType.includes('text/plain'))) {
                 // Check if the responseText itself is a URL (less common if redirect didn't happen)
                if (responseText.trim().toLowerCase().startsWith("https://")) {
                    let urlToRedirect = responseText.trim();
                    console.log("SuperEmbed Proxy: Response text is a URL:", urlToRedirect);
                     if (autoplay === 1) {
                        try {
                            const parsedUrl = new URL(urlToRedirect);
                            if (!parsedUrl.searchParams.has('autoplay')) {
                                parsedUrl.searchParams.set('autoplay', '1');
                            }
                            urlToRedirect = parsedUrl.toString();
                             console.log("SuperEmbed Proxy: Appended autoplay to text response URL:", urlToRedirect);
                        } catch (urlParseError) {
                             console.error("SuperEmbed Proxy: Error parsing text response URL for autoplay:", urlParseError.message, "Original URL:", urlToRedirect);
                        }
                    }
                    res.writeHead(302, { Location: urlToRedirect});
                    res.end();
                    return;
                }
                // If it's actual HTML content for the player
                console.log("SuperEmbed Proxy: Serving direct HTML content from getsuperembed.link.");
                res.setHeader('Content-Type', contentType || 'text/html'); // Use actual content type if available
                res.status(200).send(responseText);
                return;
            } else {
                 console.warn("SuperEmbed Proxy: OK response but unexpected Content-Type:", contentType, "Body:", responseText.substring(0, 500));
                 res.status(502).json({ error: "Failed to retrieve player: Unexpected content type from provider.", body: responseText.substring(0, 200) });
                 return;
            }
        } else { // Handle non-ok responses that were not redirects
             console.error(`SuperEmbed Proxy: Error from getsuperembed.link - Status: ${playerResponse.status}. Body: ${responseText.substring(0,500)}`);
             res.status(playerResponse.status).json({ error: `Player provider error: ${playerResponse.status}`, details: responseText.substring(0, 200) });
             return;
        }

    } catch (error) {
        console.error("SuperEmbed Proxy: CATCH BLOCK - Error fetching from getsuperembed.link -", error.name, error.message);
        if (error.type === 'request-timeout' || error.name === 'AbortError' || error.name === 'TimeoutError') {
             res.status(504).json({ error: "Request to player provider timed out." });
        } else {
             res.status(500).json({ error: "Internal server error while fetching player.", details: error.message });
        }
    }
}
