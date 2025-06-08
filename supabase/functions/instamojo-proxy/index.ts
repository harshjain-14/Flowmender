import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

interface CreatePaymentRequestBody {
  amount: number;
  purpose: string;
  buyerName: string;
  buyerEmail: string;
  redirectUrl: string;
  webhookUrl: string;
}

interface GetPaymentStatusBody {
  paymentRequestId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const INSTAMOJO_CLIENT_ID = Deno.env.get('INSTAMOJO_CLIENT_ID')
    const INSTAMOJO_CLIENT_SECRET = Deno.env.get('INSTAMOJO_CLIENT_SECRET')
    const INSTAMOJO_PRIVATE_SALT = Deno.env.get('INSTAMOJO_PRIVATE_SALT')

    if (!INSTAMOJO_CLIENT_ID || !INSTAMOJO_CLIENT_SECRET || !INSTAMOJO_PRIVATE_SALT) {
      throw new Error('Missing Instamojo environment variables')
    }

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    if (action === 'create-payment') {
      return await handleCreatePayment(req, INSTAMOJO_CLIENT_ID, INSTAMOJO_CLIENT_SECRET)
    } else if (action === 'payment-status') {
      return await handleGetPaymentStatus(req, INSTAMOJO_CLIENT_ID, INSTAMOJO_CLIENT_SECRET)
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in instamojo-proxy:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch('https://test.instamojo.com/v2/oauth2/token/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Instamojo token error:', errorText)
    throw new Error(`Failed to get access token: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

async function handleCreatePayment(req: Request, clientId: string, clientSecret: string) {
  const body: CreatePaymentRequestBody = await req.json()
  
  const accessToken = await getAccessToken(clientId, clientSecret)

  const response = await fetch('https://test.instamojo.com/v2/payment_requests/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      purpose: body.purpose,
      amount: body.amount.toString(),
      buyer_name: body.buyerName,
      email: body.buyerEmail,
      redirect_url: body.redirectUrl,
      webhook: body.webhookUrl,
      send_email: 'false',
      send_sms: 'false',
      allow_repeated_payments: 'false',
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error('Instamojo payment request error:', errorData)
    throw new Error(`Payment request failed: ${response.statusText}`)
  }

  const data = await response.json()
  
  return new Response(
    JSON.stringify({
      payment_request_id: data.id,
      payment_url: data.longurl,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleGetPaymentStatus(req: Request, clientId: string, clientSecret: string) {
  const body: GetPaymentStatusBody = await req.json()
  
  const accessToken = await getAccessToken(clientId, clientSecret)

  const response = await fetch(`https://test.instamojo.com/v2/payment_requests/${body.paymentRequestId}/`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get payment status: ${response.statusText}`)
  }

  const data = await response.json()
  
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}