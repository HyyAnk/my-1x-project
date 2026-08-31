export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code = "REPOSITORY_ERROR",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "RepositoryError";
  }
}
