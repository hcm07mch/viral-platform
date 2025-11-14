"use client";

import "@/styles/dashboard.css";
import { useMemo, useState } from "react";
import Link from "next/link";

type TabKey = "received" | "running" | "done";

type Order = {
  id: number;
  title: string;
  status: "received" | "running" | "done";
  start_date: string | null;
  end_date: string | null;
  daily_qty: number | null;
  weeks: number | null;
  created_at: string;
};

type DashboardClientProps = {
  pointBalance: number;
  orders: Order[];
  displayTier: string;
  isAdmin?: boolean;
};

export default function DashboardClient({
  pointBalance,
  orders,
  displayTier,
  isAdmin = false,
}: DashboardClientProps) {
  const [priceOpen, setPriceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("received");

  // 탭별 필터링
  const receivedOrders = useMemo(
    () => orders.filter((o) => o.status === "received"),
    [orders]
  );
  const runningOrders = useMemo(
    () => orders.filter((o) => o.status === "running"),
    [orders]
  );
  const doneOrders = useMemo(
    () => orders.filter((o) => o.status === "done"),
    [orders]
  );

  return (
    <div className="dashboard-wrapper">
      {isAdmin && (
        <section className="admin-section">
          <div className="admin-banner">
            <div className="admin-banner-content">
              <span className="admin-badge">👑 관리자</span>
              <span className="admin-text">관리자 전용 메뉴</span>
            </div>
            <Link href="/admin/cancellation-requests" className="admin-link">
              관리자 메뉴 →
            </Link>
          </div>
        </section>
      )}

      <section className="top-info-row">
        {/* 가격/등급 카드 */}
        <div className="card" id="priceCard">
          <div className="card-title">
            <span>현 등급 / 가격 안내</span>
            <button
              className="price-details-toggle"
              onClick={() => setPriceOpen((o) => !o)}
              aria-expanded={priceOpen}
              aria-controls="priceDetailsPanel"
            >
              {priceOpen ? "숨기기" : "상세보기"}
            </button>
          </div>

          <div className="card-value">{displayTier} 등급</div>
          <div className="card-subtext">
            현재 등급에 따른 가격이 적용됩니다
          </div>

          <div
            id="priceDetailsPanel"
            className={`price-details-panel ${priceOpen ? "active" : ""}`}
          >
            <div style={{ marginBottom: 8 }}>· 리워드 광고: xx원 / 1일 기준</div>
            <div style={{ marginBottom: 8 }}>· 블로그 포스팅: xx원 / 건</div>
            <div style={{ marginBottom: 8 }}>· 인스타 협찬: xx원 / 건</div>
            <div style={{ fontSize: 11, color: "#999" }}>
              위 금액은 예시 가격이며 실제 발주액은 [1일 수량 × 7일 × 주수]로
              계산됩니다
            </div>
          </div>
        </div>

        {/* 포인트(잔액) 카드 */}
        <div className="card" id="pointCard">
          <div className="card-title">보유 포인트</div>
          <div className="card-value point-value">
            {pointBalance.toLocaleString()} 🪙
          </div>
          <div className="card-subtext">
            주문 시 자동 차감 / 환불 시 자동 복구
          </div>
          <Link href="/pointCharge" className="charge-link">
            충전하기 →
          </Link>
        </div>

        {/* 진행 중 주문 카드 */}
        <div className="card" id="runningCard">
          <div className="card-title">진행 중 주문</div>
          <div className="card-value running-value">
            {runningOrders.length} 건
          </div>
          <div className="card-subtext">현시점 자동 발주 진행 중</div>
          <Link href="/orderList" className="orders-link">
            주문 내역 보기 →
          </Link>
        </div>
      </section>

      {/* 최근 주문 목록 */}
      <section className="recent-orders-section">
        <div className="section-title-row">
          <h2 className="section-title">최근 주문 내역</h2>
          <div className="tab-group">
            <button
              className={`tab-btn ${activeTab === "received" ? "active" : ""}`}
              onClick={() => setActiveTab("received")}
            >
              접수됨 ({receivedOrders.length})
            </button>
            <button
              className={`tab-btn ${activeTab === "running" ? "active" : ""}`}
              onClick={() => setActiveTab("running")}
            >
              진행 중 ({runningOrders.length})
            </button>
            <button
              className={`tab-btn ${activeTab === "done" ? "active" : ""}`}
              onClick={() => setActiveTab("done")}
            >
              완료 ({doneOrders.length})
            </button>
          </div>
        </div>

        {/* 테이블 리스트 */}
        <div className="orders-table">
          {activeTab === "received" &&
            (receivedOrders.length === 0 ? (
              <div className="empty-state">접수된 주문이 없습니다.</div>
            ) : (
              receivedOrders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))
            ))}

          {activeTab === "running" &&
            (runningOrders.length === 0 ? (
              <div className="empty-state">진행 중인 주문이 없습니다.</div>
            ) : (
              runningOrders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))
            ))}

          {activeTab === "done" &&
            (doneOrders.length === 0 ? (
              <div className="empty-state">완료된 주문이 없습니다.</div>
            ) : (
              doneOrders.map((order) => <OrderRow key={order.id} order={order} />)
            ))}
        </div>
      </section>

      {/* Quick Actions / CTA */}
      <section className="quick-actions">
        <Link href="/productList" className="action-card primary">
          <div className="action-card-title">신규 주문하기</div>
          <div className="action-card-desc">
            원하는 상품을 선택하고 빠르게 주문을 시작하세요
          </div>
        </Link>
        <Link href="/orderList" className="action-card">
          <div className="action-card-title">전체 주문 내역</div>
          <div className="action-card-desc">
            모든 주문의 상세 정보를 확인할 수 있습니다
          </div>
        </Link>
        <Link href="/pointWallet" className="action-card">
          <div className="action-card-title">포인트 관리</div>
          <div className="action-card-desc">
            충전 내역 및 사용 내역을 확인하세요
          </div>
        </Link>
      </section>
    </div>
  );
}

// 개별 주문 행 컴포넌트
function OrderRow({ order }: { order: Order }) {
  return (
    <div className="order-row">
      <div className="order-row-cell order-id">#{order.id}</div>
      <div className="order-row-cell order-title">
        {order.title || "제목 없음"}
      </div>
      <div className="order-row-cell order-meta">
        {order.daily_qty && order.weeks
          ? `${order.daily_qty}건/일 × ${order.weeks}주`
          : "-"}
      </div>
      <div className="order-row-cell order-date">
        {order.created_at
          ? new Date(order.created_at).toLocaleDateString("ko-KR")
          : "-"}
      </div>
      <div className="order-row-cell order-actions">
        <Link href={`/orderDetail/${order.id}`} className="detail-link">
          상세
        </Link>
      </div>
    </div>
  );
}
