const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { provider_token } = await req.json()
    if (!provider_token) throw new Error('Missing provider_token')

    // Test 1: simple search for HDFC
    const r1 = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent('from:alerts@hdfcbank.net')}&maxResults=5`,
      { headers: { Authorization: `Bearer ${provider_token}` } }
    )
    const d1 = await r1.json()

    // Test 2: my full query (corrected syntax - no double "from:")
    const bankAddresses = [
      'alerts@hdfcbank.net', 'alerts@hdfcbank.com',
      'notify@icicibank.com', 'alerts@icicibank.com',
      'sbmops@sbi.co.in', 'alerts@sbi.co.in', 'donotreply@sbi.co.in',
      'alerts@axisbank.com', 'alerts@axisbank.co.in',
      'noreply@kotak.com', 'alerts@kotak.com',
      'donotreply@yesbank.in', 'alerts@yesbank.in',
    ]
    const query = `from:(${bankAddresses.join(' OR ')})`
    const r2 = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`,
      { headers: { Authorization: `Bearer ${provider_token}` } }
    )
    const d2 = await r2.json()

    // Get one sample email body if found
    let sampleBody = null
    if (d2.messages && d2.messages[0]) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${d2.messages[0].id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${provider_token}` } }
      )
      sampleBody = await msgRes.json()
    }

    return new Response(JSON.stringify({
      simple_hdfc_count: d1.messages ? d1.messages.length : 'error: ' + JSON.stringify(d1).substring(0, 300),
      full_query_count: d2.messages ? d2.messages.length : 'error: ' + JSON.stringify(d2).substring(0, 300),
      sample_email: sampleBody,
    }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
