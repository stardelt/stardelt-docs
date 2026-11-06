# stardelt-docs

The documentation of [stardelt](https://stardelt.io), an open-source data platform for Kubernetes.
Built with [Docusaurus](https://docusaurus.io).

Found something wrong or missing? Every page has an **Edit this page** link, or
[open an issue](https://github.com/stardelt/stardelt-docs/issues/new/choose).

## Run it locally

With Docker:

```bash
docker compose up
```

Or with Node 20 or newer:

```bash
npm install
npm start
```

Then open http://localhost:3000. Before you open a pull request, run `npm run build`: it fails on broken
links.

## Where things are

```text
docs/getting-started/  install and first steps
docs/guides/           how to work with data on the platform
docs/operations/       how to keep it running
docs/architecture/     how it fits together
docs/services/         one page per service
docs/reference/        generated from reference-src/; never edit by hand
docs/developer/        how to contribute
sidebars.ts            the navigation
src/pages/index.tsx    the home page
```

Every merge to `main` publishes the site through GitHub Pages.

## License

[Apache 2.0](LICENSE). By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
