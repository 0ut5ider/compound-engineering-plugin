import { describe, expect, test } from "bun:test"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { writeOpenCodeBundle } from "../src/targets/opencode"
import type { OpenCodeBundle } from "../src/types/opencode"

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

describe("writeOpenCodeBundle", () => {
  test("writes config, agents, plugins, and skills", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-test-"))
    const bundle: OpenCodeBundle = {
      config: { $schema: "https://opencode.ai/config.json" },
      agents: [{ name: "agent-one", content: "Agent content" }],
      commandFiles: [],
      plugins: [{ name: "hook.ts", content: "export {}" }],
      skillDirs: [
        {
          name: "skill-one",
          sourceDir: path.join(import.meta.dir, "fixtures", "sample-plugin", "skills", "skill-one"),
        },
      ],
    }

    await writeOpenCodeBundle(tempRoot, bundle)

    expect(await exists(path.join(tempRoot, "opencode.json"))).toBe(true)
    expect(await exists(path.join(tempRoot, ".opencode", "agents", "agent-one.md"))).toBe(true)
    expect(await exists(path.join(tempRoot, ".opencode", "plugins", "hook.ts"))).toBe(true)
    expect(await exists(path.join(tempRoot, ".opencode", "skills", "skill-one", "SKILL.md"))).toBe(true)
  })

  test("writes directly into a .opencode output root", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-root-"))
    const outputRoot = path.join(tempRoot, ".opencode")
    const bundle: OpenCodeBundle = {
      config: { $schema: "https://opencode.ai/config.json" },
      agents: [{ name: "agent-one", content: "Agent content" }],
      commandFiles: [],
      plugins: [],
      skillDirs: [
        {
          name: "skill-one",
          sourceDir: path.join(import.meta.dir, "fixtures", "sample-plugin", "skills", "skill-one"),
        },
      ],
    }

    await writeOpenCodeBundle(outputRoot, bundle)

    expect(await exists(path.join(outputRoot, "opencode.json"))).toBe(true)
    expect(await exists(path.join(outputRoot, "agents", "agent-one.md"))).toBe(true)
    expect(await exists(path.join(outputRoot, "skills", "skill-one", "SKILL.md"))).toBe(true)
    expect(await exists(path.join(outputRoot, ".opencode"))).toBe(false)
  })

  test("writes directly into ~/.config/opencode style output root", async () => {
    // Simulates the global install path: ~/.config/opencode
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "config-opencode-"))
    const outputRoot = path.join(tempRoot, ".config", "opencode")
    const bundle: OpenCodeBundle = {
      config: { $schema: "https://opencode.ai/config.json" },
      agents: [{ name: "agent-one", content: "Agent content" }],
      commandFiles: [],
      plugins: [],
      skillDirs: [
        {
          name: "skill-one",
          sourceDir: path.join(import.meta.dir, "fixtures", "sample-plugin", "skills", "skill-one"),
        },
      ],
    }

    await writeOpenCodeBundle(outputRoot, bundle)

    // Should write directly, not nested under .opencode
    expect(await exists(path.join(outputRoot, "opencode.json"))).toBe(true)
    expect(await exists(path.join(outputRoot, "agents", "agent-one.md"))).toBe(true)
    expect(await exists(path.join(outputRoot, "skills", "skill-one", "SKILL.md"))).toBe(true)
    expect(await exists(path.join(outputRoot, ".opencode"))).toBe(false)
  })

  test("merges plugin config into existing opencode.json without destroying user keys", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-backup-"))
    const outputRoot = path.join(tempRoot, ".opencode")
    const configPath = path.join(outputRoot, "opencode.json")

    // Create existing config with a user-specific key
    await fs.mkdir(outputRoot, { recursive: true })
    const originalConfig = { $schema: "https://opencode.ai/config.json", custom: "value" }
    await fs.writeFile(configPath, JSON.stringify(originalConfig, null, 2))

    const bundle: OpenCodeBundle = {
      config: { $schema: "https://opencode.ai/config.json", mcp: { "plugin-server": { type: "local", command: "uvx", args: ["plugin-srv"] } } },
      agents: [],
      commandFiles: [],
      plugins: [],
      skillDirs: [],
    }

    await writeOpenCodeBundle(outputRoot, bundle)

    // Merged config should contain plugin's MCP entries AND user's original custom key
    const newConfig = JSON.parse(await fs.readFile(configPath, "utf8"))
    expect(newConfig.custom).toBe("value")
    expect(newConfig.mcp?.["plugin-server"]).toBeDefined()

    // Backup should exist with original content
    const files = await fs.readdir(outputRoot)
    const backupFileName = files.find((f) => f.startsWith("opencode.json.bak."))
    expect(backupFileName).toBeDefined()

    const backupContent = JSON.parse(await fs.readFile(path.join(outputRoot, backupFileName!), "utf8"))
    expect(backupContent.custom).toBe("value")
  })

  test("writes command files as .md in commands/ directory", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "config-opencode-"))
    const outputRoot = path.join(tempRoot, ".config", "opencode")
    const bundle: OpenCodeBundle = {
      config: { $schema: "https://opencode.ai/config.json" },
      agents: [],
      commandFiles: [{ name: "my-cmd", content: "---\ndescription: Test\n---\n\nDo something." }],
      plugins: [],
      skillDirs: [],
    }

    await writeOpenCodeBundle(outputRoot, bundle)

    const cmdPath = path.join(outputRoot, "commands", "my-cmd.md")
    expect(await exists(cmdPath)).toBe(true)
    const content = await fs.readFile(cmdPath, "utf8")
    expect(content).toBe("---\ndescription: Test\n---\n\nDo something.\n")
  })

  test("backs up existing command .md file before overwriting", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "config-opencode-"))
    const outputRoot = path.join(tempRoot, ".config", "opencode")
    const commandsDir = path.join(outputRoot, "commands")

    // Pre-create existing command file
    await fs.mkdir(commandsDir, { recursive: true })
    await fs.writeFile(path.join(commandsDir, "my-cmd.md"), "old content\n", "utf8")

    const bundle: OpenCodeBundle = {
      config: { $schema: "https://opencode.ai/config.json" },
      agents: [],
      commandFiles: [{ name: "my-cmd", content: "new content" }],
      plugins: [],
      skillDirs: [],
    }

    await writeOpenCodeBundle(outputRoot, bundle)

    // Backup file should exist
    const files = await fs.readdir(commandsDir)
    const backupFileName = files.find((f) => f.startsWith("my-cmd.md.bak."))
    expect(backupFileName).toBeDefined()

    // New content should be written
    const newContent = await fs.readFile(path.join(commandsDir, "my-cmd.md"), "utf8")
    expect(newContent).toBe("new content\n")
  })

  test("merges mcp servers without overwriting user entries", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-merge-"))
    const outputRoot = path.join(tempRoot, ".config", "opencode")
    const configPath = path.join(outputRoot, "opencode.json")

    // Pre-create existing config with user's MCP server
    await fs.mkdir(outputRoot, { recursive: true })
    const existingConfig = {
      mcp: { "user-server": { type: "local", command: "uvx", args: ["user-srv"] } },
    }
    await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2))

    const bundle: OpenCodeBundle = {
      config: {
        $schema: "https://opencode.ai/config.json",
        mcp: {
          "plugin-server": { type: "local", command: "uvx", args: ["plugin-srv"] },
          "user-server": { type: "local", command: "uvx", args: ["different"] },
        },
      },
      agents: [],
      commandFiles: [],
      plugins: [],
      skillDirs: [],
    }

    await writeOpenCodeBundle(outputRoot, bundle)

    const newConfig = JSON.parse(await fs.readFile(configPath, "utf8"))
    // Both servers should exist
    expect(newConfig.mcp?.["user-server"]).toBeDefined()
    expect(newConfig.mcp?.["plugin-server"]).toBeDefined()
    // User's server config wins (args not overwritten by plugin)
    expect(newConfig.mcp["user-server"].args).toEqual(["user-srv"])
    // Plugin's new server is added
    expect(newConfig.mcp["plugin-server"].args).toEqual(["plugin-srv"])
  })

  test("preserves unrelated user keys when merging opencode.json", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-keys-"))
    const outputRoot = path.join(tempRoot, ".config", "opencode")
    const configPath = path.join(outputRoot, "opencode.json")

    // Pre-create existing config with user preferences
    await fs.mkdir(outputRoot, { recursive: true })
    const existingConfig = { model: "my-model", theme: "dark", mcp: {} }
    await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2))

    const bundle: OpenCodeBundle = {
      config: {
        $schema: "https://opencode.ai/config.json",
        mcp: { "plugin-server": { type: "local", command: "uvx", args: ["plugin-srv"] } },
        permission: { "bash": "allow" },
      },
      agents: [],
      commandFiles: [],
      plugins: [],
      skillDirs: [],
    }

    await writeOpenCodeBundle(outputRoot, bundle)

    const newConfig = JSON.parse(await fs.readFile(configPath, "utf8"))
    // User keys must be unchanged
    expect(newConfig.model).toBe("my-model")
    expect(newConfig.theme).toBe("dark")
    // Plugin additions should be present
    expect(newConfig.mcp?.["plugin-server"]).toBeDefined()
    expect(newConfig.permission?.["bash"]).toBe("allow")
  })
})
