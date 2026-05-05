import type { ProjectSummary } from '../../lib/persistence'

export interface PendingGitHubImport {
  repo: string
  ref: string
  repoUrl: string | null
}

export type ProjectOpenHandler = (project: ProjectSummary) => Promise<void>
