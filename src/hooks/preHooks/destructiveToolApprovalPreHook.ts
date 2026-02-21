import { defaultHookEngine, isDestructiveTool, PreHookResult } from "../HookEngine"
import { getActiveIntentForSession } from "../activeIntentStore"
import { toPolicyErrorJson } from "../policyError"

function summarizeAction(toolName: string, params: Record<string, unknown>): string {
	switch (toolName) {
		case "write_to_file":
		case "apply_diff":
			return `file=${String(params.path ?? "")}`
		case "edit":
		case "search_and_replace":
		case "search_replace":
		case "edit_file":
			return `file=${String(params.file_path ?? "")}`
		case "execute_command":
			return `command=${String(params.command ?? "").slice(0, 120)}`
		default:
			return "mutating action"
	}
}

const hook = async (ctx: {
	toolName: string
	params: Record<string, unknown>
	intentId?: string
	userSessionId?: string
}) => {
	if (!isDestructiveTool(ctx.toolName)) {
		return { action: "allow" } as PreHookResult
	}

	const activeIntent = getActiveIntentForSession(ctx.userSessionId) ?? "UNKNOWN"
	const prompt = `Approve destructive action? intent=${activeIntent} tool=${ctx.toolName} ${summarizeAction(ctx.toolName, ctx.params)}`
	const approved = await defaultHookEngine.requestApproval(prompt)

	if (!approved) {
		return {
			action: "block",
			error: {
				code: "USER_REJECTED",
				message: toPolicyErrorJson("USER_REJECTED", "User rejected destructive tool execution.", {
					intent_id: activeIntent,
					tool: ctx.toolName,
				}),
			},
		} as PreHookResult
	}

	return { action: "allow" } as PreHookResult
}

defaultHookEngine.registerPreHook(hook)

export default hook
