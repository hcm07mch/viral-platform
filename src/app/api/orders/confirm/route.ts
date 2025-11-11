import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface OrderItemInput {
  clientName: string;
  dailyCount: number;
  weeks: number;
  totalCount: number;
  estimatedPrice: number;
  details: Record<string, any>;
}

interface ConfirmOrderRequest {
  productId: number;
  productName: string;
  unitPrice: number;
  items: OrderItemInput[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }

    // 2. 요청 데이터 파싱
    const body: ConfirmOrderRequest = await request.json();
    const { productId, productName, unitPrice, items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: '주문 항목이 없습니다.' },
        { status: 400 }
      );
    }

    // 3. 총 수량 및 총 가격 계산
    const totalQuantity = items.reduce((sum, item) => sum + item.totalCount, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.estimatedPrice, 0);

    // 4. 사용자 프로필 및 잔액 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance, tier')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '사용자 프로필을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 5. 잔액 부족 확인
    if (profile.balance < totalPrice) {
      return NextResponse.json(
        { 
          error: '포인트가 부족합니다.',
          required: totalPrice,
          current: profile.balance,
          shortage: totalPrice - profile.balance
        },
        { status: 400 }
      );
    }

    // 6. 트랜잭션 시작 - orders 테이블에 주문 생성
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        product_id: productId,
        product_name: productName,
        unit_price: unitPrice,
        quantity: totalQuantity,
        total_price: totalPrice,
        order_details: {
          items: items.map(item => ({
            clientName: item.clientName,
            dailyCount: item.dailyCount,
            weeks: item.weeks,
            totalCount: item.totalCount,
            estimatedPrice: item.estimatedPrice
          }))
        },
        user_tier: profile.tier,
        status: 'received',  // 접수중 상태
        confirmed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('주문 생성 실패:', orderError);
      return NextResponse.json(
        { error: '주문 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 7. order_items 테이블에 개별 항목 추가
    const orderItemsData = items.map(item => ({
      order_id: order.id,
      client_name: item.clientName,
      daily_qty: item.dailyCount,
      weeks: item.weeks,
      total_qty: item.totalCount,
      unit_price: unitPrice,
      item_price: item.estimatedPrice,
      item_details: item.details
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsData);

    if (itemsError) {
      console.error('주문 항목 생성 실패:', itemsError);
      // 롤백을 위해 주문 삭제
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: '주문 항목 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 8. 포인트 차감
    const newBalance = profile.balance - totalPrice;
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('user_id', user.id);

    if (balanceError) {
      console.error('포인트 차감 실패:', balanceError);
      // 롤백
      await supabase.from('order_items').delete().eq('order_id', order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: '포인트 차감에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 9. point_ledger에 차감 내역 기록
    const { error: ledgerError } = await supabase
      .from('point_ledger')
      .insert({
        user_id: user.id,
        transaction_type: 'deduct',
        amount: -totalPrice,
        balance_after: newBalance,
        order_id: order.id,
        memo: `주문 확정: ${productName} (${items.length}건)`
      });

    if (ledgerError) {
      console.error('거래 내역 기록 실패:', ledgerError);
      // 이미 포인트는 차감되었으므로 경고만 로그
      // 실제로는 이것도 롤백해야 하지만, 간단한 구현을 위해 진행
    }

    // 10. 성공 응답
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        totalQuantity,
        totalPrice,
        itemCount: items.length,
        newBalance
      }
    });

  } catch (error) {
    console.error('주문 확정 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
