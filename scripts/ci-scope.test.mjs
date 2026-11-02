import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { scopeForPaths } from "./ci-scope.mjs";

const none = { frontend: false, backend: false, docker: false };
const all = { frontend: true, backend: true, docker: true };

for (const [name, paths, expected] of [
  ["documentation", ["README.md", "docs/plan.md", "AGENTS.md"], none],
  ["empty diff", [], none],
  [
    "frontend UI",
    ["frontend/src/pages/Study.tsx"],
    { ...none, frontend: true },
  ],
  [
    "backend service",
    ["backend/src/main/java/com/loopdeck/service/CardService.java"],
    { ...none, backend: true },
  ],
  [
    "API contract",
    ["backend/src/main/java/com/loopdeck/controller/CardController.java"],
    { ...none, frontend: true, backend: true },
  ],
  [
    "model contract",
    ["backend/src/main/java/com/loopdeck/model/Card.java"],
    { ...none, frontend: true, backend: true },
  ],
  [
    "database migration",
    ["backend/src/main/resources/db/migration/V22__example.sql"],
    { ...none, backend: true },
  ],
  [
    "frontend dependencies",
    ["frontend/package-lock.json"],
    { ...none, frontend: true, docker: true },
  ],
  ["backend dependencies", ["backend/pom.xml"], all],
  ["Docker context", [".dockerignore"], all],
  ["Dockerfile", ["frontend/Dockerfile"], all],
  [
    "root tooling",
    ["package.json", ".husky/pre-commit"],
    { ...none, frontend: true },
  ],
  ["CI configuration", [".github/workflows/build.yml"], all],
  ["scope implementation", ["scripts/ci-scope.mjs"], all],
  ["unknown executable path", ["new-runtime/config.json"], all],
  [
    "mixed change",
    ["frontend/src/App.tsx", "backend/src/test/java/SomeTest.java"],
    { ...none, frontend: true, backend: true },
  ],
]) {
  test(name, () => assert.deepEqual(scopeForPaths(paths), expected));
}

test("CLI accepts null-separated file names and emits only boolean workflow outputs", () => {
  const result = spawnSync(process.execPath, ["scripts/ci-scope.mjs"], {
    input: "frontend/src/pages/With a space.tsx\0README.md\0",
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "frontend=true\nbackend=false\ndocker=false\n");
});
