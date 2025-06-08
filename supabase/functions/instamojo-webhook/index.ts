import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get webhook payload as form data (Instamojo sends application/x-www-form-urlencoded)
    const formData = await req.formData()
    const data: Record<string, string> = {}
    
    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      data[key] = value.toString()
    }

    console.log('Webhook received:', data)

    // Extract MAC and remove it from data for verification
    const macProvided = data['mac']
    if (!macProvided) {
      console.error('No MAC provided in webhook')
      return new Response('No MAC provided', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Remove MAC from data before verification
    delete data['mac']

    // Sort data keys for MAC calculation (as per Instamojo documentation)
    const sortedKeys = Object.keys(data).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    const sortedValues = sortedKeys.map(key => data[key])
    const dataString = sortedValues.join('|')

    // Calculate MAC using HMAC-SHA1 with private salt
    const privateSalt = Deno.env.get('INSTAMOJO_PRIVATE_SALT') || '5465ca2c3ac14b19ae131868950546ca'
    
    // Create HMAC-SHA1 hash
    const encoder = new TextEncoder()
    const keyData = encoder.encode(privateSalt)
    const messageData = encoder.encode(dataString)
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
    const macCalculated = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Verify MAC
    if (macProvided.toLowerCase() !== macCalculated.toLowerCase()) {
      console.error('MAC mismatch:', { provided: macProvided, calculated: macCalculated })
      return new Response('MAC mismatch', { 
        status: 401, 
        headers: corsHeaders 
      })
    }

    console.log('MAC verification successful')

    // Extract payment information
    const {
      payment_id,
      payment_request_id,
      status,
      amount,
      currency,
      buyer: buyerEmail,
      buyer_name: buyerName,
      purpose
    } = data

    // Only process successful payments (status = "Credit")
    if (status !== 'Credit') {
      console.log('Payment not successful, status:', status)
      return new Response('Payment not successful', { 
        status: 200, 
        headers: corsHeaders 
      })
    }

    // Find the transaction in our database
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('payment_transactions')
      .select('*')
      .eq('instamojo_payment_request_id', payment_request_id)
      .single()

    if (transactionError || !transaction) {
      console.error('Transaction not found:', transactionError)
      return new Response('Transaction not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Check if already processed
    if (transaction.webhook_verified) {
      console.log('Webhook already processed for transaction:', transaction.id)
      return new Response('Already processed', { 
        status: 200, 
        headers: corsHeaders 
      })
    }

    // Update transaction with payment details
    const { error: updateError } = await supabaseClient
      .from('payment_transactions')
      .update({
        instamojo_payment_id: payment_id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        webhook_verified: true
      })
      .eq('id', transaction.id)

    if (updateError) {
      console.error('Error updating transaction:', updateError)
      return new Response('Error updating transaction', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    // Add credits to user account using RPC function
    const { error: creditsError } = await supabaseClient.rpc('add_user_credits', {
      p_user_id: transaction.user_id,
      p_credits_to_add: transaction.credits_purchased,
      p_transaction_id: transaction.id
    })

    if (creditsError) {
      console.error('Error adding credits:', creditsError)
      return new Response('Error adding credits', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    console.log(`Successfully processed payment: ${payment_id}, added ${transaction.credits_purchased} credits to user ${transaction.user_id}`)

    return new Response('Webhook processed successfully', {
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders
    })
  }
})