import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // order_items 조회
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);

    if (itemsError) {
      console.error('주문 항목 조회 오류:', itemsError);
    }

    // product_input_definitions 조회
    const { data: inputDefs, error: inputDefsError } = await supabase
      .from('product_input_definitions')
      .select('*')
      .eq('product_id', order.product_id)
      .order('sort_order', { ascending: true });

    if (inputDefsError) {
      console.error('상품 정의 조회 오류:', inputDefsError);
    }

    // 시작일/종료일 계산
    const startDate = new Date(order.created_at);
    const startDateStr = startDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\. /g, '.').replace(/\.$/, '');

    const firstItem = items?.[0];
    const weeks = firstItem?.weeks || 0;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (weeks * 7));
    const endDateStr = endDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\. /g, '.').replace(/\.$/, '');

    return NextResponse.json({
      order: {
        id: order.id,
        order_id: `#${order.id.slice(0, 8)}`,
        product_name: order.product_name,
        status: order.status,
        start_date: startDateStr,
        end_date: endDateStr,
        period_text: `${startDateStr} ~ ${endDateStr}`,
        total_qty: order.quantity,
        total_price: order.total_price,
        created_at: order.created_at,
        order_details: order.order_details
      },
      items: items || [],
      inputDefs: inputDefs || []
    });

  } catch (error) {
    console.error('주문 상세 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
