import { useMemo, useRef, useState } from "react";
import type { MaterialItem } from "../types/materials";
import { Badge, type BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import {
  AlertCircleIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  LinkIcon,
  SearchIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
} from "./ui/Icons";
import { Input } from "./ui/Input";
import { Select, type SelectOption } from "./ui/Select";

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT_ATTR = ".pdf,.ppt,.pptx,.doc,.docx,.key,.odp,.odt,.png,.jpg,.jpeg,.webp";

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getKindMeta(item: MaterialItem): { label: string; tone: BadgeTone; previewType: "pdf" | "image" | null } {
  if (item.kind === "link") return { label: "LINK", tone: "blue", previewType: null };
  const name = (item.fileName || "").toLowerCase();
  if (name.endsWith(".pdf")) return { label: "PDF", tone: "violet", previewType: "pdf" };
  if (name.endsWith(".ppt") || name.endsWith(".pptx") || name.endsWith(".key") || name.endsWith(".odp")) {
    return { label: "SLIDES", tone: "green", previewType: null };
  }
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp")) {
    return { label: "IMAGE", tone: "blue", previewType: "image" };
  }
  return { label: "DOC", tone: "neutral", previewType: null };
}

function uploadToSignedUrl(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading file."));
    xhr.send(file);
  });
}

export interface MaterialsTabProps {
  groupId: number;
  groupName: string;
  isMyGroup: boolean;
  studentSn: number;
  regNo: string;
  defaultSubtopic: number | null;
  subtopicOptions: SelectOption<number>[];
  materials: MaterialItem[];
  storageConfigured: boolean;
  isLoading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onAdded: (item: MaterialItem) => void;
  onDeleted: (id: string) => void;
  onToast: (tone: "success" | "error", title: string, description?: string) => void;
}

