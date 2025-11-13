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

    // 주문 항목 상세 조회 (order_items 테이블에서)
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        client_name,
        daily_qty,
        weeks,
        total_qty,
        unit_price,
        item_price,
        item_details,
        created_at,
        orders (
          id,
          product_id,
          product_name,
          status,
          user_id,
          created_at,
          products (
            unit
          )
        )
      `)
      .eq('id', id)
      .single();

    if (itemError || !orderItem) {
      console.error('주문 항목 조회 오류:', itemError);
      return NextResponse.json(
        { error: '주문 항목을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인 (해당 주문의 소유자인지)
    const order = Array.isArray(orderItem.orders) ? orderItem.orders[0] : orderItem.orders;
    if (order.user_id !== user.id) {
      return NextResponse.json(
        { error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // product_input_defs 조회
    const { data: inputDefs } = await supabase
      .from('product_input_defs')
      .select(`
        id,
        product_id,
        required,
        sort_order,
        input_field_templates (
          field_key,
          label,
          field_type
        )
      `)
      .eq('product_id', order.product_id)
      .order('sort_order', { ascending: true });

    // InputDef 포맷팅
    const formattedInputDefs = inputDefs?.map(def => {
      const template = Array.isArray(def.input_field_templates) 
        ? def.input_field_templates[0] 
        : def.input_field_templates;
      
      return {
        id: def.id,
        field_key: template?.field_key || '',
        label: template?.label || '',
        field_type: template?.field_type || 'TEXT'
      };
    }) || [];

    // 응답 데이터 구성
    const products = Array.isArray(order.products) ? order.products[0] : order.products;
    const itemDetail = {
      item_id: orderItem.id,
      order_id: order.id,
      order_number: `#${order.id.slice(0, 8)}`,
      product_name: order.product_name,
      client_name: orderItem.client_name,
      daily_qty: orderItem.daily_qty,
      weeks: orderItem.weeks,
      total_qty: orderItem.total_qty,
      unit_price: orderItem.unit_price,
      item_price: orderItem.item_price,
      status: order.status,
      created_at: orderItem.created_at || order.created_at,
      item_details: orderItem.item_details || {},
      unit: products?.unit || '건'
    };

    return NextResponse.json({
      item: itemDetail,
      inputDefs: formattedInputDefs
    });

  } catch (error) {
    console.error('주문 항목 상세 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
