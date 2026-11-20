interface AboutThisGameProps {
  releaseDate?: string;
  developer?: string;
  publisher?: string;
  genres?: string[];
  platforms?: string[];
  additionalDRM?: string;
}

export default function AboutThisGame({
  releaseDate,
  developer,
  publisher,
  genres,
  platforms,
  additionalDRM,
}: AboutThisGameProps) {
  return (
    <section className="mt-1 space-y-2 text-sm" aria-label="About this game">
      {(releaseDate || developer) && (
        <div className="text-[rgb(var(--text-muted))]">
          {releaseDate && (
            <div className="mb-1">
              Released:{" "}
              <span className="text-[rgb(var(--text-primary))]">
                {releaseDate}
              </span>
            </div>
          )}
          {developer && (
            <div>
              Developer:{" "}
              <span className="text-[rgb(var(--text-primary))]">
                {developer}
              </span>
            </div>
          )}
        </div>
      )}

      {publisher && (
        <div className="text-[rgb(var(--text-secondary))]">
          Publisher:{" "}
          <span className="text-[rgb(var(--text-primary))]">{publisher}</span>
        </div>
      )}

      {genres && genres.length > 0 && (
        <div>
          <span className="text-[rgb(var(--text-muted))]">Genres: </span>
          <div className="flex flex-wrap gap-2 mt-1">
            {genres.map((genre) => (
              <span
                key={genre}
                className="bg-[rgb(var(--bg-card-alt))] px-2 py-1 rounded text-xs text-[rgb(var(--text-primary))]"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      )}

      {platforms && platforms.length > 0 && (
        <div>
          <span className="text-[rgb(var(--text-muted))]">Platforms: </span>
          <div className="flex flex-wrap gap-2 mt-1">
            {platforms.map((platform) => (
              <span
                key={platform}
                className="bg-[rgb(var(--bg-card-alt))] px-2 py-1 rounded text-xs text-[rgb(var(--text-primary))]"
              >
                {platform}
              </span>
            ))}
          </div>
        </div>
      )}

      {additionalDRM && (
        <div>
          <span className="text-[rgb(var(--text-muted))]">
            Additional DRM:{" "}
          </span>
          <span className="text-[rgb(var(--text-primary))]">
            {additionalDRM}
          </span>
        </div>
      )}
    </section>
  );
}
