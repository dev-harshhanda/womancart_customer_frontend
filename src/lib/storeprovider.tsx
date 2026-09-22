"use client";
import { store, type AppStore } from "@/lib/store";

import { setupListeners } from "@reduxjs/toolkit/query";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { type Persistor, persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";

interface Props {
  readonly children: ReactNode;
}

export const StoreProvider = ({ children }: Props) => {
  const storeRef = useRef<AppStore | null>(null);
  const persistorRef = useRef<Persistor>({} as Persistor);

  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = store();
    persistorRef.current = persistStore(storeRef.current);
  }

  useEffect(() => {
    if (storeRef.current == null) return;

    // Only reconnect refetch — disable refetchOnFocus to avoid refetch storms
    // when switching browser tabs (Header alone subscribes to 10+ queries).
    const unsubscribe = setupListeners(
      storeRef.current.dispatch,
      (dispatch, actions) => {
        const onOnline = () => dispatch(actions.onOnline());
        const onOffline = () => dispatch(actions.onOffline());
        if (typeof window !== "undefined") {
          window.addEventListener("online", onOnline);
          window.addEventListener("offline", onOffline);
        }
        return () => {
          if (typeof window !== "undefined") {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
          }
        };
      },
    );
    return unsubscribe;
  }, []);

  return (
    <Provider store={storeRef.current}>
      <PersistGate persistor={persistorRef.current}>{children}</PersistGate>
    </Provider>
  );
};
