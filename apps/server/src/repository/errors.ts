export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code = "REPOSITORY_ERROR",
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}
