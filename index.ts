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
