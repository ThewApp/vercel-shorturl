import { join } from "path";
import fs from "fs";
import { RedirectConfig } from "./cli";

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

export function dataTemplate(
  redirectsConfig: Array<RedirectConfig>
) {
  const urlsString = parseRedirectsConfig(redirectsConfig);

  const NotFoundPage = getNotFoundPage();

  return `
export const urls = ${urlsString}

export const NotFoundPage = ${JSON.stringify(NotFoundPage)};
`;
}

export function apiTemplate() {
  return `
import RedirectApi from "@thewapp/vercel-shorturl";
import { urls, NotFoundPage } from "../data.js";

const redirectApi = new RedirectApi({ urls, NotFoundPage });

export default redirectApi.handler.bind(redirectApi);
`
}
