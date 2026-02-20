export type OpenCodePermission = "allow" | "ask" | "deny"

export type OpenCodeConfig = {
  $schema?: string
  model?: string
  default_agent?: string
  tools?: Record<string, boolean>
  permission?: Record<string, OpenCodePermission | Record<string, OpenCodePermission>>
  agent?: Record<string, OpenCodeAgentConfig>
  command?: Record<string, OpenCodeCommandConfig>
  mcp?: Record<string, OpenCodeMcpServer>
}

export type OpenCodeAgentConfig = {
  description?: string
  mode?: "primary" | "subagent"
  model?: string
  temperature?: number
  tools?: Record<string, boolean>
  permission?: Record<string, OpenCodePermission>
}

export type OpenCodeCommandConfig = {
  description?: string
  model?: string
  agent?: string
  template: string
}

export type OpenCodeMcpServer = {
  type: "local" | "remote"
  command?: string[]
  url?: string
  environment?: Record<string, string>
  headers?: Record<string, string>
  enabled?: boolean
}

export type OpenCodeAgentFile = {
  name: string
  content: string
}

export type OpenCodePluginFile = {
  name: string
  content: string
}

export type OpenCodeCommandFile = {
  name: string    // command name, used as the filename stem: <name>.md
  content: string // full file content: YAML frontmatter + body
}

export type OpenCodeBundle = {
  config: OpenCodeConfig
  agents: OpenCodeAgentFile[]
  // Commands are written as individual .md files, not in opencode.json.
  // See ADR-001.
  commandFiles: OpenCodeCommandFile[]
  plugins: OpenCodePluginFile[]
  skillDirs: { sourceDir: string; name: string }[]
}
