import type { IntroOutroSnapshot } from "@studio/shared";

type Props = {
  isBuiltInSelected: boolean;
  snapshot: IntroOutroSnapshot | undefined;
  pinnedPairName: string | undefined;
  showNoReadyPairs: boolean;
  categoryName: string;
};

export function IntroOutroStatusMessages({
  isBuiltInSelected,
  snapshot,
  pinnedPairName,
  showNoReadyPairs,
  categoryName,
}: Props) {
  return (
    <>
      {isBuiltInSelected && snapshot ? (
        <div className="style-option-message" role="status">
          {snapshot.pair_id ? `Selected pair: ${pinnedPairName ?? snapshot.pair_id}` : "No intro/outro for this episode"}
        </div>
      ) : null}
      {showNoReadyPairs ? (
        <div className="style-option-message" role="status">
          No ready pairs in {categoryName}
        </div>
      ) : null}
    </>
  );
}
