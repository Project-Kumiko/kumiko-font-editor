export type ProjectSourceType = 'local' | 'github'

export interface GitHubProjectSource {
  owner: string
  repo: string
  ref: string
  defaultBranch: string
  repoUrl: string
  zipballUrl: string
  archiveRoot: string
  commitSha?: string | null
}
