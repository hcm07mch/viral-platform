import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(req: NextRequest) {
  // ✅ 응답 객체 (쿠키 세션 자동 업데이트용)
  let res = NextResponse.next({
    request: req,
  });

  // ✅ Supabase middleware client 생성
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            req.cookies.set(name, value)
          );
          res = NextResponse.next({
            request: req,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ✅ 세션 자동 refresh 
  await supabase.auth.getSession();

  // ✅ 보호 페이지 목록
  const protectedRoutes = [
    "/dashboard",
    "/product",
    "/order",
    "/wallet",
    "/admin",
    "/orderDetail"
  ];

  const { pathname } = req.nextUrl;
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtected) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // ✅ 보호 페이지인데 세션 없으면 -> login
    if (!session) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  // ✅ 정적 리소스는 middleware 제외
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|public).*)",
  ],
};
