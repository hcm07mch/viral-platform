import Link from "next/link";
import "@/styles/header.css";
import { createClient } from "@/lib/supabase/server";
import { signOut } from '@/app/auth/action';

type HeaderProps = {
  active?: "customers" | "products" | "orders" | "points"; // 활성 탭 표시용(선택)
  pageTitle?: string; // 페이지 제목 (기본값: "자동 발주 대시보드")
  className?: string; // 필요시 추가 스타일
};

export default async function Header({
  active,
  pageTitle = "자동 발주 대시보드",
  className,
}: HeaderProps) {
  const supabase = await createClient();
  
  // 현재 로그인한 사용자 정보 가져오기
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile = null;
  if (user) {
    // 프로필 정보 가져오기
    const { data } = await supabase
      .from('profiles')
      .select('account_code, company_name, display_name, tier, email')
      .eq('user_id', user.id)
      .single();
    
    profile = data;
  }

  // 표시할 계정명 결정 (우선순위: display_name > company_name > account_code > email)
  const displayAccount = profile?.display_name 
    || profile?.company_name 
    || profile?.account_code 
    || profile?.email 
    || '게스트';
  
  const displayTier = profile?.tier || 'T4';

  return (
    <header className={`global-header ${className ?? ""}`}>
      <div className="header-left">
        <div className="logo-box">
          <Link href="/dashboard" className="logo-box">LOGO</Link>
        </div>
        {/* <div className="header-service-name">
          {pageTitle}
        </div> */}
      </div>

      <nav className="header-right">
        <div className="header-nav-links">
          <Link
            href="/customerList"
            className={`header-link ${active === "customers" ? "active" : ""}`}
          >
            내 고객
          </Link>
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
