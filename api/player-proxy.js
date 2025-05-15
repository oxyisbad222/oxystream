// File: api/player-proxy.js
// Proxies requests to the multiembed.mov player.

export default async function handler(req, res) {
    console.log("Player Proxy: Received request query:", req.query);

    const { video_id, tmdb, s, e, season, episode, autoplay: autoplayQuery } = req.query;

    const currentVideoId = video_id;
    const isTmdb = tmdb === '1' || tmdb === 'true'; // Ensure boolean check
    const currentSeason = s || season; // Accept both s and season
    const currentEpisode = e || episode; // Accept both e and episode
    const wantsAutoplay = autoplayQuery === '1'; // Check if frontend wants autoplay

    if (!currentVideoId || String(currentVideoId).trim() === "") {
        console.error("Player Proxy: Error - Missing video_id parameter.");
        return res.status(400).json({ error: "Missing video_id parameter." });
    }

    const params = new URLSearchParams();
    params.append('video_id', currentVideoId);

    if (isTmdb) {
        params.append('tmdb', '1');
    }
    if (currentSeason) {
        params.append('s', currentSeason);
    }
    if (currentEpisode) {
        params.append('e', currentEpisode);
    }
    // The multiembed.mov documentation does not specify an autoplay parameter for directstream.php.
    // Autoplay will primarily be controlled by the iframe's `allow` attribute on the frontend.
    // We won't add autoplay to the multiembed.mov URL itself unless their API supports it.

    const requestUrl = `https://multiembed.mov/directstream.php?${params.toString()}`;
    console.log("Player Proxy: Constructed multiembed.mov URL:", requestUrl);

    // Since multiembed.mov/directstream.php is meant to be pasted into an iframe,
    // we redirect the iframe's request to this URL.
    // The browser (handling the iframe's src request) will follow this redirect.
    try {
        // We don't need to fetch and then redirect. We can directly tell the client to go there.
        // This simplifies the proxy and relies on multiembed.mov to serve the correct content.
        res.writeHead(302, { Location: requestUrl });
        res.end();
    } catch (error) {
        console.error("Player Proxy: CATCH BLOCK - Error during redirect attempt:", error.name, error.message);
        res.status(500).json({ error: "Internal server error while preparing player redirect.", details: error.message });
    }
}
