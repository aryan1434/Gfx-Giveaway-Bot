const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");
const GIFEncoder = require("gif-encoder-2");
const sharp = require("sharp");
const path = require("path");

GlobalFonts.registerFromPath(path.join(__dirname, "fonts", "Inter-Bold.ttf"), "Inter");

const COLOR_PALETTES = {
  green_black: ["#00BD5B", "#1a1a1a", "#009944", "#2d2d2d", "#007A3A", "#3d3d3d", "#00CC66", "#4d4d4d", "#00AA55", "#5d5d5d"],
  vibrant: ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe"],
  pastel: ["#FFB5E8", "#B5DEFF", "#BFFCC6", "#FFF5BA", "#FFCBC1", "#C4FAF8", "#E7FFAC", "#DCD3FF", "#FFC9DE", "#FFFFD1"],
  sunset: ["#FF6B6B", "#FFA07A", "#FFD93D", "#6BCB77", "#4D96FF", "#9B59B6", "#FF8C94", "#91EAE4", "#FFB6B9", "#FAF3DD"],
  ocean: ["#0077B6", "#00B4D8", "#90E0EF", "#CAF0F8", "#023E8A", "#0096C7", "#48CAE4", "#ADE8F4", "#03045E", "#00B4D8"],
  uplup: ["#6C60D7", "#FC9E9E", "#4CAF50", "#FF9800", "#2196F3", "#9C27B0", "#00BCD4", "#E91E63", "#8BC34A", "#FF5722"],
};

async function generateWheelGIF(entries, options = {}) {  const {
    width = 400,
    height = 400,
    duration = 4000,
    fps = 20,
    colorPalette = "uplup",
    winner = null,
    spinRevolutions = 4,
  } = options;

  const colors = COLOR_PALETTES[colorPalette] || COLOR_PALETTES.green_black;
  const totalFrames = Math.floor((duration / 1000) * fps);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 20;
  const sliceAngle = (2 * Math.PI) / entries.length;

  let winnerIndex = options.winnerIndex;
  if (winnerIndex === undefined || winnerIndex < 0 || winnerIndex >= entries.length) {
    winnerIndex = winner ? entries.indexOf(winner) : Math.floor(Math.random() * entries.length);
  }
  if (winnerIndex === -1) winnerIndex = Math.floor(Math.random() * entries.length);

  const winnerSliceCenter = winnerIndex * sliceAngle + sliceAngle / 2;
  const targetAngle = Math.PI * 1.5 - winnerSliceCenter;
  const totalRotation = spinRevolutions * 2 * Math.PI + targetAngle;

  const encoder = new GIFEncoder(width, height, "neuquant", true);
  encoder.setDelay(Math.floor(1000 / fps));
  encoder.setRepeat(-1);
  encoder.start();

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  for (let frame = 0; frame < totalFrames; frame++) {
    const progress = frame / (totalFrames - 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const currentRotation = totalRotation * easedProgress;

    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentRotation);

    for (let i = 0; i < entries.length; i++) {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const fontSize = Math.max(8, Math.min(20, Math.floor(600 / entries.length)));
      ctx.font = `bold ${fontSize}px Inter`;

      let displayName = entries[i];
      const maxLength = Math.floor(radius / 10);
      if (displayName.length > maxLength) {
        displayName = displayName.substring(0, maxLength - 2) + "..";
      }

      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.strokeText(displayName, radius - 15, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(displayName, radius - 15, 0);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, 2 * Math.PI);
    ctx.fillStyle = "#00BD5B"; // Green center
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    ctx.beginPath();
    // White triangle pointer like wheelofnames.com — tip at wheel edge, points down
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX - 20, centerY - radius - 38);
    ctx.lineTo(centerX + 20, centerY - radius - 38);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Small shadow for depth
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius + 4);
    ctx.lineTo(centerX - 18, centerY - radius - 34);
    ctx.lineTo(centerX, centerY - radius - 34);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fill();

    encoder.addFrame(ctx);
  }

  for (let i = 0; i < fps; i++) {
    encoder.addFrame(ctx);
  }

  encoder.finish();
  const gifBuffer = encoder.out.getData();
  // Convert the animated GIF to an animated WebP (Discord renders these natively)
  const webpBuffer = await sharp(gifBuffer, { animated: true })
    .webp({ animated: true, loop: 0, quality: 90 })
    .toBuffer();
  // winnerIndex is the slice whose center lands exactly under the fixed top arrow
  return {
    buffer: webpBuffer,
    winnerIndex,
    winner: entries[winnerIndex],
    spinDuration: duration,
  };
}

module.exports = { generateWheelGIF, COLOR_PALETTES };
