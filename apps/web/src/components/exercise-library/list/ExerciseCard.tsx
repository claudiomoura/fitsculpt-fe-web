import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type ExerciseCardProps = {
  id?: string | null;
  name: string;
  href?: string;
  coverUrl: string;
  mediaAltPrefix: string;
  muscles: string[];
  noMuscleDataLabel: string;
  equipmentLabel: string;
  equipmentValue: string;
  description?: string | null;
  favoriteLabel: string;
  addLabel: string;
  isFavorite: boolean;
  isFavoritePending: boolean;
  onFavoriteToggle?: () => void;
  onAdd: () => void;
};

export function ExerciseCard({
  id,
  name,
  href,
  coverUrl,
  mediaAltPrefix,
  muscles,
  noMuscleDataLabel,
  equipmentLabel,
  equipmentValue,
  description,
  favoriteLabel,
  addLabel,
  isFavorite,
  isFavoritePending,
  onFavoriteToggle,
  onAdd,
}: ExerciseCardProps) {
  const content = (
    <>
      <img
        src={coverUrl}
        alt={`${mediaAltPrefix} ${name}`}
        className="exercise-card-media"
        onError={(event) => {
          event.currentTarget.src = "/placeholders/exercise-cover.jpg";
        }}
      />
      <h3>{name}</h3>
      <div className="badge-list">
        {muscles.length > 0 ? (
          muscles.map((muscle) => <Badge key={muscle}>{muscle}</Badge>)
        ) : (
          <Badge variant="muted">{noMuscleDataLabel}</Badge>
        )}
      </div>
      <p className="muted">
        {equipmentLabel}: {equipmentValue}
      </p>
      {description ? <p className="muted">{description}</p> : null}
    </>
  );

  if (!id || !href) {
    return (
      <div className="feature-card">
        {content}
        <div className="inline-actions-sm">
          <Button variant="secondary" size="sm" aria-label={addLabel} onClick={onAdd}>
            +
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-card library-card">
      <Link href={href} className="library-card-link">
        {content}
      </Link>
      {onFavoriteToggle ? (
        <Button
          variant="ghost"
          size="sm"
          className="library-favorite-button"
          aria-pressed={isFavorite}
          aria-label={favoriteLabel}
          loading={isFavoritePending}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onFavoriteToggle();
          }}
        >
          {favoriteLabel}
        </Button>
      ) : null}
      <Button
        variant="secondary"
        size="sm"
        className="library-favorite-button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onAdd();
        }}
      >
        +
      </Button>
    </div>
  );
}

