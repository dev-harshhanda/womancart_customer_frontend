import {
  configureStore,
  ThunkAction,
  Action,
  combineReducers,
  Reducer,
  AnyAction,
} from "@reduxjs/toolkit";
import api from "./rtk";

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

import { authSlice } from "./slices/authSlice";
import { wishlistSlice } from "./slices/wishlistSlice";
import { RootState } from "@/types/General";
import storage from "./storage";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"], // Choose reducers to persist
};

const appReducer = combineReducers({
  auth: authSlice.reducer,
  wishlist: wishlistSlice.reducer,

  [api.reducerPath]: api.reducer,
});

export const persistedReducer = persistReducer(persistConfig, appReducer);
// export type RootState = ReturnType<typeof persistedReducer>;

const rootReducer: Reducer = (state: RootState, action: AnyAction) => {
  if (action.type === "auth/resetAuth") {
    state = {} as RootState;
    if (typeof window !== "undefined") {
      persistor.purge(); // Now safe to use persistor here
    }
  }
  return persistedReducer(state, action);
};
export const store = () => {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // serializableCheck: false,
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).concat(api.middleware),
  });
};
export const persistor = persistStore(store());
export type AppStore = ReturnType<typeof store>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
