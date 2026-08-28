# AI Documentary Studio

> **Note:** This is a personal project developed and supported exclusively for **Windows**. Other operating systems are not supported.

## Requirements

- **Operating System:** Windows 10 / 11 (64-bit)
- **Node.js:** v20+ (v22+ recommended)
- **pnpm:** v9+
- **Python:** 3.10+ (if using local audio/TTS services)

---

## Installation & Getting Started

### 1. One-Click Startup (Recommended)

Run the startup batch script in the project root:
```cmd
"run dashboard.bat"
```
This script checks required dependencies, configures the environment, and launches the local dashboard.

To stop running services:
```cmd
"stop dashboard.bat"
```

### 2. Manual Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start development server:**
   ```bash
   pnpm dev
   ```

3. **Build & Run production:**
   ```bash
   pnpm build
   pnpm start
   ```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
