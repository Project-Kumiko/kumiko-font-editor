import {
  deleteProject,
  getAllProjects,
  loadProject,
  saveProject,
  type ProjectDraft,
} from './persistence'
import { toProjectSummary } from './projectTypes'
import { deleteUfoProjectData } from './ufoPersistence'

export const listProjectSummaries = async () => {
  const projects = await getAllProjects()
  return projects.sort((a, b) => b.updatedAt - a.updatedAt)
}

export const loadProjectDraft = loadProject

export const saveProjectDraft = async (draft: ProjectDraft) => {
  await saveProject(draft)
  return toProjectSummary(draft)
}

export const deleteKumikoProject = async (projectId: string) => {
  await deleteProject(projectId)
  await deleteUfoProjectData(projectId)
}

export type { KumikoProjectDraft, KumikoProjectSummary } from './projectTypes'
