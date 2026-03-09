import { NextRequest, NextResponse } from 'next/server'

/**
 * CORS Proxy Endpoint
 * Fetches images from external URLs and proxies them to bypass CORS restrictions
 * Only supports TMDB and direct image URLs to prevent abuse
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      )
    }

    // Validate URL to prevent SSRF attacks - only allow HTTPS and specific domains
    const urlObj = new URL(url)
    const allowedDomains = [
      'image.tmdb.org',
      'www.themoviedb.org',
      'images.plex.tv',
      'poster.imax.com',
    ]

    const isAllowed = allowedDomains.some((domain) =>
      urlObj.hostname.includes(domain)
    )

    if (!isAllowed || urlObj.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'URL not allowed' },
        { status: 403 }
      )
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      )
    }

    // Get the content type
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Read the response as a buffer
    const buffer = await response.arrayBuffer()

    // Return the image with proper CORS headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    })
  } catch (error) {
    console.error('[CORS Proxy Error]', error)
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
