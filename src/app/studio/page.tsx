import type { Metadata } from "next";
import Studio from "@/components/studio/studio";

export const metadata: Metadata = {
  title: "stagemyscreen — Create your composition",
  description:
    "Upload screenshots, arrange 3D devices, and export high-resolution mockups in your browser.",
};

export default function StudioPage() {
  return <Studio />;
}
