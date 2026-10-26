// Layout helpers so one scene works in 16:9, 9:16 and 1:1.
import { useVideoConfig } from 'remotion';

export type Format = '16:9' | '9:16' | '1:1';

export const FORMATS: Record<Format, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
};

export type Layout = {
  width: number;
  height: number;
  format: Format;
  isWide: boolean;
  isVertical: boolean;
  isSquare: boolean;
  /** 1% of the shorter side. Size text and shapes in units so they scale with the format. */
  unit: number;
  cx: number;
  cy: number;
  /** Area clear of platform UI: 9:16 keeps more room at the top and bottom for app overlays. */
  safe: { top: number; left: number; right: number; bottom: number; width: number; height: number };
  /** Picks a value per format: pick({ wide: 3, vertical: 1, square: 2 }). Missing keys fall back to wide. */
  pick: <T>(v: { wide: T; vertical?: T; square?: T }) => T;
};

export function useLayout(): Layout {
  const { width, height } = useVideoConfig();
  const ratio = width / height;
  const format: Format = ratio > 1.2 ? '16:9' : ratio < 0.83 ? '9:16' : '1:1';
  const isWide = format === '16:9', isVertical = format === '9:16', isSquare = format === '1:1';
  const mx = width * (isVertical ? 0.07 : 0.05), top = height * (isVertical ? 0.12 : 0.06), bottom = height * (isVertical ? 0.2 : 0.06);
  return {
    width, height, format, isWide, isVertical, isSquare,
    unit: Math.min(width, height) / 100,
    cx: width / 2, cy: height / 2,
    safe: { top, left: mx, right: width - mx, bottom: height - bottom, width: width - 2 * mx, height: height - top - bottom },
    pick: v => (isVertical ? v.vertical ?? v.wide : isSquare ? v.square ?? v.wide : v.wide),
  };
}
