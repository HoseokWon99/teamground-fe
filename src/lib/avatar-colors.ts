export function avatarColors(color?: string) {
  const background = color && /^#[\da-f]{6}$/i.test(color) ? color : "#dde9df";
  const channels = [1, 3, 5].map((offset) => {
    const channel = parseInt(background.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  // Choose the higher contrast of black and white for the supplied background.
  return {
    background,
    color: (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000" : "#fff",
  };
}
