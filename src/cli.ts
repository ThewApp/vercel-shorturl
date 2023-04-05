#!/usr/bin/env node

import fs from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import { dataTemplate, apiTemplate } from "./redirectTemplate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface RedirectConfig {
  from: string;
  to: string;
  query?: {
    [key: string]: string;
  };
  status?: number;
  regex: string;
}

export function parseRedirectFrom(path: string): string {
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

  const redirects = yaml.load(
    fs.readFileSync("redirects.yml", "utf8")
  ) as Array<RedirectConfig>;

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

  if (!fs.existsSync("middleware.js")) {
    console.log("Generating middleware.js");
    const redirectApi = apiTemplate();
    fs.writeFileSync("middleware.js", redirectApi);
  }

  if (!fs.existsSync("lib")) {
    console.log("Creating lib directory");
    fs.mkdirSync("lib");
  }

  if (!fs.existsSync("lib/index.js")) {
    console.log("Copying lib/index.js");
    fs.copyFileSync(join(__dirname, "index.js"), "lib/index.js");
  }
}

if (process.argv[2] === "build") {
  init();
  build();
}

if (process.argv[2] === "init") {
  init();
}
