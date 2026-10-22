/**
 * Meeting URLs. The web app uses path routes (/m/{id}); the desktop app is a static export
 * that cannot pre-render unknown IDs, so it uses query routes (/m?id={id}).
 */
export const STATIC_EXPORT = process.env["NEXT_PUBLIC_STATIC_EXPORT"] === "1";

export function meetingHref(meetingId: string, staticExport = STATIC_EXPORT): string {
  const id = encodeURIComponent(meetingId);
  return staticExport ? `/m?id=${id}` : `/m/${id}`;
}

export function lobbyHref(meetingId: string, staticExport = STATIC_EXPORT): string {
  const id = encodeURIComponent(meetingId);
  return staticExport ? `/m/lobby?id=${id}` : `/m/${id}/lobby`;
}
