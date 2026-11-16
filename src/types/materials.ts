export type MaterialItem = {
  id: string;
  groupId: number;
  studentSn: number;
  uploaderName: string;
  uploaderRegNo: string;
  subtopicIndex: number;
  kind: "file" | "link";
  title: string;
  note: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  externalUrl: string | null;
  previewUrl: string | null;
  downloadUrl: string | null;
  createdAt: string;
};
