# instagram-poster

Automate photo publishing to Instagram: instagram-poster publishes not yet published photos not older than one-year-old from a specified folder.

## Usage

1. Create a config file, `~/.instagram-posterrc.json`:

```json
{
  "photos": "~/folder/with/your/photos"
}
```

2. Add already published photos to `data/published.json`.

3. Install dependencies:

```
npm install
```

4. Run:

```
bin/instagram-poster.js
```

## Authors and license

[Artem Sapegin](https://sapegin.me) and [contributors](https://github.com/sapegin/instagram-poster/graphs/contributors).

Based on [instagram-poster](https://github.com/jamesgrams/instagram-poster).

MIT License, see the included [License.md](License.md) file.
