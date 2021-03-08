# PPfilter
Userscript for filtering images on 4chan /mlp/ by data-md5. Works on any board, just adjust the url.

This repository includes a file and some links to combined approximately 180k MD5s of barby content often reposted on /mlp/.

# Installation

1. Have Greasemonkey or Tampermonkey installed
2. Click this link to install the script: https://github.com/MaresOnMyFace/PPfilter/raw/main/ppfilter.user.js
3. On the top right of /mlp/ click the Options button and populate your database. For example:
    * copy/paste your 4chanX MD5 filter list from 4chanX->settings->Filter->MD5 into the TextArea. 
    * Put any one of these urls into the url field:
        - `https://raw.githubusercontent.com/MaresOnMyFace/PPfilter/main/mymd5s.json`
        - `https://u.smutty.horse/lzwizdwkkjg.txt`
        - `https://u.smutty.horse/lzwjeagjrpa.txt`

# Usage

Install the userscript and navigate to /mlp/. Every image has a hide/show button, which adds or removes its MD5 from your local storage databse. On the top right of the page is a button with import/export options for your local storage database. Find some entries for your database in this repository.

# Details

This script uses the IndexedDB local storage API of your browser to locally persist MD5 entries. It filters images on 4chan against this local storage, making it possible to have a very large database without performance losses (unlike 4chan X's solution). 

> :warning: **Attention**: If you "clear all local data" in your browser, it will also clear this local store. Please use the "Export" button early and often, and only clear your cookies when trying to circumvent 4chan bans. 

The Mutation Observer API is used to apply our filter instantly on page load, during initial DOM parsing (preventing the "flickering" of offending images you have with 4chan X and the 4chan native extension when refreshing the page). 

The code is extremely simple and should be modified easily (please use pull requests or notify me on /mlp/ Fan Site Alternative thread). 

## Todos

* Find a way to collect a large number of offending md5s to finish this proof of concept.

## Known issues

* doesn't work in 4chan catalog which doesn't expose md5s.
* not sufficiently tested in very advanced/fancy 4chan X functionalities.
