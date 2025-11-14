import { createClient } from '@/lib/supabase/server';
import Header from '@/components/Header';
import PointWalletClient from './PointWalletClient';

export default async function PointWalletPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pointBalance = 0;
  let transactions: any[] = [];

  if (user) {
    // 포인트 잔액 계산
    const { data: ledger } = await supabase
      .from('point_ledger')
      .select('amount')
      .eq('user_id', user.id);

    pointBalance = (ledger ?? []).reduce(
      (sum: number, row: any) => sum + parseFloat(row.amount || '0'),
      0
    );

    // 거래 내역 가져오기
    const { data: ledgerData } = await supabase
      .from('point_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    transactions = ledgerData ?? [];
  }

  return (
    <>
      <Header active="points" pageTitle="포인트 지갑" />
      <PointWalletClient 
        initialBalance={pointBalance}
        initialTransactions={transactions}
      />
    </>
  );
}
