"use server";

import { createClient } from "@/lib/supabase/server";

export type UploadImageResult =
  | { ok: true; src: string; width: number; height: number }
  | { ok: false; error: string };

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function validateUuid(id: string): boolean {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

// =====================================================================
// uploadBoardImageAction
//
// Nhận File qua FormData, upload vào bucket `board-images` (path
// `<board_id>/<uuid>.<ext>`), trả về public URL + dimensions.
//
// Dimensions được client tự đo qua `new Image()` rồi gửi kèm — server
// không decode binary để tránh phụ thuộc image lib. Storage RLS đảm bảo
// chỉ editor/owner upload (xem migration 0008).
// =====================================================================
export async function uploadBoardImageAction(
  formData: FormData
): Promise<UploadImageResult> {
  const boardId = String(formData.get("board_id") ?? "").trim();
  const widthStr = String(formData.get("width") ?? "");
  const heightStr = String(formData.get("height") ?? "");
  const file = formData.get("file");

  if (!validateUuid(boardId)) return { ok: false, error: "Board không hợp lệ." };
  if (!(file instanceof File)) return { ok: false, error: "Thiếu file ảnh." };
  if (!ALLOWED_MIME.has(file.type))
    return { ok: false, error: "Định dạng ảnh không hỗ trợ (PNG/JPG/WebP/GIF)." };
  if (file.size > MAX_BYTES)
    return { ok: false, error: "Ảnh vượt quá 5MB." };

  const width = Number(widthStr);
  const height = Number(heightStr);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    return { ok: false, error: "Kích thước ảnh không hợp lệ." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Phiên đăng nhập đã hết." };

  const ext = EXT_BY_MIME[file.type] ?? "bin";
  // crypto.randomUUID an toàn ở server (Node >= 19).
  const objectName = `${boardId}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from("board-images")
    .upload(objectName, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: pub } = supabase.storage
    .from("board-images")
    .getPublicUrl(objectName);

  return { ok: true, src: pub.publicUrl, width, height };
}
