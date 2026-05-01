# Clauna

> A minimalist vibe-coding IDE — file tree, splits, integrated terminal, and Claude Code at one keystroke.

Built with **Tauri 2 + React + TypeScript + CodeMirror 6 + xterm.js**, weighing in around 5–10 MB instead of 100+ MB.

## Features

- **Four switchable layouts** (⌘1 / ⌘2 / ⌘3 / ⌘4):
  - **① Classic** — sidebar + tabbed editor + free splits (default)
  - **② Zen** — slim icon rail, popover panels, ⌘K-driven
  - **③ Tiled** — 2×2 grid: editor / editor / terminal / claude
  - **④ Claude dock** — permanent chat dock on the right
- **Real PTY terminals** via `portable-pty` — drop into your real shell
- **Claude Code integration** — `⌘J` spawns a pane that auto-launches `claude`
- **Splits everywhere** — header buttons, drag palette, or `⌘\` / `⌘⇧\`
- **Command palette** (`⌘K`) — primary input
- **Sketchy aesthetic** — handwritten Caveat/Kalam fonts, paper textures, orange accent

## Getting started

```bash
pnpm install
pnpm tauri:dev
```

First Rust compile takes ~3–5 minutes; subsequent runs are instant.

### Toolchain prerequisites

- Node 20+ (`brew install node`)
- pnpm (`brew install pnpm`)
- Rust stable (`brew install rustup && rustup-init -y --default-toolchain stable`)
- macOS: Xcode CLI tools (`xcode-select --install`)
- Windows: WebView2 (preinstalled on Win11), MSVC toolchain

## Build

```bash
pnpm tauri:build                          # current platform
pnpm tauri build --target universal-apple-darwin   # mac universal
```

Cross-compiling Windows binaries from macOS is not officially supported by Tauri (WebView2 + signing make it painful). Use the GitHub Actions workflow instead — it builds macOS arm64, macOS x64, and Windows x64 in a matrix.

## Keyboard shortcuts

| Combo            | Action                              |
|------------------|-------------------------------------|
| `⌘K`             | Command palette                     |
| `⌘J`             | Claude in new pane                  |
| `⌃` `             | New shell terminal                  |
| `⌘\`             | Split active pane right             |
| `⌘⇧\`            | Split active pane down              |
| `⌘W`             | Close active pane                   |
| `⌘S`             | Save active editor                  |
| `⌘1` / `⌘2` / `⌘3` / `⌘4` | Switch layout              |
| `Esc`            | Close palette / menus               |

## Branching

Git Flow (`main` ← `develop` ← `feature/*` / `release/*` / `hotfix/*`).
Both `main` and `develop` are protected — PR required, no force-push, no deletion.
`develop` is the default branch.

## Architecture

```
src/                  React + TypeScript frontend
  components/
    panels/           file tree, git, search, settings
    panes/            editor (CodeMirror), terminal (xterm), pane shell
  layouts/            classic / zen / tiled / claude-dock
  state/              zustand store (persisted) + initial layouts
  lib/                glyphs, paneTree algebra, ipc, keymap
src-tauri/            Rust backend
  src/
    fs_cmds.rs        list_dir, read/write_text
    git_cmds.rs       git_status, git_branch (libgit2)
    pty_cmds.rs       PTY spawn + stream events (portable-pty)
    search_cmds.rs    workspace search (ignore-aware)
```

## Origin

Designed in [Claude Design](https://claude.ai/design) — the four-variant
sketchy wireframe canvas can be found in the design bundle that prompted
this project. The implementation matches that design's aesthetic 1:1.
