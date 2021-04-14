import yaml from "js-yaml";
import fs from "fs";
import RedirectApi from "../";
import { parseRedirectFrom } from "../cli";

const redirects = yaml.load(
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

test("Setup RedirectApi", async () => {
  const redirectApi = setupApi();

  expect(redirectApi).toBeDefined();
  expect(redirectApi.handler).toBeDefined();
});

test("no path", async () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {},
  };

  await redirectApi.handler(mockedReq as any, mockedRes as any);

  expectNotFound();
});

test("example /me", async () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "me",
    },
  };
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(308, "https://github.com/ThewBear");

  mockedReq.query.path = "me/";
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(308, "https://github.com/ThewBear");

  mockedReq.query.path = "me/me";
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();
});

test("example /google/:q", async () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "google/recursion",
    },
  };
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://google.com/search?q=recursion");

  mockedReq.query.path = "google";
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();

  mockedReq.query.path = "google/recursion/recursion";
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();
});

test("example /vercel/:slug*", async () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "vercel",
    },
  };
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://vercel.com/");

  mockedReq.query.path = "vercel/docs";
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://vercel.com/docs");

  mockedReq.query.path = "vercel/solutions/nextjs";
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://vercel.com/solutions/nextjs");
});

test("example /twitter/:slug?", async () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "twitter",
    },
  };
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://twitter.com/");

  mockedReq.query.path = "twitter/thewdhanat";
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://twitter.com/thewdhanat");

  mockedReq.query.path = "twitter/thewdhanat/likes";
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();
});

test("example /github/:slug+", async () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "github",
    },
  };
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();

  mockedReq.query.path = "github/ThewApp";
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://github.com/ThewApp");

  mockedReq.query.path = "github/ThewApp/vercel-shorturl";
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://github.com/ThewApp/vercel-shorturl");
});

test("example /dev/:slug1/:slug2", async () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "dev/settings",
    },
  };
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();

  mockedReq.query.path = "dev/p/information";
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://dev.to/p/information");

  mockedReq.query.path = "dev/p/information/1";
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();
});

test("example /google with query", async () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "google",
      action: "search",
      q: "recursion",
    },
  };
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://google.com/search?q=recursion");

  mockedReq.query = {
    path: "google",
    action: "find",
    q: "recursion",
  };
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();

  mockedReq.query = {
    path: "google",
    action: "search",
    q: "",
  };
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();

  mockedReq.query = {
    path: "google",
    action: "",
    q: "",
  };
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectNotFound();
});

test("example /dev with optional query", async () => {
  const redirectApi = setupApi();

  const mockedReq = {
    query: {
      path: "dev",
      u: undefined,
    },
  };
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://dev.to/");

  mockedReq.query = {
    path: "dev",
    u: "thewbear",
  };
  await redirectApi.handler(mockedReq as any, mockedRes as any);
  expectRedirect(307, "https://dev.to/thewbear");
});
