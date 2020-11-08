import { NowRequest, NowResponse } from "@vercel/node";
import { RedirectConfig } from "./cli";
import https from "https";

interface RedirectApiURLConfig extends Omit<RedirectConfig, "regex"> {
  regex: RegExp;
}

interface RedirectApiConfig {
  urls: Array<RedirectApiURLConfig>;
  NotFoundPage: string;
}

function sendGA(item_id: string, item_variant?: string): Promise<void> {
  const data = JSON.stringify({
    client_id: String(Math.random()),
    events: [
      {
        name: "view_item",
        params: { item_id, item_variant },
      },
    ],
  });
  if (process.env.GA_api_secret && process.env.GA_measurement_id) {
    return new Promise((resolve) => {
      const req = https.request(
        `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_measurement_id}&api_secret=${process.env.GA_api_secret}`,
        {method: "POST"},
        (res) => {
          console.log(`statusCode: ${res.statusCode}`);

          res.on("data", (d) => {
            process.stdout.write(d);
          });

          resolve();
        }
      );

      req.on("error", (error) => {
        console.error(error);
      });

      req.write(data);
      req.end();
    });
  }
  return Promise.resolve();
}

export default class RedirectApi {
  constructor(readonly config: RedirectApiConfig) {}

  handler(req: NowRequest, res: NowResponse) {
    if (!req.query.path) {
      return res.status(404).send(this.config.NotFoundPage);
    }

    // Add starting "/" and remove trailing "/"
    const requestPath = "/" + String(req.query.path).replace(/\/$/, "");

    for (const url of this.config.urls) {
      const pathMatch = requestPath.match(url.regex);
      if (pathMatch) {
        const variables = pathMatch.groups || {};
        // Must have query as specified in config
        const queryMatch = Object.keys(url.query || {}).every((key) => {
          const requestValue = String(req.query[key] || "");
          if (!url.query[key].startsWith(":")) {
            // Exact string match
            return url.query[key] === requestValue;
          } else {
            // Variable query
            if (url.query[key].endsWith("?") || requestValue) {
              // Have query or optional blank
              variables[
                url.query[key].replace("?", "").substring(1)
              ] = requestValue;
              return true;
            } else {
              // Doesn't have required query
              return false;
            }
          }
        });
        if (queryMatch) {
          let destination = url.to;
          // Replace variable in destination
          for (const key in variables) {
            destination = destination.replace(`:${key}`, variables[key] || "");
          }
          return sendGA(url.from, requestPath).then(() =>
            res.redirect(url.status || 307, destination)
          );
        }
      }
    }

    return sendGA("Not Found").then(() =>
      res.status(404).send(this.config.NotFoundPage)
    );
  }
}
