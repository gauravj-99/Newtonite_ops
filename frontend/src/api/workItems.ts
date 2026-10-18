import { api } from "./client";
import type { WorkItem } from "../types";

export const getAllTeamWorkItems = async (
  teamIds: number[],
  filters: Record<string, string | number | undefined> = {}
): Promise<WorkItem[]> => {
  const batches = await Promise.all(
    teamIds.map(async (teamId) => {
      const first = await api.get(`/work/teams/${teamId}/items`, {
        params: { ...filters, page: 1, limit: 100 },
      });
      const items = first.data.items as WorkItem[];
      const totalPages = first.data.pagination.totalPages as number;
      if (totalPages <= 1) return items;

      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          api.get(`/work/teams/${teamId}/items`, {
            params: { ...filters, page: index + 2, limit: 100 },
          })
        )
      );
      return items.concat(...remaining.map((response) => response.data.items as WorkItem[]));
    })
  );
  return batches.flat();
};
