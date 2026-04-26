"""Reverse proxy helpers — forward requests to downstream services."""
import httpx
from fastapi import Request, Response
from fastapi.responses import StreamingResponse


async def proxy_request(request: Request, target_url: str) -> Response:
    """Forwards an incoming request to a downstream service and streams the response."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = httpx.URL(
            target_url,
            params=dict(request.query_params),
        )
        body = await request.body()
        upstream = await client.request(
            method=request.method,
            url=url,
            headers={k: v for k, v in request.headers.items() if k.lower() != "host"},
            content=body,
        )

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=dict(upstream.headers),
        media_type=upstream.headers.get("content-type"),
    )
