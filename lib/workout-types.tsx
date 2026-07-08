import type { WorkoutType } from "@prisma/client";
import {
  Shield,
  Rows3,
  Dumbbell,
  Footprints,
  Target,
  Zap,
  Combine,
  Swords,
  type LucideIcon,
} from "lucide-react";

export const WORKOUT_TYPES: WorkoutType[] = [
  "SHOULDERS",
  "BACK_BICEPS",
  "CHEST_TRICEPS",
  "LEGS",
  "ABS",
  "ARMS",
  "BACK_CHEST",
  "SHOULDERS_ARMS",
];

export const WORKOUT_TYPE_LABEL: Record<WorkoutType, string> = {
  SHOULDERS: "Axlar",
  BACK_BICEPS: "Rygg och biceps",
  CHEST_TRICEPS: "Bröst och triceps",
  LEGS: "Ben",
  ABS: "Mage",
  ARMS: "Biceps/Triceps",
  BACK_CHEST: "Rygg/Bröst",
  SHOULDERS_ARMS: "Axlar/Armar",
};

export const WORKOUT_TYPE_ICON: Record<WorkoutType, LucideIcon> = {
  SHOULDERS: Shield,
  BACK_BICEPS: Rows3,
  CHEST_TRICEPS: Dumbbell,
  LEGS: Footprints,
  ABS: Target,
  ARMS: Zap,
  BACK_CHEST: Combine,
  SHOULDERS_ARMS: Swords,
};

// Fixed categorical slot order — validated for CVD separation, never cycled.
export const WORKOUT_TYPE_COLOR: Record<WorkoutType, { light: string; dark: string }> = {
  SHOULDERS: { light: "#2a78d6", dark: "#3987e5" },
  BACK_BICEPS: { light: "#1baf7a", dark: "#199e70" },
  CHEST_TRICEPS: { light: "#eda100", dark: "#c98500" },
  LEGS: { light: "#008300", dark: "#008300" },
  ABS: { light: "#4a3aa7", dark: "#9085e9" },
  ARMS: { light: "#e34948", dark: "#e66767" },
  BACK_CHEST: { light: "#e87ba4", dark: "#d55181" },
  SHOULDERS_ARMS: { light: "#eb6834", dark: "#d95926" },
};

export function isWorkoutType(value: string): value is WorkoutType {
  return (WORKOUT_TYPES as string[]).includes(value);
}
