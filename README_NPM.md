# Using npm with Local Node.js Installation

Since npm is not in your system PATH, here are ways to use it:

## Option 1: Use the Helper Script (Recommended)

Run npm commands using the helper script:

```bash
./npm-helper.sh install
./npm-helper.sh run dev
./npm-helper.sh run build
```

## Option 2: Add to PATH Permanently

Add this line to your `~/.zshrc` file:

```bash
export PATH="/Users/zhengfeifan/Cursor/try 2/node-v20.11.1-darwin-arm64/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.zshrc
```

## Option 3: Use Full Path

Use the full path to npm directly:

```bash
/Users/zhengfeifan/Cursor/try 2/node-v20.11.1-darwin-arm64/bin/npm run dev
```

## Quick Commands

- **Start dev server**: `./npm-helper.sh run dev` or use the full path
- **Install packages**: `./npm-helper.sh install`
- **Build for production**: `./npm-helper.sh run build`

