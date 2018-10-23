import { reload, warn } from 'common';
import { Experiment } from './experiment';

export const globals = {
  endpoint: null, // Legacy
  ...window.prismic, // Legacy
  version: process.env.npm_package_version,
  setup: () => warn`prismic.setup() is deprecated. It now initiates automatically.`, // Legacy
  startExperiment: expId => new Experiment(expId), // TODO automate
  setupEditButton: () => warn`
     prismic.setupEditButton() is deprecated.
     Edit buttons have been replaced by the new Edit feature.
  `, // Legacy
};

// Reload original page URL
const { href } = window.location;
export const reloadOrigin = () => reload(href);

// Source Repositories
export let repos = new Set(); // [example.prismic.io, other.wroom.io]
try { repos.add( new URL(globals.endpoint).hostname.replace('.cdn', '') ); } catch(e) {}
const repoParam = (new URL(document.currentScript.src)).searchParams.get('repo')
if (repoParam) repos = new Set([...repos, ...repoParam.split(',')])

// Normalize and notify of errors (example -> example.prismic.io)
const validRepo = repo => Boolean(repo) && !/[^-a-zA-Z0-9\.]/.test(repo)
repos = [...repos].reduce((acc, repo) => {
  if (validRepo(repo)) return [...acc, repo.includes('.') ? repo : `${repo}.prismic.io`]
  warn`
    Invalid prismic.js configuration: ${repoParam}
    (Expected a repository but got ${repo || 'nothing'})
  `
  return acc
}, [])