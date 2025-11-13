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

    // 사용자의 주문 목록 조회 (orders 테이블에서 order_items 조인)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        product_name,
        quantity,
        total_price,
        status,
        created_at,
        products (
          unit
        ),
        order_items (
          id,
          client_name,
          daily_qty,
          weeks,
          total_qty,
          unit_price,
          item_price,
          item_details
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('주문 목록 조회 오류:', ordersError);
      return NextResponse.json(
        { error: '주문 목록 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 주문 데이터 포맷팅
    const formattedOrders = (orders || []).map((order) => {
      const products = Array.isArray(order.products) ? order.products[0] : order.products;
      const unit = products?.unit || '건';
      
      return {
        id: order.id,
        order_id: `#${order.id.slice(0, 8)}`,
        product_name: order.product_name || '상품명 없음',
        quantity: order.quantity || 0,
        total_price: order.total_price || 0,
        status: order.status as 'received' | 'pause' | 'running' | 'done',
        created_at: order.created_at,
        order_items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          order_id: order.id,
          client_name: item.client_name || '업체명 없음',
          daily_qty: item.daily_qty || 0,
          weeks: item.weeks || 0,
          total_qty: item.total_qty || 0,
          unit_price: item.unit_price || 0,
          item_price: item.item_price || 0,
          item_details: item.item_details || {},
          unit: unit
        }))
      };
    });

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
