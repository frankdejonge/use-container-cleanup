# Action to clean up containers from ghcr.io

This action old deleted docker containers hosted on ghcr.io. The action expects
containers to have incremental numeric semver-like tags. Any version that can be coerced
to a semver version works (e.g. `1.2` or `2.3.4`).

For tagging of containers I use tags formatted as `<MAJOR-NUMBER>.${{ github.run_number }}`.

## Example workflow

```yaml
name: Clean up Container Images

on:
  push:
    branches: [main]
    paths:
      - .github/workflows/cleanup-containers.yml
  workflow_run:
    workflows: ["Build Docker Images"]
    branches: [main]
    types:
      - completed

jobs:
  clean-up:
    runs-on: ubuntu-latest
    steps:
        uses: frankdejonge/use-container-cleanup@0.1.0
        with:
          package: <YOUR_PACKAGE_NAME>
          versions: <VERSIONS_TO_KEEP>
          token: ${{ secrets.GITHUB_TOKEN }}
```
