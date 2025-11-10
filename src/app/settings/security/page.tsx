"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [curEmail, setCurEmail] = useState("");
  const [curPw, setCurPw] = useState("");

  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleChange() {
    setMsg(null); setErr(null);

    // 1) 보안을 위해 재인증(현재 비번 검증)
    const reauth = await supabase.auth.signInWithPassword({
      email: curEmail,
      password: curPw,
    });
    if (reauth.error) {
      setErr("현재 비밀번호가 올바르지 않습니다.");
      return;
    }

    // 2) 새 비번 검증 후 변경
    if (newPw.length < 8) { setErr("새 비밀번호는 8자 이상이어야 합니다."); return; }
    if (newPw !== newPw2) { setErr("새 비밀번호가 일치하지 않습니다."); return; }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setErr(error.message); return; }

    setMsg("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
    // (선택) 보안상 로그아웃 후 로그인 유도
    setTimeout(async () => {
      await supabase.auth.signOut();
      router.replace("/login");
    }, 1200);
  }

  return (
    <main style={{ maxWidth: 520, margin: "48px auto", display: "grid", gap: 12 }}>
      <h1>보안 설정 — 비밀번호 변경</h1>

      <fieldset style={{ border: "1px solid #ddd", padding: 12 }}>
        <legend>현재 계정 확인</legend>
        <input
          placeholder="이메일"
          value={curEmail}
          onChange={(e) => setCurEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="현재 비밀번호"
          value={curPw}
          onChange={(e) => setCurPw(e.target.value)}
        />
      </fieldset>

      <fieldset style={{ border: "1px solid #ddd", padding: 12 }}>
        <legend>새 비밀번호</legend>
        <input
          type="password"
          placeholder="새 비밀번호(8자 이상)"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
        />
        <input
          type="password"
          placeholder="새 비밀번호 확인"
          value={newPw2}
          onChange={(e) => setNewPw2(e.target.value)}
        />
      </fieldset>

      <button onClick={handleChange}>비밀번호 변경</button>

      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {err && <p style={{ color: "red" }}>{err}</p>}
    </main>
  );
}
