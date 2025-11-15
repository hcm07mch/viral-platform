import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import CustomerDetailClient from "./CustomerDetailClient";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 로그인 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 고객 정보 가져오기
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !customer) {
    redirect("/customerList");
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
      <Header active="customers" pageTitle="고객 상세" />
      <CustomerDetailClient
        customer={customer}
        userId={user.id}
        displayAccount={displayAccount}
        displayTier={displayTier}
      />
    </>
  );
}
