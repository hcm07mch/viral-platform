"use client";
import "@/styles/login.css";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const router = useRouter();
    const search = useSearchParams();
    const nextUrl = search.get("redirectedFrom") || "/dashboard";
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        setErr(null);
        setLoading(true);

        // 1) 로그인
        const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
        });

        if (signInErr) {
            setLoading(false);
            setErr(signInErr.message);
        return;
        }
        // 2) 로그인 후 추가 처리: 비밀번호 재설정 필요 여부 확인
        // router.replace(nextUrl);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          setErr("세션을 가져오지 못했습니다. 다시 시도해주세요.");
          return;
        }
        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("must_reset_password")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (profErr) {
          setLoading(false);
          setErr("프로필을 가져오지 못했습니다. 다시 시도해주세요.");
          return;
        }
        if (profile?.must_reset_password) {
          router.replace("/auth/update-password");
        } else {
          router.replace(nextUrl);
        }
          return;
    }
    return (
        <div className="login-page">

        <main className="main-area">
            {/* 광고 자판기 컨셉 일러스트 */}
            <section className="vending-illustration">
            <div className="vending-text-wrapper">
                <div className="vending-title">광고 자판기 일러스트 자리</div>
                <div className="vending-sub">
                예: 인스타 체험단 / 블로그 리뷰 / 리워드 광고 카드들이<br />
                자판기 칸처럼 들어가 있는 이미지를 배치할 예정
                </div>
            </div>
            </section>

            {/* 로그인 카드 */}
            <aside className="login-card">
            <div className="login-title">로그인</div>

            <div className="form-group">
                <label className="form-label">아이디</label>
                <input 
                className="input-placeholder" 
                placeholder="아이디 입력" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                />
            </div>

            <div className="form-group">
                <label className="form-label">비밀번호</label>
                <input
                type="password"
                value={pw} 
                onChange={(e) => setPw(e.target.value)} 
                className="input-placeholder"
                placeholder="비밀번호 입력"
                />
            </div>

            <button className="login-button" onClick={handleLogin} disabled={loading}>로그인</button>
            {err && <div className="error-text" style={{ color : "red"}}>{err}</div>}
            <div className="account-guide">
                계정이 없으신가요?<br />
                관리자를 통해 계정이 발급됩니다.
            </div> 
            <p style={{ marginTop: 8 }}>
                <a href="/reset">비밀번호를 잊으셨나요?</a>
            </p>
            </aside>
        </main>

        <footer className="footer">
            <div className="footer-text">© KingkongAd / Viral Ad Platform / 2026 All rights reserved.</div> 
        </footer>
        </div>
    );
}
