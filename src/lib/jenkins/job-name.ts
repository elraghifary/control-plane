const WEBSITE_TAG_BRANCH_SUFFIXES = ["konsul", "mitra", "dapur"];

export function resolveJobName(repoName: string, tag: string): string {
  if (repoName === "website") {
    const suffix = WEBSITE_TAG_BRANCH_SUFFIXES.find((s) => tag.includes(`-${s}`));
    if (suffix) return `${repoName}-${suffix}-release`;
  }
  return `${repoName}-release`;
}
