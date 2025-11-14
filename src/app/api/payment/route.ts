import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST: 결제 생성 (테스트용 - 나중에 PG사 연동으로 대체)
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { amount, paymentMethod = 'test' } = body;

    // 유효성 검사
    if (!amount || amount < 1000) {
      return NextResponse.json(
        { error: '최소 충전 금액은 1,000원입니다.' },
        { status: 400 }
      );
    }

    // 포인트 금액 계산 (1원 = 1포인트로 가정)
    const pointAmount = Math.floor(amount);

    // IP 주소 가져오기
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 1. payment_transactions 레코드 생성 (pending 상태)
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        amount,
        point_amount: pointAmount,
        status: 'pending',
        payment_method: paymentMethod,
        pg_provider: paymentMethod === 'test' ? 'test' : null,
        pg_order_id: `ORDER-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      return NextResponse.json(
        { error: '결제 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 2. 테스트 결제인 경우 즉시 완료 처리
    if (paymentMethod === 'test') {
      // 결제 완료 상태로 업데이트
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          pg_transaction_id: `TEST-${transaction.id}`,
          pg_response: {
            test: true,
            completed_at: new Date().toISOString(),
            message: 'Test payment completed',
          },
        })
        .eq('id', transaction.id);

      if (updateError) {
        console.error('Transaction update error:', updateError);
        return NextResponse.json(
          { error: '결제 완료 처리에 실패했습니다.' },
          { status: 500 }
        );
      }

      // 3. point_ledger에 충전 기록 추가
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('point_ledger')
        .insert({
          user_id: user.id,
          transaction_type: 'charge',
          amount: pointAmount,
          memo: `포인트 충전 (${amount.toLocaleString()}원) [TxID: ${transaction.id.substring(0, 8)}]`,
          // payment_transaction_id: transaction.id, // TODO: 컬럼 추가 후 활성화
        })
        .select()
        .single();

      if (ledgerError) {
        console.error('Ledger creation error:', ledgerError);
        
        // 포인트 추가 실패 시 결제를 failed로 변경
        await supabase
          .from('payment_transactions')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: '포인트 추가 실패',
          })
          .eq('id', transaction.id);

        return NextResponse.json(
          { error: '포인트 추가에 실패했습니다.' },
          { status: 500 }
        );
      }

      // 4. 현재 잔액 계산
      const { data: allLedger } = await supabase
        .from('point_ledger')
        .select('amount')
        .eq('user_id', user.id);

      const currentBalance = (allLedger ?? []).reduce(
        (sum: number, row: any) => sum + parseFloat(row.amount || '0'),
        0
      );

      return NextResponse.json({
        success: true,
        transaction: {
          id: transaction.id,
          amount,
          pointAmount,
          status: 'completed',
        },
        balance: currentBalance,
        message: '충전이 완료되었습니다.',
      });
    }

    // 실제 PG사 연동인 경우 (나중에 구현)
    // TODO: PG사 결제창 URL 반환
    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount,
        pointAmount,
        status: 'pending',
      },
      // paymentUrl: '결제창 URL', // PG사 연동 시 추가
      message: '결제 대기 중입니다.',
    });

  } catch (error) {
    console.error('Payment creation error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 결제 내역 조회
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Fetch transactions error:', error);
      return NextResponse.json(
        { error: '결제 내역 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transactions,
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
