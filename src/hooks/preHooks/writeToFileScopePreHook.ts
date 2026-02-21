import * as fs from "fs/promises"
import * as path from "path"
import * as vscode from "vscode"
import { defaultHookEngine, PreHookResult } from "../HookEngine"
import { getActiveIntentForSession } from "../activeIntentStore"
import { toPolicyErrorJson } from "../policyError"

type IntentRecord = {
	id?: string
	owned_scope?: string[]
}

function parseSimpleActiveIntentsYaml(yamlText: string): IntentRecord[] {
	const lines = yamlText.split(/\r?\n/)
	const startIndex = lines.findIndex((l) => l.trim().startsWith("active_intents:"))
	if (startIndex === -1) return []

	const entriesText = lines.slice(startIndex + 1).join("\n")
	const rawItems = entriesText.split(/\n(?=-\s)/).map((s) => s.trim())
	const intents: IntentRecord[] = []

	for (const raw of rawItems) {
		if (!raw) continue
		const item: Record<string, any> = {}
		const itemLines = raw.split(/\r?\n/).map((l) => l.replace(/^[-\s]+/, ""))
		let currentKey: string | null = null
		for (const l of itemLines) {
			const m = l.match(/^([a-zA-Z0-9_]+):\s*(.*)$/)
			if (m) {
				currentKey = m[1]
				const val = m[2].trim()
				if (val === "") {
					item[currentKey] = []
				} else {
					item[currentKey] = val.replace(/^"|"$/g, "").replace(/^'|'$/g, "")
				}
			} else if (l.trim().startsWith("- ") && currentKey) {
				const v = l.replace(/^-\s+/, "").trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "")
				if (!Array.isArray(item[currentKey])) item[currentKey] = []
				item[currentKey].push(v)
			}
		}
		intents.push(item)
	}
	return intents
}

function normalizeToPosix(p: string) {
	return p.replace(/\\/g, "/")
}

function globToRegExp(pattern: string): RegExp {
	const escaped = normalizeToPosix(pattern).replace(/[.+^${}()|[\]\\]/g, "\\$&")
	const withGlob = escaped.replace(/\*\*/g, "___DOUBLE_STAR___").replace(/\*/g, "[^/]*")
	const finalPattern = withGlob.replace(/___DOUBLE_STAR___/g, ".*")
	return new RegExp(`^${finalPattern}$`)
}

function matchesPattern(filePath: string, pattern: string): boolean {
	return globToRegExp(pattern).test(normalizeToPosix(filePath))
}

function extractTargetPaths(toolName: string, params: Record<string, unknown>): string[] {
	if (toolName === "write_to_file" || toolName === "apply_diff") {
		const p = String(params.path ?? "").trim()
		return p ? [p] : []
	}
	if (
		toolName === "edit" ||
		toolName === "search_and_replace" ||
		toolName === "search_replace" ||
		toolName === "edit_file"
	) {
		const p = String(params.file_path ?? "").trim()
		return p ? [p] : []
	}
	if (toolName === "apply_patch") {
		const patch = String(params.patch ?? "")
		const matches = [
			...patch.matchAll(/\*\*\* (?:Update|Add|Delete) File:\s+(.+)\r?\n/g),
			...patch.matchAll(/\+\+\+\s+b\/([^\r\n]+)/g),
		]
		return matches.map((m) => m[1].trim()).filter(Boolean)
	}
	return []
}

async function loadIntentIgnorePatterns(root: string): Promise<string[]> {
	const intentIgnorePath = path.join(root, ".intentignore")
	try {
		const raw = await fs.readFile(intentIgnorePath, "utf8")
		return raw
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter((l) => l.length > 0 && !l.startsWith("#"))
	} catch {
		return []
	}
}

const scopedTools = new Set([
	"write_to_file",
	"apply_diff",
	"edit",
	"search_and_replace",
	"search_replace",
	"edit_file",
	"apply_patch",
])

const hook = async (ctx: {
	toolName: string
	params: Record<string, unknown>
	intentId?: string
	userSessionId?: string
}) => {
	if (!scopedTools.has(ctx.toolName)) {
		return { action: "allow" } as PreHookResult
	}

	const folders = vscode.workspace.workspaceFolders
	if (!folders || folders.length === 0) {
		return {
			action: "block",
			error: {
				code: "NO_WORKSPACE",
				message: toPolicyErrorJson("NO_WORKSPACE", "No workspace folder available for scope enforcement."),
			},
		} as PreHookResult
	}

	const root = folders[0].uri.fsPath
	const intentId = getActiveIntentForSession(ctx.userSessionId)
	if (!intentId) {
		return {
			action: "block",
			error: {
				code: "INTENT_REQUIRED",
				message: toPolicyErrorJson("INTENT_REQUIRED", "You must cite a valid active Intent ID.", {
					tool: ctx.toolName,
				}),
			},
		} as PreHookResult
	}

	const targets = extractTargetPaths(ctx.toolName, ctx.params)
	if (targets.length === 0) {
		return { action: "allow" } as PreHookResult
	}

	const activePath = path.join(root, ".orchestration", "active_intents.yaml")
	const activeText = await fs.readFile(activePath, "utf8")
	const intents = parseSimpleActiveIntentsYaml(activeText)
	const activeIntent = intents.find((it) => String(it.id ?? "") === intentId)
	if (!activeIntent) {
		return {
			action: "block",
			error: {
				code: "INVALID_INTENT",
				message: toPolicyErrorJson("INVALID_INTENT", "Active intent not found in active_intents.yaml.", {
					intent_id: intentId,
				}),
			},
		} as PreHookResult
	}

	const scopePatterns = Array.isArray(activeIntent.owned_scope) ? activeIntent.owned_scope : []
	if (scopePatterns.length === 0) {
		return {
			action: "block",
			error: {
				code: "EMPTY_SCOPE",
				message: toPolicyErrorJson("EMPTY_SCOPE", "Active intent has no owned_scope.", { intent_id: intentId }),
			},
		} as PreHookResult
	}

	const intentIgnore = await loadIntentIgnorePatterns(root)
	for (const rawPath of targets) {
		const normalizedPath = normalizeToPosix(rawPath.replace(/^a\//, "").replace(/^b\//, ""))
		const isIgnoredByIntentIgnore = intentIgnore.some((p) => matchesPattern(normalizedPath, p))
		if (isIgnoredByIntentIgnore) {
			continue
		}

		const isInScope = scopePatterns.some((p) => matchesPattern(normalizedPath, p))
		if (!isInScope) {
			return {
				action: "block",
				error: {
					code: "SCOPE_VIOLATION",
					message: toPolicyErrorJson(
						"SCOPE_VIOLATION",
						`Scope Violation: ${intentId} is not authorized to edit [${normalizedPath}]. Request scope expansion.`,
						{ intent_id: intentId, file: normalizedPath, owned_scope: scopePatterns },
					),
				},
			} as PreHookResult
		}
	}

	return { action: "allow" } as PreHookResult
}

defaultHookEngine.registerPreHook(hook)

export default hook
