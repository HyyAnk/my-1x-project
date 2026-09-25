import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { VariantExportError } from "./variantExport.types.js";

const execute = promisify(execFile);
export type NativeFolderPicker = (initialPath: string) => Promise<string | null>;

// Paths travel through the environment, never through executable script text.
const pickerScript = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Choose a folder for mascot variants'
$dialog.SelectedPath = $env:STUDIO_EXPORT_INITIAL_FOLDER
$dialog.ShowNewFolderButton = $true
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
$owner.ShowInTaskbar = $false
try {
  if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::Write($dialog.SelectedPath)
  }
} finally {
  $dialog.Dispose()
  $owner.Dispose()
}
`;

export function createNativeFolderPicker(run = execute, platform = process.platform): NativeFolderPicker {
  let active = false;
  return async (initialPath) => {
    if (platform !== "win32")
      throw new VariantExportError("Windows folder selection is unavailable. Use a server folder path instead.", 501);
    if (active) throw new VariantExportError("A folder window is already open. Complete or close it first.", 409);
    active = true;
    try {
      const executable = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
      const { stdout } = await run(
        executable,
        ["-NoProfile", "-STA", "-EncodedCommand", Buffer.from(pickerScript, "utf16le").toString("base64")],
        {
          windowsHide: true,
          timeout: 120_000,
          maxBuffer: 16_384,
          encoding: "utf8",
          env: { ...process.env, STUDIO_EXPORT_INITIAL_FOLDER: initialPath },
        },
      );
      return stdout.trim() || null;
    } catch {
      throw new VariantExportError("Folder window was unavailable or timed out. Try again or use a server folder path.", 503);
    } finally {
      active = false;
    }
  };
}
