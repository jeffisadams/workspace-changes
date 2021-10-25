#!/usr/bin/env node

import { red } from 'chalk'
import { textSync } from 'figlet'
import { program } from 'commander'
import { execSync } from 'child_process'

// Local Dependencies
import { getGlob, getDependencyPaths, getWorkspaceInfo, hasChanges, readJson, WorkspaceInfo, getIndependant, getFirstDependency } from './lib'

// Program config
program
  .description('Get the ordered list of which workspaces have changed since the reference commit')
  .version('0.0.1')

// Init Program Options
program
  .option('-p, --package', 'path to root package.json', './package.json')
  .option('-r, --ref', 'Github Sha to compar it from')

// Package the program cli config
program.parse(process.argv);


(async function () {
  const options = program.opts()
  if (options.help) {
    console.log(red(textSync('Workspace Changes')))
  }
  const manifest = readJson(options.package || './package.json')
  // console.log(manifest)

  if (!manifest.workspaces) {
    throw new Error('There aren\'t any workspaces to search')
  }

  // Get list of all changes as an array
  // Add in an optional reference point
  const changes = await execSync('git diff --name-only')
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

  let changedPackages = Object.values(info)
    // List of changed packages
    .filter(pkg => pkg.hasChanges || pkg.hasDependencyChanges)
    .map(({ name }, i) => {
      // Assign Build Order
      info[name].buildOrder = i
      return name
    })

  // Lots of possibilities for output
  console.log(info)
  console.log(changedPackages)

  const firstFirst = getFirstDependency(changedPackages, info)
  const secondFirst = getFirstDependency(changedPackages.filter(ns => ns !== firstFirst), info)

  console.log(firstFirst)
  console.log(secondFirst)

  // const changedOrderedPackages = changedPackages.reduce((prevList, currentInfo) => {
  //   console.log(prevList)
  //   const first = 
  //   console.log(first)
  //   return prevList.filter(ns => ns !== first)
  // }, [...changedPackages]])

  const ordered = []
  while (changedPackages.length > 0) {
    const first = getFirstDependency(changedPackages, info)
    console.log(first)
    console.log(`${first} =>\n\t ${info[first]?.changedDependencies?.join('\n\t')}`)
    ordered.unshift(first)
    changedPackages = changedPackages.filter(ns => first.indexOf(ns) === -1)
  }

  console.log(ordered)

  // while (changedPackages.length > 0) {
  //   const first = getFirstDependency(changedPackages, info)
  // }
})()
  .catch((err: Error) => {
    console.log('error')
    console.log(err.message)
  })
