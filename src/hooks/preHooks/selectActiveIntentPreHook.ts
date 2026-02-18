import * as fs from "fs/promises"
import * as path from "path"
import * as vscode from "vscode"
import { defaultHookEngine, PreHookResult } from "../HookEngine"

// PreHook that intercepts `select_active_intent` tool calls.
// - Validates that the intent exists in `.orchestration/active_intents.yaml`
// - Emits a compact `<intent_context>` XML file under `.orchestration/intent_contexts/<id>.xml`
// - Blocks the tool if the intent is invalid or the workspace isn't available

function parseSimpleActiveIntentsYaml(yamlText: string) {
	// Very small YAML parser for the expected shape used in active_intents.yaml
	// Splits top-level intent entries by "\n- " assuming file starts with `active_intents:`
	const lines = yamlText.split(/\r?\n/)
	const startIndex = lines.findIndex((l) => l.trim().startsWith("active_intents:"))
	if (startIndex === -1) return []

	const entriesText = lines.slice(startIndex + 1).join("\n")
	const rawItems = entriesText.split(/\n(?=-\s)/).map((s) => s.trim())

	const intents: Array<Record<string, any>> = []
	for (const raw of rawItems) {
		if (!raw) continue
		const item: Record<string, any> = {}
		const itemLines = raw.split(/\r?\n/).map((l) => l.replace(/^[-\s]+/, ""))
		let currentKey: string | null = null
		for (const l of itemLines) {
			const m = l.match(/^([a-zA-Z0-9_]+):\s*(.*)$/)
			if (m) {
				currentKey = m[1]
				let val = m[2].trim()
				if (val === "|") {
					// multiline block - collect subsequent indented lines
					item[currentKey] = ""
				} else if (val === "") {
					// likely a list follows
					item[currentKey] = []
				} else {
					// strip quotes
					val = val.replace(/^"|"$/g, "")
					val = val.replace(/^'|'$/g, "")
					item[currentKey] = val
				}
			} else if (l.trim().startsWith("- ") && currentKey) {
				const v = l.replace(/^-\s+/, "").trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "")
				if (!Array.isArray(item[currentKey])) item[currentKey] = []
				item[currentKey].push(v)
			} else {
				// continuation line for multiline values
				if (currentKey && typeof item[currentKey] === "string") {
					item[currentKey] += "\n" + l.trim()
				}
			}
		}
		if (item.id) intents.push(item)
	}
	return intents
}

const hook = async (ctx: { toolName: string; params: Record<string, unknown> }) => {
	if (ctx.toolName !== "select_active_intent") return { action: "allow" } as PreHookResult

	const intentIdRaw = ctx.params?.["intent_id"] ?? ctx.params?.["id"]
	const intentId = intentIdRaw ? String(intentIdRaw).trim() : undefined

	const folders = vscode.workspace.workspaceFolders
	if (!folders || folders.length === 0) {
		return {
			action: "block",
			error: {
				code: "NO_WORKSPACE",
				message: "No workspace folder available to read .orchestration/active_intents.yaml",
			},
		} as PreHookResult
	}

	const root = folders[0].uri.fsPath
	const orchestrDir = path.join(root, ".orchestration")
	const activePath = path.join(orchestrDir, "active_intents.yaml")

	try {
		const txt = await fs.readFile(activePath, "utf8")
		const intents = parseSimpleActiveIntentsYaml(txt)
		if (!intentId) {
			return {
				action: "block",
				error: { code: "MISSING_INTENT_ID", message: "You must supply an intent_id." },
			} as PreHookResult
		}
		const found = intents.find((it) => String(it.id) === intentId)
		if (!found) {
			return {
				action: "block",
				error: { code: "INVALID_INTENT", message: "You must cite a valid active Intent ID." },
			} as PreHookResult
		}

		// Build compact XML block
		const xmlLines: string[] = []
		xmlLines.push(`<intent_context id=\"${intentId}\">`)
		if (found.name) xmlLines.push(`  <name>${escapeXml(String(found.name))}</name>`)
		if (found.status) xmlLines.push(`  <status>${escapeXml(String(found.status))}</status>`)
		if (Array.isArray(found.owned_scope) && found.owned_scope.length > 0) {
			xmlLines.push(`  <owned_scope>`)
			for (const s of found.owned_scope) xmlLines.push(`    <scope>${escapeXml(String(s))}</scope>`)
			xmlLines.push(`  </owned_scope>`)
		}
		if (Array.isArray(found.constraints) && found.constraints.length > 0) {
			xmlLines.push(`  <constraints>`)
			for (const c of found.constraints) xmlLines.push(`    <constraint>${escapeXml(String(c))}</constraint>`)
			xmlLines.push(`  </constraints>`)
		}
		if (Array.isArray(found.acceptance_criteria) && found.acceptance_criteria.length > 0) {
			xmlLines.push(`  <acceptance_criteria>`)
			for (const ac of found.acceptance_criteria)
				xmlLines.push(`    <criterion>${escapeXml(String(ac))}</criterion>`)
			xmlLines.push(`  </acceptance_criteria>`)
		}
		xmlLines.push(`</intent_context>`)
		const xml = xmlLines.join("\n")

		// Ensure intent_contexts dir
		const outDir = path.join(orchestrDir, "intent_contexts")
		await fs.mkdir(outDir, { recursive: true })
		const outPath = path.join(outDir, `${intentId}.xml`)
		await fs.writeFile(outPath, xml, "utf8")

		// Return the XML payload so the dispatcher can supply it as a tool result
		return { action: "allow", payload: { intent_context_xml: xml } } as PreHookResult
	} catch (err) {
		console.error("selectActiveIntentPreHook error:", err)
		return { action: "block", error: { code: "HOOK_IO_ERROR", message: String(err) } } as PreHookResult
	}
}

function escapeXml(s: string) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;")
}

// Register the hook eagerly when this module loads
defaultHookEngine.registerPreHook(hook)

export default hook
