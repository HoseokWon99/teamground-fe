import { describe, expect, it } from "vitest";
import { MAX_VIDEO_BYTES, validateVideoFile } from "./video-file";
describe("video file validation", () => {
  it("accepts MP4/WebM including OSes without a MIME type", () => {
    for (const [name, type] of [["take.MP4", "video/mp4"], ["take.webm", "video/webm"], ["take.mp4", ""]])
      expect(validateVideoFile({ name, type, size: MAX_VIDEO_BYTES })).toBe("");
  });
  it("rejects empty/oversized files, unsupported extensions and mismatched types", () => {
    for (const file of [
      { name: "take.mp4", type: "video/mp4", size: 0 },
      { name: "take.mp4", type: "video/mp4", size: MAX_VIDEO_BYTES + 1 },
      { name: "take.mov", type: "video/quicktime", size: 10 },
      { name: "take.mp4", type: "text/html", size: 10 },
    ]) expect(validateVideoFile(file)).not.toBe("");
  });
});
