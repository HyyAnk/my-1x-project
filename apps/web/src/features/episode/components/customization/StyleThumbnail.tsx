export interface StyleThumbnailProps {
  thumbUrl: string | null;
  altText: string;
}

export function StyleThumbnail({ thumbUrl, altText }: StyleThumbnailProps) {
  if (!thumbUrl) return null;

  return (
    <span className="style-option-leading">
      <img
        src={thumbUrl}
        alt={altText}
        className="style-option-thumb mascot-style-thumb"
        style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover" }}
      />
    </span>
  );
}
