import { CircleCheck, CircleHelp, CircleAlert, TriangleAlert } from "lucide-react";
import { getConfidenceTier } from "@/lib/types";
import type { ConfidenceTier } from "@/lib/types";

export const tierOf = getConfidenceTier;

// One place for how each confidence tier looks, so the landing page, the
// diagnose result and the dashboard log can't drift apart (PRD §2.1: a
// low-confidence result must read as hedged everywhere it is shown).
// Every tier has a word and an icon shape as well as a colour.
export const TIER_META: Record<
  ConfidenceTier,
  { label: string; text: string; bar: string; tint: string; border: string; solid: string; Icon: typeof CircleCheck }
> = {
  high: { label: "High confidence", text: "text-success", bar: "bg-success", tint: "bg-success/[0.06]", border: "border-success/40", solid: "border-success", Icon: CircleCheck },
  moderate: { label: "Moderate confidence", text: "text-warning", bar: "bg-warning", tint: "bg-warning/[0.06]", border: "border-warning/40", solid: "border-warning", Icon: TriangleAlert },
  low: { label: "Low confidence", text: "text-danger", bar: "bg-danger", tint: "bg-danger/[0.06]", border: "border-danger/40", solid: "border-danger", Icon: CircleAlert },
  unknown: { label: "Confidence unknown", text: "text-muted", bar: "bg-muted", tint: "bg-foreground/[0.03]", border: "border-border", solid: "border-muted", Icon: CircleHelp },
};
