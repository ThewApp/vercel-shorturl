import { RedirectConfig } from "./cli";

export interface RedirectApiURLConfig extends Omit<RedirectConfig, "regex"> {
  regex: RegExp;
}

interface RedirectApiConfig {
  urls: Array<RedirectApiURLConfig>;
  NotFoundPage: string;
}

interface AmplitudeEvent {
  event_type: string;
  event_properties: Object;
}

function sendAmplitude(request: Request, event: AmplitudeEvent): Promise<void> {
  if (!process.env.Amplitude) return Promise.resolve();
  const requestId = String(request.headers.get("x-vercel-id"));
  const realIp = String(request.headers.get("x-real-ip"));
  const host = String(request.headers.get("host"));
  const deploymentUrl = String(request.headers.get("x-vercel-deployment-url"));

  return fetch("https://api2.amplitude.com/2/httpapi", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify({
      api_key: process.env.Amplitude,
      events: [
        {
          user_id: requestId,
          user_properties: {
            regions: requestId.substring(0, requestId.lastIndexOf("::")),
            podId: requestId.substring(
              requestId.lastIndexOf("::") + 2,
              requestId.indexOf("-")
            ),
            host: host,
            deploymentUrl: deploymentUrl,
          },
          ip: realIp,
          event_type: event.event_type,
          event_properties: event.event_properties,
        },
      ],
    }),
  })
    .then((response) => response.json())
    .then((data) => console.log(data))
    .catch((error) => console.error(error));
}

export default class RedirectApi {
  constructor(readonly config: RedirectApiConfig) {}

  handler(request: Request): Promise<Response | void> {
    const requestUrl = new URL(request.url);

    // Remove trailing "/"
    const requestPath = String(requestUrl.pathname).replace(/\/$/, "");

    if (requestPath === "") {
      return sendAmplitude(request, {
        event_type: "index",
        event_properties: { source: requestPath },
      });
    }

    for (const url of this.config.urls) {
      const pathMatch = requestPath.match(url.regex);
      if (pathMatch) {
        const variables = pathMatch.groups || {};
        // Must have query as specified in config
        const queryMatch = Object.keys(url.query || {}).every((key) => {
          const requestValue = String(requestUrl.searchParams.get(key) || "");
          if (!url.query?.[key].startsWith(":")) {
            // Exact string match
            return url.query?.[key] === requestValue;
          } else {
            // Variable query
            if (url.query[key].endsWith("?") || requestValue) {
              // Have query or optional blank
              variables[url.query[key].replace("?", "").substring(1)] =
                requestValue;
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
          return sendAmplitude(request, {
            event_type: "go",
            event_properties: { source: requestPath, destination },
          }).then(() => Response.redirect(destination, url.status || 307));
        }
      }
    }

    return sendAmplitude(request, {
      event_type: "Not Found",
      event_properties: { source: requestPath },
    }).then(
      () =>
        new Response(this.config.NotFoundPage, {
          status: 404,
          headers: {
            "content-type": "text/html",
          },
        })
    );
  }
}
