#!/usr/bin/env node

import fs from "fs";
import { join } from "path";
import yaml from "js-yaml";
import { dataTemplate, apiTemplate } from "./redirectTemplate";

export interface RedirectConfig {
  from: string;
  to: string;
  query?: {
    [key: string]: string;
  };
  status?: number;
  regex: string;
}

export function parseRedirectFrom(path: string) {
  const paths = path.split("/").filter((path) => path);
  const regexString =
    paths.reduce((prev, curr) => {
      if (!curr.startsWith(":")) {
        return prev + `\\/${curr}`;
      }

      const modifier =
        curr.endsWith("*") || curr.endsWith("?") || curr.endsWith("+")
          ? curr.substring(curr.length - 1)
          : "";
      const optional = curr.endsWith("*") || curr.endsWith("?") ? "?" : "";
      const value =
        curr.endsWith("*") || curr.endsWith("+") ? "[^#\\?]+" : "[^\\/#\\?]+";

      const namedGroup = modifier
        ? curr.substring(1, curr.length - 1)
        : curr.substring(1);

      return prev + `(\\/(?<${namedGroup}>${value}))${optional}`;
    }, "^") + "$";

  return regexString;
}

function build() {
  console.log("Building...");
  if (!fs.existsSync("public")) {
    fs.mkdirSync("public");
  }

  const redirects: Array<RedirectConfig> = yaml.safeLoad(
    fs.readFileSync("redirects.yml", "utf8")
  );

  const redirectsConfig = redirects.map((entry) => {
    entry.regex = parseRedirectFrom(entry.from);
    return entry;
  });
  const data = dataTemplate(redirectsConfig);
  fs.writeFileSync("data.js", data);

  let IndexPage;
  if (fs.existsSync("index.html")) {
    IndexPage = fs.readFileSync("index.html", "utf8");
  } else {
    IndexPage = fs.readFileSync(
      join(__dirname, "../assets", "index.html"),
      "utf8"
    );
  }
  fs.writeFileSync("public/index.html", IndexPage);

  console.log("Done.");
}

function init() {
  if (!fs.existsSync("vercel.json")) {
    console.log("Generating vercel.json");

    fs.copyFileSync(
      join(__dirname, "../assets", "vercel.example.json"),
      "vercel.json"
    );
  }
  if (!fs.existsSync("redirects.yml")) {
    console.log("Generating example redirects.yml");

    fs.copyFileSync(
      join(__dirname, "../assets", "redirects.example.yml"),
      "redirects.yml"
    );
  }
  if (!fs.existsSync("api")) {
    fs.mkdirSync("api");
  }
  if (!fs.existsSync("api/redirect.js")) {
    console.log("Generating api redirects.js");
    const redirectApi = apiTemplate();
    fs.writeFileSync("api/redirect.js", redirectApi);
  }
}

if (process.argv[2] === "build") {
  init();
  build();
}

if (process.argv[2] === "init") {
  init();
}
