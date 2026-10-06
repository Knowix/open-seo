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
  not yet implement task ownership and collection. Rank tracker queues and
  queued business reviews/updates therefore need further work.
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
- Google Analytics/Search Console and the optional in-app OpenRouter agent
  still require their own connections. This adapter does not migrate them.

See [Treg's API](https://treg.to/docs) and
[OpenSEO's self-hosting guide](https://openseo.so/docs/self-hosting/docker).
