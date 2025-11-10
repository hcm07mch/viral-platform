"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // 링크로 들어오면 recovery 세션이 자동으로 세팅됨
  useEffect(() => {
    supabase.auth.getSession().then(() => setReady(true));
  }, []);

  async function handleUpdate() {
    setErr(null); setOk(null);
    if (pw.length < 8) { setErr("비밀번호는 8자 이상이어야 합니다."); return; }
    if (pw !== pw2) { setErr("비밀번호가 일치하지 않습니다."); return; }

    // ✅ 1) 비밀번호 변경
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { setErr(error.message); return; }

    // ✅ 2) must_reset_password = false 처리
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ must_reset_password: false })
        .eq("user_id", user.id);

      if (profErr) {
        setErr("프로필 업데이트 중 오류가 발생했습니다.");
        return;
      }
    }
    setOk("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
    setTimeout(() => router.replace("/login"), 1200);
  }

  if (!ready) return <main style={{ padding: 32 }}>로딩 중...</main>;

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", display: "grid", gap: 12 }}>
      <h1>새 비밀번호 설정</h1>
      <input
        type="password"
        placeholder="새 비밀번호"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />
      <input
        type="password"
        placeholder="새 비밀번호 확인"
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
      />
      <button onClick={handleUpdate}>비밀번호 변경</button>

      {ok && <p style={{ color: "green" }}>{ok}</p>}
      {err && <p style={{ color: "red" }}>{err}</p>}
    </main>
  );
}
