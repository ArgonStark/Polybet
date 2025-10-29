import { NextRequest, NextResponse } from 'next/server'

/**
 * Farcaster Frame Handler
 * This route handles frame interactions for Farcaster mini-apps
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  // Return the HTML frame
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="PolyBet - Trade on Polymarket" />
  <meta property="og:image" content="${baseUrl}/og-image.png" />
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${baseUrl}/og-image.png" />
  <meta property="fc:frame:button:1" content="Open PolyBet" />
  <meta property="fc:frame:post_url" content="${baseUrl}/frame" />
  <title>PolyBet</title>
</head>
<body>
  <script>
    window.location.href = "${baseUrl}";
  </script>
</body>
</html>`,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle frame button clicks
    if (body.untrustedData?.buttonIndex === 1) {
      // User clicked "Open PolyBet"
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      
      return NextResponse.redirect(`${baseUrl}`)
    }

    // Return updated frame
    return new NextResponse(
      JSON.stringify({
        type: 'message',
        message: 'Open PolyBet to start trading!',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Frame POST error:', error)
    return new NextResponse('Error processing frame', { status: 500 })
  }
}

