#!/usr/bin/env node

import { program } from 'commander'
import { execSync } from 'child_process'

// Local Dependencies
import { getGlob, getDependencyPaths, getWorkspaceInfo, hasChanges, readJson, WorkspaceInfo, getNextDependency } from './lib'

const DEFAULT_OPTIONS = {
  remote: 'origin',
  branch: undefined,
  package: './package.json',
  info: false,
  json: false,
  help: false,
}

// Program config
program
  .description('Get the ordered list of which workspaces have changed since the reference commit')
  .version('0.0.1')

// Init Program Options
program
  .option('-b, --branch', 'Branch to compare for changes')
  .option('-remote, --remote', 'Github Remote if it is not origin')
  .option('-r, --ref', 'Github Sha to compare it from')
  .option('-p, --package', 'path to root package.json')
  .option('-i, --info', 'Show verbose workspace info', false)
  .option('-j, --json', 'Output as json', false)

// Package the program cli config
program.parse(process.argv);

// Primary Project Run
(async function () {
  const options = {
    ...DEFAULT_OPTIONS,
    ...program.opts()
  }

  const manifest = readJson(options.package || './package.json')

  if (!manifest.workspaces) {
    throw new Error('There aren\'t any workspaces to search')
  }

  let sha
  // If a branch is passed, then get the sha of that branch
  if (options.branch) {
    sha = await execSync(`git rev-parse ${options.remote}/${options.branch}`).toString('utf-8')
  } else {
    const defaultBranch =  await execSync(`git remote show ${options.remote} | sed -n '/HEAD branch/s/.*: //p'`).toString('utf-8')
    sha = await execSync(`git rev-parse ${options.remote}/${defaultBranch}`).toString('utf-8')
  }

  // Get list of all changes as an array
  // Add in an optional reference point
  const changes = await execSync(`git diff --name-only ${sha}`)
    .toString('utf-8')
    .split("\n")


  // Traverse workspaces and get all nested workspace package.json files
  const workspaces: string[] = manifest?.workspaces?.packages
  let manifests: string[] = []

  for (let i in workspaces) {
    const workspaceFiles = await getGlob(`${workspaces[i]}/*`)
    manifests = [
      ...manifests,
      ...workspaceFiles.filter(v => v.indexOf('package.json') !== -1)
    ]
  }

  // Build Workspace info object.
  // We can't really compare dependencies until this is build once
  // TODO: There are a couple iterations through the array for this reason
  // Something certainly worth improving upon
  const info: Record<string, WorkspaceInfo> = {}
  manifests.forEach((workspaceManifestPath) => {
    const workspaceInfo = getWorkspaceInfo(workspaceManifestPath)
    info[workspaceInfo.name] = workspaceInfo
  })

  // Get list of namespaces we need
  const namespaces = Object.keys(info)

  // Update info with the correct changes information
  Object.values(info)
    .forEach(({ name, path }) => {
      const dependencyPaths = getDependencyPaths(name, info)
      info[name].hasChanges = hasChanges(path, changes)
      info[name].hasDependencyChanges = hasChanges(dependencyPaths, changes)
      info[name].changedDependencies = (info[name].changedDependencies || []).filter(dep => namespaces.find(ns => ns === dep))
    })

  // Now filter dependencies to only the list that have changes
  Object.values(info)
    .forEach(({ changedDependencies }) => {
      changedDependencies = [...changedDependencies?.filter(dep => info[dep].hasChanges || info[dep].hasDependencyChanges) || []]
    })

  let changedPackages = Object.values(info)
    // List of changed packages
    .filter(pkg => pkg.hasChanges || pkg.hasDependencyChanges)
    .map(({ name }, i) => {
      // Assign Build Order
      info[name].buildOrder = i
      return name
    })
  
  const ordered = []
  while(changedPackages.length > 0 ) {
    const next = getNextDependency(changedPackages, info)
    ordered.push(next)
    changedPackages = changedPackages.filter(ns => ns !== next)
  }

  // Assign A Build Order to the info object
  ordered.forEach((ns, i) => info[ns].buildOrder = i)
  
  // Lots of possibilities for output
  if (options.info) {
    console.log(info)
    return
  }

  if (options.json) {
    console.log(JSON.stringify(ordered))
  } else {
    console.log(ordered.join('\n'))
  }
})()
  .catch((err: Error) => {
    console.log('error')
    console.log(err.message)
  })
