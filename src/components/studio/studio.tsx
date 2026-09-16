"use client";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  Eye,
  EyeOff,
  File as FileIcon,
  FilePlus,
  FolderOpen,
  ImagePlus,
  Layers,
  LayoutTemplate,
  LoaderCircle,
  Maximize,
  Minus,
  MousePointer2,
  Move,
  PanelLeftClose,
  Plus,
  Redo2,
  Rotate3D,
  RotateCcw,
  Save,
  SaveAll,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  X,
  Box,
  Grid2X2,
} from "lucide-react";
import {
  aspect,
  BACKGROUNDS,
  blankProject,
  CATALOG,
  finishFor,
  finishesFor,
  upgradeProject,
  newDevice,
  newCustomDevice,
  applyPreset,
  uid,
  validateProject,
  type Asset,
  type Device,
  type DeviceKind,
  type Preset,
  type Project,
} from "@/lib/studio";
import { SceneCanvas, type CanvasHandle } from "./canvas";
import { DeviceIcon, Modal, RangeControl, Toggle } from "./controls";
import { LightingControls } from "./lighting-controls";
import { ModelImport } from "./model-import";
import { ModelScreenControls } from "./model-screen-controls";
import { MODEL_LIBRARY_LIMIT, type ImportedModel } from "@/lib/imported-model";
import { DEFAULT_LIGHTING } from "@/lib/scene-lighting";
import {
  EXPORT_WIDTHS,
  MAX_EXPORT_EDGE,
  MAX_EXPORT_PIXELS,
  type ExportQuality,
} from "@/lib/export-quality";

interface History {
  past: Project[];
  present: Project;
  future: Project[];
  group?: string;
  // Edits that are not in the saved project file yet.
  dirty: boolean;
}
type Action =
  | { type: "change"; update: (p: Project) => Project; group?: string }
  | { type: "undo" | "redo" | "end" | "saved" }
  | { type: "load"; project: Project };
