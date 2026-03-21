export interface IUnitOfWork {
  runInTransaction(fn: () => Promise<void>): Promise<void>;
}
