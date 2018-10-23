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

// Repositories
export let repos = new Set(); // [example.prismic.io, other.wroom.io]
// Source: legacy prismic.endpoint
try { repos.add( new URL(globals.endpoint).hostname.replace('.cdn','') ); } catch(e) {}
// Source: <script> tag
const repoParam = (new URL(document.currentScript.src)).searchParams.get('repo')
if (repoParam) repos = new Set([...repos, ...repoParam.split(',')])
// Normalize (example -> example.prismic.io)
repos = [...repos].map(repo => repo.includes('.') ? repo : `${repo}.prismic.io`)
// Validate & filter
const validRepo = repo => !/[^-a-zA-Z0-9\.]/.test(repo)
repos = repos.filter(repo => {
  if (validRepo(repo)) return true
  warn`\`${repo}\` is an invalid repository.`
  return false
})