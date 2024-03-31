import { QueryClient, QueryObserver, QueryOptions } from './QueryClient';

export function createQueryObserver<T>(
  client: QueryClient,
  { queryKey, queryFn, staleTime = 0, cacheTime }: QueryOptions<T>
): QueryObserver<T> {
  const query = client.getQuery({ queryKey, queryFn, cacheTime });

  const observer: QueryObserver<T> = {
    notify: () => {},
    getResult: () => query.state,
    subscribe: (callback) => {
      observer.notify = callback;
      const unsubscribe = query.subscribe(observer);

      observer.fetch();

      return unsubscribe;
    },
    fetch: async () => {
      if (
        !query.state.lastUpdated ||
        Date.now() - query.state.lastUpdated > staleTime
      ) {
        query.fetch();
      }
    },
  };

  return observer;
}
