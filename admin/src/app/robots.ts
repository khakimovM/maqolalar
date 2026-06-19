import type { MetadataRoute } from "next";

/** Admin panel qidiruv tizimlarida indekslanmaydi. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
