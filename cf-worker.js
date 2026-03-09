export default {
    async fetch(request, env) {
        const allowedOrigins = [
            "http://localhost:3000",
            "https://prathamk.com.np",
            "https://www.prathamk.com.np",
        ];

        const origin = request.headers.get("Origin");
        const isAllowedOrigin = allowedOrigins.includes(origin);

        const corsHeaders = {
            "Access-Control-Allow-Origin": isAllowedOrigin ? origin : allowedOrigins[0],
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        if (!isAllowedOrigin) {
            return new Response("Forbidden: Origin not allowed", { status: 403, headers: corsHeaders });
        }

        try {
            const targetUrl = 'https://pratham12111-la.hf.space/query/stream';

            const hfResponse = await fetch(targetUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${env.HF_TOKEN}`
                },
                body: request.body,
                redirect: "follow"
            });

            const responseHeaders = new Headers(hfResponse.headers);
            Object.keys(corsHeaders).forEach(key => responseHeaders.set(key, corsHeaders[key]));

            return new Response(hfResponse.body, {
                status: hfResponse.status,
                headers: responseHeaders
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: "Proxy Error", details: error.message }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
    }
};