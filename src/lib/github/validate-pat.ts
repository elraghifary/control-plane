import { Octokit } from "octokit";

export interface GithubIdentity {
  login: string;
  avatarUrl?: string;
}

export async function validatePat(pat: string): Promise<GithubIdentity | null> {
  try {
    const octokit = new Octokit({ auth: pat });
    const { data } = await octokit.rest.users.getAuthenticated();
    return { login: data.login, avatarUrl: data.avatar_url };
  } catch {
    return null;
  }
}
