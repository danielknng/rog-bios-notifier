/**
 * Sends a message to all configured Discord webhooks.
 */
export async function sendDiscordNotification(config, data) {
  await postToWebhooks(config, buildDiscordMessage(config, data));
}

/**
 * Reports a failed check, e.g. the ASUS API changed shape and no BIOS
 * entry could be extracted, so it doesn't go unnoticed until someone
 * happens to look at the Worker's logs.
 */
export async function sendDiscordError(config, message) {
  await postToWebhooks(config, buildErrorMessage(config, message));
}

async function postToWebhooks(config, payload) {
  for (const url of config.discordWebhookUrls) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // Include the response body since Discord usually returns a helpful error message
      const body = await response.text();
      throw new Error("Discord webhook error. HTTP " + response.status + " Body: " + body);
    }
  }
}

function buildErrorMessage(config, message) {
  return {
    embeds: [
      {
        author: { name: config.productName },
        title: "Check failed",
        description: "`" + message + "`"
      }
    ]
  };
}

const EMBED_COLOR = 0xcc000e;

function buildDiscordMessage(config, data) {
  const link = data.downloadUrl || config.pageUrl;

  const fields = [
    { name: "Last Version", value: "`" + data.previousVersion + "`", inline: false },
    { name: "Current Version", value: "`" + data.currentVersion + "`", inline: false },
    { name: "Release date", value: "`" + (data.releaseDate || "unknown") + "`", inline: false }
  ];

  if (data.fileSize) {
    fields.push({ name: "File size", value: "`" + data.fileSize + "`", inline: false });
  }

  if (data.sha256) {
    fields.push({ name: "SHA-256", value: "`" + data.sha256 + "`", inline: false });
  }

  if (data.changelog) {
    fields.push({ name: "Changelog", value: quoteLines(data.changelog), inline: false });
  }

  return {
    embeds: [
      {
        author: { name: config.productName },
        title: data.forceNotify ? "TEST NOTIFICATION" : "New BIOS released!",
        url: link,
        color: EMBED_COLOR,
        fields
      }
    ]
  };
}

// Discord requires "> " at the start of every line for a blockquote, without
// this a multi-line changelog would only quote its first line.
function quoteLines(text) {
  return text
    .split("\n")
    .map((line) => "> " + line)
    .join("\n");
}
