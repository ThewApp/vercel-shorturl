import { join } from "path";
import fs from "fs";
import { URLConfig } from "./cli";

export default function redirectTemplate(redirectsObject: Array<URLConfig>) {
  const urlsString =
    redirectsObject.reduce((prev, curr) => {
      let output = "";
      output += `from: "${curr.from}",`;
      output += `to: "${curr.to}",`;
      output += `regex: /${curr.regex}/`;
      if (curr.status) output += `status: ${curr.status},`;
      if (curr.query) output += `query: ${JSON.stringify(curr.query)}`;
      return prev + `{${output}},`;
    }, "[") + "]";

  let NotFoundPage;
  if (fs.existsSync("404.html")) {
    NotFoundPage = fs.readFileSync("404.html", "utf8");
  } else {
    NotFoundPage = fs.readFileSync(join(__dirname, "../assets", "404.html"), "utf8");
  }
  return `
const urls = ${urlsString}

const NotFoundPage = \`${NotFoundPage}\`

export default (request, response) => {
  if (!request.query.path) {
    return response.status(404).send(NotFoundPage);
  }

  const requestPath = "/" + String(request.query.path);

  for (const url of urls) {
    const pathMatch = requestPath.match(url.regex);
    if (pathMatch) {
      const variables = pathMatch.groups || {};
      const queryMatch = Object.keys(url.query || {}).every((key) => {
        const requestValue = String(request.query[key]);
        if (!url.query[key].startsWith(":")) {
          return url.query[key] === requestValue;
        } else {
          if (url.query[key].endsWith("?")) {
            variables[key] = requestValue || "";
          } else {
            if (!requestValue) {
              return false;
            }
            variables[key] = requestValue;
          }
          return true;
        }
      });
      if (queryMatch) {
        let destination = url.to;
        for (const key in variables) {
          destination = destination.replace(\`:\${key}\`, variables[key] || "");
        }
        return response.redirect(url.status || 307, destination);
      }
    }
  }
  return response.status(404).send(NotfoundPage);
};
`;
}