function reducer(s: History, a: Action): History {
  if (a.type === "load")
    return { past: [], present: a.project, future: [], dirty: false };
  if (a.type === "saved") return { ...s, dirty: false };
  if (a.type === "end") return { ...s, group: undefined };
  if (a.type === "undo") {
    if (!s.past.length) return s;
    return {
      past: s.past.slice(0, -1),
      present: s.past[s.past.length - 1],
      future: [s.present, ...s.future],
      dirty: true,
    };
  }
  if (a.type === "redo") {
    if (!s.future.length) return s;
    return {
      past: [...s.past, s.present],
      present: s.future[0],
      future: s.future.slice(1),
      dirty: true,
    };
  }
  if (a.type === "change") {
    const next = a.update(upgradeProject(s.present));
    if (next === s.present) return s;
    return {
      past:
        a.group && a.group === s.group
          ? s.past
          : [...s.past.slice(-49), s.present],
      present: next,
      future: [],
      group: a.group,
      dirty: true,
    };
  }
  return s;
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
const PROJECT_EXTENSION = ".stagemyscreen";
function projectFileName(projectName: string) {
  const base = projectName
    .replace(/[^a-z0-9_-]/gi, "-")
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
  return `${base || "untitled"}${PROJECT_EXTENSION}`;
}
type SaveFilePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandle>;
// Chromium can let the person choose the name and folder, and later saves then
// overwrite that same file. Other browsers collect the name in the studio and
// write to the download folder.
function savePicker() {
  return (window as unknown as { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker;
}
const PRESETS: { id: Preset; name: string; subtitle: string }[] = [
  {
    id: "showcase",
    name: "The device family",
    subtitle: "Display, iPhone & iPad",
  },
  { id: "duo", name: "Better together", subtitle: "Desktop meets mobile" },
  {
    id: "floating",
    name: "A different angle",
    subtitle: "Let your screens float",
  },
  { id: "hero", name: "The spotlight", subtitle: "One screen. All the focus." },
];

export default function Studio() {
  const [history, dispatch] = useReducer(reducer, undefined, () => ({
    past: [],
    present: blankProject(),
    future: [],
    dirty: false,
  }));
  const project = useMemo(
    () => upgradeProject(history.present),
    [history.present],
  );
  const [selectedId, select] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<"devices" | "uploads">("devices");
  const [inspector, setInspector] = useState<"device" | "scene">("scene");
  const [mode, setMode] = useState<"move" | "rotate">("move");
  const [modal, setModal] = useState<
    "export" | "help" | "save" | "discard" | null
  >(null);
  const [saveName, setSaveName] = useState("");
  const [showModelImport, setShowModelImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false),
    [showMenu, setShowMenu] = useState(false),
    [showTemplates, setShowTemplates] = useState(true),
    [mobilePanel, setMobilePanel] = useState<"left" | "right" | null>(null);
  const [toast, setToast] = useState("");
  const [requestedExportWidth, setExportWidth] = useState(7680),
    [transparent, setTransparent] = useState(true),
    [exporting, setExporting] = useState(false),
    [uploading, setUploading] = useState(false);
  const [exportQuality, setExportQuality] = useState<ExportQuality>("ultra");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportResult, setExportResult] = useState<{
    url: string;
    downloadUrl: string;
    filename: string;
    width: number;
    height: number;
  } | null>(null);
  useEffect(
    () => () => {
      if (exportResult) URL.revokeObjectURL(exportResult.url);
    },
    [exportResult],
  );
  const availableExportWidths = EXPORT_WIDTHS.filter((width) => {
    const height = Math.round(width / aspect(project.ratio));
    return (
      Math.max(width, height) <= MAX_EXPORT_EDGE &&
      width * height <= MAX_EXPORT_PIXELS
    );
  });
  const exportWidth =
    availableExportWidths
      .filter((width) => width <= requestedExportWidth)
      .at(-1) || 1920;
  const canvas = useRef<CanvasHandle>(null),
    fileInput = useRef<HTMLInputElement>(null),
    projectInput = useRef<HTMLInputElement>(null),
    uploadTarget = useRef<string | undefined>(undefined),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    // Lets the ⌘S shortcut reach the current save without rebinding the
    // keyboard listener on every render.
    save = useRef<(chooseFile?: boolean) => Promise<void>>(async () => {});
  // Where this project was last saved, so Save project writes there again and
  // only Save as asks for a file.
  const [savedFile, setSavedFile] = useState<{
    handle: FileSystemFileHandle | null;
    name: string;
  } | null>(null);
  const fileName = savedFile?.name || projectFileName(project.name);
  const unsaved = !savedFile || history.dirty;
  // Nothing to write: no devices, uploads, or imported models yet.
  const empty =
    !project.devices.length &&
    !project.assets.length &&
    !project.models?.length;
  const selected = project.devices.find((d) => d.id === selectedId);
  const selectedModel = project.models?.find((m) => m.id === selected?.modelId);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }, []);
  const change = useCallback(
    (update: (p: Project) => Project, group?: string) =>
      dispatch({ type: "change", update, group }),
    [],
  );
  const patchDevice = useCallback(
    (id: string, patch: Partial<Device>, group?: string) =>
      change(
        (p) => ({
          ...p,
          devices: p.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        }),
        group,
      ),
    [change],
  );
  const endGesture = useCallback(() => dispatch({ type: "end" }), []);
  const pick = useCallback((id: string | null) => {
    select(id);
    setInspector(id ? "device" : "scene");
  }, []);
  // Nothing is written to this browser, so warn before edits would be lost.
  useEffect(() => {
    if (!history.dirty) return;
    const confirmExit = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", confirmExit);
    return () => window.removeEventListener("beforeunload", confirmExit);
  }, [history.dirty]);
  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    change((p) => ({
      ...p,
      devices: p.devices.filter((d) => d.id !== selectedId),
    }));
    select(null);
  }, [change, selectedId]);
  const duplicate = useCallback(() => {
    if (!selected) return;
    if (project.devices.length >= 30) {
      notify("This scene supports up to 30 devices.");
      return;
    }
    const d = {
      ...selected,
      id: uid(),
      name: `${selected.name} copy`,
      x: Math.min(20, selected.x + 0.6),
      y: Math.max(-20, selected.y - 0.25),
      z: Math.min(10, selected.z + 0.1),
    };
    change((p) => ({ ...p, devices: [...p.devices, d] }));
    select(d.id);
  }, [selected, project.devices.length, change, notify]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input,textarea,select,dialog,[contenteditable]"))
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save.current(e.shiftKey);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSelected();
      } else if (e.key.toLowerCase() === "v") setMode("move");
      else if (e.key.toLowerCase() === "r") setMode("rotate");
      else if (e.key === "Escape") {
        setShowMenu(false);
        setShowAdd(false);
        setMobilePanel(null);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [duplicate, removeSelected]);
  const addDevice = (kind: DeviceKind) => {
    if (project.devices.length >= 30) {
      notify("This scene supports up to 30 devices.");
      return;
    }
    const d = newDevice(kind);
    d.x = ((project.devices.length % 3) - 1) * 1.6;
    d.z = Math.min(4, project.devices.length * 0.3);
    change((p) => ({ ...p, devices: [...p.devices, d] }));
    pick(d.id);
    setShowAdd(false);
    notify(`${d.name} added to the scene`);
  };
  const addCustomModel = (model: ImportedModel, imported = false) => {
    if (project.devices.length >= 30)
      throw new Error(
        "This scene supports up to 30 devices. Remove a device first.",
      );
    const d = newCustomDevice(model);
    d.x = ((project.devices.length % 3) - 1) * 1.6;
    d.z = Math.min(4, project.devices.length * 0.3);
    const models = imported
      ? [...(project.models || []), model]
      : project.models;
    if (
      imported &&
      ((models?.length || 0) > 30 ||
        models!.reduce((sum, m) => sum + m.document.length, 0) >
          MODEL_LIBRARY_LIMIT)
    )
      throw new Error(
        "Your model library is full. Remove an unused model before importing another.",
      );
    const next = { ...project, models, devices: [...project.devices, d] };
    if (imported && new Blob([JSON.stringify(next)]).size > 150 * 1024 * 1024)
      throw new Error(
        "This would exceed the 150 MB project limit. Use a smaller model or remove unused screenshots.",
      );
    change(() => next);
    pick(d.id);
    setLeftTab("devices");
    setShowAdd(false);
    setShowModelImport(false);
    notify(`${model.name} added · Original materials preserved`);
  };
  const openModelImport = () => {
    setShowAdd(false);
    setShowModelImport(true);
  };
  const openUpload = (id?: string) => {
    uploadTarget.current = id;
    fileInput.current?.click();
  };
  const upload = useCallback(
    async (files: File[], target?: string) => {
      if (!files.length) return;
      setUploading(true);
      const assets: Asset[] = [];
      let failed = 0;
      try {
        for (const file of files.slice(0, 20)) {
          if (
            !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
            file.size > 25 * 1024 * 1024
          ) {
            failed++;
            continue;
          }
          try {
            const src = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            const img = new window.Image();
            img.src = src;
            await img.decode();
            if (
              img.width > 16384 ||
              img.height > 16384 ||
              img.width * img.height > 70000000
            ) {
              failed++;
              continue;
            }
            assets.push({
              id: uid(),
              name: file.name,
              src,
              width: img.width,
              height: img.height,
            });
          } catch {
            failed++;
          }
        }
        if (assets.length) {
          change((p) => {
            const accepted = assets.slice(0, 100 - p.assets.length);
            return {
              ...p,
              assets: [...p.assets, ...accepted],
              devices: p.devices.map((d) =>
                d.id === target && accepted[0]
                  ? { ...d, screenshot: accepted[0].src }
                  : d,
              ),
            };
          });
          setLeftTab("uploads");
          notify(
            `${assets.length} image${assets.length > 1 ? "s" : ""} imported${target ? " · Screen updated" : ""}${failed ? " · Some files were skipped" : ""}`,
          );
        } else
          notify("Use PNG, JPG, or WebP images up to 25 MB and 16,384 px.");
      } finally {
        setUploading(false);
      }
    },
    [change, notify],
  );
  const exportImage = async () => {
    if (!canvas.current) return;
    setExporting(true);
    setExportProgress(0);
    try {
      const blob = await canvas.current.export(
        exportWidth,
        transparent,
        exportQuality,
        setExportProgress,
      );
      const filename = `${project.name.replace(/[^a-z0-9_-]/gi, "-").toLowerCase()}-${exportWidth}px.png`;
      // A self-contained download link also works in embedded browsers that do
      // not hand blob-URL downloads to the host application's download manager.
      const downloadUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("Could not prepare the PNG download."));
        reader.readAsDataURL(blob);
      });
      setExportResult({
        url: URL.createObjectURL(blob),
        downloadUrl,
        filename,
        width: exportWidth,
        height: Math.round(exportWidth / aspect(project.ratio)),
      });
      download(blob, filename);
      notify(
        `${exportWidth} × ${Math.round(exportWidth / aspect(project.ratio))} PNG exported`,
      );
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : "Export failed. Please try a smaller size.",
      );
    } finally {
      setExporting(false);
    }
  };
  const writeProject = async (
    data: Project,
    name: string,
    handle: FileSystemFileHandle | null,
  ) => {
    const file = new Blob([JSON.stringify(data)], { type: "application/json" });
    if (handle) {
      const writable = await handle.createWritable();
      await writable.write(file);
      await writable.close();
    } else download(file, name);
    setSavedFile({ handle, name });
    dispatch({ type: "saved" });
    notify(`${name} saved with all screenshots and models`);
  };
  const saveProject = async (chooseFile = false) => {
    setShowMenu(false);
    if (empty || (!chooseFile && !unsaved)) return;
    try {
      if (savedFile && !chooseFile) {
        await writeProject(project, savedFile.name, savedFile.handle);
        return;
      }
      const picker = savePicker();
      if (!picker) {
        setSaveName(project.name);
        setModal("save");
        return;
      }
      const handle = await picker({
        suggestedName: fileName,
        types: [
          {
            description: "stagemyscreen project",
            accept: { "application/json": [PROJECT_EXTENSION] },
          },
        ],
      });
      // The file name is the only place a project is named now, so the project
      // takes the name that was chosen here.
      const name = handle.name.replace(/\.stagemyscreen$/i, "") || project.name;
      change((p) => ({ ...p, name }));
      await writeProject({ ...project, name }, handle.name, handle);
    } catch (e) {
      if ((e as DOMException | undefined)?.name === "AbortError") return;
      setSavedFile(null);
      notify("Could not save the project file. Please try again.");
    }
  };
  useEffect(() => {
    save.current = saveProject;
  });
  const startNewProject = () => {
    dispatch({ type: "load", project: blankProject() });
    setSavedFile(null);
    pick(null);
    setShowTemplates(true);
    setModal(null);
    notify("New project · Add a device or pick a layout");
  };
  const newProject = () => {
    setShowMenu(false);
    // An untouched empty scene has nothing worth confirming.
    if (history.dirty || (!savedFile && project.devices.length))
      setModal("discard");
    else startNewProject();
  };
  const importProject = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 150 * 1024 * 1024)
        throw new Error("This project is too large (maximum 150 MB).");
      const data = JSON.parse(await file.text());
      if (!validateProject(data))
        throw new Error("This isn’t a valid stagemyscreen project.");
      change(() => upgradeProject(data));
      pick(data.devices[0]?.id || null);
      // An opened project already has a file name, so saving it keeps that name.
      setSavedFile({ handle: null, name: file.name });
      dispatch({ type: "saved" });
      notify("Project opened");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not open the project.");
    }
    setShowMenu(false);
  };
  const choosePreset = (preset: Preset) => {
    change((p) => applyPreset(p, preset));
    select(null);
    setInspector("scene");
    notify("Layout applied · Your screenshots are kept");
  };
  return (
    <div className="studio-app">
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        aria-label="Upload screenshots"
        onChange={(e) => {
          void upload(Array.from(e.target.files || []), uploadTarget.current);
          e.target.value = "";
        }}
      />
      <input
        ref={projectInput}
        type="file"
        accept=".stagemyscreen"
        hidden
        aria-label="Open project"
        onChange={(e) => {
          void importProject(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <header className="app-header">
        <Link className="brand" href="/" aria-label="stagemyscreen home">
          <span className="brand-mark">
            <Box size={23} strokeWidth={1.7} />
          </span>
          <span>
            stagemyscreen<span className="brand-dot">.</span>
          </span>
          <span className="studio-badge">STUDIO</span>
        </Link>
        <div className="header-document">
          <span className="header-divider" />
          <div className="project-menu-wrap">
            <button
              className="document-title"
              onClick={() => setShowMenu(!showMenu)}
              aria-expanded={showMenu}
            >
              <FileIcon size={15} />
              File
              <ChevronDown size={14} />
            </button>
            {showMenu ? (
              <>
                <button
                  className="menu-dismiss"
                  aria-label="Dismiss project menu"
                  onClick={() => setShowMenu(false)}
                />
                <div className="dropdown project-dropdown">
                  <button onClick={newProject}>
                    <FilePlus size={16} />
                    New project
                  </button>
                  <button
                    onClick={() => void saveProject()}
                    disabled={empty || !unsaved}
                  >
                    <Save size={16} />
                    Save project
                  </button>
                  <button
                    onClick={() => void saveProject(true)}
                    disabled={empty}
                  >
                    <SaveAll size={16} />
                    Save as…
                  </button>
                  <button onClick={() => projectInput.current?.click()}>
                    <FolderOpen size={16} />
                    Open project
                  </button>
                </div>
              </>
            ) : null}
          </div>
          {savedFile ? (
            <span className="document-file">{savedFile.name}</span>
          ) : null}
          {empty ? null : (
            <span className="saved-indicator">
              {unsaved ? (
                <span className="unsaved-dot" />
              ) : (
                <CheckCheck size={14} />
              )}
              {!savedFile
                ? "Not saved to a file yet"
                : history.dirty
                  ? "Unsaved changes"
                  : "Saved"}
            </span>
          )}
        </div>
        <div className="header-actions">
          <button
            className="icon-button help-button"
            aria-label="Help and keyboard shortcuts"
            onClick={() => setModal("help")}
          >
            <CircleHelp size={19} />
          </button>
          <span className="header-divider" />
          <button
            className="export-button"
            onClick={() => {
              setTransparent(project.background === "transparent");
              setModal("export");
            }}
          >
            <ArrowDownToLine size={17} />
            Export image
            <ChevronDown size={14} />
          </button>
        </div>
      </header>
      <div className="mobile-toolbar">
        <button
          onClick={() => setMobilePanel(mobilePanel === "left" ? null : "left")}
        >
          <Layers size={16} />
          Devices
        </button>
        <span>{project.name}</span>
        <button
          onClick={() =>
            setMobilePanel(mobilePanel === "right" ? null : "right")
          }
        >
          <SlidersHorizontal size={16} />
          Edit
        </button>
      </div>
      <main className="editor-layout">
        {mobilePanel ? (
          <button
            className="panel-scrim"
            aria-label="Close panel"
            onClick={() => setMobilePanel(null)}
          />
        ) : null}
        <aside
          className={`left-panel ${mobilePanel === "left" ? "mobile-open" : ""}`}
        >
          <div className="left-tabs">
            <button
              className={leftTab === "devices" ? "active" : ""}
              onClick={() => setLeftTab("devices")}
            >
              <Layers size={16} />
              Devices
            </button>
            <button
              className={leftTab === "uploads" ? "active" : ""}
              onClick={() => setLeftTab("uploads")}
            >
              <ImagePlus size={16} />
              Uploads
            </button>
          </div>
          {leftTab === "devices" ? (
            <>
              <div className="panel-section scene-list-section">
                <div className="section-heading">
                  <h2>
                    In this scene{" "}
                    <span className="count-badge">
                      {project.devices.length}
                    </span>
                  </h2>
                  <button
                    className="icon-button small"
                    aria-label="Add device"
                    onClick={() => setShowAdd(!showAdd)}
                  >
                    <Plus size={17} />
                  </button>
                </div>
                <div className="device-list">
                  {project.devices.map((d) => (
                    <div
                      key={d.id}
                      className={`device-row ${selectedId === d.id ? "selected" : ""} ${!d.visible ? "is-hidden" : ""}`}
                    >
                      <button
                        className="device-select"
                        onClick={() => {
                          pick(d.id);
                          setMobilePanel(null);
                        }}
                      >
                        <span className={`device-thumb ${d.kind}`}>
                          <DeviceIcon kind={d.kind} size={25} />
                        </span>
                        <span>
                          <strong>{d.name}</strong>
                          <small>{finishFor(d.kind, d.finish).name}</small>
                        </span>
                      </button>
                      <button
                        className="icon-button visibility-button"
                        aria-label={`${d.visible ? "Hide" : "Show"} ${d.name}`}
                        onClick={() =>
                          patchDevice(d.id, { visible: !d.visible })
                        }
                      >
                        {d.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                    </div>
                  ))}
                  {!project.devices.length ? (
                    <div className="empty-list">
                      <Box size={26} />
                      <p>A blank canvas, all yours.</p>
                      <small>Add a device to get started.</small>
                    </div>
                  ) : null}
                </div>
                <button
                  className="add-device-button"
                  onClick={() => setShowAdd(!showAdd)}
                >
                  <Plus size={16} />
                  Add a device
                </button>
                <button
                  className="add-device-button import-model-button"
                  onClick={openModelImport}
                >
                  <Box size={16} />
                  Import 3D model
                </button>
              </div>
              {(project.models || []).length ? (
                <div className="panel-section custom-model-library">
                  <div className="section-heading">
                    <h2>Your models</h2>
                    <span className="count-badge">
                      {project.models!.length}
                    </span>
                  </div>
                  {project.models!.map((model) => (
                    <div key={model.id} className="custom-model-row">
                      <button
                        className="custom-model-add"
                        aria-label={`Add imported ${model.name}`}
                        onClick={() => {
                          try {
                            addCustomModel(model);
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        <Box size={24} strokeWidth={1.4} />
                        <span>
                          <strong>{model.name}</strong>
                          <small>
                            {model.format} ·{" "}
                            {(model.bytes / 1024 / 1024).toFixed(1)} MB
                          </small>
                        </span>
                        <Plus size={15} />
                      </button>
                      <button
                        className="icon-button small"
                        aria-label={`Remove ${model.name} from library`}
                        title="Remove unused model"
                        disabled={project.devices.some(
                          (d) => d.modelId === model.id,
                        )}
                        onClick={() =>
                          change((p) => ({
                            ...p,
                            models: p.models?.filter((m) => m.id !== model.id),
                          }))
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <p className="small-muted model-screen-hint">
                    Add another copy with its own screenshot. Remove all copies
                    to delete a model from this library.
                  </p>
                </div>
              ) : null}
              <div className="panel-section library-section">
                <div className="section-heading">
                  <h2>Device library</h2>
                  <span className="small-muted">{CATALOG.length} models</span>
                </div>
                <div className="device-library">
                  {CATALOG.map((d) => (
                    <button
                      key={d.kind}
                      className="library-card"
                      onClick={() => addDevice(d.kind)}
                      aria-label={`Add ${d.name}`}
                    >
                      <span className={`library-preview ${d.kind}`}>
                        <Image
                          src={d.thumbnail || `/models/${d.kind}.webp`}
                          alt=""
                          width={160}
                          height={160}
                          className="model-thumbnail"
                        />
                        <span className="library-add">
                          <Plus size={12} />
                        </span>
                      </span>
                      <strong>{d.name}</strong>
                      <small>{d.description.split(" · ")[0]}</small>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="panel-section uploads-panel">
              <div className="section-heading">
                <h2>Your screenshots</h2>
                <span className="count-badge">{project.assets.length}</span>
              </div>
              <button
                className="upload-zone"
                disabled={uploading}
                onClick={() => openUpload(selectedId || undefined)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void upload(
                    Array.from(e.dataTransfer.files),
                    selectedId || undefined,
                  );
                }}
              >
                {uploading ? (
                  <LoaderCircle className="animate-spin" size={23} />
                ) : (
                  <ArrowUpFromLine size={23} />
                )}
                <strong>
                  {uploading ? "Importing images…" : "Drop your screenshots"}
                </strong>
                <span>or click to browse</span>
                <small>PNG, JPG, WebP · up to 25 MB</small>
              </button>
              <p className="upload-instruction">
                Select a device, then choose a screenshot to apply it.
              </p>
              <div className="asset-list">
                {project.assets.map((a) => (
                  <button
                    key={a.id}
                    className={`asset-card ${selected?.screenshot === a.src ? "active" : ""}`}
                    onClick={() => {
                      if (!selected) {
                        notify(
                          "Select a device first to apply this screenshot.",
                        );
                        return;
                      }
                      patchDevice(selected.id, { screenshot: a.src });
                      notify("Screenshot applied");
                    }}
                  >
                    <span className="asset-thumb">
                      <Image
                        src={a.src}
                        alt={a.name}
                        width={200}
                        height={125}
                        unoptimized
                      />
                    </span>
                    <span>
                      <strong>{a.name}</strong>
                      <small>
                        {a.width} × {a.height}
                      </small>
                    </span>
                    {selected?.screenshot === a.src ? (
                      <Check size={15} />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="panel-footer">
            <span className="privacy-icon">
              <Check size={13} />
            </span>
            <span>Your designs stay on your device.</span>
          </div>
        </aside>
        <section className="workspace" aria-label="Design workspace">
          <div className="workspace-toolbar">
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={13} />
              <strong>Scene 01</strong>
              <span className="scene-dot" />
            </div>
            <div className="history-buttons">
              <button
                className="icon-button"
                aria-label="Undo"
                title="Undo (⌘Z)"
                disabled={!history.past.length}
                onClick={() => dispatch({ type: "undo" })}
              >
                <Undo2 size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Redo"
                title="Redo (⌘⇧Z)"
                disabled={!history.future.length}
                onClick={() => dispatch({ type: "redo" })}
              >
                <Redo2 size={17} />
              </button>
              <span className="toolbar-separator" />
              <button
                className="icon-button"
                aria-label="Show keyboard shortcuts"
                onClick={() => setModal("help")}
              >
                <CircleHelp size={17} />
              </button>
            </div>
          </div>
          <div className="stage-area">
            <div className="stage-topline">
              <span>
                <span className="artboard-label">SCENE 01</span>
                <span className="artboard-size">
                  {exportWidth} ×{" "}
                  {Math.round(exportWidth / aspect(project.ratio))}
                </span>
              </span>
              <button
                className="background-indicator"
                onClick={() => {
                  setInspector("scene");
                  setMobilePanel("right");
                }}
              >
                <span
                  className={`tiny-swatch ${project.background}`}
                  style={{
                    backgroundColor:
                      BACKGROUNDS[project.background] || undefined,
                  }}
                />
                {project.background === "transparent"
                  ? "Transparent background"
                  : `${project.background[0].toUpperCase() + project.background.slice(1)} background`}
                <ChevronDown size={12} />
              </button>
            </div>
            <div className="artboard-fit">
              <div
                className={`artboard ${project.background === "transparent" ? "checkerboard" : ""}`}
                style={{
                  aspectRatio: aspect(project.ratio),
                  width: `min(100cqw, ${aspect(project.ratio) * 100}cqh)`,
                }}
              >
                <SceneCanvas
                  ref={canvas}
                  project={project}
                  selectedId={selectedId}
                  mode={mode}
                  onSelect={pick}
                  onChange={patchDevice}
                  onGestureEnd={endGesture}
                  onUpload={upload}
                />
                {!project.devices.length ? (
                  <div className="empty-scene">
                    <Box size={38} />
                    <h2>Make room for your next big thing.</h2>
                    <p>Add a device, drop in your design, make it yours.</p>
                    <button
                      className="primary-button"
                      onClick={() => setShowAdd(true)}
                    >
                      <Plus size={16} />
                      Add your first device
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="stage-bottomline">
              <span>
                <MousePointer2 size={13} />
                {mode === "move"
                  ? "Drag a device to move"
                  : "Drag a device to rotate"}
                <span className="hint-dot">·</span>
                <span className="alt-hint">Hold ⌥ to rotate</span>
              </span>
              <span className="render-label">
                <span />
                Live 3D
              </span>
            </div>
            <div className="floating-toolbar">
              <div className="tool-group">
                <button
                  aria-label="Move tool"
                  title="Move (V)"
                  className={mode === "move" ? "active" : ""}
                  onClick={() => setMode("move")}
                >
                  <Move size={18} />
                </button>
                <button
                  aria-label="Rotate tool"
                  title="Rotate (R)"
                  className={mode === "rotate" ? "active" : ""}
                  onClick={() => setMode("rotate")}
                >
                  <Rotate3D size={19} />
                </button>
              </div>
              <span className="toolbar-separator" />
              <div className="zoom-controls">
                <button
                  aria-label="Zoom out"
                  disabled={project.zoom <= 0.4}
                  onClick={() =>
                    change((p) => ({
                      ...p,
                      zoom: Math.max(0.4, +(p.zoom - 0.1).toFixed(1)),
                    }))
                  }
                >
                  <Minus size={15} />
                </button>
                <button
                  className="zoom-value"
                  title="Reset zoom"
                  onClick={() => change((p) => ({ ...p, zoom: 1 }))}
                >
                  {Math.round(project.zoom * 100)}%
                </button>
                <button
                  aria-label="Zoom in"
                  disabled={project.zoom >= 2}
                  onClick={() =>
                    change((p) => ({
                      ...p,
                      zoom: Math.min(2, +(p.zoom + 0.1).toFixed(1)),
                    }))
                  }
                >
                  <Plus size={15} />
                </button>
              </div>
              <span className="toolbar-separator" />
              <button
                aria-label="Fit canvas"
                title="Fit all devices in canvas"
                onClick={() => {
                  const zoom = canvas.current?.fitZoom() || 1;
                  change((p) => ({ ...p, zoom }));
                }}
              >
                <Maximize size={17} />
              </button>
            </div>
          </div>
          <div
            className={`templates-section ${!showTemplates ? "collapsed" : ""}`}
          >
            <div className="templates-heading">
              <div>
                <LayoutTemplate size={16} />
                <h2>A great place to start</h2>
                <span>Pick a layout. Make it yours.</span>
              </div>
              <button
                className="icon-button small"
                aria-label={showTemplates ? "Hide layouts" : "Show layouts"}
                onClick={() => setShowTemplates(!showTemplates)}
              >
                {showTemplates ? <Minus size={16} /> : <Plus size={16} />}
              </button>
            </div>
            {showTemplates ? (
              <div className="template-grid">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className="template-card"
                    onClick={() => choosePreset(p.id)}
                  >
                    <div className={`template-preview template-${p.id}`}>
                      {p.id === "showcase" ? (
                        <Image
                          src="/layouts/device-family.webp"
                          alt=""
                          width={640}
                          height={360}
                          className="template-render"
                          sizes="(max-width: 780px) 45vw, 240px"
                        />
                      ) : p.id === "duo" ? (
                        <>
                          <DeviceIcon kind="laptop" size={62} />
                          <DeviceIcon kind="phone" size={33} />
                        </>
                      ) : p.id === "floating" ? (
                        <>
                          <DeviceIcon kind="phone" size={47} />
                          <DeviceIcon kind="phone" size={47} />
                        </>
                      ) : (
                        <DeviceIcon kind="phone" size={58} />
                      )}
                      <span className="template-use">
                        <Plus size={13} />
                      </span>
                    </div>
                    <strong>{p.name}</strong>
                    <small>{p.subtitle}</small>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <footer className="workspace-footer">
            <span>
              <Box size={13} />
              {project.devices.filter((d) => d.visible).length} devices in scene
            </span>
            <button onClick={() => setShowTemplates(!showTemplates)}>
              <PanelLeftClose size={13} />
              {showTemplates ? "Hide" : "Show"} layouts
            </button>
            <span>Made for your next big thing.</span>
          </footer>
        </section>
        <aside
          className={`right-panel ${mobilePanel === "right" ? "mobile-open" : ""}`}
        >
          <div className="inspector-tabs">
            <button
              className={inspector === "device" ? "active" : ""}
              onClick={() => setInspector("device")}
            >
              Device
            </button>
            <button
              className={inspector === "scene" ? "active" : ""}
              onClick={() => setInspector("scene")}
            >
              Scene
            </button>
          </div>
          <div className="inspector-content">
            {inspector === "device" && selected ? (
              <>
                <div className="panel-section selected-heading">
                  <div className="selected-device-icon">
                    <DeviceIcon kind={selected.kind} size={28} />
                  </div>
                  <div>
                    <input
                      className="device-name-input"
                      aria-label="Device name"
                      value={selected.name}
                      maxLength={80}
                      onChange={(e) =>
                        patchDevice(
                          selected.id,
                          { name: e.target.value },
                          "rename",
                        )
                      }
                      onBlur={endGesture}
                    />
                    <span>
                      {selectedModel
                        ? `${selectedModel.format} · Imported model`
                        : CATALOG.find((d) => d.kind === selected.kind)
                            ?.description}
                    </span>
                  </div>
                </div>
                <div className="panel-section">
                  <div className="section-heading">
                    <h2>Screen</h2>
                    <span className="small-muted">
                      {selectedModel
                        ? "Imported model"
                        : CATALOG.find((d) => d.kind === selected.kind)?.screen}
                    </span>
                  </div>
                  {selectedModel ? (
                    <ModelScreenControls
                      key={selected.id}
                      device={selected}
                      model={selectedModel}
                      onChange={(patch) => patchDevice(selected.id, patch)}
                    />
                  ) : null}
                  {selected.kind !== "custom" || selected.screenSurface ? (
                    <>
                      <button
                        className="screen-upload"
                        onClick={() => openUpload(selected.id)}
                      >
                        <span className={`screen-preview ${selected.kind}`}>
                          <Image
                            src={selected.screenshot}
                            alt="Current device screenshot"
                            loading="eager"
                            width={224}
                            height={125}
                            unoptimized
                          />
                        </span>
                        <span className="screen-upload-action">
                          <ImagePlus size={15} />
                          Replace screenshot
                        </span>
                      </button>
                      <div className="field-row">
                        <label htmlFor="image-fit">Image fit</label>
                        <select
                          id="image-fit"
                          value={selected.fit}
                          onChange={(e) =>
                            patchDevice(selected.id, {
                              fit: e.target.value as Device["fit"],
                            })
                          }
                        >
                          <option value="cover">Fill screen</option>
                          <option value="contain">Fit inside</option>
                          <option value="stretch">Stretch</option>
                        </select>
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="panel-section">
                  <div className="section-heading">
                    <h2>Appearance</h2>
                  </div>
                  {selected.kind === "custom" ? (
                    <p className="small-muted imported-appearance">
                      Original materials and textures. Use scene lighting to
                      shape reflections and highlights.
                    </p>
                  ) : (
                    <>
                      <div className="finish-row">
                        <span>Finish</span>
                        <div className="finish-options">
                          {Object.entries(finishesFor(selected.kind)).map(
                            ([key, f]) => (
                              <button
                                key={key}
                                title={f.name}
                                aria-label={`${f.name} finish`}
                                aria-pressed={selected.finish === key}
                                className={
                                  selected.finish === key ? "active" : ""
                                }
                                style={{ background: f.color }}
                                onClick={() =>
                                  patchDevice(selected.id, {
                                    finish: key as Device["finish"],
                                  })
                                }
                              >
                                {selected.finish === key ? (
                                  <Check size={13} />
                                ) : null}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                      <span className="finish-name">
                        {finishFor(selected.kind, selected.finish).name}
                      </span>
                    </>
                  )}
                </div>
                <div className="panel-section">
                  <div className="section-heading">
                    <h2>Rotation</h2>
                    <button
                      className="icon-button small"
                      aria-label="Reset rotation"
                      onClick={() =>
                        patchDevice(selected.id, { rx: 0, ry: 0, rz: 0 })
                      }
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                  <div className="rotation-controls">
                    {(
                      [
                        { key: "rx", label: "X · Tilt" },
                        { key: "ry", label: "Y · Turn" },
                        { key: "rz", label: "Z · Roll" },
                      ] as const
                    ).map((a) => (
                      <RangeControl
                        key={a.key}
                        label={a.label}
                        value={selected[a.key]}
                        min={-180}
                        max={180}
                        suffix="°"
                        onChange={(v) =>
                          patchDevice(selected.id, { [a.key]: v }, a.key)
                        }
                        onEnd={endGesture}
                      />
                    ))}
                  </div>
                </div>
                <div className="panel-section">
                  <div className="section-heading">
                    <h2>Position & scale</h2>
                    <button
                      className="icon-button small"
                      aria-label="Reset position and scale"
                      onClick={() =>
                        patchDevice(selected.id, { x: 0, y: 0, z: 0, scale: 1 })
                      }
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                  <div className="position-controls">
                    {(["x", "y", "z"] as const).map((axis) => (
                      <RangeControl
                        key={axis}
                        label={`Position ${axis.toUpperCase()}`}
                        value={selected[axis]}
                        min={axis === "z" ? -10 : -20}
                        max={axis === "z" ? 10 : 20}
                        step={0.01}
                        onChange={(v) =>
                          patchDevice(
                            selected.id,
                            { [axis]: v },
                            `position-${axis}`,
                          )
                        }
                        onEnd={endGesture}
                      />
                    ))}
                  </div>
                  <RangeControl
                    label="Scale"
                    value={selected.scale * 100}
                    min={20}
                    max={300}
                    suffix="%"
                    onChange={(v) =>
                      patchDevice(selected.id, { scale: v / 100 }, "scale")
                    }
                    onEnd={endGesture}
                  />
                </div>
                <div className="panel-section device-actions">
                  <button onClick={duplicate}>
                    <Copy size={15} />
                    Duplicate
                  </button>
                  <button
                    className="delete-device"
                    aria-label="Delete selected device"
                    onClick={removeSelected}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            ) : inspector === "device" ? (
              <div className="inspector-empty">
                <MousePointer2 size={30} />
                <h3>Make it your own</h3>
                <p>
                  Select a device on the canvas to change its screen, finish,
                  and angle.
                </p>
                <button
                  className="secondary-button"
                  onClick={() => setInspector("scene")}
                >
                  Edit scene settings
                </button>
              </div>
            ) : (
              <>
                <LightingControls
                  value={project.lighting || DEFAULT_LIGHTING}
                  shadows={project.shadows}
                  onChange={(patch, group) =>
                    change(
                      (p) => ({
                        ...p,
                        lighting: {
                          ...(p.lighting || DEFAULT_LIGHTING),
                          ...patch,
                        },
                      }),
                      group,
                    )
                  }
                  onEnd={endGesture}
                  onToggleShadows={() =>
                    change((p) => ({ ...p, shadows: !p.shadows }))
                  }
                />
                <div className="panel-section">
                  <div className="section-heading">
                    <h2>Canvas</h2>
                    <Grid2X2 size={16} />
                  </div>
                  <label className="stacked-field">
                    Aspect ratio
                    <select
                      aria-label="Canvas aspect ratio"
                      value={project.ratio}
                      onChange={(e) =>
                        change((p) => ({
                          ...p,
                          ratio: e.target.value as Project["ratio"],
                        }))
                      }
                    >
                      <option value="16:9">16:9 · Presentation</option>
                      <option value="4:3">4:3 · Classic</option>
                      <option value="1:1">1:1 · Social</option>
                      <option value="9:16">9:16 · Story</option>
                    </select>
                  </label>
                </div>
                <div className="panel-section">
                  <div className="section-heading">
                    <h2>Background</h2>
                  </div>
                  <div className="background-options">
                    {Object.entries(BACKGROUNDS).map(([key, color]) => (
                      <button
                        key={key}
                        className={`${key === "transparent" ? "checkerboard" : ""} ${project.background === key ? "active" : ""}`}
                        style={{
                          backgroundColor: color || undefined,
                          color: key === "dark" ? "white" : undefined,
                        }}
                        aria-label={`${key} background`}
                        aria-pressed={project.background === key}
                        onClick={() =>
                          change((p) => ({
                            ...p,
                            background: key as Project["background"],
                          }))
                        }
                      >
                        {project.background === key ? (
                          <Check size={19} />
                        ) : null}
                        <span>{key}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="panel-section">
                  <div className="section-heading">
                    <h2>Export quality</h2>
                  </div>
                  <p className="quality-description">
                    Crisp edges and original-resolution screenshots. Ready for
                    decks, websites, and everything in between.
                  </p>
                  <button
                    className="secondary-button full-width"
                    onClick={() => setModal("export")}
                  >
                    <ArrowDownToLine size={15} />
                    Export settings
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="inspector-bottom">
            <span className="small-mint-square">
              <Sparkles size={13} />
            </span>
            Good design deserves a great stage.
          </div>
        </aside>
      </main>
      {showAdd ? (
        <Modal
          title="Find the right frame"
          onClose={() => setShowAdd(false)}
          wide
        >
          <p className="modal-description">
            Detailed devices. Ready for your designs.
          </p>
          <button
            className="add-device-button import-model-button"
            onClick={openModelImport}
          >
            <Box size={17} />
            Import your own 3D model{" "}
            <span className="small-muted">GLB / glTF / USDZ</span>
          </button>
          <div className="add-modal-grid">
            {CATALOG.map((d) => (
              <button key={d.kind} onClick={() => addDevice(d.kind)}>
                <div className={`add-modal-preview ${d.kind}`}>
                  <Image
                    src={d.thumbnail || `/models/${d.kind}.webp`}
                    alt={`${d.name} 3D model`}
                    width={300}
                    height={300}
                    className="model-thumbnail"
                  />
                </div>
                <strong>{d.name}</strong>
                <span>{d.description}</span>
                <small>
                  <Plus size={13} />
                  Add to scene
                </small>
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
      {showModelImport ? (
        <ModelImport
          onClose={() => setShowModelImport(false)}
          onImport={(model) => addCustomModel(model, true)}
        />
      ) : null}
      {modal === "export" ? (
        <Modal
          title="Ready for the world."
          onClose={() => {
            if (!exporting) {
              setExportResult(null);
              setModal(null);
            }
          }}
        >
          {exportResult ? (
            <div className="export-result">
              <p className="modal-description">
                Your full-resolution PNG is ready.
              </p>
              <a
                href={exportResult.url}
                target="_blank"
                rel="noreferrer"
                className="export-preview"
                aria-label="Open full-resolution export"
              >
                <Image
                  src={exportResult.url}
                  alt="Exported device composition"
                  width={exportResult.width}
                  height={exportResult.height}
                  unoptimized
                />
              </a>
              <p className="export-dimensions">
                {exportResult.width.toLocaleString()} ×{" "}
                {exportResult.height.toLocaleString()} pixels · Lossless PNG
              </p>
              <a
                className="primary-button full-width"
                href={exportResult.downloadUrl}
                download={exportResult.filename}
              >
                Download PNG
              </a>
              <button
                className="secondary-button full-width"
                onClick={() => setExportResult(null)}
              >
                Back to export settings
              </button>
            </div>
          ) : (
            <>
              <p className="modal-description">
                Your scene, in its best light.
              </p>
              <div className="export-format">
                <span className="format-icon">
                  <ImagePlus size={23} />
                </span>
                <div>
                  <strong>PNG image</strong>
                  <span>Lossless quality · Full transparency</span>
                </div>
                <Check size={18} />
              </div>
              <label className="stacked-field">
                Resolution
                <select
                  aria-label="Export resolution"
                  value={exportWidth}
                  disabled={exporting}
                  onChange={(e) => setExportWidth(Number(e.target.value))}
                >
                  {availableExportWidths.map((width) => (
                    <option key={width} value={width}>
                      {width.toLocaleString()} px
                      {width === 7680
                        ? " · 8K (recommended)"
                        : width === 15360
                          ? " · 16K"
                          : width === 12000
                            ? " · 12K"
                            : width === 3840
                              ? " · 4K"
                              : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="export-dimensions">
                <span>
                  {exportWidth} ×{" "}
                  {Math.round(exportWidth / aspect(project.ratio))} pixels
                </span>
                <span>{project.ratio}</span>
              </div>
              <label className="stacked-field">
                Render quality
                <select
                  aria-label="Render quality"
                  value={exportQuality}
                  disabled={exporting}
                  onChange={(e) =>
                    setExportQuality(e.target.value as ExportQuality)
                  }
                >
                  <option value="ultra">
                    Ultra · Supersampled (recommended)
                  </option>
                  <option value="high">High · Faster render</option>
                </select>
              </label>
              <p className="export-quality-hint">
                {exportQuality === "ultra"
                  ? "Four rendered pixels per output pixel for smoother edges and fine detail."
                  : "Full-resolution rendering with hardware antialiasing."}
              </p>
              <Toggle
                label="Transparent background"
                hint="Place your devices on any background"
                checked={transparent}
                onChange={() => {
                  if (!exporting) setTransparent(!transparent);
                }}
              />
              <div className="export-note">
                <Check size={14} />
                {project.devices.filter((d) => d.visible).length} visible
                devices · No watermark
              </div>
              <button
                className="primary-button full-width export-confirm"
                disabled={exporting || !project.devices.some((d) => d.visible)}
                onClick={() => void exportImage()}
              >
                {exporting ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <ArrowDownToLine size={17} />
                )}
                {exporting
                  ? exportProgress >= 95
                    ? "Encoding lossless PNG…"
                    : `Rendering… ${exportProgress}%`
                  : "Export PNG"}
              </button>
              <p className="export-footnote">
                Rendered locally. Your screenshots never leave this browser.
              </p>
            </>
          )}
        </Modal>
      ) : null}
      {modal === "discard" ? (
        <Modal title="Discard this project?" onClose={() => setModal(null)}>
          <p className="modal-description">
            {savedFile
              ? `Edits made since ${savedFile.name} was saved are not in the file yet, and starting a new project discards them.`
              : "This project has never been saved to a file, and starting a new project discards it."}
          </p>
          <div className="modal-choices">
            <button
              className="secondary-button"
              onClick={() => {
                startNewProject();
              }}
            >
              <Trash2 size={15} />
              Discard and start new
            </button>
            <button
              className="primary-button"
              onClick={() => setModal(null)}
              autoFocus
            >
              Keep editing
            </button>
          </div>
        </Modal>
      ) : null}
      {modal === "save" ? (
        <Modal title="Name your project file" onClose={() => setModal(null)}>
          <p className="modal-description">
            One file holds the layout, every screenshot, and imported models.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = saveName.trim() || project.name;
              setModal(null);
              change((p) => ({ ...p, name }));
              void writeProject(
                { ...project, name },
                projectFileName(name),
                null,
              );
            }}
          >
            <label className="save-name-field">
              FILE NAME
              <input
                aria-label="Project file name"
                autoFocus
                maxLength={100}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
              <small>{projectFileName(saveName.trim() || project.name)}</small>
            </label>
            <button className="primary-button full-width" type="submit">
              <Save size={16} />
              Save project
            </button>
          </form>
        </Modal>
      ) : null}
      {modal === "help" ? (
        <Modal title="A few studio essentials" onClose={() => setModal(null)}>
          <p className="modal-description">
            Add a device. Upload your UI. Find your angle.
          </p>
          <div className="help-steps">
            <p>
              <span>1</span>Choose a model from the device library.
            </p>
            <p>
              <span>2</span>Drop a screenshot onto its screen or use Replace
              screenshot.
            </p>
            <p>
              <span>3</span>Drag to arrange. Use the rotation controls to find
              the perfect angle.
            </p>
            <p>
              <span>4</span>Export a supersampled transparent PNG up to 16K.
            </p>
          </div>
          <div className="shortcut-list">
            {[
              ["Move tool", "V"],
              ["Rotate tool", "R"],
              ["Rotate while dragging", "⌥ / Alt"],
              ["Undo", "⌘ / Ctrl + Z"],
              ["Redo", "⌘ / Ctrl + ⇧ + Z"],
              ["Duplicate selected", "⌘ / Ctrl + D"],
              ["Delete selected", "Delete"],
              ["Save project", "⌘ / Ctrl + S"],
              ["Save as", "⌘ / Ctrl + ⇧ + S"],
            ].map(([label, key]) => (
              <div key={label}>
                <span>{label}</span>
                <kbd>{key}</kbd>
              </div>
            ))}
          </div>
          <p className="help-note">
            Nothing is saved automatically. Use File → Save project to keep a
            portable file with your screenshots.
          </p>
        </Modal>
      ) : null}
      {toast ? (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
