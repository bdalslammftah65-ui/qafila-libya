"use client";

import Image from "next/image";
import { BadgeCheck, MessageCircle, ImageOff } from "lucide-react";
import type { Product } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { logWhatsAppContact } from "@/lib/products";
import ShareButton from "@/components/ShareButton";

function formatPrice(price?: number | null): string {
  if (price === null || price === undefined || Number.isNaN(price)) {
    return "حسب الاتفاق";
  }
  return `${price.toLocaleString("ar-LY")} د.ل`;
}

function buildWhatsAppLink(phone: string, title: string): string {
  const digitsOnly = phone.replace(/[^0-9]/g, "");
  const message = encodeURIComponent(`مرحباً، أنا مهتم بمنتج "${title}" على قافلة.`);
  return `https://wa.me/${digitsOnly}?text=${message}`;
}

export default function ProductCard({ product }: { product: Product }) {
  const { user, signIn } = useAuth();
  const coverImage = product.images?.[0];
  const whatsappLink = buildWhatsAppLink(product.phone, product.title);

  async function handleContactClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!user) {
      // لا نسمح بفتح واتساب قبل تسجيل الدخول - نطلب تسجيل الدخول أولاً
      e.preventDefault();
      try {
        const signedInUser = await signIn();
        if (signedInUser) {
          alert("تم تسجيل الدخول بنجاح! اضغط زر واتساب مرة أخرى للتواصل مع البائع.");
        }
      } catch (err) {
        console.error(err);
        alert("تعذّر تسجيل الدخول. حاول مرة أخرى.");
      }
      return;
    }

    // المستخدم مسجّل دخول: نترك الرابط يفتح واتساب طبيعياً (دون preventDefault)
    // ونسجّل عملية التواصل في الخلفية دون انتظار حتى لا نؤخر فتح واتساب
    void logWhatsAppContact(user.uid, product.id, product.phone).catch((err) =>
      console.error("تعذر تسجيل عملية التواصل:", err)
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(139,94,52,0.08)] overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-[#F2EDE3]">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 300px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#C9C0B2]">
            <ImageOff size={32} />
          </div>
        )}

        {product.isVerified && (
          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur rounded-full p-1 shadow-sm">
            <BadgeCheck size={18} className="text-emerald-600" />
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-semibold text-[#3A2E22] line-clamp-1">{product.title}</h3>
        <p className="text-xs text-[#9A8E7D]">{product.city}</p>
        <p className="text-sm font-bold text-primary mt-auto">{formatPrice(product.price)}</p>

        <div className="mt-2 flex items-center gap-1.5">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleContactClick}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] text-white text-xs font-semibold rounded-xl py-2 active:scale-[0.98] transition-transform"
          >
            <MessageCircle size={15} />
            تواصل واتساب
          </a>

          <ShareButton
            title={product.title}
            url={typeof window !== "undefined" ? window.location.origin + "/product/" + product.id : ""}
          />
        </div>
      </div>
    </div>
  );
}
