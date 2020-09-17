import yaml from "js-yaml";
import fs from "fs";
import RedirectApi from "../";
import { parseRedirectFrom } from "../cli";

const redirects = yaml.safeLoad(
  fs.readFileSync("assets/redirects.example.yml", "utf8")
);

const NotFoundPage = "<html></html>";

const mockedRes = {
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  redirect: jest.fn().mockReturnThis(),
};

function setupApi() {
  const urls = redirects.map((entry) => {
    entry.regex = new RegExp(parseRedirectFrom(entry.from));
    return entry;
  });
  return new RedirectApi({ urls, NotFoundPage });
}

function clearMock() {
  Object.keys(mockedRes).forEach((key) => mockedRes[key].mockClear());
}

function expectRedirect(status, url, clear = true) {
  expect(mockedRes.redirect).toHaveBeenCalledWith(status, url);
  if (clear) clearMock();
}

function expectNotFound(clear = true) {
  expect(mockedRes.status).toHaveBeenCalledWith(404);
  expect(mockedRes.send).toHaveBeenCalledWith(NotFoundPage);
  if (clear) clearMock();
}

test("Setup RedirectApi", () => {
  const redirectApi = setupApi();

  expect(redirectApi).toBeDefined();
  expect(redirectApi.handler).toBeDefined();
});

test("no path", () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {},
  };

  redirectApi.handler(mockedReq as any, mockedRes as any);

  expectNotFound();
});

test("example /me", () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "me",
    },
  };
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(308, "https://github.com/ThewBear");

  mockedReq.query.path = "me/";
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(308, "https://github.com/ThewBear");

  mockedReq.query.path = "me/me";
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();
});

test("example /google/:q", () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "google/recursion",
    },
  };
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://google.com/search?q=recursion");

  mockedReq.query.path = "google";
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();

  mockedReq.query.path = "google/recursion/recursion";
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();
});

test("example /vercel/:slug*", () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "vercel",
    },
  };
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://vercel.com/");

  mockedReq.query.path = "vercel/docs";
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://vercel.com/docs");

  mockedReq.query.path = "vercel/solutions/nextjs";
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://vercel.com/solutions/nextjs");
});

test("example /twitter/:slug?", () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "twitter",
    },
  };
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://twitter.com/");

  mockedReq.query.path = "twitter/thewdhanat";
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://twitter.com/thewdhanat");

  mockedReq.query.path = "twitter/thewdhanat/likes";
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();
});

test("example /github/:slug+", () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "github",
    },
  };
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();

  mockedReq.query.path = "github/ThewApp";
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://github.com/ThewApp");

  mockedReq.query.path = "github/ThewApp/vercel-shorturl";
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://github.com/ThewApp/vercel-shorturl");
});

test("example /dev/:slug1/:slug2", () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "dev/settings",
    },
  };
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();

  mockedReq.query.path = "dev/p/information";
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://dev.to/p/information");

  mockedReq.query.path = "dev/p/information/1";
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();
});

test("example /google with query", () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "google",
      action: "search",
      q: "recursion",
    },
  };
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://google.com/search?q=recursion");

  mockedReq.query = {
    path: "google",
    action: "find",
    q: "recursion",
  };
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();

  mockedReq.query = {
    path: "google",
    action: "search",
    q: "",
  };
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();

  mockedReq.query = {
    path: "google",
    action: "",
    q: "",
  };
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();
});

test("example /dev with optional query", () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "dev",
      u: undefined,
    },
  };
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://dev.to/");

  mockedReq.query = {
    path: "dev",
    u: "thewbear",
  };
  redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://dev.to/thewbear");
});
