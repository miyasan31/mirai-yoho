import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import { type AppPath, toAppPath } from "../lib/app-path";

export function useOrganizationIdFromRoute(): string | null {
  const params = useParams({ strict: false });
  const pathname = useLocation({ select: (location) => location.pathname });

  if (typeof params.organizationId === "string") {
    return params.organizationId;
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (
    firstSegment &&
    !["login", "password-reset", "api"].includes(firstSegment)
  ) {
    return firstSegment;
  }

  return null;
}

export function buildOrganizationPath(
  organizationId: string,
  path: string,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/${organizationId}${normalizedPath}`;
}

export function useOrganizationRouting() {
  const organizationId = useOrganizationIdFromRoute();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  return useMemo(
    () => ({
      organizationId,
      buildPath: (path: string): AppPath =>
        toAppPath(
          organizationId ? buildOrganizationPath(organizationId, path) : path,
        ),
      /**
       * 組織を切り替える。切り替え先に存在しない ID を含むパス
       * （詳細ページなど）に迷い込まないよう、常にホームへ遷移する。
       */
      replaceOrganization: (nextOrganizationId: string) => {
        void navigateRef.current({
          href: buildOrganizationPath(nextOrganizationId, "/home"),
        });
      },
    }),
    [organizationId],
  );
}
