"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query, updateDoc, doc as fsDoc } from "firebase/firestore";
import {
  BadgeCheck,
  Clock,
  Loader2,
  Lock,
  PackageCheck,
  Rocket,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import LoginButton from "@/components/LoginButton";
import { adminDeleteProduct, toggleProductStatus } from "@/lib/products";
import type { Product } from "@/types";

export default function AdminPage() {
  const router = useRouter();
  const { user, authLoading, isAdmin, adminLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  // الحماية الحقيقية: Firebase Custom Claim (admin: true)، وليس أي قيمة في localStorage.
  // ننتظر اكتمال فحص الهوية والصلاحية قبل اتخاذ أي قرار لتفادي "وميض" أو طرد خاطئ.
  useEffect(() => {
    if (authLoading || adminLoading) return;

    if (!user || !isAdmin) {
      alert("لا تملك صلاحية الوصول إلى لوحة التحكم.");
      router.replace("/");
    }
  }, [authLoading, adminLoading, user, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;

    async function fetchAllProducts() {
      try {
        setIsLoadingProducts(true);
        const productsQuery = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(productsQuery);
        const fetched: Product[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Product, "id">),
        }));
        setProducts(fetched);
      } catch (err) {
        console.error(err);
        alert("تعذّر تحميل المنتجات.");
      } finally {
        setIsLoadingProducts(false);
      }
    }

    fetchAllProducts();
  }, [isAdmin]);

  // إحصائيات مبنية من المنتجات المحمّلة فعلاً (لا طلب إضافي لـ Firestore):
  // لا تملك قواعد الأمان صلاحية سرد كل مستخدمي users/، لذا نحسب "عدد الحرفيين"
  // كعدد أصحاب المنتجات الفريدين (ownerId) بدل الاعتماد على مجموعة users.
  const stats = useMemo(() => {
    const uniqueOwners = new Set(products.map((p) => p.ownerId));
    const activeCount = products.filter((p) => p.status === "active").length;
    const pendingCount = products.filter((p) => !p.isVerified).length;
    return {
      artisanCount: uniqueOwners.size,
      activeCount,
      pendingCount,
    };
  }, [products]);

  async function handleVerify(productId: string) {
    try {
      setPendingActionId(productId);
      await updateDoc(fsDoc(db, "products", productId), { isVerified: true });
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, isVerified: true } : p)));
    } catch (err) {
      console.error(err);
      alert("فشل تحديث حالة المنتج.");
    } finally {
      setPendingActionId(null);
    }
  }

  // "قبول ونشر": يُعيد عرض منتج كان مخفياً، دون المساس بحالة التوثيق (زر مستقل عن "توثيق")
  async function handlePublish(productId: string) {
    try {
      setPendingActionId(productId);
      await toggleProductStatus(productId, "active");
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, status: "active" } : p)));
    } catch (err) {
      console.error(err);
      alert("فشل نشر المنتج.");
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleDelete(productId: string) {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذا المنتج نهائياً؟");
    if (!confirmed) return;

    try {
      setPendingActionId(productId);
      await adminDeleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      console.error(err);
      alert("فشل حذف المنتج.");
    } finally {
      setPendingActionId(null);
    }
  }

  // أثناء التحقق من الهوية والصلاحية لا نعرض شيئاً لتفادي "وميض" لوحة الإدارة
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#B8AC99]">
        <Loader2 size={28} className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen px-4 pt-16 flex flex-col items-center text-center gap-4">
        <Lock size={32} className="text-[#B8AC99]" />
        <h1 className="text-lg font-bold text-[#3A2E22]">سجّل الدخول للمتابعة</h1>
        <LoginButton />
      </main>
    );
  }

  if (!isAdmin) {
    // سيتم تحويل المستخدم تلقائياً عبر useEffect أعلاه، هذا فقط احتياط أثناء لحظة التحويل
    return (
      <main className="min-h-screen px-4 pt-16 flex flex-col items-center text-center gap-4">
        <ShieldAlert size={32} className="text-red-500" />
        <p className="text-sm text-red-600">لا تملك صلاحية الوصول إلى هذه الصفحة.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 pt-8 pb-6">
      <h1 className="text-xl font-bold text-[#3A2E22] mb-5">لوحة تحكم الإدارة</h1>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-white rounded-2xl shadow-sm p-3 flex flex-col items-center gap-1 text-center">
          <Users size={18} className="text-primary" />
          <p className="text-lg font-extrabold text-[#3A2E22] leading-none">{stats.artisanCount}</p>
          <p className="text-[10px] text-[#9A8E7D] leading-tight">الحرفيون</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-3 flex flex-col items-center gap-1 text-center">
          <PackageCheck size={18} className="text-emerald-600" />
          <p className="text-lg font-extrabold text-[#3A2E22] leading-none">{stats.activeCount}</p>
          <p className="text-[10px] text-[#9A8E7D] leading-tight">منتجات نشطة</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-3 flex flex-col items-center gap-1 text-center">
          <Clock size={18} className="text-amber-600" />
          <p className="text-lg font-extrabold text-[#3A2E22] leading-none">{stats.pendingCount}</p>
          <p className="text-[10px] text-[#9A8E7D] leading-tight">قيد المراجعة</p>
        </div>
      </div>

      {isLoadingProducts && (
        <div className="flex items-center justify-center py-16 text-[#B8AC99]">
          <Loader2 size={28} className="animate-spin" />
        </div>
      )}

      {!isLoadingProducts && products.length === 0 && (
        <p className="text-center text-sm text-[#9A8E7D] py-16">لا توجد منتجات حالياً.</p>
      )}

      {!isLoadingProducts && products.length > 0 && (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-sm text-[#3A2E22]">{product.title}</h2>
                  <p className="text-xs text-[#9A8E7D] mt-0.5">
                    {product.city} · {product.phone}
                  </p>
                </div>

                {product.isVerified ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-1 whitespace-nowrap">
                    <BadgeCheck size={13} /> موثّق
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-1 whitespace-nowrap">
                    <Clock size={13} /> قيد المراجعة
                  </span>
                )}
              </div>

              <div className="flex gap-2 mt-1 flex-wrap">
                {!product.isVerified && (
                  <button
                    onClick={() => handleVerify(product.id)}
                    disabled={pendingActionId === product.id}
                    className="flex-1 bg-primary text-white text-xs font-semibold rounded-xl py-2 disabled:opacity-60"
                  >
                    توثيق
                  </button>
                )}

                {product.status !== "active" && (
                  <button
                    onClick={() => handlePublish(product.id)}
                    disabled={pendingActionId === product.id}
                    className="flex-1 flex items-center justify-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl py-2 disabled:opacity-60"
                  >
                    <Rocket size={13} /> قبول ونشر
                  </button>
                )}

                <button
                  onClick={() => handleDelete(product.id)}
                  disabled={pendingActionId === product.id}
                  className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-600 text-xs font-semibold rounded-xl py-2 disabled:opacity-60"
                >
                  <Trash2 size={13} /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
