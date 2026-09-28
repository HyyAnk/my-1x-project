# Read-only inspection of the working directory for native 64-bit processes.
# Access failures and unsupported architectures fail closed.
if (-not ('DashboardProcessDirectory' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class DashboardProcessDirectory {
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
    [DllImport("kernel32.dll")]
    static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool ReadProcessMemory(IntPtr handle, IntPtr address, byte[] data, int size, out IntPtr read);
    [DllImport("kernel32.dll")]
    static extern bool IsWow64Process(IntPtr handle, out bool wow64);
    [DllImport("ntdll.dll")]
    static extern int NtQueryInformationProcess(IntPtr handle, int kind, IntPtr[] info, int size, out int returned);

    static byte[] Read(IntPtr handle, long address, int size) {
        var data = new byte[size];
        IntPtr count;
        if (!ReadProcessMemory(handle, new IntPtr(address), data, size, out count) || count.ToInt64() != size)
            throw new InvalidOperationException("Process memory is unavailable");
        return data;
    }

    public static string Get(int pid) {
        if (IntPtr.Size != 8) return null;
        var handle = OpenProcess(0x410, false, pid);
        if (handle == IntPtr.Zero) return null;
        try {
            bool wow64;
            if (!IsWow64Process(handle, out wow64) || wow64) return null;
            var info = new IntPtr[6];
            int returned;
            if (NtQueryInformationProcess(handle, 0, info, 48, out returned) != 0) return null;
            long parameters = BitConverter.ToInt64(Read(handle, info[1].ToInt64() + 0x20, 8), 0);
            var directory = Read(handle, parameters + 0x38, 16);
            int length = BitConverter.ToUInt16(directory, 0);
            if (length == 0 || length > 32766 || length % 2 != 0) return null;
            return System.Text.Encoding.Unicode.GetString(Read(handle, BitConverter.ToInt64(directory, 8), length));
        } catch { return null; }
        finally { CloseHandle(handle); }
    }
}
'@
}

function Test-DashboardWorkspaceDirectory {
  param([string]$Directory, [string]$ProjectRoot)
  if ([string]::IsNullOrWhiteSpace($Directory)) { return $false }
  $rootPath = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
  $directoryPath = [IO.Path]::GetFullPath($Directory).TrimEnd('\')
  return $directoryPath.Equals($rootPath, [StringComparison]::OrdinalIgnoreCase) -or
    $directoryPath.StartsWith($rootPath + '\', [StringComparison]::OrdinalIgnoreCase)
}

function Test-DashboardProcessOwner {
  param([int]$ProcessId, [string]$ProjectRoot)
  $directory = [DashboardProcessDirectory]::Get($ProcessId)
  return Test-DashboardWorkspaceDirectory -Directory $directory -ProjectRoot $ProjectRoot
}
