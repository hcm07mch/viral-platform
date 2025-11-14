import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

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
    const profileBalance = parseFloat(profile.balance);
    if (profileBalance < totalPrice) {
      return NextResponse.json(
        { 
          error: '포인트가 부족합니다.',
          required: totalPrice,
          current: profileBalance,
          shortage: totalPrice - profileBalance
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

    // 8. point_ledger에 차감 내역 먼저 기록 (트리거가 자동으로 balance 업데이트)
    // Service Role 클라이언트 사용 (RLS 우회)
    const supabaseService = createServiceClient();
    
    // 현재 잔액 조회 (최신 상태)
    const { data: currentLedger } = await supabaseService
      .from('point_ledger')
      .select('balance_after')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const currentBalance = currentLedger?.balance_after ? parseFloat(currentLedger.balance_after) : parseFloat(profile.balance);
    const newBalance = currentBalance - totalPrice;

    const { error: ledgerError } = await supabaseService
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
      // 롤백
      await supabase.from('order_items').delete().eq('order_id', order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: '포인트 차감에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 9. 트리거가 profiles.balance를 자동 업데이트하므로 수동 업데이트 제거
    // update_profile_balance() 트리거가 처리함

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
