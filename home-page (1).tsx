"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { Search, PackageSearch, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Product } from "@/types";
import ProductCard from "@/components/ProductCard";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // رابط مباشر لإنشاء الفهرس المفقود إن أرسلته Firestore ضمن رسالة الخطأ
  const [errorActionUrl, setErrorActionUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        setError(null);
        setErrorActionUrl(null);

        // نعرض فقط المنتجات "نشطة" (غير المخفية من قِبل أصحابها)
        // يتطلب فهرساً مركّباً (status + createdAt) موجود في firestore.indexes.json
        const productsQuery = query(
          collection(db, "products"),
          where("status", "==", "active"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(productsQuery);
        const fetched: Product[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Product, "id">),
        }));
        setProducts(fetched);
      } catch (err) {
        console.error(err);

        // نميّز سبب الفشل الفعلي بدل رسالة عامة، حتى لا تبدو مشكلة "القراءة"
        // وكأنها لا تزال قائمة رغم أن قواعد Firestore قد تكون سليمة فعلاً.
        const firebaseError = err as { code?: string; message?: string };
        const code = firebaseError?.code ?? "";
        const message = firebaseError?.message ?? "";
        const indexUrlMatch = message.match(/https:\/\/console\.firebase\.google\.com\S+/);

        if (code === "permission-denied") {
          setError(
            "تم رفض القراءة من Firestore. تحقق أن القواعد المنشورة فعلياً على مشروعك (وليس فقط في الكود) تحتوي على allow read: if true؛ لمجموعة products."
          );
        } else if (code === "failed-precondition" || message.includes("requires an index")) {
          setError(
            indexUrlMatch
              ? "هذا الاستعلام (status + createdAt) يحتاج فهرساً مركّباً في Firestore لم يُنشأ بعد. أنشئه مباشرة من الرابط التالي:"
              : "هذا الاستعلام يحتاج فهرساً مركّباً في Firestore (status + createdAt). انشر firestore.indexes.json أو أنشئ الفهرس يدوياً من كونسول Firebase."
          );
          setErrorActionUrl(indexUrlMatch ? indexUrlMatch[0] : null);
        } else {
          setError("تعذّر تحميل المنتجات. تحقق من اتصالك بالإنترنت وحاول مجدداً.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // قائمة المدن المتاحة للتصفية، مستخرجة من المنتجات المحمّلة فعلياً (بدون طلب إضافي)
  const cities = useMemo(() => {
    const unique = new Set(products.map((p) => p.city).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "ar"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !normalizedSearch || product.title.toLowerCase().includes(normalizedSearch);
      const matchesCity = !selectedCity || product.city === selectedCity;
      return matchesSearch && matchesCity;
    });
  }, [products, searchTerm, selectedCity]);

  // الموقع فارغ كلياً (لا منتجات على الإطلاق) مقابل: التصفية/البحث لم يُطابق شيئاً
  const isSiteEmpty = !isLoading && !error && products.length === 0;
  const hasNoFilteredResults = !isLoading && !error && products.length > 0 && filteredProducts.length === 0;

  return (
    <main className="min-h-screen">
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-[#A87A52] to-[#C9A66B] px-5 pt-10 pb-8 rounded-b-[2rem] shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">قافلة</h1>
          <p className="text-white/85 text-sm mt-1">سوق الحرفيين الليبيين، تواصل مباشر مع الصنّاع</p>
        </div>
        <div className="absolute -left-8 -bottom-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-4 -top-6 w-24 h-24 rounded-full bg-white/10" />
      </header>

      <div className="px-4 -mt-5 relative z-10">
        <div className="bg-white rounded-2xl shadow-md flex items-center gap-2 px-4 py-3">
          <Search size={18} className="text-[#B8AC99]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#C9C0B2]"
          />
        </div>
      </div>

      {/* فلاتر المدينة: تُبنى من المنتجات المحمّلة فعلاً، والتصفية فورية بالكامل على جهاز العميل */}
      {!isLoading && !error && cities.length > 0 && (
        <div
          className="px-4 mt-4 flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <button
            type="button"
            onClick={() => setSelectedCity(null)}
            className={`shrink-0 text-xs font-semibold rounded-full px-4 py-1.5 transition-colors ${
              selectedCity === null
                ? "bg-primary text-white"
                : "bg-white text-[#6B5B48] border border-[#E8E0D2]"
            }`}
          >
            الكل
          </button>
          {cities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setSelectedCity(city)}
              className={`shrink-0 text-xs font-semibold rounded-full px-4 py-1.5 transition-colors ${
                selectedCity === city
                  ? "bg-primary text-white"
                  : "bg-white text-[#6B5B48] border border-[#E8E0D2]"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      <section className="px-4 mt-5">
        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-white rounded-2xl overflow-hidden">
                <div className="aspect-square bg-[#F2EDE3] animate-pulse" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 w-3/4 bg-[#F2EDE3] rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-[#F2EDE3] rounded animate-pulse" />
                  <div className="h-7 w-full bg-[#F2EDE3] rounded-xl animate-pulse mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center text-sm text-red-600 bg-red-50 rounded-xl py-6 px-4 flex flex-col gap-2">
            <p>{error}</p>
            {errorActionUrl && (
              <a
                href={errorActionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold break-all"
              >
                {errorActionUrl}
              </a>
            )}
          </div>
        )}

        {/* الموقع فارغ كلياً: لا منتجات بعد */}
        {isSiteEmpty && (
          <div className="flex flex-col items-center justify-center text-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles size={28} className="text-primary" />
            </div>
            <h2 className="text-base font-bold text-[#3A2E22]">قريباً.. كن أول من يضيف منتجاً!</h2>
            <p className="text-sm text-[#9A8E7D] max-w-[220px]">
              قافلة في انتظار أول حرفي يعرض صنعته هنا.
            </p>
            <Link
              href="/add-product"
              className="mt-2 bg-primary text-white text-sm font-semibold rounded-xl px-5 py-2.5"
            >
              أضف أول منتج
            </Link>
          </div>
        )}

        {/* البحث أو فلتر المدينة لم يُطابق أي منتج، رغم وجود منتجات أخرى */}
        {hasNoFilteredResults && (
          <div className="flex flex-col items-center justify-center text-center text-[#9A8E7D] py-16 gap-2">
            <PackageSearch size={36} />
            <p className="text-sm">لا توجد نتائج مطابقة، جرّب كلمة أو مدينة أخرى.</p>
          </div>
        )}

        {!isLoading && !error && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pb-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
