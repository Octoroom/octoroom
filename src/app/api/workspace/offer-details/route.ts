import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('offerId');
    const propertyId = searchParams.get('propertyId');
    const agentId = searchParams.get('agentId'); // Optional check

    if (!offerId || !propertyId) {
      return NextResponse.json({ error: 'Missing offerId or propertyId' }, { status: 400 });
    }

    // 1. Fetch offer using admin client (bypasses RLS)
    const { data: offer, error: offerError } = await supabaseAdmin
      .from('octo_offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (offerError) throw offerError;

    // 2. Fetch property details
    const { data: propertyData, error: propError } = await supabaseAdmin
      .from('octo_properties')
      .select('title, address_name, author_id')
      .eq('id', propertyId)
      .single();

    if (propError) throw propError;

    // (Optional) Check if agentId matches the author_id of the property for security
    // if (agentId && propertyData.author_id !== agentId) {
    //   return NextResponse.json({ error: 'Unauthorized to view this offer' }, { status: 403 });
    // }

    return NextResponse.json({
      ...offer,
      properties: propertyData || { address_name: 'Unknown Address' }
    });

  } catch (error: any) {
    console.error('Failed to load offer details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
