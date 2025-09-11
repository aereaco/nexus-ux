import { runFromPackage, writeToPackageDotJson, ask, run, getFromPackageDotJson } from './utils';
import chalk from 'chalk';
const log = (message: any) => console.log(chalk.green(message))
const version = process.argv[2]
const prevVersion = getFromPackageDotJson('library', 'version')
import fs from 'fs';
const axios = require('axios').create({
    headers: { Authorization: `Bearer ${require('./.env.json').GITHUB_TOKEN}` }
})

if (! version) {
    console.log('Whoops, you must pass in a version number to this command as the argument')
    process.exit(1)
}

if (! /[0-9]+\.[0-9]+\.[0-9]+/.test(version)) {
    console.log('Whoops, the supplies version is invalid: '+version)
    process.exit(1)
}

writeNewVersion()
writeNewDocsVersion()
buildAssets()
run(`open https://github.com/aereaco/nexus-ux/compare/v${prevVersion}...main`)

setTimeout(() => {
    ask('Have you reviewed, committed, and pushed all the files for this release?', () => {
        draftRelease(version, () => {
            ask('Are you sure you want to publish this release: '+version+'?', () => publish())
        })
    })
}, 1000)

function writeNewVersion() {
    let file = __dirname+'/../packages/docs/src/en/essentials/installation.md'
    let docs = fs.readFileSync(file, 'utf8')
    docs = docs.replace(prevVersion, version)
    fs.writeFileSync(file, docs)
    console.log('Writing new version to installation docs: '+version)

    writeToPackageDotJson('library', 'version', version)
    console.log('Bumping package.json: '+version)

    writeToPackageDotJson('ui', 'version', version)
    console.log('Bumping @alpinejs/ui package.json: '+version)

    writeToPackageDotJson('csp', 'version', version)
    console.log('Bumping @alpinejs/csp package.json: '+version)

    writeToPackageDotJson('persist', 'version', version)
    console.log('Bumping @alpinejs/persist package.json: '+version)

    writeToPackageDotJson('morph', 'version', version)
    console.log('Bumping @alpinejs/morph package.json: '+version)
}

function writeNewDocsVersion() {
    let versionWithRevisionSuffix = `${version}-revision.1`

    writeToPackageDotJson('docs', 'version', versionWithRevisionSuffix)
    console.log('Bumping @alpinejs/docs package.json: '+version);
}

function buildAssets() {
    console.log('Building assets...')
    require('./build')
}

function publish() {
    console.log('Publishing alpinejs on NPM...');
    runFromPackage('library', 'npm publish')

    console.log('Publishing @alpinejs/ui on NPM...');
    runFromPackage('ui', 'npm publish --access public')

    console.log('Publishing @alpinejs/csp on NPM...');
    runFromPackage('csp', 'npm publish --access public')

    console.log('Publishing @alpinejs/docs on NPM...');
    runFromPackage('docs', 'npm publish --access public')

    console.log('Publishing @alpinejs/morph on NPM...');
    runFromPackage('morph', 'npm publish --access public')
    log('\n\nFinished!')
}

async function draftRelease(name: any, after: any = () => {}) {
    let lastRelease = await getLastRelease()

    let since = lastRelease.published_at

    let pulls = await getPullRequestsSince(since)

    let output = ''

    output += "## Added\n\n## Fixed\n\n"

    output += pulls.map((pull: any) => `* ${pull.title} [#${pull.number}](${pull.html_url})`).join('\n')

    fs.writeFileSync('./changelog.tmp', output)

    run('code ./changelog.tmp')

    ask('Are you finished editing the changelog?', () => {
        let content = fs.readFileSync('./changelog.tmp', 'utf8')

        fs.unlinkSync('./changelog.tmp')

        tagNewRelease(name, content, after)
    })
}

async function getLastRelease() {
    let { data: releases } = await axios.get('https://api.github.com/repos/aereaco/nexus-ux/releases')

    let lastRelease = releases.find((release: any) => {
        return release.target_commitish === 'main'
            && release.draft === false
    })

    return lastRelease
}

async function getPullRequestsSince(since: any) {
    let { data: pulls } = await axios.get('https://api.github.com/repos/aereaco/nexus-ux/pulls?state=closed&sort=updated&direction=desc&base=main')

    let pullsSince = pulls.filter((pull: any) => {
        if (! pull.merged_at) return false

        return pull.merged_at > since
    })

    return pullsSince
}

function tagNewRelease(name: any, content: any, after: any = () => {}) {
    return axios.post('https://api.github.com/repos/aereaco/nexus-ux/releases', {
        name: 'v'+name,
        tag_name: 'v'+name,
        target_commitish: 'main',
        body: content,
        draft: false,
    }).then(() => {
        after()
    })
}

export {}
