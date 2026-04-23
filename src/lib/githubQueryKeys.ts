export const githubQueryKeys = {
  all: ['github'] as const,
  viewer: () => [...githubQueryKeys.all, 'viewer'] as const,
  forkStatus: (repo: string | null, branch: string | null) =>
    [...githubQueryKeys.all, 'forkStatus', repo, branch] as const,
  compareStatus: (
    repo: string | null,
    headOwner: string | null,
    headBranch: string | null
  ) =>
    [
      ...githubQueryKeys.all,
      'compareStatus',
      repo,
      headOwner,
      headBranch,
    ] as const,
}
