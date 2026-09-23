import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const PAGES = ["", "/how-it-works", "/security", "/get-started", "/diagnose"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "monthly", priority: path === "" ? 1 : 0.7 }));
}
