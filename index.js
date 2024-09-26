import * as fs from "fs";
import { extract, parse } from "letterparser";
import * as cheerio from 'cheerio';
import postcss from "postcss"
import { francAll } from "franc";
import * as path from 'path';
import ufs from "url-file-size"
import emojiRegex from "emoji-regex";
import extractUrls from "extract-urls";
import extractTlds from "tld-extract";

export default class emlAnalyzer {
  htmlTagAttributes = [];
  htmlTagNames = [];
  htmlConditionalComments = [];
  cssProperties = [];
  cssValues = [];
  cssRules = [];
  cssAtRules = [];
  cssSelectors = [];
  urlProtocols = [];
  assetFormats = [];
  assetSizes = [];
  images = [];
  hasHtmlStructuredData = false;
  hasHtmlMicrosoftActionableMessage = false;
  hasInvalidCss = false;


  constructor(filePath, opts={}) {
    const {
      fetchExternalAssetsSize = false
    } = opts;

    Object.assign(this, opts);

    this.filePath = filePath;
    let fileFormat = this.getFormat(filePath);
    if(fileFormat !== '.eml') {
      throw new Error(`Only .eml files are supported. ${fileFormat} given`);
    }

    this.extractEmail(this.filePath);
  }


  extractEmail(filePath) {
    try {
      const contents = fs.readFileSync(filePath, "utf-8");
      this.eml = extract(contents);
      this.emlContents = parse(contents);
    } catch (err) {
      console.error(err.message);
      throw new Error(`Couldn't parse .eml file`);
    }
  }


  async run() {
    const $ = cheerio.load(this.eml.html, { decodeEntities: false }, false);
    const tags = $('*');

    for (const tag of tags.toArray()) {
      this.htmlTagNames.push(tag.tagName);
      this.getAttributesFromTag(tag);
      this.getUrlsFromTag(tag);
      this.getStructuredData(tag);
      this.getImagesFromTag(tag);
      await this.getLinkAssetsFromTag(tag);
      this.getCssFromTag(tag);
    }
    
    this.getHtmlconditionalComments(tags);

    try {
      this.getCssFromStyleTags(postcss.parse( $('style').text() ).nodes);
    } catch(error) {
      console.log(`couldn't parse CSS in <style>. Error: ${error}`);
      this.hasInvalidCss = true;
    }

    this.getCssImages();
    await this.analyzeImages();
  }




  /**
   * GETTERS * * *
   */

  get mime() {
    return {
      text: (this.eml.text && this.eml.text.length) ? true : false,
      html: (this.eml.html && this.eml.html.length) ? true : false,
      amp: (this.eml.amp && this.eml.amp.length) ? true : false,
    };
  }


  get subject() {
    if(this.eml.subject) {
      return {
        chars: this.eml.subject.length,
        words: this.eml.subject.split(/\s+/).length,
        emojis: this.getEmojis(this.eml.subject),
      };
    } else {
      return {
        chars: 0,
        words: 0,
        emojis: [],
      }
    }
  }


  get sender() {
    let domain = extractTlds(`https://${this.eml.from.address.split('@').pop()}`);

    return {
      tld: domain.tld,
      subdomain: domain.sub,
      government: /\bgov\b/i.test(domain.tld),
      education: /\bedu\b/i.test(domain.tld),
    };
  }


  get hasAttachments() {
    return (this.eml.attachments && this.eml.attachments.length) ? true : false;
  }


  get language() {
    const languages = francAll(this.eml.text || this.eml.subject);
    // first & second most probable languages
    let lang1 = languages?.[0]?.[0] ?? 'und';
    let lang2 = languages?.[1]?.[0] ?? 'und';

    // if the second most probable language is english, use that
    if (lang2 === "eng" && lang1 === "sco") {
      return lang2;
    }

    return lang1;
  }


