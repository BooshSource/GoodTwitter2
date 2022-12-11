import { Logger } from "../util/logger"
import { settings } from "../util/settings"
import { dismissUpdateNotice, getCurrentUserInfo, getLocalizedString, getSvg, isLoggedIn, isOnSmallerView, updateNoticeDismissed, waitForKeyElements } from "../util/util"


const logger = new Logger("component/sidebar")


export function initializeSidebar() {
  addLeftSidebar()
  addRightSidebar()
  addSidebarElements()
  handleTrends()

  // @option hideFollowSuggestions
  if (settings.get("hideFollowSuggestions")) {
    let sel = settings.get("hideFollowSuggestionsSidebarSel")

    // user suggestions (Who to follow, You might like)
    if ((sel & 1) == 1) {
      waitForKeyElements(`div[data-testid=sidebarColumn] aside [data-testid=UserCell]`, e => {
        e.closest("aside").parentElement.remove()
      }, false)
    }

    // topic suggestions
    if ((sel & 2) == 2) {
      waitForKeyElements(`div[data-testid=sidebarColumn] section [href^="/i/topics/"]`, e => {
        e.closest("section").parentElement.parentElement.remove()
      }, false)
    }
  }

  window.addEventListener("resize", () => {
    if (isOnSmallerView())
      moveSidebarElements("right")
    else
      moveSidebarElements("left")
  })
}


// add left sidebar
function addLeftSidebar() {
  waitForKeyElements("main > div > div > div", mainView => {
    if (!mainView.querySelector(".gt2-left-sidebar")) {
      mainView.insertAdjacentHTML("afterbegin", `
      <div class="gt2-left-sidebar-container">
        <div class="gt2-left-sidebar"></div>
      </div>
      `)
      logger.debug("added left sidebar")
    }
  }, false)
}


// add right sidebar
function addRightSidebar() {
  waitForKeyElements("div[data-testid=sidebarColumn] > div > div:nth-child(2) > div > div > div", rightSidebar => {
    if (!rightSidebar.querySelector(".gt2-right-sidebar")) {
      rightSidebar.insertAdjacentHTML("afterbegin", `<div class="gt2-right-sidebar"></div>`)
      logger.debug("added right sidebar")
    }
  }, false)
}


function addSidebarElements() {
  let insertAt = isOnSmallerView() ? ".gt2-right-sidebar" : ".gt2-left-sidebar"

  waitForKeyElements(insertAt, sidebar => {
    sidebar.replaceChildren()
    sidebar.insertAdjacentHTML("afterbegin", `
      ${getUpdateNotice()}
      ${getDashboardProfileHtml()}
      <div class="gt2-legacy-profile-info gt2-left-sidebar-elem"></div>
    `)
    logger.debug("added static elements")

    sidebar.querySelector(".gt2-sidebar-notice-close")
      ?.addEventListener("click", event => {
        let container = (event.target as HTMLElement).closest(".gt2-sidebar-notice")

        if (container.classList.contains("gt2-update-notice")) {
          dismissUpdateNotice()
        }
        container.remove()
      })

  }, false)
}


// profile view left sidebar
function getDashboardProfileHtml() {
  let i = getCurrentUserInfo()
  let href = isLoggedIn() ? "href" : "data-href"
  return `
    <div class="gt2-dashboard-profile gt2-left-sidebar-elem">
      <a ${href}="/${i.screenName}" class="gt2-banner" style="background-image: ${i.bannerUrl ? `url(${i.bannerUrl}/600x200)` : "unset"};"></a>
      <div>
        <a ${href}="/${i.screenName}" class="gt2-avatar">
          <img src="${i.avatarUrl}"/>
        </a>
        <div class="gt2-user">
          <a ${href}="/${i.screenName}" class="gt2-name">${i.name.replaceEmojis()}</a>
          <a ${href}="/${i.screenName}" class="gt2-screenname">
            @<span >${i.screenName}</span>
          </a>
        </div>
        <div class="gt2-toggle-${isLoggedIn() ? "acc-switcher-dropdown" : "lo-nightmode" }">
          <div></div>
          ${getSvg(isLoggedIn() ? "caret" : "moon")}
        </div>
        <div class="gt2-stats">
          <ul>
            <li>
              <a ${href}="/${i.screenName}">
                <span>${getLocalizedString("statsTweets")}</span>
                <span>${i.stats.tweets.humanize()}</span>
              </a>
            </li>
            <li>
              <a ${href}="/${i.screenName}/following">
                <span>${getLocalizedString("statsFollowing")}</span>
                <span>${i.stats.following.humanize()}</span>
              </a>
            </li>
            <li>
              <a ${href}="/${i.screenName}/followers">
                <span>${getLocalizedString("statsFollowers")}</span>
                <span>${i.stats.followers.humanize()}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `
}


