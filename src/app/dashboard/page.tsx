// Server Component - 데이터를 서버에서 미리 패칭
import "@/styles/dashboard.css";
import { createClient } from "@/lib/supabase/server";
import HeaderClient from "@/components/HeaderClient";
import DashboardClient from "./DashboardClient";

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

export default async function DashboardPage() {
  const supabase = await createClient();

  // 현재 로그인한 사용자 정보 가져오기
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let pointBalance = 0;
  let orders: Order[] = [];

  if (user) {
    // 프로필 정보 가져오기
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id, tier, account_code, company_name, display_name, email")
      .eq("user_id", user.id)
      .single();

    profile = profileData;

    // 포인트 잔액 계산 (현장 계산)
    const { data: ledger } = await supabase
      .from("point_ledger")
      .select("amount")
      .eq("user_id", user.id);

    pointBalance = (ledger ?? []).reduce(
      (sum: number, row: any) => sum + parseFloat(row.amount || '0'),
      0
    );

    // 주문 목록 가져오기
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, title, status, start_date, end_date, daily_qty, weeks, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    orders = (ordersData ?? []) as Order[];
  }

  // 표시할 계정명 결정
  const displayAccount =
    profile?.display_name ||
    profile?.company_name ||
    profile?.account_code ||
    profile?.email ||
    "게스트";

  const displayTier = profile?.tier || "T4";

  return (
    <>
      <HeaderClient
        displayAccount={displayAccount}
        displayTier={displayTier}
        pageTitle="자동 발주 대시보드"
      />
      <DashboardClient
        pointBalance={pointBalance}
        orders={orders}
        displayTier={displayTier}
        isAdmin={profile?.tier === 'admin'}
      />
    </>
  );
}
