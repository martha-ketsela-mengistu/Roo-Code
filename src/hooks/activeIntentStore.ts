const activeIntentBySession = new Map<string, string>()

function normalizeSessionId(userSessionId?: string): string {
	return userSessionId?.trim() || "global"
}

export function setActiveIntentForSession(userSessionId: string | undefined, intentId: string) {
	activeIntentBySession.set(normalizeSessionId(userSessionId), intentId)
}

export function getActiveIntentForSession(userSessionId?: string): string | undefined {
	return activeIntentBySession.get(normalizeSessionId(userSessionId))
}

export function clearActiveIntentForSession(userSessionId?: string) {
	activeIntentBySession.delete(normalizeSessionId(userSessionId))
}
