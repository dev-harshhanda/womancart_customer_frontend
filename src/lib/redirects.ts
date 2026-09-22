import redirectsJson from "../../redirects.generated.json";

type RedirectRule = {
  source: string;
  destination: string;
};

const redirects = redirectsJson as RedirectRule[];

export const redirectMap = new Map<string, string>();

export function normalize(path: string): string {
  // Decode encoded characters
  let p = decodeURIComponent(path);

  // Remove query string (safety)
  p = p.split("?")[0];

  // Remove trailing slash except "/"
  if (p.length > 1) {
    p = p.replace(/\/+$/, "");
  }

  // Lowercase
  p = p.toLowerCase();

  return p;
}

// Build map once
for (const item of redirects) {
  redirectMap.set(item.source, item.destination);
}