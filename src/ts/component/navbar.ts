import { Logger } from "../util/logger"
import { getCurrentUserInfo, getLocalizedString, isLoggedIn, waitForKeyElements, watchForChanges } from "../util/util"


const logger = new Logger("component", "navbar")


/**
 * Entry function for adding the navbar component.
 */
export function initializeNavbar() {
  addNavbar()
  addSearch()
}


/**
 * Adds the navbar to the page.
 */
function addNavbar(): void {
  waitForKeyElements(`nav > [data-testid]`, () => {
    if (document.querySelector(".gt2-nav")) return

    let loggedIn = isLoggedIn()

    document.querySelector("main")
      .insertAdjacentHTML("beforebegin", `
        <nav class="gt2-nav">
          <div class="gt2-nav-left"></div>
          <div class="gt2-nav-center">
            <a class="gt2-nav-bird" href="${loggedIn ? "/home" : "/"}"></a>
          </div>
          <div class="gt2-nav-right">
            <div class="gt2-search"></div>
            ${loggedIn ? `
            <div class="gt2-toggle-navbar-dropdown">
              <img src="${getCurrentUserInfo().avatarUrl}" />
            </div>
            <div class="gt2-compose">${getLocalizedString("composeNewTweet")}</div>` : ""}
          </div>
        </nav>
        <div class="gt2-search-overflow-hider"></div>`)

    logger.debug(`added navbar`)


    let navbarElementsToAdd: {
      selector: string
      localizedString: string
    }[] = []

    // home, notifications, messages (and explore on smaller screens)
    if (loggedIn) {
      navbarElementsToAdd = [
        {
          selector: "[data-testid=AppTabBar_Home_Link]",
          localizedString: getLocalizedString("navHome")
        }, {
          selector: "[data-testid=AppTabBar_Notifications_Link]",
          localizedString: getLocalizedString("navNotifications")
        }, {
          selector: "[data-testid=AppTabBar_DirectMessage_Link]",
          localizedString: getLocalizedString("navMessages")
        }
      ]

      if (window.innerWidth < 1005) navbarElementsToAdd.push({
        selector: "[data-testid=AppTabBar_Explore_Link]",
        localizedString: getLocalizedString("navExplore")
      })
    }

    // not logged in
    else {
      navbarElementsToAdd = [
        {
          selector: "[data-testid=AppTabBar_Explore_Link]",
          localizedString: getLocalizedString("navExplore")
        }, {
          selector: `a[href="/settings"]`,
          localizedString: getLocalizedString("navSettings")
        }
      ]
    }

    for (let elem of navbarElementsToAdd) {
      // check for updates
      watchForChanges(`header ${elem.selector}`, () => {
        addOrUpdateNavbarElement(elem.selector, elem.localizedString)
        highlightNavbarLocation()
      }, true)
    }

    addBird()
  })
}


/**
 * Highlights the current location in the navbar.
 */
function highlightNavbarLocation(): void {
  document.querySelectorAll(`.gt2-nav-left > a`)
    ?.forEach(e => e.classList.remove("active"))
  let elem = document.querySelector(`.gt2-nav a[href^='/${location.pathname.split("/")[1]}']`)
  if (elem) {
    elem.classList.add("active")
    logger.debug("highlighted location on navbar element:", elem)
  }
}


/**
 * Adds or updates a navbar element by a given selector.
 * @param selector Selector string of the navbar element to add
 * @param localizedString localized string of the text
 */
function addOrUpdateNavbarElement(selector: string, localizedString: string): void {
  let origElem = document.querySelector(`header ${selector}`) as HTMLElement
  if (!origElem) {
    logger.error(`Error finding navbar element with selector "${selector}"`)
    return
  }

  let mockElem = document.querySelector(`.gt2-nav ${selector}`)

  // mock element does not exist
  if (!mockElem) {
    document.querySelector(".gt2-nav-left")
    .insertAdjacentHTML("beforeend", origElem.outerHTML)
    logger.debug(`added navbar element with selector "${selector}"`)
    mockElem = document.querySelector(`.gt2-nav ${selector}`)

    // click handler
    mockElem.addEventListener("click", (event: MouseEvent) => {
      event.preventDefault()
      origElem.click()
    })
  }

  // mock element already exists
  else {
    mockElem.innerHTML = origElem.innerHTML
    logger.debug(`updated navbar element with selector "${selector}"`)
  }

  mockElem.firstElementChild.setAttribute("data-gt2-color-override-ignore", "")
  mockElem.firstElementChild.insertAdjacentHTML("beforeend", `
    <div class="gt2-nav-header">${localizedString}</div>`)
}


/**
 * Adds the search box to the navbar.
 */
function addSearch(): void {
  let search = "div[data-testid=sidebarColumn] > div > div:nth-child(2) > div > div > div > div:nth-child(1)"
  waitForKeyElements(`${search} [data-testid=SearchBox_Search_Input]`, () => {
    let mockSearch = document.querySelector(".gt2-search")
    let hadInput = mockSearch.querySelector("input") != null

    // replace mock search
    mockSearch.replaceChildren(document.querySelector(search))

    logger.debug(`${hadInput ? "updated" : "added"} search`)
  }, false)
}


/**
 * Removes the search from the navbar.
 */
export function removeSearch(): void {
  document.querySelector(".gt2-search").replaceChildren()
  logger.debug("removed search")
}


/**
 * Adds the twitter bird to the navbar.
 */
function addBird(): void {
  let bird = document.querySelector("header h1 svg")
  if (!bird) {
    logger.error("couldn't find twitter bird")
  } else {
    document.querySelector(".gt2-nav-bird")
      .insertAdjacentHTML("beforeend", bird.outerHTML)
    logger.debug("added twitter bird to navbar")
  }
}
