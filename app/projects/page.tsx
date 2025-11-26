import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ProjectCard } from '@/components/project-card';
import { projects } from '@/data/projects';

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              Projects
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              주요 프로젝트와 오픈소스 활동을 소개합니다
            </p>
          </div>

          <div className="space-y-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                title={project.title}
                description={project.tldr}
                tags={project.techStack.slice(0, 6)}
                slug={project.slug}
                role={project.role}
              />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
