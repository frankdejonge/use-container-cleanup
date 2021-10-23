import * as core from '@actions/core';
import * as github from '@actions/github';
import compare from 'semver/functions/rcompare';
import valid from 'semver/functions/valid';
import coerce from 'semver/functions/coerce';

(async () => {
    const myToken = core.getInput('token');
    const packageName = core.getInput('package');
    const keepVersions = parseInt(core.getInput('versions'));
    const octokit = github.getOctokit(myToken);

    let response = await octokit.rest.packages.getAllPackageVersionsForPackageOwnedByAuthenticatedUser({
        package_type: 'container',
        package_name: packageName,
    });

    if (response.status !== 200) {
        throw new Error(`Unable to list version for package: ${packageName}`);
    }

    let versions = response.data.filter(v => ! v.metadata.container.tags.includes('latest'))
        .map(v => {
            let tags = v.metadata.container.tags.map(t => valid(coerce(t))) as string[];

            return {
                v,
                tags,
                latest: latestTag(tags),
            };
        })
        .filter(v => v.tags.some(t => valid(t)))
        .map(v => ({v: v.v, latest: latestTag(v.tags)}));

    versions.forEach(v => console.log(`Found version for tag ${v.latest}`));
    console.log('-----------------------------------------------');
    console.log(`Keeping only the last ${keepVersions} versions.`);
    console.log('-----------------------------------------------');
    versions.sort((a, b) => compare(a.latest, b.latest));
    versions.splice(0, keepVersions);
    versions.forEach(v => console.log(`Deleting version for tag ${v.latest}`));


    if (versions.length === 0) {
        console.log('No versions to delete');
    }

    let deletions = versions.map(v => octokit.rest.packages.deletePackageVersionForAuthenticatedUser({
        package_name: packageName,
        package_type: 'container',
        package_version_id: v.v.id,
    }));

    await Promise.all(deletions);
})().catch(error => {
    core.setFailed(error);
});

function latestTag(tags: string[]): string {
    tags = [...tags];
    tags.sort(compare);

    return tags.pop();
}


function numericVersion(tags) {
    let version = tags.find(tag => valid(tag));

    if (!version) {
        return 0;
    }

    let parts = version.split('.');
    console.log(parts);
    let sum = 0;
    let a = ['1', '23'];

    for (let i = parts.length; i > 0; i--) {
        console.log(i);
        console.log(parts.length - i);
        console.log(parts.length - i, parts[parts.length - i]);
        // // increase the numbers based on their position to ensure single number ordering
        // // version 1.2.0 should be lower than 1.30.0 but higher than 1.1.123
        sum += Math.pow(10, (i *  3)) * parseInt(parts[parts.length - i]);
    }

    return sum;
}

numericVersion(['1.23']);