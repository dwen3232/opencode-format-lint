import { afterEach, describe, expect, test, vi } from "vitest";
import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import type { BunShell } from "../shell";
import { CodefmtPlugin } from "../index";

vi.mock("fs");
import fs from "fs";

type BunShellOutput = Awaited<ReturnType<BunShell>>;
type ToolExecuteAfterHook = NonNullable<Hooks["tool.execute.after"]>;
type EventHook = NonNullable<Hooks["event"]>;

type TestClient = {
  app: {
    log: ReturnType<typeof vi.fn>;
  };
  session: {
    get: ReturnType<typeof vi.fn>;
    prompt: ReturnType<typeof vi.fn>;
  };
};

interface ShellCall {
  cmd: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
}

function makeShellOutput(
  exitCode: number,
  stdout = "",
  stderr = "",
): BunShellOutput {
  return {
    exitCode,
    stdout: Buffer.from(stdout),
    stderr: Buffer.from(stderr),
    text: () => stdout,
    json: () => JSON.parse(stdout),
    arrayBuffer: () => new ArrayBuffer(0),
    bytes: () => new Uint8Array(),
    blob: () => new Blob([stdout]),
  };
}

function makeShell(
  calls: ShellCall[],
  resolveOutput: (cmd: string, args: string[]) => BunShellOutput,
) : BunShell {
  const shell = Object.assign(
    vi.fn((_: TemplateStringsArray, cmd: string, args: string[]) => {
    const call: ShellCall = { cmd, args };
    calls.push(call);

    const output = resolveOutput(cmd, args);
    const promise = Object.assign(Promise.resolve(output), {
      cwd: (cwd: string) => {
        call.cwd = cwd;
        return promise;
      },
      env: (env?: Record<string, string>) => {
        call.env = env;
        return promise;
      },
      quiet: () => promise,
      nothrow: () => promise,
      stdin: new WritableStream(),
      lines: async function* () {},
      text: () => Promise.resolve(output.stdout.toString()),
      json: () => Promise.resolve(null),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob([])),
      throws: () => promise,
    });

    return promise;
    }),
    {
      braces: vi.fn<(pattern: string) => string[]>().mockReturnValue([]),
      escape: vi.fn<(input: string) => string>().mockImplementation((input) => input),
      env: vi.fn().mockReturnThis(),
      cwd: vi.fn().mockReturnThis(),
      nothrow: vi.fn().mockReturnThis(),
      throws: vi.fn().mockReturnThis(),
    },
  );

  return shell as unknown as BunShell;
}

function makeClient(parentID?: string): TestClient {
  return {
    app: {
      log: vi.fn().mockResolvedValue(undefined),
    },
    session: {
      get: vi.fn().mockResolvedValue({ data: parentID ? { parentID } : {} }),
      prompt: vi.fn().mockResolvedValue(undefined),
    },
  };
}

function makePluginInput(client: TestClient, $: BunShell): PluginInput {
  return {
    client: client as unknown as PluginInput["client"],
    project: {} as PluginInput["project"],
    directory: "/project",
    worktree: "/project",
    experimental_workspace: {
      register: vi.fn(),
    },
    serverUrl: new URL("https://example.com"),
    $,
  };
}

async function runToolExecuteAfter(
  hooks: Hooks,
  input: Parameters<ToolExecuteAfterHook>[0],
): Promise<void> {
  const handler = hooks["tool.execute.after"];
  if (!handler) throw new Error("tool.execute.after hook not registered");

  await handler(input, {
    title: "",
    output: "",
    metadata: null,
  });
}

async function runEvent(
  hooks: Hooks,
  input: Parameters<EventHook>[0],
): Promise<void> {
  const handler = hooks.event;
  if (!handler) throw new Error("event hook not registered");
  await handler(input);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CodefmtPlugin integration", () => {
  test("runs default Python tools and injects a lint report", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const calls: ShellCall[] = [];
    const client = makeClient();
    const plugin = await CodefmtPlugin(
      makePluginInput(client, makeShell(calls, (cmd, _args) => {
        if (cmd === "ruff") {
          return makeShellOutput(1, '[{"code":"F401"}]');
        }
        return makeShellOutput(0);
      })),
    );

    await runToolExecuteAfter(plugin, {
      tool: "write",
      args: { filePath: "/project/src/main.py" },
      sessionID: "session-1",
      callID: "call-1",
    });

    await runEvent(plugin, {
      event: {
        type: "session.idle",
        properties: { sessionID: "session-1" },
      },
    });

    const report =
      'Lint errors found after the last edit. Fix them:\n\n**/project/src/main.py**\n[ruff] [{"code":"F401"}]';

    expect(calls).toEqual([
      {
        cmd: "black",
        args: ["/project/src/main.py"],
        cwd: process.cwd(),
        env: undefined,
      },
      {
        cmd: "isort",
        args: ["/project/src/main.py"],
        cwd: process.cwd(),
        env: undefined,
      },
      {
        cmd: "ruff",
        args: ["check", "--output-format", "json", "/project/src/main.py"],
        cwd: process.cwd(),
        env: undefined,
      },
    ]);

    expect(client.session.prompt).toHaveBeenCalledWith({
      path: { id: "session-1" },
      body: {
        parts: [
          {
            type: "text",
            text: report,
          },
        ],
      },
    });
  });

  test("deduplicates tracked files within a session and skips prompt when lint passes", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const calls: ShellCall[] = [];
    const client = makeClient();
    const plugin = await CodefmtPlugin(
      makePluginInput(client, makeShell(calls, (_cmd, _args) => makeShellOutput(0))),
    );

    await runToolExecuteAfter(plugin, {
      tool: "write",
      args: { filePath: "/project/src/main.py" },
      sessionID: "session-1",
      callID: "call-1",
    });
    await runToolExecuteAfter(plugin, {
      tool: "edit",
      args: { filePath: "/project/src/main.py" },
      sessionID: "session-1",
      callID: "call-2",
    });

    await runEvent(plugin, {
      event: {
        type: "session.idle",
        properties: { sessionID: "session-1" },
      },
    });

    expect(calls.map((call) => call.cmd)).toEqual(["black", "isort", "ruff"]);
    expect(client.session.prompt).not.toHaveBeenCalled();
  });
});
