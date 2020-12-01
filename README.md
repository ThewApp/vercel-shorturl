# vercel-shorturl

Create your own shorturl on Vercel.

## Demo

[Demo](https://vercel-shorturl-starter.vercel.app) is deployed with the example [redirects.yml](assets/redirects.example.yml).

## Usage

Option 1. Use [the template](https://github.com/ThewApp/vercel-shorturl-starter) which automatically deploy to Vercel through GitHub Actions

Option 2. Install locally

1. Install  
   `npm install @thewapp/vercel-shorturl`
1. Init  
   `npx vercel-shorturl init`
1. Edit `redirects.yml`
1. Build  
   `npx vercel-shorturl build`
1. Deploy  
   `vc`

See the example [redirects.yml](assets/redirects.example.yml) for available features.

Note: You need to run `npx vercel-shorturl build` before deploying.

## Features

### Custom page

You can override home page and 404 page by placing `index.html` and `404.html` in project root.

### Analytics

vercel-shorturl can automatically send an event to [Amplitude](https://amplitude.com/), just set `Amplitude` [environment variable](https://vercel.com/docs/environment-variables) to your [HTTP API]() key.
