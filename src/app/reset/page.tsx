"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const site = process.env.NEXT_PUBLIC_SITE_URL!;

  async function handleSend() {
    setMsg(null); setErr(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${site}/auth/update-password`,
    });
    if (error) { setErr(error.message); return; }
    setMsg("재설정 링크를 이메일로 보냈습니다. 메일함을 확인해주세요.");
  }

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", display: "grid", gap: 12 }}>
      <h1>비밀번호 재설정</h1>
      <input
        placeholder="가입 이메일"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleSend}>재설정 링크 보내기</button>
      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {err && <p style={{ color: "red" }}>{err}</p>}
    </main>
  );
}
