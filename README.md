# Yarn Changed (Seriously, how does this not exist yet?)

## Contributions and PRs welcome

This CLI package compares to the default branch and tells you which workspace packages have changed. It also outputs the changed packages in order of dependency.  Ideally we can use this to get build order and bake it into automation without having to bring on Lerna.  This is also only focused on GIT so if your repo isn't using git, then you're going to have a bad time.

## Help Output

```
Usage: workspaces [options]

Get the ordered list of which workspaces have changed since the reference commit

Options:
  -V, --version      output the version number
  -b, --branch       Branch to compare for changes
  -remote, --remote  Github Remote if it is not origin
  -r, --ref          Github Sha to compare it from
  -p, --package      path to root package.json
  -i, --info         Show verbose workspace info (default: false)
  -j, --json         Output as json (default: false)
  -h, --help         display help for command
```
