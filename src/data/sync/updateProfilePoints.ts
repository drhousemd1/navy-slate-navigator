
import { queryClient } from "../queryClient";
import localforage from "localforage";

export async function updateProfilePoints(points: number, dom_points: number) {
  queryClient.setQueryData(["profile_points"], { points, dom_points });
  await localforage.setItem("profile_points", { points, dom_points });
}