  get languageFull() {
    const languageMap = {
      cmn: "Mandarin Chinese",
      spa: "Spanish",
      eng: "English",
      rus: "Russian",
      arb: "Standard Arabic",
      ben: "Bengali",
      hin: "Hindi",
      por: "Portuguese",
      ind: "Indonesian",
      jpn: "Japanese",
      fra: "French",
      deu: "German",
      jav: "Javanese (Javanese)",
      jav: "Javanese (Latin)",
      kor: "Korean",
      tel: "Telugu",
      vie: "Vietnamese",
      mar: "Marathi",
      ita: "Italian",
      tam: "Tamil",
      tur: "Turkish",
      urd: "Urdu",
      guj: "Gujarati",
      pol: "Polish",
      ukr: "Ukrainian",
      kan: "Kannada",
      mai: "Maithili",
      mal: "Malayalam",
      pes: "Iranian Persian",
      mya: "Burmese",
      swh: "Swahili (individual language)",
      sun: "Sundanese",
      ron: "Romanian",
      pan: "Panjabi",
      bho: "Bhojpuri",
      amh: "Amharic",
      hau: "Hausa",
      fuv: "Nigerian Fulfulde",
      bos: "Bosnian (Cyrillic)",
      bos: "Bosnian (Latin)",
      hrv: "Croatian",
      nld: "Dutch",
      srp: "Serbian (Cyrillic)",
      srp: "Serbian (Latin)",
      tha: "Thai",
      ckb: "Central Kurdish",
      yor: "Yoruba",
      uzn: "Northern Uzbek (Cyrillic)",
      uzn: "Northern Uzbek (Latin)",
      zlm: "Malay (individual language) (Arabic)",
      zlm: "Malay (individual language) (Latin)",
      ibo: "Igbo",
      npi: "Nepali (individual language)",
      ceb: "Cebuano",
      skr: "Saraiki",
      tgl: "Tagalog",
      hun: "Hungarian",
      azj: "North Azerbaijani (Cyrillic)",
      azj: "North Azerbaijani (Latin)",
      sin: "Sinhala",
      koi: "Komi-Permyak",
      ell: "Modern Greek (1453-)",
      ces: "Czech",
      mag: "Magahi",
      run: "Rundi",
      bel: "Belarusian",
      plt: "Plateau Malagasy",
      qug: "Chimborazo Highland Quichua",
      mad: "Madurese",
      nya: "Nyanja",
      zyb: "Yongbei Zhuang",
      pbu: "Northern Pashto",
      kin: "Kinyarwanda",
      zul: "Zulu",
      bul: "Bulgarian",
      swe: "Swedish",
      lin: "Lingala",
      som: "Somali",
      hms: "Southern Qiandong Miao",
      hnj: "Hmong Njua",
      ilo: "Iloko",
      kaz: "Kazakh",
      uig: "Uighur (Arabic)",
      uig: "Uighur (Latin)",
      hat: "Haitian",
      khm: "Khmer",
      prs: "Dari",
      hil: "Hiligaynon",
      sna: "Shona",
      tat: "Tatar",
      xho: "Xhosa",
      hye: "Armenian",
      min: "Minangkabau",
      afr: "Afrikaans",
      lua: "Luba-Lulua",
      sat: "Santali",
      bod: "Tibetan",
      tir: "Tigrinya",
      fin: "Finnish",
      slk: "Slovak",
      tuk: "Turkmen (Cyrillic)",
      tuk: "Turkmen (Latin)",
      dan: "Danish",
      nob: "Norwegian Bokmål",
      suk: "Sukuma",
      als: "Tosk Albanian",
      sag: "Sango",
      nno: "Norwegian Nynorsk",
      heb: "Hebrew",
      mos: "Mossi",
      tgk: "Tajik",
      cat: "Catalan",
      sot: "Southern Sotho",
      kat: "Georgian",
      bcl: "Central Bikol",
      glg: "Galician",
      lao: "Lao",
      lit: "Lithuanian",
      umb: "Umbundu",
      tsn: "Tswana",
      vec: "Venetian",
      nso: "Pedi",
      ban: "Balinese",
      bug: "Buginese",
      knc: "Central Kanuri",
      kng: "Koongo",
      ibb: "Ibibio",
      lug: "Ganda",
      ace: "Achinese",
      bam: "Bambara",
      tzm: "Central Atlas Tamazight",
      ydd: "Eastern Yiddish",
      kmb: "Kimbundu",
      lun: "Lunda",
      shn: "Shan",
      war: "Waray (Philippines)",
      dyu: "Dyula",
      wol: "Wolof",
      kir: "Kirghiz",
      nds: "Low German",
      fuf: "Pular",
      mkd: "Macedonian",
      vmw: "Makhuwa",
      zgh: "Standard Moroccan Tamazight",
      ewe: "Ewe",
      khk: "Halh Mongolian",
      slv: "Slovenian",
      ayr: "Central Aymara",
      bem: "Bemba (Zambia)",
      emk: "Eastern Maninkakan",
      bci: "Baoulé",
      bum: "Bulu (Cameroon)",
      epo: "Esperanto",
      pam: "Pampanga",
      tiv: "Tiv",
      tpi: "Tok Pisin",
      ven: "Venda",
      ssw: "Swati",
      nyn: "Nyankole",
      kbd: "Kabardian",
      iii: "Sichuan Yi",
      yao: "Yao",
      lvs: "Standard Latvian",
      quz: "Cusco Quechua",
      src: "Logudorese Sardinian",
      rup: "Macedo-Romanian",
      sco: "Scots",
      tso: "Tsonga",
      men: "Mende (Sierra Leone)",
      fon: "Fon",
      nhn: "Central Nahuatl",
      dip: "Northeastern Dinka",
      kde: "Makonde",
      kbp: "Kabiyè",
      tem: "Timne",
      toi: "Tonga (Zambia)",
      ekk: "Standard Estonian",
      snk: "Soninke",
      cjk: "Chokwe",
      ada: "Adangme",
      aii: "Assyrian Neo-Aramaic",
      quy: "Ayacucho Quechua",
      rmn: "Balkan Romani",
      bin: "Bini",
      gaa: "Ga",
      ndo: "Ndonga",
    };
  
    if (languageMap[this.language]) {
      return languageMap[this.language];
    }
  
    return this.language;
  }


