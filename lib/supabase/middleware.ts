import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/lib/types";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/** Default landing route per role. */
export function homeForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "accounting":
      return "/accounting";
    case "field_officer":
    case "installer":
      return "/field";
    default:
      return "/login";
  }
}

/**
 * Refreshes the Supabase session and enforces route guards.
 * Returns the response that must be propagated from middleware.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAppArea =
    path.startsWith("/admin") ||
    path.startsWith("/field") ||
    path.startsWith("/accounting");

  // Not signed in & hitting a protected area -> login.
  if (!user && isAppArea) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (user && isAppArea) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .single();

    const role = profile?.role as UserRole | undefined;

    // Deactivated account -> bounce to login.
    if (profile && profile.active === false) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "inactive");
      return NextResponse.redirect(url);
    }

    // Enforce per-area role access.
    const allowed =
      (path.startsWith("/admin") && role === "admin") ||
      (path.startsWith("/accounting") &&
        (role === "accounting" || role === "admin")) ||
      (path.startsWith("/field") &&
        (role === "field_officer" || role === "installer"));

    if (!allowed && role) {
      const url = request.nextUrl.clone();
      url.pathname = homeForRole(role);
      return NextResponse.redirect(url);
    }
  }

  // Signed-in user visiting /login -> send to their dashboard.
  if (user && path === "/login") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const url = request.nextUrl.clone();
    url.pathname = homeForRole(profile?.role as UserRole);
    return NextResponse.redirect(url);
  }

  return response;
}
