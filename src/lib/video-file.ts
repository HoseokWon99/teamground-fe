export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export function validateVideoFile(file: Pick<File, "name" | "type" | "size">): string {
  if (file.size === 0) return "비어 있는 파일은 업로드할 수 없습니다.";
  if (file.size > MAX_VIDEO_BYTES) return "영상은 최대 100 MiB까지 업로드할 수 있습니다.";
  const expected = /\.mp4$/i.test(file.name) ? "video/mp4" : /\.webm$/i.test(file.name) ? "video/webm" : undefined;
  if (!expected || (file.type && file.type !== expected)) return "MP4 또는 WebM 영상 파일을 선택해 주세요.";
  return "";
}
