'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import '@/styles/pointWallet.css';

type Transaction = {
  id: string;
  transaction_type: 'charge' | 'deduct' | 'refund' | 'admin_adjust';
  amount: number;
  balance_after: number;
  order_id: string | null;
  memo: string | null;
  created_at: string;
};

type PointWalletClientProps = {
  initialBalance: number;
  initialTransactions: Transaction[];
};

const TRANSACTION_LABELS: Record<string, string> = {
  charge: '충전',
  deduct: '사용',
  refund: '환불',
  admin_adjust: '관리자 조정'
};

export default function PointWalletClient({
  initialBalance,
  initialTransactions,
}: PointWalletClientProps) {
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [balance, setBalance] = useState(initialBalance);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshTransactions = async () => {
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      
      // 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      // 잔액 재계산
      const { data: ledger } = await supabase
        .from('point_ledger')
        .select('amount')
        .eq('user_id', user.id);

      const newBalance = (ledger ?? []).reduce(
        (sum: number, row: any) => sum + Number(row.amount || 0),
        0
      );

      // 거래 내역 가져오기
      const { data: ledgerData } = await supabase
        .from('point_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setBalance(newBalance);
      setTransactions(ledgerData ?? []);
    } catch (error) {
      console.error('거래 내역 새로고침 실패:', error);
      alert('거래 내역을 불러오는데 실패했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + ' 🪙';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openChargeModal = () => {
    setShowChargeModal(true);
  };

  const closeChargeModal = () => {
    setShowChargeModal(false);
  };

  const filteredTransactions = filterType === 'all'
    ? transactions
    : transactions.filter(t => t.transaction_type === filterType);

  return (
    <>
      <main className="point-wallet-wrapper">
        <section className="point-wallet-panel">
          {/* 포인트 잔액 카드 */}
          <div className="balance-card">
            <div className="balance-header">
              <div className="balance-title">보유 포인트</div>
              <button 
                className="charge-button"
                onClick={openChargeModal}
              >
                💳 충전하기
              </button>
            </div>
            <div className="balance-amount-row">
              <div className="balance-amount">
                {formatCurrency(balance)}
              </div>
              <button 
                className="balance-refresh-button"
                onClick={refreshTransactions}
                disabled={isRefreshing}
                title="잔액 새로고침"
              >
                ↻
              </button>
            </div>
            <div className="balance-info">
              포인트는 주문 시 자동으로 차감됩니다
            </div>
          </div>

          {/* 거래 내역 섹션 */}
          <div className="transactions-section">
            <div className="transactions-header">
              <h2 className="transactions-title">변동 내역</h2>
              
              <div className="transactions-header-actions">
                {/* 새로고침 버튼 */}
                <button
                  className="refresh-button"
                  onClick={refreshTransactions}
                  disabled={isRefreshing}
                  title="거래 내역 새로고침"
                >
                  {isRefreshing ? '↻' : '↻'}
                </button>
                
                {/* 필터 */}
                <div className="transaction-filters">
                <button
                  className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  전체
                </button>
                <button
                  className={`filter-btn ${filterType === 'charge' ? 'active' : ''}`}
                  onClick={() => setFilterType('charge')}
                >
                  충전
                </button>
                <button
                  className={`filter-btn ${filterType === 'deduct' ? 'active' : ''}`}
                  onClick={() => setFilterType('deduct')}
                >
                  사용
                </button>
                <button
                  className={`filter-btn ${filterType === 'refund' ? 'active' : ''}`}
                  onClick={() => setFilterType('refund')}
                >
                  환불
                </button>
                </div>
              </div>
            </div>

            {/* 거래 내역 리스트 */}
            <div className="transactions-list">
              {filteredTransactions.length === 0 ? (
                <div className="empty-state">거래 내역이 없습니다.</div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="transaction-item">
                    <div className="transaction-left">
                      <div className="transaction-type-badge" data-type={transaction.transaction_type}>
                        {TRANSACTION_LABELS[transaction.transaction_type]}
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-memo">
                          {transaction.memo || '메모 없음'}
                        </div>
                        <div className="transaction-date">
                          {formatDate(transaction.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="transaction-right">
                      <div 
                        className={`transaction-amount ${
                          transaction.amount > 0 ? 'positive' : 'negative'
                        }`}
                      >
                        {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </div>
                      <div className="transaction-balance">
                        잔액: {formatCurrency(transaction.balance_after)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 충전 모달 */}
      {showChargeModal && (
        <div className="charge-modal-backdrop" onClick={closeChargeModal}>
          <div className="charge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="charge-modal-header">
              <h3>포인트 충전</h3>
              <button className="close-button" onClick={closeChargeModal}>
                ✕
              </button>
            </div>
            <div className="charge-modal-body">
              <iframe
                src="/pointCharge"
                className="charge-iframe"
                title="포인트 충전"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
