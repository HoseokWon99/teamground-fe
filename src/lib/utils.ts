import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function displayDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(
    new Date(
      value.includes("T")
        ? /[Z+]/.test(value)
          ? value
          : `${value}+09:00`
        : `${value}T00:00:00+09:00`,
    ),
  );
}
export function displayTime(value: string) {
  return value.slice(11, 16);
}
