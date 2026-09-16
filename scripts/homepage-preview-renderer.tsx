"use client";

// Isolated preview generator: see docs/HOMEPAGE.md. Never mounts the editor or storage.
import { useEffect, useRef, useState } from "react";
import { DeviceEngine } from "@/lib/device-engine";
import { DEFAULT_PROJECT, applyPreset, type Project } from "@/lib/studio";

const scenes: Record<string, Project> = {
  // Same arrangement as the studio's Device family layout.
  // Zoomed out slightly so the floor shadow isn't clipped at the edge.
  family: { ...applyPreset(DEFAULT_PROJECT, "showcase"), zoom: 0.86 },
};

export default function AssetRenderer() {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<DeviceEngine | null>(null);
  const [status, setStatus] = useState("Ready");
  const [outputs, setOutputs] = useState<{ name: string; href: string }[]>([]);
  useEffect(() => {
    if (!host.current) return;
    engine.current = new DeviceEngine(host.current);
    engine.current.resize(1200, 675);
    engine.current.update(scenes.family);
    return () => engine.current?.dispose();
  }, []);
  async function renderAll() {
    const results = [];
    for (const [name, scene] of Object.entries(scenes)) {
      setStatus(`Rendering ${name}`);
      const e = engine.current!;
      e.resize(1200, 675);
      e.update(scene);
      const blob = await e.export(7680, true, "ultra");
      const href = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
      results.push({ name, href });
    }
    setOutputs(results);
    setStatus("Complete");
  }
  return (
    <main style={{ padding: 24 }}>
      <h1>Original demo compositions</h1>
      <p>{status}</p>
      <button onClick={renderAll}>Render homepage previews</button>
      <div ref={host} style={{ width: 1200, height: 675 }} />
      {outputs.map((o) => (
        <p key={o.name}>
          <a download={`${o.name}.png`} href={o.href}>
            {o.name}
          </a>
        </p>
      ))}
    </main>
  );
}
