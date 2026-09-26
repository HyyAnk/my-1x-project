export interface IdentityDirectory {
  getDirectoryHandle(name: string, options: { create: boolean }): Promise<IdentityDirectory>;
  getFileHandle(
    name: string,
    options: { create: boolean },
  ): Promise<{
    createWritable(): Promise<{
      write(data: Uint8Array): Promise<void>;
      close(): Promise<void>;
      abort(): Promise<void>;
    }>;
  }>;
}

export type IdentityPickerWindow = Window & {
  showDirectoryPicker?: (options: { mode: "readwrite" }) => Promise<IdentityDirectory>;
};

export interface IdentityProgress {
  message: string;
  completed?: number;
  total?: number;
}
