// Generate a high-quality 512x512 PNG icon for Port Manager
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 512;

// Color helpers
function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo = 0, hi = 255) { return Math.max(lo, Math.min(hi, Math.round(v))); }

function lerpColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1) / 255;
  return t * t * (3 - 2 * t);
}

function distSq(x1, y1, x2, y2) { return (x1 - x2) ** 2 + (y1 - y2) ** 2; }
function dist(x1, y1, x2, y2) { return Math.sqrt(distSq(x1, y1, x2, y2)); }

// Distance from point to line segment
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(px, py, x1, y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}

// Rounded rect SDF (signed distance)
function roundedRectSDF(px, py, cx, cy, hw, hh, r) {
  const dx = Math.max(Math.abs(px - cx) - hw + r, 0);
  const dy = Math.max(Math.abs(py - cy) - hh + r, 0);
  return Math.sqrt(dx * dx + dy * dy) - r;
}

function createPixelData() {
  const data = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  const cx = SIZE / 2, cy = SIZE / 2;

  // Palette
  const bgTop = hexToRgb('#0c1929');
  const bgBot = hexToRgb('#152238');
  const accentBlue = hexToRgb('#3b82f6');
  const accentCyan = hexToRgb('#22d3ee');
  const accentLight = hexToRgb('#60a5fa');
  const nodeGlow = hexToRgb('#1d4ed8');
  const white = [255, 255, 255];

  // Layout
  const rr = SIZE * 0.42;  // rounded rect half-size
  const cornerR = SIZE * 0.18; // corner radius

  // Network nodes layout (hub-spoke)
  const hubX = cx, hubY = cy - SIZE * 0.02;
  const hubR = SIZE * 0.075;
  const spokeR = SIZE * 0.042;
  const armLen = SIZE * 0.22;

  // 5 outer nodes evenly spaced
  const nodeAngles = [-90, -18, 54, 126, 198].map(a => a * Math.PI / 180);
  const outerNodes = nodeAngles.map(a => ({
    x: hubX + Math.cos(a) * armLen,
    y: hubY + Math.sin(a) * armLen,
  }));

  // Secondary connections (mesh lines between some outer nodes)
  const meshPairs = [[0, 1], [1, 2], [3, 4], [0, 4]];

  for (let y = 0; y < SIZE; y++) {
    const rowOff = y * (SIZE * 4 + 1);
    data[rowOff] = 0; // filter byte
    for (let x = 0; x < SIZE; x++) {
      const px = rowOff + 1 + x * 4;
      let r = 0, g = 0, b = 0, a = 0;

      // 1. Rounded rectangle background
      const sdf = roundedRectSDF(x, y, cx, cy, rr, rr, cornerR);
      if (sdf < 1.5) {
        const bgAlpha = sdf < 0 ? 1 : Math.max(0, 1 - sdf / 1.5);

        // Vertical gradient bg
        const gradT = (y - (cy - rr)) / (2 * rr);
        const bg = lerpColor(bgTop, bgBot, gradT);

        // Subtle radial glow from center
        const cDist = dist(x, y, hubX, hubY);
        const glowT = Math.max(0, 1 - cDist / (SIZE * 0.45));
        const glowColor = lerpColor(bg, hexToRgb('#0f2847'), glowT * glowT * 0.6);

        r = glowColor[0]; g = glowColor[1]; b = glowColor[2];
        a = clamp(bgAlpha * 255);

        // 2. Mesh lines (behind everything, faint)
        for (const [i, j] of meshPairs) {
          const n1 = outerNodes[i], n2 = outerNodes[j];
          const d = distToSegment(x, y, n1.x, n1.y, n2.x, n2.y);
          if (d < 4) {
            const lineAlpha = Math.max(0, 1 - d / 4) * 0.15;
            r = lerp(r, accentCyan[0], lineAlpha);
            g = lerp(g, accentCyan[1], lineAlpha);
            b = lerp(b, accentCyan[2], lineAlpha);
          }
        }

        // 3. Spoke lines (hub to each outer node)
        for (const node of outerNodes) {
          const d = distToSegment(x, y, hubX, hubY, node.x, node.y);
          if (d < 3.5) {
            const lineAlpha = Math.max(0, 1 - d / 3.5) * 0.7;
            // Gradient along line: blue near hub -> cyan near node
            const toNode = dist(x, y, node.x, node.y);
            const toHub = dist(x, y, hubX, hubY);
            const lineT = toHub / (toHub + toNode + 0.001);
            const lineCol = lerpColor(accentBlue, accentCyan, lineT);
            r = lerp(r, lineCol[0], lineAlpha);
            g = lerp(g, lineCol[1], lineAlpha);
            b = lerp(b, lineCol[2], lineAlpha);
          }
        }

        // 4. Outer node glows
        for (const node of outerNodes) {
          const d = dist(x, y, node.x, node.y);
          // Soft glow
          if (d < spokeR * 4) {
            const glAlpha = Math.max(0, 1 - d / (spokeR * 4));
            r = lerp(r, accentCyan[0], glAlpha * glAlpha * 0.12);
            g = lerp(g, accentCyan[1], glAlpha * glAlpha * 0.12);
            b = lerp(b, accentCyan[2], glAlpha * glAlpha * 0.12);
          }
          // Solid node
          if (d < spokeR + 1.5) {
            const nodeAlpha = d < spokeR ? 1 : Math.max(0, 1 - (d - spokeR) / 1.5);
            // Radial gradient on node: bright center -> accent edge
            const innerT = d / spokeR;
            const nodeCol = lerpColor(white, accentCyan, Math.min(1, innerT * 0.6 + 0.3));
            r = lerp(r, nodeCol[0], nodeAlpha);
            g = lerp(g, nodeCol[1], nodeAlpha);
            b = lerp(b, nodeCol[2], nodeAlpha);
            a = clamp(Math.max(a, nodeAlpha * 255));
          }
          // Bright ring
          if (d > spokeR - 2 && d < spokeR + 2) {
            const ringAlpha = Math.max(0, 1 - Math.abs(d - spokeR) / 2) * 0.4;
            r = lerp(r, 255, ringAlpha);
            g = lerp(g, 255, ringAlpha);
            b = lerp(b, 255, ringAlpha);
          }
        }

        // 5. Central hub glow
        const hubDist = dist(x, y, hubX, hubY);
        if (hubDist < hubR * 5) {
          const glAlpha = Math.max(0, 1 - hubDist / (hubR * 5));
          r = lerp(r, accentBlue[0], glAlpha * glAlpha * 0.2);
          g = lerp(g, accentBlue[1], glAlpha * glAlpha * 0.2);
          b = lerp(b, accentBlue[2], glAlpha * glAlpha * 0.2);
        }

        // 6. Central hub solid
        if (hubDist < hubR + 2) {
          const hubAlpha = hubDist < hubR ? 1 : Math.max(0, 1 - (hubDist - hubR) / 2);
          // Radial gradient: white center -> blue edge
          const innerT = hubDist / hubR;
          const hubCol = lerpColor(white, accentBlue, Math.min(1, innerT * 0.5 + 0.2));
          r = lerp(r, hubCol[0], hubAlpha);
          g = lerp(g, hubCol[1], hubAlpha);
          b = lerp(b, hubCol[2], hubAlpha);
          a = clamp(Math.max(a, hubAlpha * 255));
        }
        // Hub bright ring
        if (hubDist > hubR - 2.5 && hubDist < hubR + 2.5) {
          const ringAlpha = Math.max(0, 1 - Math.abs(hubDist - hubR) / 2.5) * 0.5;
          r = lerp(r, 255, ringAlpha);
          g = lerp(g, 255, ringAlpha);
          b = lerp(b, 255, ringAlpha);
        }

        // 7. Data flow dots (small bright dots along spokes)
        for (let si = 0; si < outerNodes.length; si++) {
          const node = outerNodes[si];
          const dotPos = 0.35 + si * 0.08; // stagger dots
          const dotX = hubX + (node.x - hubX) * dotPos;
          const dotY = hubY + (node.y - hubY) * dotPos;
          const dotR = 4;
          const dd = dist(x, y, dotX, dotY);
          if (dd < dotR + 2) {
            const dotAlpha = dd < dotR ? 1 : Math.max(0, 1 - (dd - dotR) / 2);
            r = lerp(r, 255, dotAlpha * 0.9);
            g = lerp(g, 255, dotAlpha * 0.9);
            b = lerp(b, 255, dotAlpha * 0.9);
          }
        }

        // 8. Subtle border on the rounded rect
        if (sdf > -2.5 && sdf < 1.5) {
          const borderAlpha = Math.max(0, 1 - Math.abs(sdf + 0.5) / 2) * 0.25;
          r = lerp(r, accentLight[0], borderAlpha);
          g = lerp(g, accentLight[1], borderAlpha);
          b = lerp(b, accentLight[2], borderAlpha);
        }
      }

      data[px] = clamp(r);
      data[px + 1] = clamp(g);
      data[px + 2] = clamp(b);
      data[px + 3] = clamp(a);
    }
  }
  return data;
}

function createPNG(pixelData, size) {
  const compressed = zlib.deflateSync(pixelData, { level: 9 });

  function crc32(buf) {
    let crc = 0xffffffff;
    const table = new Int32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeData = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeData));
    return Buffer.concat([len, typeData, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

console.log('Generating 512x512 icon...');
const pixels = createPixelData();
const png = createPNG(pixels, SIZE);
const outPath = path.join(__dirname, '..', 'public', 'icon.png');
fs.writeFileSync(outPath, png);
console.log('Icon created at', outPath, '(' + png.length + ' bytes)');
