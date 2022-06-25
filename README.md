# PPfilter
Userscript for filtering images on 4chan /mlp/ by data-md5. Works on any board, just adjust the url.

This repository includes approximately 180k MD5s of barby content often reposted on /mlp/. The goal is browsing without having to view offending content. 

# Installation

1. Have Greasemonkey or Tampermonkey installed
2. Click this link to install the script: https://github.com/ponyman68/PPfilter/raw/main/ppfilter.user.js
3. On the top right of /mlp/ click the Options button and populate your database:
    * Copy url into the import text box:
        ```
        https://raw.githubusercontent.com/ponyman68/PPfilter/main/mymd5s.json
        ```
    * copy/paste your 4chanX MD5 filter list from 4chanX->settings->Filter->MD5 into the TextArea. 

# Why use this over my existing 4chan X Md5 filter setup?

* this script filters images before page load (meaning you don't see offending images "flicker" briefly in view when you refresh the page)
* and hiding an image instantly takes 1 click instead of 3

# Usage

Install the userscript and navigate to /mlp/. Every image has a hide/show button, which adds or removes its MD5 from your local storage databse. On the top right of the page is a button with import/export options for your local storage database. Find a manually picked selection of entries for your database in this repository.

# Clearing

> :warning: **Attention**: If you "clear all local data" in your browser, it will also clear this local store. Please use the "Export" button early and often, and only clear your cookies when trying to circumvent 4chan bans. You can do this by going into developer console (F12) on 4chan, clicking on storage manager, and clearing only the "cookies" entry there.

# Limitations

Requires a fairly up-to-date browser version. 
Interferes with advanced 4chan X filtering (ex. thread collapsing based on image MD5s doesn't work after this script removes the images) 

## Known issues

* doesn't work in 4chan catalog which doesn't currently expose md5s.