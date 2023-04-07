# vercel-shorturl

Create your own shorturl on Vercel Edge Middleware.

## Demo

[Demo](https://vercel-shorturl-starter.vercel.app) is deployed with the example [redirects.yml](assets/redirects.example.yml).

## Usage

Use [the template](https://github.com/ThewApp/vercel-shorturl-starter)

See the example [redirects.yml](assets/redirects.example.yml) for available features.

## Features

### Custom page

You can override home page and 404 page by placing `index.html` and `404.html` in project root.

### Analytics

vercel-shorturl can automatically send an event to [Amplitude](https://amplitude.com/), just set `Amplitude` [environment variable](https://vercel.com/docs/environment-variables) to your [HTTP API]() key.
