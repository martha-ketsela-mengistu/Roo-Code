// Ensure all hook modules are loaded for side-effect registration.
import "./preHooks/selectActiveIntentPreHook"
import "./preHooks/handshakeGatePreHook"
import "./preHooks/writeToFileScopePreHook"
import "./preHooks/destructiveToolApprovalPreHook"

export * from "./HookEngine"
