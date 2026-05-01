# Mastodon Web Client

This fork keeps only the files needed to build and export Mastodon's web client assets.

## Requirements

- Node.js 20+
- Yarn 4 via Corepack

## Setup

```sh
corepack enable
yarn install --immutable
```

## Build

```sh
yarn build:production
```

The production bundle is written to `public/packs/`. Development builds use `public/packs-dev/`.

## Development

```sh
yarn dev
```

The Vite dev server serves the client from `app/javascript`.

## Validation

```sh
yarn lint
yarn typecheck
```

## License

Mastodon is licensed under the GNU Affero General Public License v3.0 or later. See [LICENSE](LICENSE).
