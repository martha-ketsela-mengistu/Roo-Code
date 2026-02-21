import { getActiveIntentForSession, setActiveIntentForSession } from "../activeIntentStore"
import { defaultHookEngine, isDestructiveTool, PreHookResult } from "../HookEngine"
import { toPolicyErrorJson } from "../policyError"

const hook = async (ctx: {
	toolName: string
	params: Record<string, unknown>
	intentId?: string
	userSessionId?: string
}) => {
	if (ctx.toolName === "select_active_intent") {
		const selected = String(ctx.params?.["intent_id"] ?? ctx.params?.["id"] ?? "").trim()
		if (selected) {
			setActiveIntentForSession(ctx.userSessionId, selected)
		}
		return { action: "allow" } as PreHookResult
	}

	if (!isDestructiveTool(ctx.toolName)) {
		return { action: "allow" } as PreHookResult
	}

	const activeIntent = getActiveIntentForSession(ctx.userSessionId)
	if (!activeIntent) {
		return {
			action: "block",
			error: {
				code: "HANDSHAKE_REQUIRED",
				message: toPolicyErrorJson(
					"HANDSHAKE_REQUIRED",
					"You must cite a valid active Intent ID. First read .orchestration/active_intents.yaml, choose intent_id, then call select_active_intent(intent_id) to load intent context.",
					{ tool: ctx.toolName },
				),
			},
		} as PreHookResult
	}

	return { action: "allow", payload: { active_intent_id: activeIntent } } as PreHookResult
}

defaultHookEngine.registerPreHook(hook)

export default hook
