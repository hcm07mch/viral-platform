import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 관리자용: 모든 중단 신청 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('관리자 API 인증 체크:', { user: user?.id, error: authError?.message });

    if (authError || !user) {
      console.log('인증 실패:', authError);
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    // 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    console.log('관리자 권한 체크:', { userId: user.id, tier: profile?.tier });

    if (!profile || profile.tier !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    }

    // URL 파라미터로 필터링
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, rejected, completed
    const requestType = searchParams.get('type'); // pause, cancel, refund

    let query = supabase
      .from('cancellation_requests')
      .select(`
        *,
        order:orders!cancellation_requests_order_item_id_fkey (
          id,
          product_name,
          user_id,
          total_price,
          product_id,
          quantity,
          order_details,
          products (
            id,
            name
          )
        ),
        user_profile:profiles!cancellation_requests_user_id_fkey (
          email,
          display_name
        ),
        processed_by_profile:profiles!cancellation_requests_processed_by_fkey (
          email,
          display_name
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (requestType) {
      query = query.eq('request_type', requestType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    console.log('Fetched cancellation requests:', JSON.stringify(data, null, 2));

    // 디버깅: 관계 데이터 확인
    if (data && data.length > 0 && !data[0].order_items) {
      const testOrderItemId = data[0].order_item_id;
      console.log('Testing order_item lookup for:', testOrderItemId);
      
      const { data: testOrderItem, error: testError } = await supabase
        .from('order_items')
        .select('*')
        .eq('id', testOrderItemId)
        .single();
      
      console.log('Direct order_items query result:', testOrderItem, testError);
    }

    if (data && data.length > 0 && !data[0].user_profile) {
      const testUserId = data[0].user_id;
      console.log('Testing profile lookup for:', testUserId);
      
      const { data: testProfile, error: testError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', testUserId)
        .single();
      
      console.log('Direct profiles query result:', testProfile, testError);
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('중단 신청 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
