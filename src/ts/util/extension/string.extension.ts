import { EMOJI_REGEXP } from "../../constants"
import { settings } from "../settings"
import { logger } from "../logger"

export {}

declare global {
  interface String {
    /**
     * Converts a camel case string to a custom case format.
     * @param separator The separator to split the string with
     * @returns string in custom separated case format
     */
    camelCaseToSeparatedCase(separator: string): string

    /**
     * Converts a camel case string to snake case.
     *
     * Example: `thisIsATest123` -> `this_is_a_test_123`
     * @returns string in snake case
     */
    camelCaseToSnakeCase(): string

    /**
     * Converts a camel case string to kebab case.
     *
     * Example: `thisIsATest123` -> `this-is-a-test-123`
     * @returns string in kebab case
     */
    camelCaseToKebabCase(): string

    /**
     * Replaces a range inside the string with a given replacement string.
     * @param index the position where the replacement should start
     * @param length the amount of characters to replace
     * @param text the string to be added
     */
    replaceAt(index: number, length: number, text: string): string

    /**
     * Inserts a string at a given position.
     * @param index the position where the string should be placed
     * @param text the string to be added
     */
    insertAt(index: number, text: string): string

    /**
     * Adds links from an entities object to the string.
     * @param entities the entities to add to the string
     * @returns string with linked entities
     */
    populateWithEntities(entities: TwitterApi.Entities): string

    /**
     * Replaces emojis with the twitter twemoji SVGs.
     * @returns string with replaced emojis
     */
    replaceEmojis(): string
  }
}


String.prototype.camelCaseToSeparatedCase = function(separator: string): string {
  let arr: string[] = this.toString().split("")
  return arr.map((e, i) => {
    let addDash = i > 0
      && ((!isNaN(e as any) && isNaN(arr[i-1] as any))
       || (isNaN(e as any) && !isNaN(arr[i-1] as any))
       || (isNaN(e as any) && e == e.toUpperCase()))
    return `${addDash ? separator : ""}${e.toLowerCase()}`
  }).join("")
}


String.prototype.camelCaseToSnakeCase = function(): string {
  return this.camelCaseToSeparatedCase("_")
}


String.prototype.camelCaseToKebabCase = function(): string {
  return this.camelCaseToSeparatedCase("-")
}


String.prototype.replaceAt = function(index: number, length: number, text: string): string {
  return `${this.toString().slice(0, index)}${text}${this.toString().slice(index + length)}`
}


String.prototype.insertAt = function(index: number, text: string): string {
  return this.toString().replaceAt(index, 0, text)
}


String.prototype.populateWithEntities = function(entities: TwitterApi.Entities): string {
  let text = this.toString()
  let out = text

  let toReplace: {
    [key: number]: string
  }[] = []

  // urls
  if (entities.urls) {
    for (let url of entities.urls) {
      toReplace.push({
        [url.indices[0]]: `<a href="`,
        [url.indices[1]]: `" target="_blank">${url.display_url}</a> `
      })
    }
  }

  // users
  if (entities.user_mentions) {
    for (let user of entities.user_mentions) {
      let x = text.slice(user.indices[0], user.indices[0]+1) == "@" ? 0 : 1
      toReplace.push({
        [user.indices[0]+x]: `<a href="/${user.screen_name}">`,
        [user.indices[1]+x]: `</a> `
      })
    }
  }

  // hashtags
  if (entities.hashtags) {
    for (let hashtag of entities.hashtags) {
      let x = text.slice(hashtag.indices[0], hashtag.indices[0]+1) == "#" ? 0 : 1
      toReplace.push({
        [hashtag.indices[0]+x]: `<a href="/hashtag/${hashtag.text}">`,
        [hashtag.indices[1]+x]: `</a> `
      })
    }
  }

  // change indices if emoji(s) appear before the entity
  // reason: multiple > 0xFFFF codepoint emojis are counted wrong: all but the first emoji have their length reduced by 1.
  // also, if any emoji > 0xFFFF precedes a url, the indices of the url are misaligned by -1.
  if (!EMOJI_REGEXP) {
    logger.error("error with emoji-regex.txt.")
  } else {
    let match: RegExpMatchArray | null
    let counter = 0
    while ((match = EMOJI_REGEXP.exec(text)) != null) {
      let e = match[1]
      if (e.codePointAt(0) < 0xFFFF) continue
      counter++
      for (let i in toReplace) {
        let tmp = Object.entries(toReplace[i])
        // skip if not url and first element
        if (tmp[0][1] != `<a href="` && counter == 1) continue
        if (parseInt(tmp[0][0]) >= match.index) {
          toReplace[i] = {
            [parseInt(tmp[0][0]) + 1]: tmp[0][1],
            [parseInt(tmp[1][0]) + 1]: tmp[1][1]
          }
        }
      }
    }
  }

  // sort array
  toReplace = toReplace.sort((a, b) => parseInt(Object.keys(a)[0]) - parseInt(Object.keys(b)[0]))

  // replace values
  let offset = 0
  for (let e of toReplace) {
    for (let [index, value] of Object.entries(e)) {
      out = out.insertAt(parseInt(index) + offset, value)
      offset += value.length
    }
  }

  if (settings.get("expandTcoShortlinks")) {
    let re = /href="(https:\/\/t\.co\/[^"]+)"/
    let match: RegExpMatchArray | null
    while ((match = re.exec(out)) != null) {
      out = out.replace(new RegExp(`href="${match[1]}"`), `href="${
        entities.urls.find((e: any) => e.url == match[1]).expanded_url
      }"`)
    }
  }

  return out
}


String.prototype.replaceEmojis = function(): string {
  if (!EMOJI_REGEXP) {
    logger.error("error with emoji-regex.txt.")
    return this
  }

  let text = this.toString()
  .replace(/([\*#0-9])\s\u20E3/ug, "$1\u20E3")
  .replace(/([\*#0-9])\uFE0F/ug, "$1")

  let out = text
  let match: RegExpMatchArray | null
  let offset = 0
  while ((match = EMOJI_REGEXP.exec(text)) != null) {
    let e = match[1]
    // get unicode of emoji
    let uni = []
    for (let i = 0; i < e.length; i++) {
      uni.push(e.codePointAt(i).toString(16))
      if (e.codePointAt(i) > 0xFFFF) i++
    }

    // remove fe0f from non joined emojis
    if (uni.length > 1 && uni[1].match(/^FE0F$/i)) uni.pop()

    // replace with image
    // https://abs-0.twimg.com/emoji/v2/svg/1f647.svg
    // https://abs-0.twimg.com/emoji/v2/svg/1f647-200d-2640-fe0f.svg
    let img = `<img src="https://abs-0.twimg.com/emoji/v2/svg/${uni.join("-")}.svg" alt="${e}" class="gt2-emoji" />`
    out = out.replaceAt(match.index + offset, e.length, img)

    offset += img.length - e.length
  }

  return out
}
