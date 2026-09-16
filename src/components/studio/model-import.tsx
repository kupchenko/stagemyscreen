"use client";
import { useEffect, useRef, useState } from "react";
import {
  Box,
  FolderOpen,
  LoaderCircle,
  Upload,
  AlertCircle,
} from "lucide-react";
import type { ImportedModel } from "@/lib/imported-model";
import { Modal } from "./controls";

export function ModelImport({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (model: ImportedModel) => void;
}) {
  const files = useRef<HTMLInputElement>(null),
    folder = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const importFiles = async (selected: File[]) => {
    if (!selected.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const { importModelFiles } = await import("@/lib/custom-models");
      const model = await importModelFiles(selected);
      if (active.current) onImport(model);
    } catch (e) {
      if (active.current)
        setError(
          e instanceof Error
            ? e.message
            : "Could not read this model. Try exporting it as glTF 2.0.",
        );
    } finally {
      if (active.current) setBusy(false);
    }
  };
  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    void importFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };
  return (
    <Modal title="Bring your own model" onClose={onClose}>
      <p className="modal-description">
        Your hardware. Your materials. The same studio.
      </p>
      <input
        ref={files}
        type="file"
        hidden
        multiple
        accept=".glb,.gltf,.usdz,.bin,.png,.jpg,.jpeg,.webp"
        aria-label="Choose 3D model files"
        onChange={onFiles}
      />
      <input
        ref={(el) => {
          folder.current = el;
          el?.setAttribute("webkitdirectory", "");
        }}
        type="file"
        hidden
        multiple
        aria-label="Choose 3D model folder"
        onChange={onFiles}
      />
      <button
        className="model-import-drop"
        disabled={busy}
        onClick={() => files.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          void importFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <span className="model-import-icon">
          {busy ? (
            <LoaderCircle size={30} className="animate-spin" />
          ) : (
            <Box size={32} strokeWidth={1.4} />
          )}
        </span>
        <strong>
          {busy ? "Preparing your model…" : "Choose a GLB, glTF, or USDZ file"}
        </strong>
        <span>
          {busy
            ? "Reading geometry, materials, and textures"
            : "or drop your model and its files here"}
        </span>
        <small>Up to 64 MB · GLB / glTF / USDZ</small>
      </button>
      <div className="model-import-help">
        <p>
          <strong>GLB & USDZ</strong> include the model and its textures in one
          file.
        </p>
        <p>
          <strong>glTF</strong> needs its .bin files and textures too. Select
          them together, or choose a folder containing one model.
        </p>
        <button
          className="add-device-button"
          disabled={busy}
          onClick={() => folder.current?.click()}
        >
          <FolderOpen size={16} />
          Choose model folder
        </button>
      </div>
      {error ? (
        <p className="model-import-error" role="alert">
          <AlertCircle size={17} />
          <span>{error}</span>
        </p>
      ) : null}
      <p className="model-local-note">
        <Upload size={14} />
        Files stay on this device and are included when you save the project.
      </p>
    </Modal>
  );
}
