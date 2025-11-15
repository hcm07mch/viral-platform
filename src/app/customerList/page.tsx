import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import CustomerListClient from "./CustomerListClient";

export default async function CustomerListPage() {
  const supabase = await createClient();

  // 로그인 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 프로필 정보 가져오기
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_code, company_name, display_name, tier, email")
    .eq("user_id", user.id)
    .single();

  const displayAccount =
    profile?.display_name ||
    profile?.company_name ||
    profile?.account_code ||
    profile?.email ||
    "게스트";

  const displayTier = profile?.tier || "T4";

  return (
    <>
      <Header active="customers" pageTitle="내 고객" />
      <CustomerListClient
        userId={user.id}
        displayAccount={displayAccount}
        displayTier={displayTier}
      />
    </>
  );
}
