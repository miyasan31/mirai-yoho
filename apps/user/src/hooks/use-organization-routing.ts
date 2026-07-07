import { useLocation, useParams, useRouter } from "@tanstack/react-router";
import { useMemo, useRef } from "react";

export function useOrganizationIdFromRoute(): string | null {
  const params = useParams({ strict: false });
  const { pathname } = useLocation();

  if (typeof params.organizationId === "string") {
    return params.organizationId;
  }

  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (
    firstSegment &&
    !["admin", "consultant", "consultants", "booking", "api"].includes(
      firstSegment,
    )
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

export function switchOrganizationInPath(
  pathname: string,
  nextOrganizationId: string,
): string {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return `/${nextOrganizationId}`;
  }

  if (segments[0] === "admin" || segments[0] === "consultant") {
    return `/${nextOrganizationId}/${segments.join("/")}`;
  }

  if (segments[0]) {
    segments[0] = nextOrganizationId;
  }

  return `/${segments.join("/")}`;
}

export function useOrganizationRouting() {
  const organizationId = useOrganizationIdFromRoute();
  const { pathname } = useLocation();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  return useMemo(
    () => ({
      organizationId,
      buildPath: (path: string) =>
        organizationId ? buildOrganizationPath(organizationId, path) : path,
      replaceOrganization: (nextOrganizationId: string) => {
        routerRef.current.history.push(
          switchOrganizationInPath(pathname, nextOrganizationId),
        );
      },
    }),
    [organizationId, pathname],
  );
}
