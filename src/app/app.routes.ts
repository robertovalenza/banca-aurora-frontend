import { Routes } from "@angular/router";
import { authGuard } from "../guards/auth.guard";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("../shared/components/home/home.component").then(
        (m) => m.HomeComponent
      ),
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("../shared/components/dashboard/dashboard.component").then(
        (m) => m.DashboardComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: "unauthorized",
    loadComponent: () =>
      import("../shared/components/unauthorized/unauthorized.component").then(
        (m) => m.UnauthorizedComponent
      ),
  },
  { path: "**", redirectTo: "unauthorized" },
];