  get result() {
    return {
      mimeTypes: this.mime,
      subject: this.subject,
      sender: this.sender,
      hasAttachments: this.hasAttachments,
      language: {
        code: this.language,
        name: this.languageFull,
      },

      html: {
        urlProtocols: [...new Set(this.urlProtocols)],
        tags: this.getTags(),
        attributes: this.htmlTagAttributes,
        conditionalComments: [...new Set(this.htmlConditionalComments)],
        hasStructuredData: this.hasHtmlStructuredData,
        hasMicrosoftActionableMessage: this.hasHtmlMicrosoftActionableMessage,
      },

      css: {
        hasInvalid: this.hasInvalidCss,
        properties: [...new Set(this.cssProperties)],
        values: [...new Set(this.cssValues)],
        selectors: [...new Set(this.cssSelectors)],
        rules: this.getUniqueObjects(this.cssRules),
        atRules: this.getUniqueObjects(this.cssAtRules),
      },

      externalAssets: {
        imageCount: [...new Set(this.images)].length,
        formats: [...new Set(this.assetFormats)],
        sizes: this.assetSizes,
      }
    }
  }



  /**
   * UTILS * * *
   */


  getUniqueObjects(arr) {
    return arr.filter(function(obj) {
      let key = Object.values(obj).join('');
      return !this.has(key) && this.add(key);
    }, new Set)
  }


  isValidURL(str) {
    try {
      new URL(str);
      return true;
    } catch (err) {
      return false;
    }
  }


  getUrlProtocol(value) {
    if(value.startsWith('#')) {
      this.urlProtocols.push('url_fragement');
      return 'url_fragment';
    } else {
      const url = new URL(value);
      this.urlProtocols.push(url.protocol);
      return url.protocol;
    }
  }


  getFormat(url) {
    if(url.includes('?')) {
      url = url.substring(0, url.indexOf("?"));
    }

    let ext = path.extname(url);
    if(ext) {
      return ext;
    }

    return null;
  }


  getEmojis(text) {
    const regex = emojiRegex();
    const emojis = [];
    for (const match of text.matchAll(regex)) {
      emojis.push(match[0]);
    }
  
    return emojis;
  }



  /**
   * PARSE HTML * * *
   */

  getTags() {
    const tags = {};

    for (const tagName of this.htmlTagNames) {
      tags[tagName] = tags[tagName] ? (tags[tagName] + 1) : 1;
    }

    for (const [key, value] of Object.entries(tags)) {
      tags[key] = {'count': value};
    }

    return tags;
  }


  getAttributesFromTag(tag) {
    if(!tag.attributes.length) {
      return;
    }

    tag.attributes.forEach(attr => {
      if(!this.htmlTagAttributes.includes(attr.name)) {
        this.htmlTagAttributes.push(attr.name);
      }
    })
  }


  getUrlsFromTag(tag) {
    if(!tag.attributes.length) {
      return;
    }

    const href = tag.attributes.find(e => e.name == 'href')?.value;
    if(href && this.isValidURL(href)) {
      this.getUrlProtocol(href);
    }
  }


