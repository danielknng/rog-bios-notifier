# rog-bios-notifier

A Cloudflare Worker that checks ASUS motherboard BIOS support pages once per hour and sends a Discord notification when a new BIOS is released.

## How it works

The Worker checks one or more configured ASUS motherboard targets, via the same JSON API ASUS's own `helpdesk_bios` page calls, and compares the returned version against the last known state stored in Cloudflare KV. If a newer version is found for a target, it posts a message to that target's Discord webhook(s), including the release date, file size, SHA-256 and changelog.

## Requirements

- A Cloudflare account with Workers and KV enabled

## Setup

**1. Configure targets**

Targets are defined in `src/config.js` as a plain array:

```js
const TARGETS = [
  {
    id: "x870e-e-wifi",
    productName: "ROG STRIX X870E-E GAMING WIFI BIOS",
    pageUrl: "https://rog.asus.com/motherboards/rog-strix/rog-strix-x870e-e-gaming-wifi/helpdesk_bios/",
    asusModel: "rog-strix-x870e-e-gaming-wifi",
    asusM1Id: "28607",
    asusLevelTagId: "231962"
  }
];
```

Add one object per motherboard you want to watch. Each target needs a unique `id`, used both for its KV key and its webhook secret name.

**Finding `asusModel`, `asusM1Id` and `asusLevelTagId` for a different motherboard**

1. Open the motherboard's `.../helpdesk_bios/` page in a browser, e.g. `https://rog.asus.com/motherboards/<series>/<model>/helpdesk_bios/`.
2. Open dev tools (F12) and switch to the Network tab, then reload the page.
3. Filter for `GetPDBIOS`. One request should show up, to `rog.asus.com/support/webapi/ProductV2/GetPDBIOS`.
4. Its query string has all three values: `model`, `m1id` and `LevelTagId`.
5. `model` is also just the slug from the product URL itself (the part between `/motherboards/<series>/` and `/helpdesk_bios/`), so that one you can read straight off the address bar.


**2. Create a KV namespace**

```
Cloudflare Dashboard -> Storage & databases -> Worker KV -> Create Instance
```

Copy the Namespace ID into `wrangler.jsonc` under `kv_namespaces`.


**3. Connect the repository to Cloudflare**

```
Cloudflare Dashboard -> Compute (Workers) -> Workers & Pages -> Create -> Connect to Git
Authorize the Cloudflare GitHub app, select this repository and the branch to deploy from (e.g. main)
```

Cloudflare will build and deploy the Worker automatically on every push to that branch. No local `wrangler deploy` needed.

**4. Set a Discord webhook secret per target**

```
Cloudflare Dashboard -> Compute -> Workers & Pages -> Click your worker
Click on Settings -> Variables and Secrets -> Add
"Variable name": DISCORD_WEBHOOK_URL_<ID>
"Value": Your Webhook-URL
"Type": Secret
```

`<ID>` is the target's `id` from `config.js`, uppercased with hyphens replaced by underscores, e.g. `id: "x870e-e-wifi"` needs a variable named `DISCORD_WEBHOOK_URL_X870E_E_WIFI`. To notify multiple Discord servers for the same target, provide a comma-separated list of webhook URLs in that one value.

> [!WARNING]
> Make sure the Type is set to Secret, not the default text type, before saving. A plain text variable is readable in the dashboard and via the API, a webhook URL set as a secret is not. Select Deploy afterwards to apply it.

## Endpoints

| Path           | Description                                              |
|----------------|----------------------------------------------------------|
| /run           | Runs a check manually, notifies only if version changed  |
| /state         | Returns the current state from KV as JSON                |
| /notify-test   | Runs a check and always sends a Discord notification     |

## License

MIT
