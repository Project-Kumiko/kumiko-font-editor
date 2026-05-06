import type { KumikoProjectSummary } from '../../lib/projectTypes'

export interface PendingGitHubImport {
  repo: string
  ref: string
  repoUrl: string | null
}

export type ProjectOpenHandler = (
  project: KumikoProjectSummary
) => Promise<void>