  getStructuredData(tag) {
    if(tag.name == 'script') {
      const type = tag.attributes.find(e => e.name == 'type')?.value;

      if(type === 'application/ld+json' && tag.children[0].data.includes('schema.org')) {
        this.hasHtmlStructuredData = true;
      }

      if(type === 'application/adaptivecard+json' && tag.children[0].data.includes('AdaptiveCard')) {
        this.hasHtmlMicrosoftActionableMessage = true;
      }
    }

    const itemtype = tag.attributes.find(e => e.name == 'itemtype')?.value;
    if(itemtype && itemtype.includes('schema.org')) {
      this.hasHtmlStructuredData = true;
    }
  }


  getHtmlconditionalComments(tags) {
    let app = this;

    tags.contents().map(function () {
      if(this.type === 'comment') {
        if(this.data.startsWith('[if')) {
          app.htmlConditionalComments.push(
            this.data.substring(0, this.data.indexOf(">"))
          );
        }
      }
    });
  }




  /**
   * PARSE CSS * * *
   */

  getCssFromTag(tag) {
    const styleAttr = tag.attributes.find(e => e.name === 'style');

    if (!styleAttr) {
      return;
    }

    try {
      let css = postcss.parse(styleAttr.value);
      this.getCssRules(css);
    } catch (error) {
      console.log(`couldn't parse inline CSS. Error: ${error}`);
      this.hasInvalidCss = true;
    }
  }


  getCssFromStyleTags(nodes) {

    nodes?.forEach(e => {
      if(e.selector) {
        this.cssSelectors.push(e.selector);
      }

      if(e.type == 'rule') {
        this.getCssRules(e);
      }

      if(e.type == 'atrule') {
        this.cssAtRules.push({
          name: e.name,
          params: e.params,
        });

        this.getCssFromStyleTags(e.nodes);
      }
    })
  }


  getCssRules(node) {
    node.nodes.forEach(e => {
      this.cssProperties.push(e.prop);
      this.cssValues.push(e.value);

      this.cssRules.push({
        property: e.prop,
        value: e.value,
      });
    });
  }



  /**
   * EXTERNAL ASSETS (HTML & CSS)
   */


  getImagesFromTag(tag) {
    const src = tag.attributes.find(e => e.name == 'src')?.value;
    const srcset = tag.attributes.find(e => e.name == 'srcset')?.value;

    if(src) {
      this.images.push(src);
    }

    if(srcset) {
      extractUrls(srcset)?.forEach(e => {
        this.images.push(e);
      })
    }
  }


  getCssImages() {
    this.cssValues
      .filter(e => e?.includes('url('))
      .map(e => {
        let urls = extractUrls(e);
        if(urls) {
          this.images.push(...urls);
        }
      });
  }


  getAttachedImageInfo(contentID) {
    const attachment = this.emlContents.body.find(e => e.headers['Content-Id'] === `<${contentID}>`);
    if(!attachment) {
      return;
    }

    if(attachment.contentType.type) {
      let contentType = attachment.contentType.type;
      this.assetFormats.push(contentType.replace('image/', '.'));
    }

    if(attachment.headers['Content-Disposition']) {
      let contentDisposition = attachment.headers['Content-Disposition'].split(';');
      let size = contentDisposition.find(e => e.trim().startsWith('size='));
      if(size) {
        this.assetSizes.push(parseInt(size.replace('size=', '').trim()))
      }
    }
  }


  async getLinkAssetsFromTag(tag) {
    if(tag.name != 'link') {
      return;
    }

    const rel = tag.attributes.find(e => e.name == 'rel')?.value;
    const href = tag.attributes.find(e => e.name == 'href')?.value;

    if(rel && href && ['stylesheet'].includes(rel) && this.isValidURL(href)) {
      let format = this.getFormat(href);
      if(format) {
        this.assetFormats.push(format);
      }

      if(this.fetchExternalAssetsSize) {
        await ufs(href)
            .then(val => this.assetSizes.push(val))
            .catch(error => {
              console.log(`couldn't get file size of external stylesheet. Error: ${error}`)
            });
      }
    }
  }


  async analyzeImages() {
    for (const image of [...new Set(this.images)]) {
      if(image.startsWith('cid:')) {
        this.getAttachedImageInfo(image.replace('cid:', ''));
        return;
      }

      if(!this.isValidURL(image)) {
        return;
      }

      let protocol = this.getUrlProtocol(image);
      let format = this.getFormat(image);
      if(format) {
        this.assetFormats.push(format);
      }

      // file size
      // only check http assets (ignore cid attachements)
      if(this.fetchExternalAssetsSize && protocol.includes('http')) {
        await ufs(image)
          .then(val => this.assetSizes.push(val))
          .catch(console.error);
      }
    }
  }
}

