import type { Metadata } from "next";
import { ProjectDetail } from "@/components/project-detail";

export const metadata: Metadata = { title: "Cấu hình dự án" };

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectDetail projectId={projectId} />;
}
