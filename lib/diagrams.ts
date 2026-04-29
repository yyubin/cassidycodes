import fs from 'fs';
import path from 'path';
import { Project } from '@/types';

export type ResolvedDiagram = {
  title: string;
  description: string;
  mermaidCode: string;
};

export function loadProjectDiagrams(project: Project): ResolvedDiagram[] {
  if (!project.diagrams) return [];

  return project.diagrams.map((d) => ({
    title: d.title,
    description: d.description,
    mermaidCode: fs.readFileSync(
      path.join(process.cwd(), 'content/projects', `${d.mermaidFile}.mmd`),
      'utf-8'
    ),
  }));
}
