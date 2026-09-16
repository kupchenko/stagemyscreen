import type { Metadata } from "next";
import { Homepage } from "@/components/home/homepage";

export const metadata: Metadata = {
  title: "stagemyscreen — Free, open-source device mockups",
  description:
    "Turn screenshots into 3D device mockups and export transparent 8K PNGs. Free, open source, and runs entirely in your browser.",
};

export default function Home() {
  return <Homepage />;
}
