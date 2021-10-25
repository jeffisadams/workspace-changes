import { ForegroundColor } from 'chalk'
import { readFileSync } from 'fs'
import glob from 'glob'

export type ChangesInfo = Record<string, WorkspaceInfo>

export interface WorkspaceInfo {
  name: string
  path: string
  buildOrder: number
  hasChanges: boolean
  hasDependencyChanges: boolean
  changedDependencies?: string[]
}

export const getGlob = (path: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    glob(path, {}, (err: Error | null, files: string[]) => {
      if (err) {
        reject(err)
      }

      resolve(files.filter(v => v.indexOf('node_modules') === -1))
    })
  })
}

export const readJson = (path: string): Record<string, any> => {
  return JSON.parse(readFileSync(path, { encoding: 'utf8' }))
}


export const getWorkspacePath = (manifestPath: string): string => {
  const parts = manifestPath.split('/')
  parts.pop()
  return parts.join('/')
}

export const getWorkspaceInfo = (packagePath: string): WorkspaceInfo => {
  const pkg = readJson(packagePath)
  const path = getWorkspacePath(packagePath)
  return {
    path,
    name: pkg.name,
    buildOrder: -1,
    hasChanges: false,
    hasDependencyChanges: false,
    changedDependencies: [
      ...(Object.keys(pkg?.dependencies || {})),
      ...(Object.keys(pkg?.devDependencies || {}))
    ],
  }
}

export const getDependencyPaths = (name: string, info: ChangesInfo): string[] => {
  return (info[name].changedDependencies || [])
    .map(depName => info[depName]?.path)
    .filter(path => !!path)
}

export const hasChanges = (paths: string | string[], gitPaths: string[]): boolean => {
  // Wrap it so the interface matches
  if (typeof paths === 'string') {
    return hasChanges([paths], gitPaths)
  }

  for (let i in gitPaths) {
    const testPath = gitPaths[i]
    const hasPath = paths.some((path) => {
      if (testPath.indexOf(path) !== -1) {
        console.log(`hit on ${testPath} for ${path}`)
        return true
      }
    })

    if (hasPath) {
      return true
    }
  }
  return false
}


export const getIndependant = (list: string[], info: ChangesInfo): string[] => {
  const allDeps: string[] = []
  Object.values(info).forEach(({ changedDependencies }) => {
    allDeps.push(...changedDependencies || [])
  })
  return list.filter(ns => allDeps.indexOf(ns) === -1)
}

export const getFirstDependency = (list: string[], info: ChangesInfo): string => {
  
  // Path where there are dependencies with no depenencies
  const foundationCandidates: string[] = Object.values(info)
  .filter(({ name, hasChanges, hasDependencyChanges }) => list.indexOf(name) !== -1 && hasChanges && !hasDependencyChanges)
  .map(({ name }) => name)
  
  if (foundationCandidates.length > 0) {
    return foundationCandidates.shift() as string
  } else {
    let first = list[0]
    list.forEach(ns => {
      const { name, changedDependencies } = info[ns]
      
    })
    console.log('no independant libs')
    return first
    // // Now the real work
    // console.log('no foundation')
    // const changed = Object.values(info)
    //   .filter(({ name, hasChanges }) => list.indexOf(name) !== -1 && (hasChanges))
    //   .map(({ name }) => name)
    // console.log(changed)
    // return changed.shift()as string
  }
}