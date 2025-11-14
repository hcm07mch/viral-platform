import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 중단 신청 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const body = await request.json();
    const { order_item_id, request_type, reason, details } = body;

    console.log('중단 신청 데이터:', { order_item_id, request_type, reason, details });

    if (!order_item_id || !request_type || !reason || reason.trim() === '') {
      console.log('필수 항목 누락:', { order_item_id, request_type, reason });
      return NextResponse.json({ error: '필수 항목을 입력해주세요' }, { status: 400 });
    }

    if (!['pause', 'cancel', 'refund'].includes(request_type)) {
      return NextResponse.json({ error: '유효하지 않은 요청 유형입니다' }, { status: 400 });
    }

    // order_item 소유권 확인
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .select('id, status, order_id, orders!inner(user_id)')
      .eq('id', order_item_id)
      .single();

    if (itemError || !orderItem) {
      return NextResponse.json({ error: '주문 항목을 찾을 수 없습니다' }, { status: 404 });
    }

    const orders = orderItem.orders as unknown as { user_id: string };
    if (orders.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    // 이미 처리중인 신청이 있는지 확인
    const { data: existingRequest } = await supabase
      .from('cancellation_requests')
      .select('id, status')
      .eq('order_item_id', order_item_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingRequest) {
      return NextResponse.json({ error: '이미 처리 대기중인 신청이 있습니다' }, { status: 400 });
    }

    // 중단 신청 생성
    const { data, error } = await supabase
      .from('cancellation_requests')
      .insert({
        order_item_id,
        user_id: user.id,
        request_type,
        reason,
        details,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data, message: '중단 신청이 접수되었습니다' });

  } catch (error) {
    console.error('중단 신청 생성 오류:', error);
    return NextResponse.json(
      { error: '신청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 특정 order_item의 중단 신청 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderItemId = searchParams.get('order_item_id');

    if (!orderItemId) {
      return NextResponse.json({ error: 'order_item_id가 필요합니다' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('cancellation_requests')
      .select('*')
      .eq('order_item_id', parseInt(orderItemId))
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });

  } catch (error) {
    console.error('중단 신청 조회 오류:', error);
    return NextResponse.json(
      { error: '조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
