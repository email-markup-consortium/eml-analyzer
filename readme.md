# eml-analyzer

A tool to analyse the HTML version of an email message in `.eml` files.


## Usage

```js
let analyzer = new emlAnalyzer("path/to/file.eml");

analyzer.run().then(() => {
  let result = analyzer.result;

  // print result to console
  console.log(result);

  // or save as JSON
  fs.writeFileSync(`results.json`, JSON.stringify(result, null, 2));
});
```


## Options

| Option                  | Type    | Default | Description                                     |
| ----------------------- | ------- | ------- | ----------------------------------------------- |
| fetchExternalAssetsSize | Boolean | false   | Whether to get the file size of external assets |


```js
let analyzer = new emlAnalyzer("path/to/file.eml", {
  fetchExternalAssetsSize: false,
});
```

## Results

The returned results include:

- Mime Types
- Subject line
  - Character count
  - Word count
  - Used emojis
- Sender
  - The TLD of sender domain
  - Subdomain
- Whether the email has attachements
- Language of email message
- HTML
  - Tags
  - Tag attributes
  - MSO conditional comments
  - URL protocols used in links
  - Structured data
    - Whether structured data is used (e.g. Gmail annotations)
    - Whether Microsoft Actionable Messages are used
- CSS
  - Whether invalid CSS is detected
  - CSS properties
  - CSS values
  - CSS selectors
  - CSS rules
  - CSS at-rules
- External assets
  - Image count
  - File formats
  - Optional: file sizes of external assets


```json
{
  "mimeTypes": {
    "text": true,
    "html": true,
    "amp": false
  },
  "subject": {
    "chars": 25,
    "words": 4,
    "emojis": [
      "❤️‍🔥"
    ]
  },
  "sender": {
    "tld": "com",
    "subdomain": "",
    "government": false,
    "education": false
  },
  "hasAttachments": false,
  "language": {
    "code": "arb",
    "name": "Standard Arabic"
  },
  "html": {
    "urlProtocols": [
      "https:"
    ],
    "tags": {
      "meta": {
        "count": 5
      },
      "title": {
        "count": 1
      },
      "style": {
        "count": 1
      },
      "center": {
        "count": 1
      },
      "table": {
        "count": 5
      },
      "tbody": {
        "count": 5
      },
      "tr": {
        "count": 19
      },
      "td": {
        "count": 22
      },
      "div": {
        "count": 22
      },
      .
      .
      .
    },
    "attributes": [
      "charset",
      "http-equiv",
      "content",
      "name",
      "type",
      "align",
      "border",
      "cellpadding",
      "cellspacing",
      "height",
      "width",
      "id",
      "style",
      .
      .
      .
    ],
    "conditionalComments": [
      "[if gte mso 9]"
    ],
    "hasStructuredData": false,
    "hasMicrosoftActionableMessage": false
  },
  "css": {
    "hasInvalid": false,
    "properties": [
      "direction",
      "border-collapse",
      "mso-table-lspace",
      "mso-table-rspace",
      "-ms-text-size-adjust",
      "-webkit-text-size-adjust",
      "height",
      "margin",
      "padding",
      "width",
      .
      .
      .
    ],
    "values": [
      "rtl",
      "collapse",
      "0",
      "100%",
      "exactly",
      "9px",
      "separate",
      "0.5px solid #6E6E6E",
      "10px",
      "#FFF",
      "600px",
      "none no-repeat center/cover",
      .
      .
      .
    ],
    "selectors": [
      ":root",
      "img",
      "html",
      "body",
      ".gray-box",
      ".upper-footer",
      ".lower-footer",
      "body,#mainBody",
      "p,li,.main-content h5",
      .
      .
      .
    ],
    "rules": [
      {
        "property": "direction",
        "value": "rtl"
      },
      {
        "property": "border-collapse",
        "value": "collapse"
      },
      {
        "property": "mso-table-lspace",
        "value": "0"
      },
      {
        "property": "height",
        "value": "100%"
      },
      .
      .
      .
    ],
    "atRules": [
      {
        "name": "font-face",
        "params": ""
      },
      {
        "name": "media",
        "params": "(prefers-color-scheme: dark)"
      },
      {
        "name": "media",
        "params": "only screen and (max-width: 480px)"
      }
    ]
  },
  "externalAssets": {
    "imageCount": 15,
    "formats": [
      ".png",
      ".jpeg"
    ],
    "sizes": []
  }
}
```



## License

MIT Licensed, see License.md


## Credit

Parts of the code has been adopted form other EMC projects and were written by other developers not listed in this repository as contributors.

