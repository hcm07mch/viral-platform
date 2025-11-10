"use client";

import Link from "next/link";
import "@/styles/header.css";
import { signOut } from '@/app/auth/action';

type HeaderClientProps = {
  displayAccount?: string;
  displayTier?: string;
  active?: "products" | "orders" | "points";
  pageTitle?: string; // 페이지 제목 (기본값: "자동 발주 대시보드")
  className?: string;
};

export default function HeaderClient({
  displayAccount = '게스트',
  displayTier = 'T4',
  active,
  pageTitle = "",
  className,
}: HeaderClientProps) {
  return (
    <header className={`global-header ${className ?? ""}`}>
      <div className="header-left">
        <div className="logo-box">
          <Link href="/dashboard" className="logo-box">LOGO</Link>
        </div>

      </div>

      <nav className="header-right">
        <div className="header-nav-links">
          <Link
            href="/productList"
            className={`header-link ${active === "products" ? "active" : ""}`}
          >
            상품 목록
          </Link>
          <Link
            href="/orderList"
            className={`header-link ${active === "orders" ? "active" : ""}`}
          >
            주문 내역
          </Link>
          <Link
            href="/pointWallet"
            className={`header-link ${active === "points" ? "active" : ""}`}
          >
            포인트
          </Link>
        </div>

        <div className="header-userbox">
          계정: {displayAccount}
          <br />
          등급: {displayTier}
        </div>

        {/* 로그아웃 버튼 */}
        <form action={signOut}>
          <button className="logout-btn">
            로그아웃
          </button>
        </form>
      </nav>
    </header>
  );
}
