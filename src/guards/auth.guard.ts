import { CanActivateFn } from "@angular/router";
import { inject } from "@angular/core";
import { Router } from "@angular/router";

function isExpired(token: string): boolean {
  const saved = localStorage.getItem("tokenExpiry");
  if (saved) return Date.now() >= Number(saved);

  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (typeof decoded?.exp === "number") {
      return Date.now() >= decoded.exp * 1000;
    }
  } catch {}
  return false;
}

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);

  if (state.url === "/unauthorized") return true;

  const token = localStorage.getItem("accessToken");
  if (!token || isExpired(token)) {
    return router.parseUrl("/unauthorized");
  }

  return true;
};
