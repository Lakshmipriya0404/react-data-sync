export interface QueryState<T> {
  status: 'loading' | 'success' | 'error';
  isFetching: boolean;
  data?: T;
  error?: any;
  lastUpdated?: number;
}

interface Query<T> {
  queryKey: string;
  queryHash: string;
  promise: Promise<void> | null;
  subscribers: QueryObserver<T>[];
  gcTimeout: ReturnType<typeof setTimeout> | null;
  state: QueryState<T>;
  subscribe: (subscriber: QueryObserver<T>) => () => void;
  scheduleGC: () => void;
  unscheduleGC: () => void;
  setState: (updater: Updater<T>) => void;
  fetch: () => Promise<void> | null;
}

export interface QueryObserver<T> {
  notify: () => void;
  getResult: () => QueryState<T>;
  subscribe: (callback: () => void) => () => void;
  fetch: () => void;
}

export interface QueryOptions<T> {
  queryKey: any;
  queryFn: () => Promise<T>;
  staleTime?: number;
  cacheTime?: number;
}

type Updater<T> = (state: QueryState<T>) => QueryState<T>;

export class QueryClient {
  queries: Query<any>[];

  constructor() {
    this.queries = [];
  }
  //creates new query or returns the existing query
  getQuery<T>(options: QueryOptions<T>): Query<T> {
    const queryHash = JSON.stringify(options.queryKey);
    let query = this.queries.find((d) => d.queryHash === queryHash);

    if (!query) {
      query = this.createQuery(options);
      this.queries.push(query);
    }

    return query;
  }

  private createQuery<T>({
    queryKey,
    queryFn,
    cacheTime = 5 * 60 * 1000,
  }: QueryOptions<T>): Query<T> {
    const query: Query<T> = {
      queryKey,
      queryHash: JSON.stringify(queryKey),
      promise: null,
      subscribers: [],
      gcTimeout: null,
      state: {
        status: 'loading',
        isFetching: true,
        data: undefined,
        error: undefined,
      },
      subscribe: (subscriber) => {
        query.subscribers.push(subscriber);
        query.unscheduleGC();

        return () => {
          query.subscribers = query.subscribers.filter((d) => d !== subscriber);

          if (!query.subscribers.length) {
            query.scheduleGC();
          }
        };
      },
      scheduleGC: () => {
        query.gcTimeout = setTimeout(() => {
          this.queries = this.queries.filter((d) => d !== query);
        }, cacheTime);
      },
      unscheduleGC: () => {
        clearTimeout(query.gcTimeout!);
      },
      setState: (updater) => {
        query.state = updater(query.state);
        query.subscribers.forEach((subscriber) => subscriber.notify());
      },
      fetch: () => {
        if (!query.promise) {
          query.promise = (async () => {
            query.setState((old) => ({
              ...old,
              isFetching: true,
              error: undefined,
            }));

            try {
              const data = await queryFn();
              query.setState((old) => ({
                ...old,
                status: 'success',
                lastUpdated: Date.now(),
                data,
              }));
            } catch (error) {
              query.setState((old) => ({
                ...old,
                status: 'error',
                error,
              }));
            } finally {
              query.promise = null;
              query.setState((old) => ({
                ...old,
                isFetching: false,
              }));
            }
          })();
        }

        return query.promise;
      },
    };

    return query;
  }
}