export function MaterialsTab({
  groupId,
  groupName,
  isMyGroup,
  studentSn,
  regNo,
  defaultSubtopic,
  subtopicOptions,
  materials,
  storageConfigured,
  isLoading,
  loadError,
  onRetry,
  onAdded,
  onDeleted,
  onToast,
}: MaterialsTabProps) {
  const [mode, setMode] = useState<"file" | "link">(storageConfigured ? "file" : "link");
  const [subtopicIndex, setSubtopicIndex] = useState<number | null>(defaultSubtopic);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [subtopicFilter, setSubtopicFilter] = useState<number | "all">("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MaterialItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = (picked: File | null) => {
    setFormError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.size > MAX_BYTES) {
      setFormError("File exceeds the 25 MB limit.");
      onToast("error", "File too large", "Maximum allowed file size is 25 MB.");
      return;
    }
    setFile(picked);
    if (!title.trim()) {
      const noExt = picked.name.replace(/\.[^.]+$/, "");
      setTitle(noExt);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (subtopicIndex == null) {
      setFormError("Please select a subtopic for this material.");
      return;
    }
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFormError("Please enter a title.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "file") {
        if (!file) {
          setFormError("Please choose a file to upload.");
          setSubmitting(false);
          return;
        }
        setUploadPct(0);
        const signRes = await fetch(`/api/groups/${groupId}/materials/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regNo,
            subtopicIndex,
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }),
        });
        const signData = await signRes.json();
        if (!signRes.ok) {
          throw new Error(signData?.error || "Could not start upload.");
        }

        await uploadToSignedUrl(signData.signedUrl, file, setUploadPct);

        const saveRes = await fetch(`/api/groups/${groupId}/materials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regNo,
            kind: "file",
            subtopicIndex,
            title: cleanTitle,
            note: note.trim() || undefined,
            storagePath: signData.storagePath,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          }),
        });
        const saveData = await saveRes.json();
        if (!saveRes.ok) {
          throw new Error(saveData?.error || "Could not save material metadata.");
        }

        onAdded(saveData.material as MaterialItem);
        setFile(null);
        setTitle("");
        setNote("");
        setUploadPct(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onToast("success", "Material uploaded", `${cleanTitle} · Subtopic ${subtopicIndex + 1}`);
      } else {
        const res = await fetch(`/api/groups/${groupId}/materials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regNo,
            kind: "link",
            subtopicIndex,
            title: cleanTitle,
            note: note.trim() || undefined,
            externalUrl: externalUrl.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Could not add link.");
        }
        onAdded(data.material as MaterialItem);
        setExternalUrl("");
        setTitle("");
        setNote("");
        onToast("success", "Link added", `${cleanTitle} · Subtopic ${subtopicIndex + 1}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setFormError(msg);
      setUploadPct(null);
      onToast("error", "Could not add material", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/groups/${groupId}/materials/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regNo }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Could not delete material.");
      }
      onDeleted(id);
      setConfirmDeleteId(null);
      onToast("success", "Material removed");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete material.";
      onToast("error", "Delete failed", msg);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (subtopicFilter !== "all" && m.subtopicIndex !== subtopicFilter) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        (m.note || "").toLowerCase().includes(q) ||
        (m.fileName || "").toLowerCase().includes(q) ||
        m.uploaderName.toLowerCase().includes(q)
      );
    });
  }, [materials, search, subtopicFilter]);

  return (
    <div className="materials-section no-print">
      {isMyGroup && (
        <Card padding="lg" className="materials-upload-card">
          <div className="materials-upload-head">
            <div>
              <h2 className="my-selection-title">Share Group Material</h2>
              <p className="my-selection-sub">
                Upload slides, PDFs, docs, or diagrams (max 25 MB) or share a link for {groupName}.
              </p>
            </div>
            <div className="segmented" role="group" aria-label="Material type">
              <button
                type="button"
                className={`segmented-btn ${mode === "file" ? "is-active" : ""}`}
                onClick={() => {
                  setMode("file");
                  setFormError(null);
                }}
              >
                <UploadIcon size={14} />
                <span>Upload file</span>
              </button>
              <button
                type="button"
                className={`segmented-btn ${mode === "link" ? "is-active" : ""}`}
                onClick={() => {
                  setMode("link");
                  setFormError(null);
                }}
              >
                <LinkIcon size={14} />
                <span>Add link</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="materials-form">
            <div className="my-selection-grid">
              <Select
                label="Subtopic (required)"
                value={subtopicIndex}
                options={subtopicOptions}
                placeholder="Select a subtopic"
                onChange={(val) => {
                  setSubtopicIndex(val);
                  setFormError(null);
                }}
              />
              <Input
                label="Title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setFormError(null);
                }}
                placeholder={mode === "file" ? "e.g. Subtopic 2 Slide Deck" : "e.g. Google Slides Draft"}
                maxLength={140}
                required
              />
            </div>

            {mode === "file" ? (
              <div className="materials-dropzone-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_ATTR}
                  className="sr-only-input"
                  id="material-file-input"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor="material-file-input"
                  className={`materials-dropzone ${file ? "has-file" : ""}`}
                >
                  <UploadIcon size={20} />
                  {file ? (
                    <span className="materials-dropzone-text">
                      <strong>{file.name}</strong>
                      <span className="mono">{formatBytes(file.size)} · Tap to change</span>
                    </span>
                  ) : (
                    <span className="materials-dropzone-text">
                      <strong>Tap to choose a file</strong>
                      <span>PDF, PPT/PPTX, DOC/DOCX, KEY, ODP/ODT, PNG, JPG, WEBP · Max 25 MB</span>
                    </span>
                  )}
                </label>

                {uploadPct !== null && (
                  <div className="materials-progress">
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${uploadPct}%` }} />
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: "var(--color-ink-soft)" }}>
                      {uploadPct}%
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <Input
                label="URL"
                type="url"
                inputMode="url"
                value={externalUrl}
                onChange={(e) => {
                  setExternalUrl(e.target.value);
                  setFormError(null);
                }}
                placeholder="https://docs.google.com/presentation/..."
                required
              />
            )}

            <Input
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Updated speaker notes & circuit diagrams"
              maxLength={300}
            />

            {formError && (
              <p className="ui-field-error" role="alert">
                {formError}
              </p>
            )}

            <div className="my-selection-actions">
              <span className="my-selection-hint">
                {!storageConfigured && mode === "file"
                  ? "File storage is not configured yet—use Add link if needed."
                  : "Visible to all students; only you can delete your upload."}
              </span>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting
                  ? mode === "file"
                    ? "Uploading…"
                    : "Saving…"
                  : mode === "file"
                    ? "Upload material"
                    : "Add link"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loadError && (
        <Card padding="md" className="error-card" role="alert">
          <div className="error-card-body">
            <span className="error-card-icon" aria-hidden="true">
              <AlertCircleIcon size={18} />
            </span>
            <div>
              <p className="error-card-title">Could not load materials</p>
              <p className="error-card-desc">{loadError}</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </Card>
      )}

      <div className="filter-row">
        <div className="filter-search">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search materials by title, note, or uploader…"
            leadingIcon={<SearchIcon size={15} />}
            aria-label="Search materials"
          />
        </div>
        <div className="filter-pills" role="group" aria-label="Filter materials by subtopic">
          <button
            type="button"
            className={`filter-pill ${subtopicFilter === "all" ? "is-active" : ""}`}
            onClick={() => setSubtopicFilter("all")}
          >
            All ({isLoading ? "…" : materials.length})
          </button>
          {subtopicOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filter-pill ${subtopicFilter === opt.value ? "is-active" : ""}`}
              onClick={() => setSubtopicFilter(opt.value)}
            >
              Subtopic {opt.value + 1}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="materials-grid" aria-busy="true" aria-label="Loading materials">
          {[1, 2, 3].map((n) => (
            <Card key={n} padding="md">
              <div className="stat-skeleton">
                <span className="skeleton-line skeleton-line--sm" />
                <span className="skeleton-line skeleton-line--lg" />
                <span className="skeleton-line skeleton-line--md" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card padding="lg" variant="cloud">
          <div className="empty-state">
            {materials.length === 0
              ? isMyGroup
                ? "No materials shared yet. Upload a slide deck, PDF, or link above to get started."
                : `No materials have been shared by ${groupName} yet.`
              : "No materials match your current filter."}
          </div>
        </Card>
      ) : (
        <div className="materials-grid">
          {filtered.map((item) => {
            const meta = getKindMeta(item);
            const isOwner = isMyGroup && item.studentSn === studentSn;
            const dateLabel = new Date(item.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });

            return (
              <div key={item.id} className="material-doc">
                <div className="material-doc-inner">
                  <span className="material-doc-fold" aria-hidden="true" />
                  <div className="material-card-top">
                    <div className="material-card-badges">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <Badge tone="neutral">Subtopic {item.subtopicIndex + 1}</Badge>
                    </div>
                    <span className="material-card-date mono">{dateLabel}</span>
                  </div>

                  <div className="material-card-body">
                    <h3 className="material-card-title">{item.title}</h3>
                    {item.note && <p className="material-card-note">{item.note}</p>}
                    <p className="material-card-meta">
                      <span>{item.uploaderName}</span>
                      {item.sizeBytes ? (
                        <span className="mono"> · {formatBytes(item.sizeBytes)}</span>
                      ) : null}
                    </p>
                  </div>

                  <div className="material-card-actions">
                    {item.kind === "file" ? (
                      <>
                        {meta.previewType && item.previewUrl && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setPreviewItem(item)}
                          >
                            <EyeIcon size={14} />
                            <span>Preview</span>
                          </Button>
                        )}
                        {item.downloadUrl && (
                          <a
                            href={item.downloadUrl}
                            download={item.fileName || item.title}
                            className="ui-btn ui-btn--secondary ui-btn--sm material-link-btn"
                          >
                            <DownloadIcon size={14} />
                            <span>Download</span>
                          </a>
                        )}
                      </>
                    ) : (
                      item.externalUrl && (
                        <a
                          href={item.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ui-btn ui-btn--secondary ui-btn--sm material-link-btn"
                        >
                          <ExternalLinkIcon size={14} />
                          <span>Open link</span>
                        </a>
                      )
                    )}

                    {isOwner && (
                      confirmDeleteId === item.id ? (
                        <div className="material-delete-confirm">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === item.id}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={deletingId === item.id}
                            className="material-delete-btn"
                            onClick={() => handleDelete(item.id)}
                          >
                            {deletingId === item.id ? "Removing…" : "Confirm"}
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="material-trash-btn"
                          aria-label={`Delete ${item.title}`}
                          title="Delete"
                          onClick={() => setConfirmDeleteId(item.id)}
                        >
                          <TrashIcon size={16} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inline PDF / Image Preview Modal */}
      {previewItem && previewItem.previewUrl && (
        <div
          className="preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewItem.title}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewItem(null);
          }}
        >
          <div className="preview-modal">
            <div className="preview-modal-head">
              <div style={{ minWidth: 0 }}>
                <h3 className="preview-modal-title">{previewItem.title}</h3>
                {previewItem.fileName && (
                  <p className="preview-modal-sub mono">{previewItem.fileName}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {previewItem.downloadUrl && (
                  <a
                    href={previewItem.downloadUrl}
                    download={previewItem.fileName || previewItem.title}
                    className="ui-btn ui-btn--secondary ui-btn--sm material-link-btn"
                  >
                    <DownloadIcon size={14} />
                    <span>Download</span>
                  </a>
                )}
                <button
                  type="button"
                  className="ui-toast-close"
                  aria-label="Close preview"
                  onClick={() => setPreviewItem(null)}
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>
            <div className="preview-modal-body">
              {getKindMeta(previewItem).previewType === "image" ? (
                <img
                  src={previewItem.previewUrl}
                  alt={previewItem.title}
                  className="preview-img"
                />
              ) : (
                <iframe
                  src={previewItem.previewUrl}
                  title={previewItem.title}
                  className="preview-iframe"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
