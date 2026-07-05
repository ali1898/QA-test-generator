/**
 * Confluence Cloud REST API client.
 *
 * Publishes a Markdown document as a Confluence page using the "wiki"
 * (storage) representation. Supports both create and update (if a page
 * with the same title exists in the target space).
 *
 * Auth: Basic auth with email + API token
 *   (https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)
 *
 * Docs: https://developer.atlassian.com/cloud/confluence/rest/v1/intro/
 */
import { existsSync, readFileSync } from "node:fs";

export interface ConfluenceConfig {
  /** Cloud host, e.g. "myteam.atlassian.net". */
  domain: string;
  /** Account email used for Basic auth. */
  email: string;
  /** API token from https://id.atlassian.com/manage-profile/security/api-tokens. */
  apiToken: string;
  /** Space key, e.g. "QA". */
  spaceKey: string;
  /** Optional parent page id to nest under. */
  parentId?: number;
}

export interface PublishResult {
  /** Confluence page id. */
  id: string;
  /** Page title. */
  title: string;
  /** Public URL of the page. */
  url: string;
  /** Whether an existing page was updated. */
  updated: boolean;
}

const API_BASE = (domain: string) => `https://${domain}/wiki/api/v2`;

/** Basic auth header value. */
function authHeader(config: ConfluenceConfig): string {
  const token = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
  return `Basic ${token}`;
}

/** Find an existing page by title within the configured space. */
async function findPageByTitle(
  config: ConfluenceConfig,
  title: string,
): Promise<{ id: string; version: number } | null> {
  // v2 pages API supports title search via query param.
  const url = `${API_BASE(config.domain)}/pages?spaceId=${await resolveSpaceId(config)}&title=${encodeURIComponent(
    title,
  )}&status=current`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader(config), Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: { id: string; version: { number: number }; title: string }[];
  };
  const match = (data.results ?? []).find((p) => p.title === title);
  return match ? { id: match.id, version: match.version.number } : null;
}

/** Resolve spaceId from spaceKey (v2 needs the numeric space id). */
async function resolveSpaceId(config: ConfluenceConfig): Promise<string> {
  const url = `https://${config.domain}/wiki/api/v2/spaces?keys=${encodeURIComponent(
    config.spaceKey,
  )}`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader(config), Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Confluence: cannot resolve space "${config.spaceKey}" (${res.status})`);
  }
  const data = (await res.json()) as { results?: { id: string; key: string }[] };
  const space = (data.results ?? [])[0];
  if (!space) {
    throw new Error(`Confluence: space "${config.spaceKey}" not found`);
  }
  return space.id;
}

/** Publish (create or update) a page with the given title + markdown body. */
export async function publishPage(
  config: ConfluenceConfig,
  title: string,
  markdownBody: string,
): Promise<PublishResult> {
  const existing = await findPageByTitle(config, title);
  const spaceId = await resolveSpaceId(config);

  if (existing) {
    // Update existing page → bump version, replace body.
    const url = `${API_BASE(config.domain)}/pages/${existing.id}`;
    const body = {
      id: existing.id,
      status: "current",
      title,
      spaceId,
      body: {
        representation: "wiki",
        value: markdownBody,
      },
      version: { number: existing.version + 1, message: "Updated by QA Test Generator" },
    };
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader(config),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Confluence update failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { id: string };
    return {
      id: data.id,
      title,
      url: `https://${config.domain}/wiki/spaces/${config.spaceKey}/pages/${data.id}`,
      updated: true,
    };
  }

  // Create new page.
  const url = `${API_BASE(config.domain)}/pages`;
  const body: Record<string, unknown> = {
    spaceId,
    status: "current",
    title,
    body: {
      representation: "wiki",
      value: markdownBody,
    },
  };
  if (config.parentId) {
    body.parentId = config.parentId;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Confluence create failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string };
  return {
    id: data.id,
    title,
    url: `https://${config.domain}/wiki/spaces/${config.spaceKey}/pages/${data.id}`,
    updated: false,
  };
}

/** Read ConfluenceConfig from a JSON env-file or explicit object. */
export function loadConfluenceConfigFromFile(path: string): ConfluenceConfig {
  if (!existsSync(path)) {
    throw new Error(`Confluence config file not found: ${path}`);
  }
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const required: (keyof ConfluenceConfig)[] = ["domain", "email", "apiToken", "spaceKey"];
  for (const key of required) {
    if (!raw[key]) {
      throw new Error(`Confluence config missing required field: ${key}`);
    }
  }
  return raw as ConfluenceConfig;
}
