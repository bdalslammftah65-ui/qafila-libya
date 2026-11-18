"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

interface ShareButtonProps {
  title: string;
  url: string;
  /** نص إضافي يظهر عند المشاركة عبر الواجهات التي تدعمه (اختياري) */
  text?: string;
}

export default function ShareButton({ title, url, text }: ShareButtonProps) {
  const [justCopied, setJustCopied] = useState(false);

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // على الجوال: نستخدم واجهة المشاركة الأصلية (تفتح تطبيقات المشاركة المثبّتة)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: text ?? title, url });
        return;
      } catch (err) {
        // المستخدم أغلق نافذة المشاركة بنفسه - لا داعي لأي رسالة خطأ
        const code = (err as { name?: string })?.name;
        if (code === "AbortError") return;
        console.error("تعذّرت المشاركة:", err);
      }
    }

    // على سطح المكتب أو عند فشل المشاركة الأصلية: ننسخ الرابط للحافظة
    try {
      await navigator.clipboard.writeText(url);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch (err) {
      console.error("تعذّر نسخ الرابط:", err);
      alert(url);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="مشاركة المنتج"
      className="flex items-center justify-center gap-1.5 bg-[#F2EDE3] text-[#6B5B48] text-xs font-semibold rounded-xl py-2 px-3 active:scale-[0.98] transition-transform"
    >
      {justCopied ? <Check size={15} className="text-emerald-600" /> : <Share2 size={15} />}
      {justCopied ? "تم نسخ الرابط" : "مشاركة"}
    </button>
  );
}
