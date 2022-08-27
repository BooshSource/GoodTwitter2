import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"
import babel from "@rollup/plugin-babel"
import postcss from "rollup-plugin-postcss"
import autoprefixer from "autoprefixer"
import addUserscriptHeader from "./packages/rollup-plugin-add-userscript-header/dist/plugin"
import pkg from "./package.json"


const extensions = [".js", ".ts"]

export default {
  input: "./src/ts/main.ts",
  plugins: [
    // scss
    postcss({
      extract: "goodtwitter2.style.css",
      plugins: [ autoprefixer() ],
      minimize: true
    }),

    // ts
    commonjs(),
    resolve({ extensions }),
    babel({
      extensions,
      babelHelpers: "bundled",
      include: ["src/**/*"]
    }),
    addUserscriptHeader({
      meta: {
        "match": [
          "https://twitter.com/*",
          "https://mobile.twitter.com/*"
        ],
        "exclude": [
          "https://twitter.com/i/cards/*",
          "https://twitter.com/i/release_notes",
          "https://twitter.com/*/privacy",
          "https://twitter.com/*/tos",
          "https://twitter.com/account/access"
        ],
        "connect": [
          "api.twitter.com"
        ],
        "require": [
          "https://github.com/Bl4Cc4t/GoodTwitter2/raw/master/twitter.gt2eb.i18n.js"
        ],
        "resource": {
          // "css": "dist/goodtwitter2.style.css",
          "css": "twitter.gt2eb.style.css",
          // "emojiRegex": "static/emoji-regex.txt"
          "emojiRegex": "data/emoji-regex.txt"
        }
      }
    })
  ],

  output: [{
    file: pkg.main,
    format: "iife",
    name: pkg.name
  }]
}

