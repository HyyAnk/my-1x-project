import { CompositionPreviewFrame } from "../../../components/composition-preview";
import { useTranslation } from "../../../i18n";

type SandboxVerifiedPreviewProps = {
  iframeKey: number;
  previewHtml: string;
  pendingPreviewHtml: string;
  loading: boolean;
  previewError: string | null;
  onPendingPreviewLoad: (frame: HTMLIFrameElement, html: string) => void;
  onRetryPreview: () => void;
  width: number;
  height: number;
};

export function SandboxVerifiedPreview({ width, height, ...rest }: SandboxVerifiedPreviewProps) {
  const { t } = useTranslation();
  return (
    <CompositionPreviewFrame
      width={width}
      height={height}
      title="HyperFrames Sandbox Frame Preview"
      statusLabel={t("visualSandbox.verifyingFonts")}
      errorLabel={t("visualSandbox.fontLoadFailed")}
      retryLabel={t("common.retry")}
      {...rest}
    />
  );
}
