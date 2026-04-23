import type { UfoProjectRecord } from '../../lib/ufoTypes'

export interface PendingGitHubImport {
  repo: string
  ref: string
  repoUrl: string | null
}

export type ProjectOpenHandler = (project: UfoProjectRecord) => Promise<void>
