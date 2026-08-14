import type { Metadata } from "next";
import { AdminShell } from "@/components/admin-shell";
import { ProjectsList } from "@/components/projects-list";

export const metadata: Metadata = { title: "Dự án" };

export default function ProjectsPage() {
  return <AdminShell><ProjectsList /></AdminShell>;
}
