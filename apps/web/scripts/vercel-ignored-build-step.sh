#!/bin/sh

if [ "${VERCEL_GIT_COMMIT_REF:-}" = "main" ]; then
  echo "main branch detected; continue with build/deploy"
  exit 1
fi

echo "branch '${VERCEL_GIT_COMMIT_REF:-unknown}' is not main; ignore build"
exit 0
