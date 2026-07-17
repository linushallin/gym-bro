import type { MuscleGroup } from "@prisma/client";
import {
  Dumbbell,
  Rows3,
  Shield,
  Zap,
  Swords,
  Footprints,
  Target,
  type LucideIcon,
} from "lucide-react";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "ABS",
];

export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  CHEST: "Bröst",
  BACK: "Rygg",
  SHOULDERS: "Axlar",
  BICEPS: "Biceps",
  TRICEPS: "Triceps",
  LEGS: "Ben",
  ABS: "Mage",
};

export const MUSCLE_GROUP_ICON: Record<MuscleGroup, LucideIcon> = {
  CHEST: Dumbbell,
  BACK: Rows3,
  SHOULDERS: Shield,
  BICEPS: Zap,
  TRICEPS: Swords,
  LEGS: Footprints,
  ABS: Target,
};

// Fixed categorical slot order — validated for CVD separation, never cycled.
export const MUSCLE_GROUP_COLOR: Record<MuscleGroup, { light: string; dark: string }> = {
  CHEST: { light: "#eda100", dark: "#c98500" },
  BACK: { light: "#1baf7a", dark: "#199e70" },
  SHOULDERS: { light: "#2a78d6", dark: "#3987e5" },
  BICEPS: { light: "#4a3aa7", dark: "#9085e9" },
  TRICEPS: { light: "#e34948", dark: "#e66767" },
  LEGS: { light: "#008300", dark: "#008300" },
  ABS: { light: "#eb6834", dark: "#d95926" },
};

export function isMuscleGroup(value: string): value is MuscleGroup {
  return (MUSCLE_GROUPS as string[]).includes(value);
}

// Sort a set of groups into the canonical MUSCLE_GROUPS order.
export function sortGroups(groups: MuscleGroup[]): MuscleGroup[] {
  return MUSCLE_GROUPS.filter((g) => groups.includes(g));
}

// The display name of a session: its groups joined, e.g. "Bröst / Triceps".
export function sessionLabel(groups: MuscleGroup[]): string {
  return sortGroups(groups)
    .map((g) => MUSCLE_GROUP_LABEL[g])
    .join(" / ");
}
