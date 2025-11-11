import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 사용자의 주문 목록 조회 (orders 테이블에서)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('주문 목록 조회 오류:', ordersError);
      return NextResponse.json(
        { error: '주문 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 각 주문에 대한 order_items 조회 및 포맷팅
    const formattedOrders = await Promise.all(
      (orders || []).map(async (order) => {
        // order_items 조회
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);

        // 첫 번째 아이템의 정보를 대표로 사용
        const firstItem = items?.[0];

        // product_input_definitions에서 inputDefs 조회
        const { data: inputDefs } = await supabase
          .from('product_input_definitions')
          .select('*')
          .eq('product_id', order.product_id)
          .order('sort_order', { ascending: true });

        // 시작일: 주문 생성일
        const startDate = new Date(order.created_at);
        const startDateStr = startDate.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\. /g, '.').replace(/\.$/, '');

        // 종료일: 시작일 + (weeks * 7일)
        const weeks = firstItem?.weeks || 0;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (weeks * 7));
        const endDateStr = endDate.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).replace(/\. /g, '.').replace(/\.$/, '');

        return {
          id: order.id,
          order_id: `#${order.id.slice(0, 8)}`,
          client_name: firstItem?.client_name || '고객명 없음',
          product_name: order.product_name || '상품명 없음',
          daily_qty: firstItem?.daily_qty || 0,
          weeks: firstItem?.weeks || 0,
          total_qty: order.quantity || 0,
          start_date: startDateStr,
          end_date: endDateStr,
          status: order.status as 'received' | 'pause' | 'running' | 'done',
          details: firstItem?.item_details || {},
          inputDefs: inputDefs || [],
          created_at: order.created_at
        };
      })
    );

    return NextResponse.json({
      orders: formattedOrders
    });

  } catch (error) {
    console.error('주문 목록 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
