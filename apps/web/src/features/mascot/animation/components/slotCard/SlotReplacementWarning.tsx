export function SlotReplacementWarning({ errorMessage }: { errorMessage?: string | null }) {
  if (!errorMessage) return null;
  return (
    <div role="alert" className="anim-slot-failed-box">
      <span>Replacement failed. Showing the previous animation.</span>
      <p className="anim-error-description">{errorMessage}</p>
      <span>Use Replace Video to upload a corrected video.</span>
    </div>
  );
}
