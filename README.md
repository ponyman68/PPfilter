# PPfilter
Userscript for filtering images on 4chan /mlp/ by data-md5. Works on any board, just adjust the url.

This repository includes a file and some links to combined approximately 180k MD5s of barby content often reposted on /mlp/. The goal is a browsing experience without having to view offending content. This data set is accurate enough to filter about 40%-60% of offending content on the board.

### Why use this over my existing 4chan X Md5 filter setup?

No reason, this script basically does the same as filtering with 4chan X, except:

* this script filters images before page load (meaning you don't see offending images "flicker" briefly in view when you refresh the page)
* and hiding an image instantly takes 1 click instead of 3

This code is also extremely simple to understand and modify, which is not the case for 4chan X.

# Installation

1. Have Greasemonkey or Tampermonkey installed
2. Click this link to install the script: https://github.com/MaresOnMyFace/PPfilter/raw/main/ppfilter.user.js
3. On the top right of /mlp/ click the Options button and populate your database. For example:
    * Copy all of these urls into the import text box:
        ```
        https://raw.githubusercontent.com/MaresOnMyFace/PPfilter/main/mymd5s.json
        https://u.smutty.horse/lzwizdwkkjg.txt
        https://u.smutty.horse/lzwjeagjrpa.txt
        ```
    * copy/paste your 4chanX MD5 filter list from 4chanX->settings->Filter->MD5 into the TextArea. 

# Usage

Install the userscript and navigate to /mlp/. Every image has a hide/show button, which adds or removes its MD5 from your local storage databse. On the top right of the page is a button with import/export options for your local storage database. Find a manually picked selection of entries for your database in this repository.

# Capabilities

This script uses the IndexedDB local storage API of your browser to locally persist MD5 entries. It filters images on 4chan against this local storage, making it possible to have a very large database without performance losses. 

> :warning: **Attention**: If you "clear all local data" in your browser, it will also clear this local store. Please use the "Export" button early and often, and only clear your cookies when trying to circumvent 4chan bans. 

The Mutation Observer API is used to apply our filter instantly on page load, during initial DOM parsing (preventing the "flickering" of offending images you have with 4chan X and the 4chan native extension when refreshing the page). 

The code is simple and should be modified easily for future purposes (please use pull requests, notify me on /mlp/ Fan Site Alternative thread, or message me at maresonmyface at horsefucker dot org). 

# Limitations

Requires a fairly up-to-date browser version. 
Interferes with advanced 4chan X filtering (ex. thread collapsing based on image MD5s doesn't work after this script removes the images) 

## Known issues

* doesn't work in 4chan catalog which doesn't currently expose md5s.
* not sufficiently tested in very advanced/fancy 4chan X functionalities.
