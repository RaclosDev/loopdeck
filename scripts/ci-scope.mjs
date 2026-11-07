import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function scopeForPaths(paths) {
  const scope = { frontend: false, backend: false, docker: false };
  for (const path of paths) {
    if (
      /^(docs\/|anti-slop\/)/.test(path) ||
      /^[^/]+\.md$/.test(path) ||
      path === "LICENSE"
    )
      continue;
    if (
      /(^|\/)Dockerfile$/.test(path) ||
      path === ".dockerignore" ||
      /^docker-compose\./.test(path)
    ) {
      scope.frontend = scope.backend = scope.docker = true;
    } else if (path.startsWith("frontend/")) {
      scope.frontend = true;
      if (/^frontend\/package(-lock)?\.json$/.test(path)) scope.docker = true;
    } else if (path.startsWith("backend/")) {
      scope.backend = true;
      if (
        /^backend\/src\/main\/java\/com\/loopdeck\/(controller|dto|model|config)\//.test(
          path,
        )
      )
        scope.frontend = true;
      if (path === "backend/pom.xml") scope.frontend = scope.docker = true;
    } else if (
      ["package.json", "package-lock.json"].includes(path) ||
      path.startsWith(".husky/")
    ) {
      scope.frontend = true;
    } else {
      scope.frontend = scope.backend = scope.docker = true;
    }
  }
  return scope;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const paths = readFileSync(0, "utf8").split("\0").filter(Boolean);
  for (const [name, required] of Object.entries(scopeForPaths(paths)))
    console.log(`${name}=${required}`);
}
