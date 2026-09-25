// Data access for the UI. Today it returns example data from ./mock;
// each function will call the Go API (cmd/api) once it exists, keeping the same shape.
import * as mock from "./mock";

export async function getTenant() {
  return mock.tenant;
}

export async function getOverview() {
  return mock.overview;
}

export async function getRevenue() {
  return { series: mock.revenue, split: mock.revenueSplit, top: mock.topPackages };
}

export async function getRouters() {
  return mock.routers;
}

export async function getPayments() {
  return mock.payments;
}

export async function getSubscribers() {
  return mock.subscribers;
}

export async function getHotspotPackages() {
  return mock.hotspotPackages;
}

export async function getOnboarding() {
  return mock.onboarding;
}
