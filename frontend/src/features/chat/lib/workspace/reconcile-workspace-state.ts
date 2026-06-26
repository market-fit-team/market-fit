import type { AssembledToolCall } from "@langchain/langgraph-sdk/stream"
import type { ChatRightPanel } from "@/features/chat/types/workspace"
import type {
  ArtifactResponse,
  DocumentResponse,
} from "@/shared/api/generated/agent/schemas"

type ChatWorkspaceSelections = {
  documentIds: string[]
  artifactIds: string[]
}

type ChatWorkspaceRefreshPlan = {
  invalidateArtifacts: boolean
  invalidateDocuments: boolean
  processedCallIds: string[]
}

const ARTIFACT_MUTATION_TOOLS = new Set(["artifact_create", "artifact_update"])

const DOCUMENT_MUTATION_TOOLS = new Set([
  "artifact_save_as_document",
  "document_create",
  "document_update",
  "document_delete",
])

export const pruneWorkspaceSelections = ({
  documentIds,
  artifactIds,
  documents,
  artifacts,
}: ChatWorkspaceSelections & {
  documents: DocumentResponse[]
  artifacts: ArtifactResponse[]
}): ChatWorkspaceSelections => {
  const availableDocumentIds = new Set(documents.map((document) => document.id))
  const availableArtifactIds = new Set(artifacts.map((artifact) => artifact.id))

  return {
    documentIds: documentIds.filter((id) => availableDocumentIds.has(id)),
    artifactIds: artifactIds.filter((id) => availableArtifactIds.has(id)),
  }
}

export const areWorkspaceSelectionsEqual = (
  left: ChatWorkspaceSelections,
  right: ChatWorkspaceSelections
) => {
  if (left.documentIds.length !== right.documentIds.length) {
    return false
  }
  if (left.artifactIds.length !== right.artifactIds.length) {
    return false
  }

  return (
    left.documentIds.every((id, index) => right.documentIds[index] === id) &&
    left.artifactIds.every((id, index) => right.artifactIds[index] === id)
  )
}

export const reconcileWorkspaceRightPanel = ({
  panel,
  documents,
  artifacts,
}: {
  panel: ChatRightPanel | null
  documents: DocumentResponse[]
  artifacts: ArtifactResponse[]
}): ChatRightPanel | null => {
  if (panel == null) {
    return null
  }

  if (panel.kind === "library-document") {
    const nextDocument = documents.find(
      (document) => document.id === panel.document.id
    )

    if (!nextDocument) {
      return { kind: "library" }
    }

    if (
      nextDocument.id === panel.document.id &&
      nextDocument.updated_at === panel.document.updated_at &&
      nextDocument.raw_text === panel.document.raw_text &&
      nextDocument.summary === panel.document.summary &&
      nextDocument.title === panel.document.title
    ) {
      return panel
    }

    return { kind: "library-document", document: nextDocument }
  }

  if (panel.kind === "artifact") {
    const nextArtifact = artifacts.find(
      (artifact) => artifact.id === panel.artifact.id
    )

    if (!nextArtifact) {
      return null
    }

    if (
      nextArtifact.id === panel.artifact.id &&
      nextArtifact.version === panel.artifact.version &&
      nextArtifact.updated_at === panel.artifact.updated_at &&
      nextArtifact.raw_text === panel.artifact.raw_text &&
      nextArtifact.summary === panel.artifact.summary &&
      nextArtifact.title === panel.artifact.title
    ) {
      return panel
    }

    return { kind: "artifact", artifact: nextArtifact }
  }

  return panel
}

export const getWorkspaceRefreshPlan = ({
  toolCalls,
  processedCallIds,
}: {
  toolCalls: AssembledToolCall[]
  processedCallIds: Set<string>
}): ChatWorkspaceRefreshPlan => {
  let invalidateArtifacts = false
  let invalidateDocuments = false
  const nextProcessedCallIds: string[] = []

  for (const toolCall of toolCalls) {
    const callId = toolCall.callId ?? toolCall.id
    if (
      typeof callId !== "string" ||
      processedCallIds.has(callId) ||
      toolCall.status !== "finished"
    ) {
      continue
    }

    nextProcessedCallIds.push(callId)

    if (ARTIFACT_MUTATION_TOOLS.has(toolCall.name ?? "")) {
      invalidateArtifacts = true
    }

    if (DOCUMENT_MUTATION_TOOLS.has(toolCall.name ?? "")) {
      invalidateDocuments = true
    }
  }

  return {
    invalidateArtifacts,
    invalidateDocuments,
    processedCallIds: nextProcessedCallIds,
  }
}
