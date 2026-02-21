export function toPolicyErrorJson(code: string, message: string, details?: Record<string, unknown>) {
	return JSON.stringify({
		status: "error",
		type: "policy_violation",
		code,
		message,
		details: details ?? {},
		suggestion: "Adjust the tool call and retry.",
	})
}
