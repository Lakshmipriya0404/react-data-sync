import { useContext, useEffect, useReducer, useRef } from "react";
import { QueryObserver, QueryOptions, QueryState } from "./QueryClient";
import { createQueryObserver } from "./createQueryObserver";
import { context } from "./QueryClientProvider";

export default function useQuery<T>({
  queryKey,
  queryFn,
  staleTime,
  cacheTime,
}: QueryOptions<T>): QueryState<T> {
  const client = useContext(context); // Access QueryClient from context

  //force re-render when the state changes
  const [, rerender] = useReducer((i) => i + 1, 0);

  //to keep track of the observer between renders
  const observerRef = useRef<QueryObserver<T>>();

  if (!observerRef.current) {
    observerRef.current = createQueryObserver(client, {
      queryKey,
      queryFn,
      staleTime,
      cacheTime,
    });
  }

  useEffect(() => {
    return observerRef.current!.subscribe(rerender);
  }, []);

  //return the query state
  return observerRef.current.getResult();
}
