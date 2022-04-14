import type { VercelRequest, VercelResponse  } from "@vercel/node";
import * as Amplitude from "@amplitude/node";
import { RedirectConfig } from "./cli";

export interface RedirectApiURLConfig extends Omit<RedirectConfig, "regex"> {
  regex: RegExp;
}

interface RedirectApiConfig {
  urls: Array<RedirectApiURLConfig>;
  NotFoundPage: string;
}

const amplitude = process.env.Amplitude
  ? Amplitude.init(process.env.Amplitude)
  : null;

function sendAmplitude(
  req: VercelRequest,
  event: Amplitude.Event
): Promise<Amplitude.Response | void> {
  if (amplitude) {
    const requestId = String(req.headers["x-vercel-id"]);
    amplitude.logEvent({
      ip: String(req.headers["x-real-ip"]),
      user_id: requestId,
      user_properties: {
        regions: requestId.substring(0, requestId.lastIndexOf("::")),
        podId: requestId.substring(
          requestId.lastIndexOf("::") + 2,
          requestId.indexOf("-")
        ),
      },
      ...event,
    });

    return amplitude.flush();
  }
  return Promise.resolve();
}

export default class RedirectApi {
  constructor(readonly config: RedirectApiConfig) {}

  handler(req: VercelRequest, res: VercelResponse ) {
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
          if (!url.query?.[key].startsWith(":")) {
            // Exact string match
            return url.query?.[key] === requestValue;
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
          return sendAmplitude(req, {
            event_type: "go",
            event_properties: { source: requestPath, destination },
          }).then(() => res.redirect(url.status || 307, destination));
        }
      }
    }

    return sendAmplitude(req, {
      event_type: "Not Found",
      event_properties: { source: requestPath },
    }).then(() => res.status(404).send(this.config.NotFoundPage));
  }
}
