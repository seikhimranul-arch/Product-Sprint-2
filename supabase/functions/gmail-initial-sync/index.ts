// ============================================================
// FintLer — gmail-initial-sync v3-compatible
// ============================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SyncRequest {
  user_id: string
  provider_token: string
  provider_refresh_token?: string
}

interface ParsedTransaction {
  amount: number
  type: 'debit' | 'credit'
  merchant: string
  bank_name: string
  account_last4: string
  transaction_date: string
  source_email_id: string
  category: string
}

const BANK_DOMAINS: Record<string, string> = {
  'alerts@hdfcbank.net': 'hdfc', 'alerts@hdfcbank.com': 'hdfc',
  'notify@icicibank.com': 'icici', 'alerts@icicibank.com': 'icici',
  'sbmops@sbi.co.in': 'sbi', 'alerts@sbi.co.in': 'sbi', 'donotreply@sbi.co.in': 'sbi',
  'alerts@axisbank.com': 'axis', 'alerts@axisbank.co.in': 'axis',
  'noreply@kotak.com': 'kotak', 'alerts@kotak.com': 'kotak',
  'donotreply@yesbank.in': 'yes', 'alerts@yesbank.in': 'yes',
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: ['swiggy', 'zomato', 'dominos', 'mcdonald', 'kfc', 'pizza', 'restaurant', 'cafe', 'biryani', 'food', 'dining', 'eats', 'burger', 'subway', 'haldiram', 'chaayos'],
  transport: ['uber', 'ola', 'rapido', 'metro', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'fastag'],
  shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa'],
  grocery: ['blinkit', 'zepto', 'instamart', 'bigbasket', 'dunzo', 'dmart'],
  entertainment: ['netflix', 'prime', 'hotstar', 'spotify', 'youtube', 'bookmyshow', 'pvr', 'inox'],
  utilities: ['electricity', 'water', 'gas', 'broadband', 'wifi', 'mobile', 'recharge', 'airtel', 'jio'],
  transfer: ['upi', 'neft', 'imps', 'rtgs'],
  subscription: ['subscription', 'membership', 'monthly', 'annual'],
  health: ['pharmacy', 'apollo', 'medplus', 'doctor', 'hospital', '1mg', 'pharmeasy'],
  investment: ['mutual fund', 'stocks', 'zerodha', 'groww', 'sip'],
}

function categorizeMerchant(merchant: string): string {
  const lower = (merchant || '').toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return category
  }
  return 'other'
}

function getDayOfWeek(date: Date): string {
  return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()]
}

function extractEmailBody(payload: any): string {
  if (!payload) return ''
  if (payload.body?.data) {
    try { return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/')) } catch { return '' }
  }
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        try { return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')) } catch { continue }
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        try { return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')) } catch { continue }
      }
    }
    for (const part of payload.parts) {
      const r = extractEmailBody(part)
      if (r) return r
    }
  }
  return ''
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim()
}

