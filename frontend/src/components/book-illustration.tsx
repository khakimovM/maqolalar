"use client";

import Image from "next/image";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

export function BookIllustration() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 60, damping: 18 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 60, damping: 18 });
  function onMove(e: React.MouseEvent) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <div onMouseMove={onMove} className="relative flex items-center justify-center" style={{ perspective: 1000 }}>
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: 660,
          height: 660,
          background: "radial-gradient(circle, rgba(93,202,165,0.18), rgba(70,225,205,0.06) 50%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={reduce ? {} : { y: [0, -12, 0] }}
        transition={{ y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            width: "min(86vw, 600px)",
            filter: "drop-shadow(0 14px 30px rgba(0,0,0,0.16))",
          }}
        >
          <Image
            src="/hero.webp"
            alt="Bilim daraxti — ochiq kitobdan o'sayotgan nurli daraxt"
            width={1024}
            height={1024}
            priority
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
