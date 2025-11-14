import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST: PG사 결제 완료 콜백 처리 (나중에 구현)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // TODO: PG사별 콜백 데이터 파싱
    // 예시: Toss Payments, 이니시스, 카카오페이 등
    const {
      transactionId, // 우리 DB의 transaction ID
      pgTransactionId, // PG사 거래 ID
      status,
      amount,
      pgResponse,
    } = body;

    // 1. 결제 거래 업데이트
    const { data: transaction, error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status,
        pg_transaction_id: pgTransactionId,
        pg_response: pgResponse,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
        failed_at: status === 'failed' ? new Date().toISOString() : null,
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (updateError) {
      console.error('Transaction update error:', updateError);
      return NextResponse.json(
        { error: '결제 처리에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 2. 결제 성공 시 포인트 추가
    if (status === 'completed') {
      const { error: ledgerError } = await supabase
        .from('point_ledger')
        .insert({
          user_id: transaction.user_id,
          transaction_type: 'charge',
          amount: transaction.point_amount,
          memo: `포인트 충전 (${amount.toLocaleString()}원) [TxID: ${transaction.id.substring(0, 8)}]`,
          // payment_transaction_id: transaction.id, // TODO: 컬럼 추가 후 활성화
        });

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
    }

    return NextResponse.json({
      success: true,
      transaction,
    });

  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
