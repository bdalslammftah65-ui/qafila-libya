"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, User, LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function BottomNav() {
  const pathname = usePathname();
  const { user, authLoading, signIn } = useAuth();

  async function handleLoginClick() {
    try {
      await signIn();
    } catch (err) {
      console.error(err);
      const code = (err as { code?: string })?.code ?? "";

      if (code === "auth/unauthorized-domain") {
        // السبب الأشيع: نطاق الموقع الحالي غير مُدرج في Firebase Authentication
        alert(
          "تعذّر تسجيل الدخول: هذا النطاق غير مصرّح له في Firebase.\n" +
            "أضف النطاق الظاهر في شريط العنوان الآن إلى:\n" +
            "Firebase Console → Authentication → Settings → Authorized domains"
        );
      } else {
        alert(`تعذّر تسجيل الدخول. حاول مرة أخرى.\n(${code || "خطأ غير معروف"})`);
      }
    }
  }

  const isHomeActive = pathname === "/";
  const isAddActive = pathname.startsWith("/add-product");
  const isProfileActive = pathname === "/profile" || pathname === "/my-products" || pathname === "/settings";

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[#EFE9DD] shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      <div className="mx-auto max-w-md flex items-center justify-around py-2">
        <Link
          href="/"
          className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors"
        >
          <Home size={22} strokeWidth={isHomeActive ? 2.5 : 2} className={isHomeActive ? "text-primary" : "text-[#A9A196]"} />
          <span className={`text-[11px] ${isHomeActive ? "text-primary font-semibold" : "text-[#A9A196]"}`}>الرئيسية</span>
        </Link>

        {authLoading ? (
          <div className="flex flex-col items-center gap-1 px-4 py-1.5">
            <Loader2 size={22} className="animate-spin text-[#A9A196]" />
            <span className="text-[11px] text-[#A9A196]">تحميل...</span>
          </div>
        ) : user ? (
          <>
            <Link
              href="/add-product"
              className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors"
            >
              <PlusCircle size={22} strokeWidth={isAddActive ? 2.5 : 2} className={isAddActive ? "text-primary" : "text-[#A9A196]"} />
              <span className={`text-[11px] ${isAddActive ? "text-primary font-semibold" : "text-[#A9A196]"}`}>أضف منتج</span>
            </Link>

            <Link
              href="/profile"
              className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors"
            >
              <User size={22} strokeWidth={isProfileActive ? 2.5 : 2} className={isProfileActive ? "text-primary" : "text-[#A9A196]"} />
              <span className={`text-[11px] ${isProfileActive ? "text-primary font-semibold" : "text-[#A9A196]"}`}>حسابي</span>
            </Link>
          </>
        ) : (
          <button
            type="button"
            onClick={handleLoginClick}
            className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors"
          >
            <LogIn size={22} className="text-[#A9A196]" />
            <span className="text-[11px] text-[#A9A196]">تسجيل الدخول</span>
          </button>
        )}
      </div>
    </nav>
  );
}
