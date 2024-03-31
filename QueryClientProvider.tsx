import React, { useEffect, createContext, FC } from "react";
import { QueryClient } from "./QueryClient";

export const context = createContext<QueryClient>(new QueryClient());

interface QueryClientProviderProps {
  children: React.ReactNode;
  client: QueryClient;
}

export const QueryClientProvider: FC<QueryClientProviderProps> = ({
  children,
  client,
}) => {
  useEffect(() => {
    const onFocus = () => {
      client.queries.forEach((query) => {
        query.subscribers.forEach((subscriber) => {
          subscriber.fetch();
        });
      });
    };

    window.addEventListener("visibilitychange", onFocus, false);
    window.addEventListener("focus", onFocus, false);

    return () => {
      window.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [client]);

  return <context.Provider value={client}>{children}</context.Provider>;
};