// gt2 update notice
function getUpdateNotice(): string {
  // check if update notice needs to be shown
  if (!settings.get("updateNotifications") || updateNoticeDismissed()) {
    return ""
  }

  let ver = GM_info.script.version
  return `
    <div class="gt2-sidebar-notice gt2-update-notice gt2-left-sidebar-elem">
      <div class="gt2-sidebar-notice-header">
        GoodTwitter2
        <div class="gt2-sidebar-notice-close">
          <div></div>
          ${getSvg("x")}
        </div>
      </div>
      <div class="gt2-sidebar-notice-content">
        ${getSvg("tick")} ${getLocalizedString("updatedInfo").replace("$version$", `v${ver}`)}<br />
        <a
          href="https://github.com/Bl4Cc4t/GoodTwitter2/blob/master/doc/changelog.md#${ver.replace(/\./g, "")}"
          target="_blank">
          ${getLocalizedString("updatedInfoChangelog")}
        </a>
      </div>
    </div>
  `
}


// handle trends (hide, move, wrap)
function handleTrends() {
  let w = window.innerWidth
  let trendsSelector = `section:not(.gt2-trends-handled) div[data-testid=trend]:not(.gt2-trend-wrapped),
                section[aria-labelledby^=accessible-list]:not(.gt2-trends-handled) a[href="/explore/tabs/for-you"] > div > span:not(.gt2-trend-wrapped)`

  waitForKeyElements(trendsSelector, trends => {
    let trendSection = trends.closest("section")
    let trendContainer = trendSection.parentElement.parentElement

    // actions for the whole container
    if (!trendSection.classList.contains("gt2-trends-handled")
      && trends.closest("div[data-testid=sidebarColumn]")) {

      // hide trends
      if (settings.get("hideTrends")) {
        trendContainer.remove()
        logger.debug("removed trends")
        return
      }

      trendSection.classList.add("gt2-trends-handled")
      trendContainer.classList.add("gt2-trends")

      // move trends
      if (settings.get("leftTrends")) {
        trendContainer.classList.add("gt2-left-sidebar-elem")

        if (!isOnSmallerView()) {
          let leftSidebarTrends = document.querySelector(".gt2-left-sidebar .gt2-trends")

          // replace existing trends
          if (leftSidebarTrends) {
            leftSidebarTrends.replaceWith(trendContainer)
            logger.debug("replace existing trends in left sidebar")
          }

          // move trends
          else {
            document.querySelector(".gt2-left-sidebar")
              ?.append(trendContainer)
            logger.debug("moved trends to left sidebar")
          }

        }
      }
    }


    // wrap trends in anchors
    let toWrap = trends.querySelector<HTMLElement>(":scope > div > div:nth-child(2) > span [dir]")
    if (toWrap) {
      trends.classList.add("gt2-trend-wrapped")
      let text = toWrap.innerText
      let query = encodeURIComponent(text.replace(/%/g, "%25"))
        .replace(/'/g, "%27")
        .replace(/(^\"|\"$)/g, "")

      toWrap.innerHTML = `<a class="gt2-trend" href="/search?q=${text.includes("#") ? query : `%22${query}%22`}">${text}</a>`
    }
  }, false)
}

function moveSidebarElements(targetSide: "left" | "right"): void {
  // check if there are elements to move
  let opposite = targetSide == "left" ? "right" : "left"
  if (document.querySelectorAll(`.gt2-${opposite}-sidebar > *`).length == 0)
    return

  let sidebar = document.querySelector(`.gt2-${targetSide}-sidebar`)
  if (!sidebar) {
    logger.error(`${targetSide} sidebar not found while trying to move elements.`)
    return
  }

  let elements = document.querySelectorAll(".gt2-left-sidebar-elem")
  sidebar.append(...Array.from(elements))

  logger.debug(`moved ${elements.length} elements to the ${targetSide} sidebar`)
}
