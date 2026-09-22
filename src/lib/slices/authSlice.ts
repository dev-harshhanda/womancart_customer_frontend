import { RootState, User } from "@/types/General";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  user: User | null;
  token: string | null;
  tempToken: string | null;
  role: string | null;
  jobSeekerStep: number | null;
  employerStep: number | null;
  rememberMe: boolean | null;
  email: string | null;
  password: string | null;
  isTour: boolean;
  userRole: string | null;
  isLoggingOut: boolean | null;
  fcmToken: string | null;
}
const initialState: AuthState = {
  user: null,
  token: null,
  tempToken: null,
  role: null,
  jobSeekerStep: null,
  employerStep: null,
  rememberMe: null,
  email: null,
  password: null,
  isTour: false,
  userRole: null,
  isLoggingOut: false,
  fcmToken: null,
};
export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    resetAuth: (state) => {
      state.user = null;
      state.token = null;
      state.fcmToken = null;
      // state.rememberMe = null;
    },
    setCredentials: (
      state,
      action: PayloadAction<Pick<AuthState, "user" | "token">>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    setUser: (state, action: PayloadAction<Pick<AuthState, "user">>) => {
      state.user = action.payload.user;
    },
    temporaryToken: (
      state,
      action: PayloadAction<Pick<AuthState, "tempToken">>
    ) => {
      state.tempToken = action.payload.tempToken;
    },
    setToken: (state, action: PayloadAction<Pick<AuthState, "token">>) => {
      state.token = action.payload.token;
    },
    setFcmToken: (
      state,
      action: PayloadAction<Pick<AuthState, "fcmToken">>
    ) => {
      state.fcmToken = action.payload.fcmToken;
    },
    setLoggingOut: (
      state,
      action: PayloadAction<Pick<AuthState, "isLoggingOut">>
    ) => {
      state.isLoggingOut = action.payload.isLoggingOut;
    },
    setRole: (state, action: PayloadAction<Pick<AuthState, "role">>) => {
      state.role = action.payload.role;
    },
    SetJobSeekerStep: (
      state,
      action: PayloadAction<Pick<AuthState, "jobSeekerStep">>
    ) => {
      state.jobSeekerStep = action.payload.jobSeekerStep;
    },
    setEmployerStep: (
      state,
      action: PayloadAction<Pick<AuthState, "employerStep">>
    ) => {
      state.employerStep = action.payload.employerStep;
    },
    setAuthRememberMe: (
      state,
      action: PayloadAction<
        Pick<AuthState, "rememberMe" | "email" | "password" | "userRole">
      >
    ) => {
      state.rememberMe = action.payload.rememberMe;
      state.email = action.payload.email;
      state.password = action.payload.password;
      state.userRole = action.payload.userRole;
    },
    showTour: (state, action: PayloadAction<Pick<AuthState, "isTour">>) => {
      state.isTour = action.payload.isTour;
    },
  },
});
export const {
  resetAuth,
  setCredentials,
  temporaryToken,
  setRole,
  setUser,
  setToken,
  SetJobSeekerStep,
  setEmployerStep,
  setAuthRememberMe,
  showTour,
  setLoggingOut,
  setFcmToken,
} = authSlice.actions;

export const getCurrentUser = (state: RootState) => state.auth.user;
export const getToken = (state: RootState) => state.auth.token;
export const getTempToken = (state: RootState) => state.auth.tempToken;
export const getRole = (state: RootState) => state.auth.role;
export const getJobSeekerStep = (state: RootState) => state.auth.jobSeekerStep;
export const getEmployerStep = (state: RootState) => state.auth.employerStep;
export const canShowTour = (state: RootState) => state.auth.isTour;
export const isLoggingOut = (state: RootState) => state.auth.isLoggingOut;
export const getFcmToken = (state: RootState) => state.auth.fcmToken;
export const isRemember = (state: RootState) => {
  return {
    isRemember: state.auth.rememberMe,
    email: state.auth.email,
    password: state.auth.password,
    userRole: state.auth.userRole,
  };
};

export default authSlice.reducer;
