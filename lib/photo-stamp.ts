// Burn a watermark (FUTEX + optional name + PHT time + GPS) onto a photo.
// Used for installer on-site update photos so the client documentation shows
// who took the photo, when, and where.

export function getGeo(): Promise<{ lat: number | null; lng: number | null }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation)
      return resolve({ lat: null, lng: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Stamp a photo with FUTEX + name + PHT timestamp + GPS. Geo fetched if omitted. */
export async function stampPhoto(
  src: File,
  opts: { name?: string; geo?: { lat: number | null; lng: number | null } } = {},
): Promise<File> {
  const geo = opts.geo ?? (await getGeo());
  const url = URL.createObjectURL(src);
  try {
    const img = await loadImage(url);
    const maxW = 1280;
    const scale = Math.min(1, maxW / (img.width || maxW));
    const w = Math.round((img.width || maxW) * scale);
    const h = Math.round((img.height || maxW) * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0, w, h);

    const now = new Date();
    const stamp =
      now.toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Manila",
      }) + " PHT";
    const loc =
      geo.lat != null && geo.lng != null
        ? `GPS ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`
        : "GPS unavailable";
    const lines = [
      "FUTEX Energy Solution",
      ...(opts.name ? [opts.name] : []),
      stamp,
      loc,
    ];

    const fontSize = Math.max(14, Math.round(w * 0.032));
    const pad = Math.round(w * 0.02);
    const lineH = Math.round(fontSize * 1.35);
    const bandH = lineH * lines.length + pad;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, h - bandH, w, bandH);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.textBaseline = "alphabetic";
    lines.forEach((ln, i) => {
      const y = h - pad - (lines.length - 1 - i) * lineH;
      ctx.fillText(ln, pad, y);
    });

    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.85),
    );
    if (!blob) return src;
    return new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
  } catch {
    return src;
  } finally {
    URL.revokeObjectURL(url);
  }
}
