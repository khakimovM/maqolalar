"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { BookIllustration } from "@/components/book-illustration";

const HEADLINE = ["Bilim", "—", "har", "bir", "sahifada"];

function Brand({ big }: { big?: boolean }) {
  return (
    <motion.div
      layoutId="brand"
      transition={{ duration: 0.85, ease: [0.6, 0, 0.2, 1] }}
      className={
        "flex items-center font-medium tracking-tight " +
        (big ? "gap-3 text-6xl md:text-7xl" : "gap-2 text-lg")
      }
      style={big ? { color: "#9CF5D2", textShadow: "0 0 22px rgba(124,255,232,0.6)" } : undefined}
    >
      <BookOpen className={big ? "h-12 w-12" : "h-5 w-5"} style={{ color: "#5DCAA5" }} />
      Maqolalar
    </motion.div>
  );
}

export default function HomePage() {
  const reduce = useReducedMotion();
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    if (reduce) {
      setIntro(false);
      return;
    }
    const t = setTimeout(() => setIntro(false), 1800);
    return () => clearTimeout(t);
  }, [reduce]);

  const container: Variants = {
    hide: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
  };
  const word: Variants = {
    hide: { y: "115%", opacity: 0 },
    show: { y: "0%", opacity: 1, transition: { type: "spring", stiffness: 120, damping: 16 } },
  };
  const fade: Variants = {
    hide: { y: 18, opacity: 0 },
    show: (i = 0) => ({
      y: 0,
      opacity: 1,
      transition: { delay: 0.35 + i * 0.12, duration: 0.6, ease: "easeOut" },
    }),
  };

  return (
    <LayoutGroup>
      <main className="relative min-h-dvh overflow-hidden" style={{ background: "#07090C", color: "#F4F6F7" }}>
        <header className="absolute inset-x-0 top-0 z-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
            <Link href="/" aria-label="Maqolalar">
              {!intro && <Brand />}
            </Link>
            <Link
              href="/login"
              className="rounded-full border px-5 py-2 text-sm font-medium transition-colors hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.22)", color: "#F4F6F7" }}
            >
              Kirish
            </Link>
          </div>
        </header>

        <div className="mx-auto grid min-h-dvh max-w-7xl grid-cols-1 items-center gap-10 px-8 md:grid-cols-2">
          <motion.div
            variants={container}
            initial="hide"
            animate={intro ? "hide" : "show"}
            className="order-2 text-center md:order-1 md:text-left"
          >
            <motion.div variants={fade} custom={0} className="mb-5 text-sm uppercase tracking-[0.25em]" style={{ color: "#5DCAA5" }}>
              Ziyolilar uchun
            </motion.div>
            <h1 className="font-serif text-5xl font-medium leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              {HEADLINE.map((w, i) => (
                <span key={i} className="mr-[0.22em] inline-block overflow-hidden pb-[0.1em] align-bottom">
                  <motion.span variants={word} className="inline-block" style={w === "sahifada" ? { color: "#5DCAA5" } : undefined}>
                    {w}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p variants={fade} custom={1} className="mx-auto mt-6 max-w-md text-lg leading-relaxed md:mx-0" style={{ color: "#9AA1A8" }}>
              Kimyo, matematika, qurilish va boshqa yo&apos;nalishlarda chuqur,
              ishonchli maqolalar. Mutaxassislar yozadi — siz o&apos;qiysiz.
            </motion.p>
            <motion.div variants={fade} custom={2} className="mt-9 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <Link
                href="/articles"
                className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-medium transition-transform hover:scale-105"
                style={{ background: "#5DCAA5", color: "#06281F", boxShadow: "0 0 40px rgba(93,202,165,0.30)" }}
              >
                Maqolalarni ko&apos;rish
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="rounded-full border px-7 py-3.5 text-base font-medium transition-colors hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.22)", color: "#F4F6F7" }}
              >
                Kirish
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="order-1 flex justify-center md:order-2 md:justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: intro ? 0 : 1 }}
            transition={{ duration: 0.8, delay: intro ? 0 : 0.3 }}
          >
            <BookIllustration />
          </motion.div>
        </div>

        <AnimatePresence>
          {intro && (
            <motion.div
              key="intro-bg"
              className="fixed inset-0 z-50"
              style={{ background: "#07090C" }}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>
        {intro && (
          <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center">
            <Brand big />
          </div>
        )}
      </main>
    </LayoutGroup>
  );
}
