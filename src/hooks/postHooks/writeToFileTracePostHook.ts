import * as fs from "fs/promises"
import * as path from "path"
import * as vscode from "vscode"
import { execFile } from "child_process"
import { promisify } from "util"
import { createHash, randomUUID } from "crypto"
import { defaultHookEngine, PostHook } from "../HookEngine"
import { getActiveIntentForSession } from "../activeIntentStore"

const execFileAsync = promisify(execFile)

function sha256(value: string): string {
	return `sha256:${createHash("sha256").update(value).digest("hex")}`
}

async function resolveGitRevision(root: string): Promise<string> {
	try {
		const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })
		const revision = stdout.trim()
		return revision || "unknown"
	} catch {
		return "unknown"
	}
}

const hook: PostHook = async (ctx) => {
	if (ctx.toolName !== "write_to_file") return

	const writePath = String(ctx.params?.path ?? "").trim()
	const content = String(ctx.params?.content ?? "")
	const mutationClass = String(ctx.params?.mutation_class ?? "").trim()
	const providedIntentId = String(ctx.params?.intent_id ?? "").trim()
	if (!writePath || !content || !mutationClass) return

	const folders = vscode.workspace.workspaceFolders
	if (!folders || folders.length === 0) return

	const root = folders[0].uri.fsPath
	const orchestrDir = path.join(root, ".orchestration")
	await fs.mkdir(orchestrDir, { recursive: true })

	const tracePath = path.join(orchestrDir, "agent_trace.jsonl")
	const revision = await resolveGitRevision(root)
	const lineCount = content.length === 0 ? 1 : content.split(/\r?\n/).length
	const contentHash = sha256(content)
	const intentId = providedIntentId || getActiveIntentForSession(ctx.userSessionId) || "UNKNOWN"

	const record = {
		id: randomUUID(),
		timestamp: new Date().toISOString(),
		vcs: { revision_id: revision },
		mutation_class: mutationClass,
		files: [
			{
				relative_path: writePath.replace(/\\/g, "/"),
				conversations: [
					{
						url: ctx.userSessionId ?? "session",
						contributor: {
							entity_type: "AI",
							model_identifier: "unknown-model",
						},
						ranges: [
							{
								start_line: 1,
								end_line: lineCount,
								content_hash: contentHash,
							},
						],
						related: [
							{
								type: "specification",
								value: intentId,
							},
						],
					},
				],
			},
		],
	}

	await fs.appendFile(tracePath, `${JSON.stringify(record)}\n`, "utf8")
}

defaultHookEngine.registerPostHook(hook)

export default hook