function parseWithRegex(body: string, fromEmail: string): ParsedTransaction | null {
  const bankName = BANK_DOMAINS[fromEmail.toLowerCase()] || 'unknown'
  const cleanBody = stripHtml(body)
  const amountMatch = cleanBody.match(/(?:Rs\.?|INR|₹)\s*([0-9][0-9,]*\.?[0-9]{0,2})/i)
  if (!amountMatch) return null
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''))
  if (isNaN(amount) || amount <= 0) return null

  const lower = cleanBody.toLowerCase()
  let type: 'debit' | 'credit' = 'debit'
  if (lower.includes('credited') || lower.includes('credit of') ||
      lower.includes('received') || lower.includes('deposited') ||
      lower.includes('refund')) type = 'credit'

  let accountLast4 = ''
  const accountMatch = cleanBody.match(
    /(?:a\/c|account|card|acct)(?:\s+no\.?)?(?:\s+ending)?(?:\s+in)?\s*\*+(\d{4})/i)
  if (accountMatch) accountLast4 = accountMatch[1]
  if (!accountLast4) {
    const xxMatch = cleanBody.match(/x{2,}(\d{4})/i)
    if (xxMatch) accountLast4 = xxMatch[1]
  }

  let rawMerchant = ''
  const vpaMatch = cleanBody.match(/(?:to|at|on)\s+([A-Za-z0-9][A-Za-z0-9_\-\.]{2,}(?:@[A-Za-z0-9]+)?)/i)
  if (vpaMatch) rawMerchant = vpaMatch[1].replace(/@.*$/, '')
  if (!rawMerchant) {
    const infoMatch = cleanBody.match(/Info\s*[:\-]\s*([^\n\r.;,]{3,50})/i)
    if (infoMatch) rawMerchant = infoMatch[1].trim()
  }
  if (!rawMerchant) {
    const byMatch = cleanBody.match(/\bby\s+([A-Z][A-Z\s&]{3,40})(?:\s+on|\s+for|\.|,)/i)
    if (byMatch) rawMerchant = byMatch[1].trim()
  }
  if (!rawMerchant) {
    const atMatch = cleanBody.match(/\bat\s+([A-Z][A-Z0-9\s&]{2,40}?)(?:\s+on|\s+for|\s+via|\.|,)/i)
    if (atMatch) rawMerchant = atMatch[1].trim()
  }
  if (!rawMerchant) {
    const upiMatch = cleanBody.match(/[a-z0-9._-]+@[a-z]+/i)
    if (upiMatch) rawMerchant = upiMatch[0].split('@')[0]
  }
  if (!rawMerchant || rawMerchant.length < 2) return null

  let transactedAt = new Date()
  const monthsMap: Record<string, number> = {
    jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
  }
  const dmyMatch = cleanBody.match(
    /(\d{1,2})[-\/\s]([A-Za-z]{3,9})[-\/\s](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?)?/)
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10)
    const month = monthsMap[dmyMatch[2].substring(0,3).toLowerCase()]
    let year = parseInt(dmyMatch[3], 10)
    if (year < 100) year += 2000
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0
    const ampm = dmyMatch[7]?.toLowerCase()
    let h24 = hour
    if (ampm === 'pm' && hour < 12) h24 += 12
    if (ampm === 'am' && hour === 12) h24 = 0
    const d = new Date(year, month, day, h24, minute)
    if (!isNaN(d.getTime())) transactedAt = d
  }

  const merchant = rawMerchant.toLowerCase().trim()
  return {
    amount, type, merchant, bank_name: bankName, account_last4: accountLast4,
    transaction_date: transactedAt.toISOString(),
    source_email_id: '', category: categorizeMerchant(merchant),
  }
}

async function parseWithGemini(body: string, apiKey: string, fromEmail: string): Promise<ParsedTransaction | null> {
  const cleanBody = stripHtml(body).substring(0, 2000)
  const prompt = `Extract transaction details from this Indian bank alert email.
Email From: ${fromEmail}
Email Body:
"""
${cleanBody}
"""
Return ONLY a JSON object:
{"amount":<number>,"type":"debit"|"credit","merchant":"<name>","account_last4":"<4 digits>","date_iso":"<ISO datetime>","category":"food|transport|shopping|grocery|entertainment|utilities|transfer|subscription|health|investment|other"}
If not a transaction, return: {"error":"not a transaction"}`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
        })})
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    if (parsed.error || !parsed.amount) return null
    const transactedAt = parsed.date_iso ? new Date(parsed.date_iso) : new Date()
    const validDate = isNaN(transactedAt.getTime()) ? new Date() : transactedAt
    return {
      amount: Number(parsed.amount),
      type: parsed.type === 'credit' ? 'credit' : 'debit',
      merchant: (parsed.merchant || 'unknown').toLowerCase(),
      bank_name: BANK_DOMAINS[fromEmail.toLowerCase()] || 'unknown',
      account_last4: parsed.account_last4 || '',
      transaction_date: validDate.toISOString(),
      source_email_id: '',
      category: parsed.category || 'other',
    }
  } catch (err) { console.error('Gemini parse error:', err); return null }
}

