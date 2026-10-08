# Self-host OpenSEO with Treg

This fork adds `SEO_DATA_PROVIDER=treg` to the shared DataForSEO request layer.
Treg relays provider-native results, so existing keyword, SERP, backlink,
Lighthouse and supported AI answer parsing remains in OpenSEO. The default
`dataforseo` mode still uses a direct DataForSEO account.

## Configure

Keep your credentials in a private file outside the repository, readable only
by your account. Set:

```dotenv
SEO_DATA_PROVIDER=treg
TREG_TOKEN=your_treg_token
# Required for identity tokens; optional for tokens scoped to one org:
TREG_ORG=your_team_slug
OPENSEO_TELEMETRY_DISABLED=1
```

Build the fork's image:

```sh
docker build -t openseo-treg:local -f deploy/docker/Dockerfile .
```

Run it with your private environment file, a persistent volume and a loopback
port binding:

```sh
docker run -d --name openseo-treg --restart unless-stopped \
  --env-file /absolute/path/outside-the-repository/local.env \
  -e AUTH_MODE=local_noauth -e CLOUDFLARE_INCLUDE_PROCESS_ENV=true \
  -p 127.0.0.1:3001:3001 -v openseo_data:/app/.wrangler \
  openseo-treg:local
```

The dashboard is at `http://127.0.0.1:3001`; the MCP endpoint is
`http://127.0.0.1:3001/mcp`. Local mode uses a local admin identity and does not
need hosted OpenSEO OAuth. Configure the agent to use this endpoint directly.
The official plugin's MCP points to the hosted service; keep its public SEO
skills, but disable its hosted MCP when switching to this fork.

## Coverage and costs

- The checked-in catalog mapping comes from Treg's public DataForSEO catalog.
  Unknown routes fail before making a provider request. Refresh the mapping
  when Treg adds support, retaining exact method/path/id matches.
- Queued `task_post` workflows are blocked before submission: this adapter does
  not yet implement task ownership and collection. Scheduled rank checks use supported live SERPs instead. Queued business
  reviews/updates remain unavailable.
- Some LLM mention analytics and model-list routes are not in the catalog.
  Their absence is reported explicitly; similar-looking endpoints are not
  substituted because their request and response contracts differ.
- DataForSEO account balance reads are blocked in Treg mode. Use Treg's own
  balance and activity tools, rather than displaying the provider's shared
  account as your balance.
- Treg bills your team's balance or uses its configured provider key. OpenSEO's
  existing estimates use DataForSEO pricing and can differ from actual Treg
  charges. Check Treg's catalog prices before research. Server logs record
  `X-Treg-Call-Id` and `X-Treg-Cost-Micro`; Treg's ledger is authoritative.
- Retries reuse one Treg idempotency key per request. A new research request
  receives a new key. Direct provider mode retains its existing retry policy.
- DataForSEO credentials are never sent to Treg. Your Treg token stays on the
  server, outside the repository and client bundle.
- Google Analytics/Search Console can reuse registered Treg connections through
  the explicitly enabled local bridge below, or retain direct OAuth connections.
  The optional in-app OpenRouter agent still requires its model provider.

See [Treg's API](https://treg.to/docs) and
[OpenSEO's self-hosting guide](https://openseo.so/docs/self-hosting/docker).

## Local Google account bridge

For a private local instance with AUTH_MODE=local_noauth, set TREG_GOOGLE_ENABLED=true in the private environment file and restart the service. The bridge reuses the team's registered google-search-console, google-analytics-admin and google-analytics tools. Pick each project's verified Search Console site and GA4 property in Settings → Integrations. The selection is validated against the available Google properties and saved separately per project. Existing direct Google OAuth connections continue to work. No new Google credentials are stored in OpenSEO. Treg GA4 reports are filtered to the project domain and its www hostname; the returned source metadata lists these hostnames. This separates websites sharing one property. Direct OAuth reporting keeps its existing property scope.

This bridge accepts only the discovery and read-only reporting routes used by OpenSEO; Google writes and arbitrary hosts are rejected. It is disabled in hosted and shared-auth modes to prevent access to a global team's credentials. Keep the no-auth service bound to loopback.

## Rank checks and spend

Treg mode uses supported live SERPs for scheduled and manual rank checks. It does not submit queued tasks. Rank estimates identify the provider and include pricing warnings: the Treg first-page observation was $0.004 when inspected October 8, 2026; deeper pages remain planning estimates. An estimated credit ceiling is not a Treg dollar cap. Set an appropriate frequency and keyword count before enabling a schedule.

Project Settings → Integrations → Treg usage shows actual USD charges from response headers. The free get_treg_usage MCP tool reads the same normalized ledger. Each request is attributed to its project and organization; replays count once. Missing headers and transport failures remain unknown, not zero. This ledger starts at installation and excludes calls made outside the app. The upstream task cost remains separate and is not represented as the Treg invoice. Read Treg's own balance to reconcile overall account spend.

The existing external AI-answer workflow may continue via Treg directly, with summaries saved into OpenSEO. OpenSEO queued AI tracking and other unmapped or queued routes remain unsupported and are rejected before submitting requests. The in-app AI agent still needs its own configured model provider.
