import Link from 'next/link';

interface ProjectCardProps {
  title: string;
  description: string;
  tags: string[];
  slug: string;
  role?: string;
}

export function ProjectCard({ title, description, tags, slug, role }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${slug}`}
      className="block group p-6 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-cyan-400 dark:hover:border-cyan-600 transition-all hover:shadow-lg hover:shadow-cyan-500/10"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {title}
            </h3>
            {role && (
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {role}
              </p>
            )}
          </div>
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          {description}
        </p>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-sm rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