function computeStats(transactions: ParsedTransaction[]) {
  const debits = transactions.filter((t) => t.type === 'debit')
  const totalSpent = debits.reduce((s, t) => s + t.amount, 0)
  const byCategory: Record<string, number> = {}
  for (const t of debits) byCategory[t.category] = (byCategory[t.category] || 0) + t.amount
  const byDay: Record<string, number> = {}
  for (const t of debits) {
    const d = getDayOfWeek(new Date(t.transaction_date))
    byDay[d] = (byDay[d] || 0) + t.amount
  }
  const byHour: Record<number, number> = {}
  for (const t of debits) {
    const h = new Date(t.transaction_date).getHours()
    byHour[h] = (byHour[h] || 0) + t.amount
  }
  const byMerchant: Record<string, number> = {}
  for (const t of debits) byMerchant[t.merchant] = (byMerchant[t.merchant] || 0) + t.amount
  const topMerchants = Object.entries(byMerchant)
    .sort((a,b) => Number(b[1]) - Number(a[1])).slice(0, 10)
  return { totalSpent, debitCount: debits.length, transactionCount: transactions.length,
           byCategory, byDay, byHour, topMerchants }
}

async function generateInsights(stats: any, apiKey: string) {
  const fallback = {
    spending_personality: 'Steady Spender',
    personality_description: 'You have consistent spending patterns across the month.',
    summary: `You spent ₹${Math.round(stats.totalSpent).toLocaleString('en-IN')} across ${stats.debitCount} transactions.`,
    category_alert_title: 'Your top spending category deserves attention',
    category_alert_amount: Math.max(...Object.values(stats.byCategory).map(Number)),
    category_alert_category:
      Object.entries(stats.byCategory).sort((a,b) => Number(b[1]) - Number(a[1]))[0]?.[0] || 'other',
    behavioral_trigger: 'Moment of Impact',
    behavioral_trigger_detail: 'Open your dashboard to see when you tend to spend most.',
    micro_goal: 'Try a no-spend day this week.',
  }
  const prompt = `You are FintLer — warm, non-judgmental AI financial clarity engine for Indian millennials. NEVER use words like "overspend", "waste", "bad". Always empower.

Stats (90 days):
- Total spent: ₹${Math.round(stats.totalSpent)}
- Debit count: ${stats.debitCount}
- By category: ${JSON.stringify(stats.byCategory)}
- By day: ${JSON.stringify(stats.byDay)}
- By hour: ${JSON.stringify(stats.byHour)}
- Top merchants: ${JSON.stringify(stats.topMerchants)}

Return ONLY valid JSON:
{"spending_personality":"<2-3 word persona>","personality_description":"<one warm sentence>","summary":"<one sentence>","category_alert_title":"<short>","category_alert_amount":<number>,"category_alert_category":"<cat>","behavioral_trigger":"Moment of Impact","behavioral_trigger_detail":"<specific time/day pattern>","micro_goal":"<one small action>"}`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        })})
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return { ...fallback, ...JSON.parse(jsonMatch[0]) }
  } catch (err) { console.error('Insight error:', err) }
  return fallback
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { user_id, provider_token, provider_refresh_token }: SyncRequest = await req.json()
    if (!user_id || !provider_token) {
      throw new Error('Missing user_id or provider_token')
    }
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) throw new Error('GEMINI_API_KEY not set in Edge Function secrets')

    // Save tokens to profiles (with try/catch in case column is missing)
    try {
      await supabaseAdmin.from('profiles').update({
        gmail_sync_enabled: true,
      }).eq('id', user_id)
    } catch (e) { console.log('profile update skipped:', e) }

    // Save email_connections if table exists
    try {
      await supabaseAdmin.from('email_connections').upsert({
        user_id, provider: 'gmail',
        access_token: provider_token,
        refresh_token: provider_refresh_token || '',
        connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch (e) { console.log('email_connections skipped:', e) }

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const dateStr = ninetyDaysAgo.toISOString().split('T')[0].replace(/-/g, '/')
    const fromAddresses = Object.keys(BANK_DOMAINS).map(d => d).join(' OR from:')
    const query = `from:(${fromAddresses}) after:${dateStr}`
    console.log('Gmail query:', query)

    const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=200`
    const gmailResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${provider_token}` },
    })
    if (!gmailResponse.ok) {
      const errText = await gmailResponse.text()
      throw new Error(
        `Gmail API ${gmailResponse.status}. ` +
        `Usually means gmail.readonly scope not granted or token expired. ` +
        `Re-sign in. Raw: ${errText.substring(0, 300)}`
      )
    }
    const gmailData = await gmailResponse.json()
    const messages: { id: string }[] = gmailData.messages || []
    console.log(`Found ${messages.length} emails`)

    const transactions: ParsedTransaction[] = []
    let regexSuccess = 0, geminiSuccess = 0, failures = 0

    for (const msg of messages) {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${provider_token}` } })
        if (!msgRes.ok) { failures++; continue }
        const msgData = await msgRes.json()
        const headers = msgData.payload?.headers || []
        const fromRaw = headers.find((h: any) => h.name === 'From')?.value || ''
        const fromEmail = (fromRaw.match(/<(.+)>/) || ['', fromRaw])[1].toLowerCase().trim()
        const body = extractEmailBody(msgData.payload)
        if (!body) { failures++; continue }

        let parsed = parseWithRegex(body, fromEmail)
        if (parsed) { regexSuccess++ }
        else {
          parsed = await parseWithGemini(body, geminiKey, fromEmail)
          if (parsed) geminiSuccess++
          else { failures++; continue }
        }
        parsed.source_email_id = msg.id
        transactions.push(parsed)
      } catch (err) { console.error(err); failures++ }
    }
    console.log(`Parse: ${regexSuccess} regex, ${geminiSuccess} gemini, ${failures} failed`)

    if (transactions.length > 0) {
      const rows = transactions.map((t) => ({
        user_id, source_email_id: t.source_email_id,
        bank_name: t.bank_name, account_last4: t.account_last4,
        amount: t.amount, type: t.type, merchant: t.merchant,
        category: t.category, transaction_date: t.transaction_date,
        day_of_week: getDayOfWeek(new Date(t.transaction_date)),
        hour_of_day: new Date(t.transaction_date).getHours(),
      }))
      const { error: insertErr } = await supabaseAdmin
        .from('transactions')
        .upsert(rows, { onConflict: 'user_id,source_email_id', ignoreDuplicates: true })
      if (insertErr) throw insertErr
    }

    let insights = null
    if (transactions.length > 0) {
      const stats = computeStats(transactions)
      insights = await generateInsights(stats, geminiKey)
      await supabaseAdmin.from('insights').insert({
        user_id,
        spending_personality: insights.spending_personality,
        personality_description: insights.personality_description,
        summary: insights.summary,
        category_alert_title: insights.category_alert_title,
        category_alert_amount: insights.category_alert_amount,
        category_alert_category: insights.category_alert_category,
        behavioral_trigger: insights.behavioral_trigger,
        behavioral_trigger_detail: insights.behavioral_trigger_detail,
        micro_goal: insights.micro_goal,
        raw_ai_response: insights,
      })
      await supabaseAdmin.from('profiles').update({
        spending_personality: insights.spending_personality,
      }).eq('id', user_id)
    }

    return new Response(JSON.stringify({
      success: true, emails_found: messages.length,
      transactions_parsed: transactions.length,
      regex_success: regexSuccess, gemini_success: geminiSuccess,
      failures, insights,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err: any) {
    console.error('Sync error:', err)
    return new Response(JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
