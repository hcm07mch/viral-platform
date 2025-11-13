'use client';

import { useState } from 'react';
import '@/styles/pointCharge.css';

const CHARGE_AMOUNTS = [
  10000, 30000, 50000, 100000, 300000, 500000
];

export default function PointChargeClient() {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
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
    
    // TODO: 실제 결제 API 연동
    setTimeout(() => {
      alert(`${selectedAmount.toLocaleString()} 🪙 충전이 완료되었습니다!`);
      setIsProcessing(false);
      // 모달이면 부모 창 새로고침
      if (window.opener) {
        window.opener.location.reload();
        window.close();
      }
    }, 1500);
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
