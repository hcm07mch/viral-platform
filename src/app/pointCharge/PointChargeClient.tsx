'use client';

import { useState } from 'react';
import '@/styles/pointCharge.css';

const CHARGE_AMOUNTS = [
  10000, 30000, 50000, 100000, 300000, 500000
];

const PAYMENT_METHODS = [
  { id: 'test', name: '테스트 결제', icon: '🧪', enabled: true },
  { id: 'card', name: '신용/체크카드', icon: '💳', enabled: false },
  { id: 'kakao', name: '카카오페이', icon: '💬', enabled: false },
  { id: 'toss', name: '토스페이', icon: '💙', enabled: false },
  { id: 'bank', name: '계좌이체', icon: '🏦', enabled: false },
];

export default function PointChargeClient() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('test');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(value);
    if (value) {
      setSelectedAmount(parseInt(value));
    } else {
      setSelectedAmount(null);
    }
  };

  const handleCharge = async () => {
    if (!selectedAmount || selectedAmount < 1000) {
      alert('최소 충전 금액은 1,000 🪙입니다.');
      return;
    }

    setIsProcessing(true);
    
    try {
      // 결제 API 호출 (현재는 테스트 모드)
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedAmount,
          paymentMethod: paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '충전에 실패했습니다.');
      }

      if (data.success) {
        alert(
          `${selectedAmount.toLocaleString()} 🪙 충전이 완료되었습니다!\n` +
          `현재 잔액: ${data.balance.toLocaleString()} 🪙`
        );
        
        // 부모 창이 있으면 새로고침 후 현재 창 닫기
        if (window.opener) {
          window.opener.location.reload();
          window.close();
        } else {
          // 부모 창이 없으면 포인트 지갑으로 이동
          window.location.href = '/pointWallet';
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert(error instanceof Error ? error.message : '충전 중 오류가 발생했습니다.');
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ko-KR') + ' 🪙';
  };

  return (
    <div className="point-charge-container">
      <div className="charge-content">
        <div className="charge-header">
          <h1 className="charge-title">포인트 충전</h1>
          <p className="charge-subtitle">충전할 금액을 선택해주세요</p>
        </div>

        {/* 금액 선택 버튼 */}
        <div className="amount-grid">
          {CHARGE_AMOUNTS.map((amount) => (
            <button
              key={amount}
              className={`amount-button ${selectedAmount === amount && !customAmount ? 'active' : ''}`}
              onClick={() => handleAmountSelect(amount)}
            >
              {formatCurrency(amount)}
            </button>
          ))}
        </div>

        {/* 직접 입력 */}
        <div className="custom-amount-section">
          <label className="custom-amount-label">직접 입력</label>
          <div className="custom-amount-input-wrapper">
            <input
              type="text"
              className="custom-amount-input"
              placeholder="금액 입력 (최소 1,000 🪙)"
              value={customAmount}
              onChange={handleCustomAmountChange}
            />
            <span className="currency-suffix">🪙</span>
          </div>
        </div>

        {/* 결제 수단 선택 */}
        <div className="payment-method-section">
          <label className="payment-method-label">결제 수단</label>
          <div className="payment-method-grid">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                className={`payment-method-button ${
                  paymentMethod === method.id ? 'active' : ''
                } ${!method.enabled ? 'disabled' : ''}`}
                onClick={() => method.enabled && setPaymentMethod(method.id)}
                disabled={!method.enabled}
              >
                <span className="payment-icon">{method.icon}</span>
                <span className="payment-name">{method.name}</span>
                {!method.enabled && <span className="coming-soon">준비중</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 선택된 금액 표시 */}
        {selectedAmount && (
          <div className="selected-amount-card">
            <div className="selected-amount-label">충전 금액</div>
            <div className="selected-amount-value">
              {formatCurrency(selectedAmount)}
            </div>
          </div>
        )}

        {/* 충전 버튼 */}
        <button
          className="charge-submit-button"
          onClick={handleCharge}
          disabled={!selectedAmount || isProcessing}
        >
          {isProcessing ? '처리 중...' : '충전하기'}
        </button>
      </div>
    </div>
  );
}
