import { createClient } from "@/lib/supabase/middleware"
import { i18nRouter } from "next-i18n-router"
import { NextResponse, type NextRequest } from "next/server"
import i18nConfig from "./i18nConfig"

export async function middleware(request: NextRequest) {
    // Extract the locale from the URL
  
    if (request.nextUrl.pathname.startsWith(`/admin`)) {
      const { supabase } = createClient(request);
      const user = await supabase.auth.getUser();
      if (!user || !user.data?.user?.id) {
        return NextResponse.redirect(new URL('/signin', request.url));
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.data.user.id)
        .single()

      const is_admin = data?.is_admin;
      
      if (!is_admin) { // Changed condition to check if is_admin is NOT true
        const { data: homeWorkspace, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", user.data.user.id)
        .eq("is_home", true)
        .single()

      if (!homeWorkspace) {
        throw new Error(error?.message)
      }

      return NextResponse.redirect(
        new URL(`/${homeWorkspace.id}/chat`, request.url)
      )
        return NextResponse.redirect(new URL(`/${homeWorkspace.id}/chat`, request.url));
      }
    }
  
  const i18nResult = i18nRouter(request, i18nConfig)
  if (i18nResult) return i18nResult

  try {
    const { supabase, response } = createClient(request)

    const session = await supabase.auth.getSession()
    
    const redirectToChat = session && request.nextUrl.pathname === "/"

    if (redirectToChat) {
      const { data: homeWorkspace, error } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", session.data.session?.user.id)
        .eq("is_home", true)
        .single()

      if (!homeWorkspace) {
        throw new Error(error?.message)
      }

      return NextResponse.redirect(
        new URL(`/${homeWorkspace.id}/chat`, request.url)
      )
    }

    return response
  } catch (e) {
    return NextResponse.next({
      request: {
        headers: request.headers
      }
    })
  }
}

export const config = {
  matcher: "/((?!api|static|.*\\..*|_next|auth).*)"
}
