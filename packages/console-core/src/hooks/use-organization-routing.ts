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
  const pathname = useLocation({ select: (location) => location.pathname });
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
      replaceOrganization: (nextOrganizationId: string) => {
        void navigateRef.current({
          href: switchOrganizationInPath(pathname, nextOrganizationId),
        });
      },
    }),
    [organizationId, pathname],
  );
}
