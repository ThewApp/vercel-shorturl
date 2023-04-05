import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { RedirectConfig } from "./cli";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function parseRedirectsConfig(redirectsConfig: Array<RedirectConfig>) {
  return (
    redirectsConfig.reduce((prev, curr) => {
      let output = "";
      output += `from: "${curr.from}",`;
      output += `to: "${curr.to}",`;
      output += `regex: /${curr.regex}/,`;
      if (curr.status) output += `status: ${curr.status},`;
      if (curr.query) output += `query: ${JSON.stringify(curr.query)},`;
      return prev + `{${output}},`;
    }, "[") + "]"
  );
}

export function getNotFoundPage() {
  if (fs.existsSync("404.html")) {
    return fs.readFileSync("404.html", "utf8");
  } else {
    return fs.readFileSync(join(__dirname, "../assets", "404.html"), "utf8");
  }
}

export function dataTemplate(redirectsConfig: Array<RedirectConfig>) {
  const urlsString = parseRedirectsConfig(redirectsConfig);

  const NotFoundPage = getNotFoundPage();

  return `
export const urls = ${urlsString}

export const NotFoundPage = ${JSON.stringify(NotFoundPage)};
`;
}

export function apiTemplate() {
  return `
import RedirectApi from "./lib/index.js";
import * as data from "./data.js";

const redirectApi = new RedirectApi(data);

export default redirectApi.handler.bind(redirectApi);
`;
}
