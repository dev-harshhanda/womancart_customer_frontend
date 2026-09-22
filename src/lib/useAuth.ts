import { useMemo } from "react";
import { getCurrentUser } from "./slices/authSlice";
import { useAppSelector } from "./hook";

function useAuth() {
  const user = useAppSelector(getCurrentUser);
  return useMemo(() => user, [user]);
}

export default useAuth;
