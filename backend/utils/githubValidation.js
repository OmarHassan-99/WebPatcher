import { App } from "octokit";
import { request } from "@octokit/request";
import validator from "validator";
import axios from "axios";

const app = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
});

export async function validateRepo(repoUrl) {
  const cleanUrl = repoUrl.trim().replace(/\.git$/, "");
  const regex = /github\.com\/([^/]+)\/([^/]+)/;
  const match = cleanUrl.match(regex);

  if (!match || !validator.isURL(repoUrl)) {
    return { valid: false, message: "Invalid GitHub URL format" };
  }

  const owner = match[1];
  const repo = match[2];

  try {
    // --- CHECK 1: Is it a Public Repo? ---
    await request(`GET /repos/${owner}/${repo}`);

    return {
      valid: true,
      type: "public",
      message: "Public repository verified",
    };
  } catch (publicError) {
    try {
      // --- CHECK 2: Is it a Private Repo (with App installed)? ---
      const { data: installation } = await app.octokit.request(
        "GET /repos/{owner}/{repo}/installation",
        { owner, repo },
      );

      return {
        valid: true,
        type: "private",
        installationId: installation.id, // Needed later to clone the code if needed
        message: "Private repository verified (App is installed)",
      };
    } catch (privateError) {
      if (privateError.status === 404) {
        return {
          valid: false,
          message:
            "Repository not found. If private, ensure the GitHub App is installed",
        };
      }

      console.error("GitHub App Check Error:", privateError);
      return { valid: false, message: "Error validating repository access" };
    }
  }
}

export async function validateGitHubToken(token, owner, repo) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    const permissions = response.data.permissions;

    if (!permissions.push) {
      return {
        valid: false,
        message: `Your token does not have push access to ${owner}/${repo}.`,
        owner,
        repo,
        errorType: "NO_PUSH_ACCESS",
      };
    }

    return { valid: true };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return {
        valid: false,
        message:
          "Repository not found or access denied. If this is a private repository, ensure your GitHub token has the 'repo' scope checked.",
      };
    }
    if (error.response && error.response.status === 401) {
      return {
        valid: false,
        message: "Invalid GitHub token provided. It may be expired or revoked.",
      };
    }
    return { valid: false, message: "Failed to validate token." };
  }
}
